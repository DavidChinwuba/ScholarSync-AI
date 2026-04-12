import express from 'express';
import { google } from 'googleapis';
import axios from 'axios';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Firebase Admin
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
} else if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  }
}

const db = admin.firestore();

const PORT = 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// --- Google OAuth ---
const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${APP_URL}/api/auth/google/callback`
);

app.get('/api/auth/google/url', (req, res) => {
  const { userId } = req.query;
  const url = googleOAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: userId as string,
    prompt: 'consent'
  });
  res.json({ url });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  try {
    const { tokens } = await googleOAuth2Client.getToken(code as string);
    await db.collection('userTokens').doc(userId as string).set({
      userId,
      google: tokens
    }, { merge: true });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Google Calendar connected! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// --- Microsoft OAuth ---
const msConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  redirectUri: `${APP_URL}/api/auth/microsoft/callback`
};

app.get('/api/auth/microsoft/url', (req, res) => {
  const { userId } = req.query;
  const url = `https://login.microsoftonline.com/${msConfig.tenantId}/oauth2/v2.0/authorize?` + new URLSearchParams({
    client_id: msConfig.clientId!,
    response_type: 'code',
    redirect_uri: msConfig.redirectUri,
    response_mode: 'query',
    scope: 'offline_access Calendars.ReadWrite',
    state: userId as string
  }).toString();
  res.json({ url });
});

app.get('/api/auth/microsoft/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  try {
    const response = await axios.post(`https://login.microsoftonline.com/${msConfig.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
      client_id: msConfig.clientId!,
      client_secret: msConfig.clientSecret!,
      code: code as string,
      redirect_uri: msConfig.redirectUri,
      grant_type: 'authorization_code'
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    await db.collection('userTokens').doc(userId as string).set({
      userId,
      microsoft: response.data
    }, { merge: true });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'microsoft' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Outlook Calendar connected! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// --- Sync Endpoint ---
app.post('/api/calendar/sync', async (req, res) => {
  const { userId, provider, event } = req.body;
  try {
    const tokenDoc = await db.collection('userTokens').doc(userId).get();
    if (!tokenDoc.exists) return res.status(404).json({ error: 'No tokens found' });
    const tokens = tokenDoc.data();

    if (provider === 'google') {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      auth.setCredentials(tokens?.google);

      // Listen for token refresh
      auth.on('tokens', async (newTokens) => {
        await db.collection('userTokens').doc(userId).set({
          google: { ...tokens?.google, ...newTokens }
        }, { merge: true });
      });

      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.title,
          description: event.description,
          start: { dateTime: event.start },
          end: { dateTime: event.end }
        }
      });
    } else if (provider === 'microsoft') {
      let accessToken = tokens?.microsoft.access_token;
      
      try {
        await axios.post('https://graph.microsoft.com/v1.0/me/events', {
          subject: event.title,
          body: { contentType: 'HTML', content: event.description },
          start: { dateTime: event.start, timeZone: 'UTC' },
          end: { dateTime: event.end, timeZone: 'UTC' }
        }, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } catch (error: any) {
        if (error.response?.status === 401 && tokens?.microsoft.refresh_token) {
          const refreshResponse = await axios.post(`https://login.microsoftonline.com/${msConfig.tenantId}/oauth2/v2.0/token`, new URLSearchParams({
            client_id: msConfig.clientId!,
            client_secret: msConfig.clientSecret!,
            refresh_token: tokens.microsoft.refresh_token,
            grant_type: 'refresh_token',
            scope: 'offline_access Calendars.ReadWrite'
          }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });

          accessToken = refreshResponse.data.access_token;
          await db.collection('userTokens').doc(userId).set({
            microsoft: refreshResponse.data
          }, { merge: true });

          await axios.post('https://graph.microsoft.com/v1.0/me/events', {
            subject: event.title,
            body: { contentType: 'HTML', content: event.description },
            start: { dateTime: event.start, timeZone: 'UTC' },
            end: { dateTime: event.end, timeZone: 'UTC' }
          }, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } else {
          throw error;
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// API Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export app for Vercel
export default app;

// Start server if not running as a function
if (!process.env.VERCEL) {
  const startServer = async () => {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  };
  startServer();
}

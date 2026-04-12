import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, doc, onSnapshot } from '../firebase';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserData } from '../App';

export function Integrations({ user, userData }: { user: User, userData: UserData }) {
  const [tokens, setTokens] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'userTokens', user.uid), (doc) => {
      if (doc.exists()) {
        setTokens(doc.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const connectCalendar = async (provider: 'google' | 'microsoft') => {
    try {
      const response = await fetch(`/api/auth/${provider}/url?userId=${user.uid}`);
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        url,
        'oauth_popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // Tokens will be updated via onSnapshot
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-sans font-bold text-stone-900 tracking-tight">Integrations</h1>
          {userData.isPremium && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
              Premium
            </span>
          )}
        </div>
        <p className="text-stone-500">Connect your calendars to sync study sessions and quizzes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Calendar */}
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-stone-900">Google Calendar</h3>
                <p className="text-xs text-stone-500">Sync to your Google account</p>
              </div>
            </div>
            {tokens?.google ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-stone-400 uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" /> Not Connected
              </span>
            )}
          </div>
          
          <button
            onClick={() => connectCalendar('google')}
            className={cn(
              "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              tokens?.google 
                ? "bg-stone-100 text-stone-900 hover:bg-stone-200" 
                : "bg-stone-900 text-white hover:bg-stone-800"
            )}
          >
            {tokens?.google ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
          </button>
        </div>

        {/* Outlook Calendar */}
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-stone-900">Outlook Calendar</h3>
                <p className="text-xs text-stone-500">Sync to your Microsoft account</p>
              </div>
            </div>
            {tokens?.microsoft ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-stone-400 uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" /> Not Connected
              </span>
            )}
          </div>
          
          <button
            onClick={() => connectCalendar('microsoft')}
            className={cn(
              "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              tokens?.microsoft 
                ? "bg-stone-100 text-stone-900 hover:bg-stone-200" 
                : "bg-stone-900 text-white hover:bg-stone-800"
            )}
          >
            {tokens?.microsoft ? 'Reconnect Outlook Calendar' : 'Connect Outlook Calendar'}
          </button>
        </div>
      </div>

      <div className="bg-stone-50 p-6 rounded-2xl border border-black/5 space-y-4">
        <h3 className="font-sans font-bold text-stone-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-stone-400" /> Setup Instructions
        </h3>
        <div className="text-sm text-stone-600 space-y-4">
          <p>To enable calendar synchronization, you need to configure OAuth credentials in your AI Studio project settings:</p>
          <ol className="list-decimal ml-6 space-y-2">
            <li>
              <strong>Google Calendar:</strong> Create a project in the <a href="https://console.cloud.google.com/" target="_blank" className="text-stone-900 underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a>, enable the Calendar API, and create OAuth 2.0 credentials.
            </li>
            <li>
              <strong>Outlook Calendar:</strong> Register an application in the <a href="https://portal.azure.com/" target="_blank" className="text-stone-900 underline inline-flex items-center gap-1">Azure Portal <ExternalLink className="w-3 h-3" /></a> under "App registrations" and create a client secret.
            </li>
            <li>
              Add the following <strong>Redirect URIs</strong> to your provider settings:
              <div className="mt-2 p-3 bg-white rounded-lg border border-black/5 font-mono text-xs break-all">
                {window.location.origin}/api/auth/google/callback<br />
                {window.location.origin}/api/auth/microsoft/callback
              </div>
            </li>
            <li>
              Set the <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, <code>MICROSOFT_CLIENT_ID</code>, and <code>MICROSOFT_CLIENT_SECRET</code> environment variables in AI Studio.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

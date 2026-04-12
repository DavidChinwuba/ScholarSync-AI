import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, signInWithPopup, googleProvider, signOut, db, doc, getDoc, setDoc, onSnapshot, increment } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Homework } from './pages/Homework';
import { Flashcards } from './pages/Flashcards';
import { Quizzes } from './pages/Quizzes';
import { StudyGroups } from './pages/StudyGroups';
import { StudySchedules } from './pages/StudySchedules';
import { Integrations } from './pages/Integrations';
import { Auth } from './components/Auth';
import { User } from 'firebase/auth';

export interface UserData {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isPremium?: boolean;
  stats: {
    flashcardsStudied: number;
    quizzesCompleted: number;
    homeworkQuestionsAsked: number;
    studyTimeMinutes: number;
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Increment revenue on cellular connection
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn && (conn.type === 'cellular' || conn.effectiveType === '4g' || conn.effectiveType === '3g')) {
          const revenueRef = doc(db, 'revenue', 'global_stats');
          try {
            await setDoc(revenueRef, {
              totalImpressions: increment(1),
              estimatedRevenue: increment(0.01), // Example: $0.01 per cellular session
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          } catch (error) {
            console.error('Error updating revenue:', error);
          }
        }

        // Ensure user exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          const initialData = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isPremium: false,
            stats: {
              flashcardsStudied: 0,
              quizzesCompleted: 0,
              homeworkQuestionsAsked: 0,
              studyTimeMinutes: 0
            },
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, initialData);
          setUserData(initialData as UserData);
        }

        // Listen for real-time updates to user data (like premium status)
        const unsubDoc = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          }
        });

        setUser(firebaseUser);
        setLoading(false);
        return () => unsubDoc();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentPage('home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400 font-sans">Loading ScholarSync AI...</div>
      </div>
    );
  }

  if (!user || !userData) {
    return <Auth />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home user={user} userData={userData} onNavigate={setCurrentPage} />;
      case 'homework': return <Homework user={user} userData={userData} />;
      case 'flashcards': return <Flashcards user={user} userData={userData} />;
      case 'quizzes': return <Quizzes user={user} userData={userData} />;
      case 'groups': return <StudyGroups user={user} userData={userData} />;
      case 'schedules': return <StudySchedules user={user} userData={userData} />;
      case 'integrations': return <Integrations user={user} userData={userData} />;
      default: return <Home user={user} userData={userData} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout user={user} userData={userData} onLogout={handleLogout} currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
    </ErrorBoundary>
  );
}

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { generateStudySchedule } from '../services/gemini';
import { db, collection, addDoc, query, where, onSnapshot, doc, updateDoc, increment } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, Search, Loader2, ChevronRight, CheckCircle2, XCircle, Clock, CalendarDays, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserData } from '../App';

interface StudyEvent {
  title: string;
  start: string;
  end: string;
  description: string;
}

interface StudySchedule {
  id: string;
  topic: string;
  events: StudyEvent[];
  createdAt: string;
}

export function StudySchedules({ user, userData }: { user: User, userData: UserData }) {
  const [schedules, setSchedules] = useState<StudySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [examDate, setExamDate] = useState('');
  const [activeSchedule, setActiveSchedule] = useState<StudySchedule | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'studySchedules'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySchedule));
      setSchedules(newSchedules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'userTokens', user.uid), (doc) => {
      if (doc.exists()) {
        setTokens(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !examDate || loading) return;

    setLoading(true);
    try {
      const events = await generateStudySchedule(topic, examDate, userData.isPremium);
      await addDoc(collection(db, 'studySchedules'), {
        userId: user.uid,
        topic,
        events,
        createdAt: new Date().toISOString()
      });
      setTopic('');
      setExamDate('');
    } catch (error) {
      console.error('Generate schedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncToCalendar = async (provider: 'google' | 'microsoft', event: StudyEvent) => {
    if (!tokens?.[provider]) {
      alert(`Please connect your ${provider === 'google' ? 'Google' : 'Outlook'} Calendar in the Integrations tab first.`);
      return;
    }

    setSyncing(event.title);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          provider,
          event
        })
      });
      
      if (response.ok) {
        alert(`Successfully synced "${event.title}" to your ${provider === 'google' ? 'Google' : 'Outlook'} Calendar!`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync event. Please try again or reconnect your calendar.');
    } finally {
      setSyncing(null);
    }
  };

  if (activeSchedule) {
    return (
      <div className="space-y-8">
        <header className="flex items-center justify-between">
          <button onClick={() => setActiveSchedule(null)} className="text-stone-500 hover:text-stone-900 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 rotate-180" /> Back to Schedules
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-sans font-bold text-stone-900">{activeSchedule.topic} Plan</h2>
            {userData.isPremium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
                Premium
              </span>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {activeSchedule.events.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-sans font-bold text-stone-900">{event.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.start).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(event.end).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => syncToCalendar('google', event)}
                    disabled={syncing === event.title}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    title="Sync to Google Calendar"
                  >
                    {syncing === event.title ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => syncToCalendar('microsoft', event)}
                    disabled={syncing === event.title}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    title="Sync to Outlook Calendar"
                  >
                    {syncing === event.title ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{event.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-sans font-bold text-stone-900 tracking-tight">Study Schedules</h1>
            {userData.isPremium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
                Premium
              </span>
            )}
          </div>
          <p className="text-stone-500">
            {userData.isPremium 
              ? "Generate 10 detailed study sessions with learning objectives and resources." 
              : "Generate 5 study sessions. Upgrade for more detailed plans!"}
          </p>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
        <h2 className="text-lg font-sans font-bold text-stone-900">Generate New Schedule</h2>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Organic Chemistry"
              className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div className="md:col-span-1 space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={loading || !topic.trim() || !examDate}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Generate Plan
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((schedule) => (
          <motion.div
            key={schedule.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition-colors">
                <CalendarDays className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-stone-400">{schedule.events.length} sessions</span>
            </div>
            <h3 className="text-lg font-sans font-bold text-stone-900 mb-2 truncate">{schedule.topic}</h3>
            <p className="text-sm text-stone-500 mb-6 line-clamp-2">AI-generated study plan for your exam.</p>
            <button
              onClick={() => setActiveSchedule(schedule)}
              className="w-full bg-stone-50 text-stone-900 py-3 rounded-xl font-bold hover:bg-stone-900 hover:text-white transition-all"
            >
              View Schedule
            </button>
          </motion.div>
        ))}
        {schedules.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50">
            <CalendarDays className="w-12 h-12 mx-auto text-stone-300" />
            <p className="text-stone-500">No study schedules yet. Generate one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

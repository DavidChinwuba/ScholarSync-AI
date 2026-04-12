import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, doc, onSnapshot, collection, query, where, limit, orderBy, setDoc } from '../firebase';
import { motion } from 'motion/react';
import { Brain, BookOpen, MessageSquare, Users, TrendingUp, Clock, Star, CalendarDays, ChevronRight, Settings, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { cn } from '../lib/utils';
import { UserData } from '../App';

interface HomeProps {
  user: User;
  userData: UserData;
  onNavigate: (page: string) => void;
}

export function Home({ user, userData, onNavigate }: HomeProps) {
  const [stats, setStats] = useState(userData.stats);
  const [recentSchedules, setRecentSchedules] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const isAdmin = user.email === 'nkchuba@gmail.com';

  useEffect(() => {
    setStats(userData.stats);
  }, [userData.stats]);

  useEffect(() => {
    if (isAdmin) {
      const unsub = onSnapshot(doc(db, 'revenue', 'global_stats'), (doc) => {
        if (doc.exists()) {
          setRevenue(doc.data());
        }
      });
      return () => unsub();
    }
  }, [isAdmin]);

  useEffect(() => {
    const q = query(
      collection(db, 'studySchedules'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const statCards = [
    { label: 'Flashcards Studied', value: stats.flashcardsStudied, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Quizzes Completed', value: stats.quizzesCompleted, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'AI Help Sessions', value: stats.homeworkQuestionsAsked, icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Study Time (min)', value: stats.studyTimeMinutes, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const handleUpgrade = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), { isPremium: true }, { merge: true });
    } catch (error) {
      console.error('Upgrade error:', error);
    }
  };

  const chartData = [
    { name: 'Flashcards', value: stats.flashcardsStudied, color: '#2563eb' },
    { name: 'Quizzes', value: stats.quizzesCompleted, color: '#d97706' },
    { name: 'AI Help', value: stats.homeworkQuestionsAsked, color: '#059669' },
    { name: 'Study (min)', value: stats.studyTimeMinutes, color: '#7c3aed' },
  ];

  const radarData = [
    { subject: 'Flashcards', A: stats.flashcardsStudied, fullMark: Math.max(stats.flashcardsStudied, 20) },
    { subject: 'Quizzes', A: stats.quizzesCompleted, fullMark: Math.max(stats.quizzesCompleted, 10) },
    { subject: 'AI Help', A: stats.homeworkQuestionsAsked, fullMark: Math.max(stats.homeworkQuestionsAsked, 15) },
    { subject: 'Study Time', A: stats.studyTimeMinutes, fullMark: Math.max(stats.studyTimeMinutes, 60) },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-sans font-bold text-stone-900 tracking-tight">
              Welcome back, {user.displayName?.split(' ')[0]}!
            </h1>
            {userData.isPremium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
                Premium
              </span>
            )}
          </div>
          <p className="text-stone-500">Ready to crush your study goals today?</p>
        </div>
        {!userData.isPremium && (
          <button 
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
          >
            <Star className="w-4 h-4 fill-current" />
            Upgrade to Premium
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <TrendingUp className="w-4 h-4 text-stone-300" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-sans font-bold text-stone-900">{stat.value}</p>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-sans font-bold text-stone-900">Progress Overview</h2>
            <p className="text-xs text-stone-500">Your academic activity at a glance</p>
          </div>
          <BarChartIcon className="w-5 h-5 text-stone-300" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[300px]">
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#78716c', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="h-full hidden lg:block">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} hide />
                <Radar
                  name="Activity"
                  dataKey="A"
                  stroke="#1c1917"
                  fill="#1c1917"
                  fillOpacity={0.1}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
            <h2 className="text-lg font-sans font-bold text-stone-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onNavigate('homework')}
                className="p-4 rounded-xl border border-black/5 hover:bg-stone-50 transition-colors text-left space-y-2 group"
              >
                <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="text-white w-5 h-5" />
                </div>
                <p className="font-medium text-stone-900">Ask AI</p>
                <p className="text-xs text-stone-500">Get homework help</p>
              </button>
              <button 
                onClick={() => onNavigate('schedules')}
                className="p-4 rounded-xl border border-black/5 hover:bg-stone-50 transition-colors text-left space-y-2 group"
              >
                <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarDays className="text-white w-5 h-5" />
                </div>
                <p className="font-medium text-stone-900">Study Plan</p>
                <p className="text-xs text-stone-500">Generate schedule</p>
              </button>
              <button 
                onClick={() => onNavigate('flashcards')}
                className="p-4 rounded-xl border border-black/5 hover:bg-stone-50 transition-colors text-left space-y-2 group"
              >
                <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="text-white w-5 h-5" />
                </div>
                <p className="font-medium text-stone-900">Flashcards</p>
                <p className="text-xs text-stone-500">Study your sets</p>
              </button>
              <button 
                onClick={() => onNavigate('integrations')}
                className="p-4 rounded-xl border border-black/5 hover:bg-stone-50 transition-colors text-left space-y-2 group"
              >
                <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="text-white w-5 h-5" />
                </div>
                <p className="font-medium text-stone-900">Integrations</p>
                <p className="text-xs text-stone-500">Connect calendars</p>
              </button>
            </div>
          </div>

          <div className="bg-stone-900 p-6 rounded-2xl shadow-xl text-white space-y-4 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h2 className="text-lg font-sans font-bold">Study Tip of the Day</h2>
              <p className="text-stone-300 leading-relaxed">
                "The Pomodoro Technique: Study for 25 minutes, then take a 5-minute break. It keeps your brain fresh and focused!"
              </p>
              <div className="pt-4">
                <button className="bg-white text-stone-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-100 transition-colors">
                  Learn More
                </button>
              </div>
            </div>
            <Brain className="absolute -bottom-8 -right-8 w-48 h-48 text-white/5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-sans font-bold text-stone-900">Recent Schedules</h2>
            <button 
              onClick={() => onNavigate('schedules')}
              className="text-xs font-bold text-stone-400 hover:text-stone-900 uppercase tracking-widest flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {recentSchedules.map((schedule, i) => (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onNavigate('schedules')}
                className="p-4 rounded-xl bg-stone-50 border border-black/5 hover:border-stone-900 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-stone-900 group-hover:text-stone-900">{schedule.topic}</p>
                    <p className="text-xs text-stone-500">{schedule.events.length} sessions generated</p>
                  </div>
                  <CalendarDays className="w-5 h-5 text-stone-300 group-hover:text-stone-900 transition-colors" />
                </div>
              </motion.div>
            ))}
            {recentSchedules.length === 0 && (
              <div className="py-10 text-center space-y-2 opacity-50">
                <CalendarDays className="w-10 h-10 mx-auto text-stone-300" />
                <p className="text-sm text-stone-500">No schedules yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && revenue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-stone-900 text-white p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-sans font-bold tracking-tight">Revenue Dashboard</h2>
                <p className="text-stone-400 text-sm">Real-time monetization tracking (Admin Only)</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="space-y-2">
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Total Impressions</p>
                <p className="text-4xl font-mono font-bold">{revenue.totalImpressions?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Estimated Revenue</p>
                <p className="text-4xl font-mono font-bold text-emerald-400">
                  ${(revenue.estimatedRevenue || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-stone-500">
              <p>Last updated: {new Date(revenue.lastUpdated).toLocaleString()}</p>
              <p className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live Tracking Active
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        </motion.div>
      )}
    </div>
  );
}

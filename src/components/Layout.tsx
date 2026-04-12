import React from 'react';
import { motion } from 'motion/react';
import { Home, BookOpen, Brain, MessageSquare, Users, LogOut, Menu, X, CalendarDays, Settings } from 'lucide-react';
import { User } from 'firebase/auth';
import { cn } from '../lib/utils';
import { UserData } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  userData: UserData | null;
  onLogout: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function Layout({ children, user, userData, onLogout, currentPage, onPageChange }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'homework', label: 'Homework Help', icon: MessageSquare },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'quizzes', label: 'Quizzes', icon: Brain },
    { id: 'schedules', label: 'Study Schedules', icon: CalendarDays },
    { id: 'groups', label: 'Study Groups', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-black/5 p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/20 rotate-3">
            <Brain className="text-white w-6 h-6 -rotate-3" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-stone-900 tracking-tight leading-none">ScholarSync</span>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">AI Tutor</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                currentPage === item.id
                  ? "bg-stone-900 text-white shadow-md"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-black/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-black/5" alt="User" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-stone-900 truncate">{user.displayName}</p>
                {userData?.isPremium && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wider">Pro</span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          
          <div className="pt-4 px-2">
            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">
              Powered by <span className="text-stone-900">DC-Tech</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-black/5 p-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <Brain className="text-white w-5 h-5" />
          </div>
          <span className="font-sans font-bold text-stone-900">ScholarSync AI</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-stone-500">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isSidebarOpen ? 0 : '-100%' }}
        className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 p-6 flex flex-col space-y-8 shadow-2xl"
      >
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/20 rotate-3">
            <Brain className="text-white w-6 h-6 -rotate-3" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-stone-900 tracking-tight leading-none">ScholarSync</span>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">AI Tutor</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onPageChange(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                currentPage === item.id
                  ? "bg-stone-900 text-white shadow-md"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-black/5 space-y-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          
          <div className="pt-4 px-2">
            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">
              Powered by <span className="text-stone-900">DC-Tech</span>
            </p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-5xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { db, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, limit } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, MessageSquare, Send, X, LogOut, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserData } from '../App';

export function StudyGroups({ user, userData }: { user: User, userData: UserData }) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTopic, setNewGroupTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'studyGroups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyGroup)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeGroup) {
      // Listen for messages in the active group's subcollection
      const messagesRef = collection(db, 'studyGroups', activeGroup.id, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => doc.data() as Message));
      });

      return () => {
        unsubscribe();
        setMessages([]);
      };
    }
  }, [activeGroup]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupTopic.trim() || loading) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'studyGroups'), {
        name: newGroupName,
        topic: newGroupTopic,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: new Date().toISOString()
      });
      setShowCreate(false);
      setNewGroupName('');
      setNewGroupTopic('');
    } catch (error) {
      console.error('Create group error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeGroup) return;

    const message: Message = {
      user: user.displayName || 'Anonymous',
      text: input,
      timestamp: Date.now(),
      uid: user.uid
    };

    try {
      const messagesRef = collection(db, 'studyGroups', activeGroup.id, 'messages');
      await addDoc(messagesRef, message);
      setInput('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  if (activeGroup) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <header className="p-4 border-b border-black/5 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Users className="text-white w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-stone-900">{activeGroup.name}</h2>
                {userData.isPremium && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold uppercase tracking-wider rounded border border-amber-200">
                    Pro
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">{activeGroup.topic}</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveGroup(null)}
            className="p-2 text-stone-400 hover:text-red-500 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            Leave Room <LogOut className="w-4 h-4" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex flex-col",
                msg.user === user.displayName ? "items-end" : "items-start"
              )}
            >
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-2">
                {msg.user}
              </span>
              <div className={cn(
                "p-3 rounded-2xl text-sm max-w-[80%]",
                msg.user === user.displayName 
                  ? "bg-stone-900 text-white rounded-tr-none" 
                  : "bg-stone-100 text-stone-900 rounded-tl-none"
              )}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-stone-50 border-t border-black/5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-stone-900 text-white p-3 rounded-xl hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-sans font-bold text-stone-900 tracking-tight">Study Groups</h1>
            {userData.isPremium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
                Premium
              </span>
            )}
          </div>
          <p className="text-stone-500">Join real-time collaborative study rooms.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-stone-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-stone-200" />
                ))}
              </div>
            </div>
            <h3 className="text-lg font-sans font-bold text-stone-900 mb-1 truncate">{group.name}</h3>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">{group.topic}</p>
            <button
              onClick={() => setActiveGroup(group)}
              className="w-full bg-stone-50 text-stone-900 py-3 rounded-xl font-bold hover:bg-stone-900 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              Join Room <MessageSquare className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-sans font-bold text-stone-900">Create Group</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 text-stone-400 hover:text-stone-900">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Group Name</label>
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Late Night Bio Study"
                    className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Topic</label>
                  <input
                    value={newGroupTopic}
                    onChange={(e) => setNewGroupTopic(e.target.value)}
                    placeholder="e.g. Biology"
                    className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newGroupName.trim() || !newGroupTopic.trim()}
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Room'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StudyGroup {
  id: string;
  name: string;
  topic: string;
  createdBy: string;
  members: string[];
  createdAt: string;
}

interface Message {
  user: string;
  text: string;
  timestamp: number;
  uid: string;
}

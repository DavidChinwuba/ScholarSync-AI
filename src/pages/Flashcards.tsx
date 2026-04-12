import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { generateFlashcards } from '../services/gemini';
import { db, collection, addDoc, query, where, onSnapshot, doc, updateDoc, increment } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, BookOpen, ChevronLeft, ChevronRight, RotateCcw, Loader2, Trash2 } from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  cards: Flashcard[];
  createdAt: string;
}

import { UserData } from '../App';

export function Flashcards({ user, userData }: { user: User, userData: UserData }) {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'flashcardSets'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newSets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlashcardSet));
      setSets(newSets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    try {
      const cards = await generateFlashcards(topic, userData.isPremium);
      await addDoc(collection(db, 'flashcardSets'), {
        userId: user.uid,
        title: topic,
        topic,
        cards,
        createdAt: new Date().toISOString()
      });
      setTopic('');
    } catch (error) {
      console.error('Generate flashcards error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStudy = (set: FlashcardSet) => {
    setActiveSet(set);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const nextCard = async () => {
    if (!activeSet) return;
    if (currentCardIndex < activeSet.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      
      // Update stats
      await updateDoc(doc(db, 'users', user.uid), {
        'stats.flashcardsStudied': increment(1)
      });
    } else {
      setActiveSet(null);
    }
  };

  if (activeSet) {
    const card = activeSet.cards[currentCardIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <button onClick={() => setActiveSet(null)} className="text-stone-500 hover:text-stone-900 flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" /> Back to Sets
          </button>
          <div className="text-sm font-medium text-stone-500">
            Card {currentCardIndex + 1} of {activeSet.cards.length}
          </div>
        </header>

        <div className="perspective-1000 h-96 w-full cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
            className="relative w-full h-full preserve-3d"
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-3xl border-2 border-stone-900 shadow-xl flex items-center justify-center p-12 text-center">
              <h3 className="text-2xl font-sans font-bold text-stone-900">{card.front}</h3>
              <div className="absolute bottom-6 text-stone-400 text-xs uppercase tracking-widest">Click to flip</div>
            </div>
            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-stone-900 rounded-3xl shadow-xl flex items-center justify-center p-12 text-center rotate-y-180">
              <p className="text-xl text-white leading-relaxed">{card.back}</p>
              <div className="absolute bottom-6 text-stone-400 text-xs uppercase tracking-widest">Click to flip</div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={nextCard}
            className="bg-stone-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2"
          >
            {currentCardIndex === activeSet.cards.length - 1 ? 'Finish Set' : 'Next Card'} <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-sans font-bold text-stone-900 tracking-tight">Flashcards</h1>
            {userData.isPremium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
                Premium
              </span>
            )}
          </div>
          <p className="text-stone-500">
            {userData.isPremium 
              ? "Generate up to 20 detailed cards with AI." 
              : "Generate 10 cards with AI. Upgrade for more!"}
          </p>
        </div>
        <form onSubmit={handleGenerate} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (e.g. Photosynthesis)"
              className="pl-10 pr-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 w-64"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="bg-stone-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sets.map((set) => (
          <motion.div
            key={set.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-stone-400">{set.cards.length} cards</span>
            </div>
            <h3 className="text-lg font-sans font-bold text-stone-900 mb-2 truncate">{set.title}</h3>
            <p className="text-sm text-stone-500 mb-6 line-clamp-2">AI-generated cards based on your topic.</p>
            <button
              onClick={() => startStudy(set)}
              className="w-full bg-stone-50 text-stone-900 py-3 rounded-xl font-bold hover:bg-stone-900 hover:text-white transition-all"
            >
              Study Now
            </button>
          </motion.div>
        ))}
        {sets.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50">
            <BookOpen className="w-12 h-12 mx-auto text-stone-300" />
            <p className="text-stone-500">No flashcard sets yet. Generate one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { generateQuiz } from '../services/gemini';
import { db, collection, addDoc, query, where, onSnapshot, doc, updateDoc, increment } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Plus, Search, Loader2, ChevronRight, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserData } from '../App';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
}

export function Quizzes({ user, userData }: { user: User, userData: UserData }) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'quizzes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      setQuizzes(newQuizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    try {
      const questions = await generateQuiz(topic, userData.isPremium);
      await addDoc(collection(db, 'quizzes'), {
        userId: user.uid,
        title: topic,
        questions,
        createdAt: new Date().toISOString()
      });
      setTopic('');
    } catch (error) {
      console.error('Generate quiz error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    if (answer === activeQuiz!.questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < activeQuiz!.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setShowResult(true);
      // Update stats
      await updateDoc(doc(db, 'users', user.uid), {
        'stats.quizzesCompleted': increment(1)
      });
    }
  };

  if (activeQuiz) {
    if (showResult) {
      return (
        <div className="max-w-md mx-auto text-center space-y-8 py-12">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto"
          >
            <Trophy className="w-12 h-12 text-amber-600" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-sans font-bold text-stone-900">Quiz Complete!</h2>
            <p className="text-stone-500">You scored {score} out of {activeQuiz.questions.length}</p>
          </div>
          <div className="bg-stone-900 p-6 rounded-2xl text-white">
            <p className="text-sm font-medium opacity-70 mb-1">Accuracy</p>
            <p className="text-4xl font-sans font-bold">{Math.round((score / activeQuiz.questions.length) * 100)}%</p>
          </div>
          <button
            onClick={() => setActiveQuiz(null)}
            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
          >
            Back to Quizzes
          </button>
        </div>
      );
    }

    const q = activeQuiz.questions[currentQuestionIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="text-sm font-medium text-stone-500">
            Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
          </div>
          <div className="h-2 flex-1 mx-8 bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
              className="h-full bg-stone-900"
            />
          </div>
        </header>

        <div className="space-y-6">
          <h3 className="text-2xl font-sans font-bold text-stone-900 leading-tight">{q.question}</h3>
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((option) => {
              const isCorrect = option === q.correctAnswer;
              const isSelected = option === selectedAnswer;
              
              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selectedAnswer}
                  className={cn(
                    "p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between group",
                    !selectedAnswer && "border-black/5 hover:border-stone-900 hover:bg-stone-50",
                    selectedAnswer && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-900",
                    selectedAnswer && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-900",
                    selectedAnswer && !isSelected && !isCorrect && "border-black/5 opacity-50"
                  )}
                >
                  <span className="font-medium">{option}</span>
                  {selectedAnswer && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {selectedAnswer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {selectedAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-4 bg-stone-50 rounded-2xl border border-black/5">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Explanation</p>
                <p className="text-sm text-stone-600 leading-relaxed">{q.explanation}</p>
              </div>
              <button
                onClick={nextQuestion}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
              >
                {currentQuestionIndex === activeQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-sans font-bold text-stone-900 tracking-tight">Quizzes</h1>
            {userData.isPremium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-200">
                Premium
              </span>
            )}
          </div>
          <p className="text-stone-500">
            {userData.isPremium 
              ? "Generate 10-question advanced quizzes with detailed explanations." 
              : "Generate 5-question quizzes. Upgrade for advanced topics!"}
          </p>
        </div>
        <form onSubmit={handleGenerate} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (e.g. Calculus)"
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
        {quizzes.map((quiz) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition-colors">
                <Brain className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-stone-400">{quiz.questions.length} questions</span>
            </div>
            <h3 className="text-lg font-sans font-bold text-stone-900 mb-2 truncate">{quiz.title}</h3>
            <p className="text-sm text-stone-500 mb-6 line-clamp-2">Challenge yourself with this AI quiz.</p>
            <button
              onClick={() => startQuiz(quiz)}
              className="w-full bg-stone-50 text-stone-900 py-3 rounded-xl font-bold hover:bg-stone-900 hover:text-white transition-all"
            >
              Start Quiz
            </button>
          </motion.div>
        ))}
        {quizzes.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50">
            <Brain className="w-12 h-12 mx-auto text-stone-300" />
            <p className="text-stone-500">No quizzes yet. Generate one to test your skills!</p>
          </div>
        )}
      </div>
    </div>
  );
}

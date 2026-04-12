import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { explainHomeworkStream } from '../services/gemini';
import { GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Send, Image as ImageIcon, Loader2, User as UserIcon, Bot, Trash2, MessageSquare, X, Search, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db, doc, updateDoc, increment, getDoc, setDoc, onSnapshot } from '../firebase';
import { cn } from '../lib/utils';
import { UserData } from '../App';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp?: string;
}

const highlightText = (children: any, query: string): any => {
  if (!query) return children;
  
  if (typeof children === 'string') {
    const parts = children.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-stone-900 rounded-sm px-0.5">{part}</mark>
          ) : part
        )}
      </>
    );
  }

  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <React.Fragment key={i}>
        {highlightText(child, query)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      children: highlightText((children as React.ReactElement<any>).props.children, query)
    });
  }

  return children;
};

export function Homework({ user, userData }: { user: User, userData: UserData }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const chatRef = doc(db, 'homeworkChats', user.uid);
    const unsubscribe = onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMessages(data.messages || []);
      }
      setHistoryLoading(false);
    }, (error) => {
      console.error('Error loading chat history:', error);
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const filteredMessages = messages.filter(msg => 
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRecording = () => {
    if (isRecording) {
      // The browser will handle stopping and triggering onend
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Speech recognition start error:', error);
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveChatHistory = async (newMessages: Message[]) => {
    try {
      const chatRef = doc(db, 'homeworkChats', user.uid);
      await setDoc(chatRef, {
        userId: user.uid,
        messages: newMessages,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const streamResponse = await explainHomeworkStream(input, messages, userData.isPremium, userMessage.image);
      
      const aiMessage: Message = { 
        role: 'assistant', 
        content: '',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      let fullContent = '';

      for await (const chunk of streamResponse) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
          fullContent += text;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...aiMessage,
              content: fullContent
            };
            return newMessages;
          });
        }
      }
      
      // Save to Firestore after stream completes
      const finalMessages = [...updatedMessages, { ...aiMessage, content: fullContent }];
      await saveChatHistory(finalMessages);

      // Update stats
      await updateDoc(doc(db, 'users', user.uid), {
        'stats.homeworkQuestionsAsked': increment(1)
      });
    } catch (error) {
      console.error('Homework help error:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'An error occurred while getting help. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear your chat history?')) return;
    
    try {
      const chatRef = doc(db, 'homeworkChats', user.uid);
      await setDoc(chatRef, {
        userId: user.uid,
        messages: [],
        updatedAt: new Date().toISOString()
      });
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  useEffect(() => {
    if (scrollRef.current && !searchQuery) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, searchQuery]);

  if (historyLoading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center bg-white rounded-2xl border border-black/5 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <header className="p-4 border-b border-black/5 bg-stone-50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Bot className="text-white w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-stone-900">AI Tutor</h2>
                {userData.isPremium && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold uppercase tracking-wider rounded border border-amber-200">
                    Pro
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">Ask anything or upload a photo of your homework</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                isSearchOpen ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"
              )}
              title="Search History"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
            <button 
              onClick={handleClearChat}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in chat history..."
                  className="w-full bg-white border border-black/5 rounded-xl pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="flex items-center justify-between mt-3 px-1">
                  <p className="text-xs font-medium text-stone-900">
                    Search Results
                  </p>
                  <p className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                    {filteredMessages.length} {filteredMessages.length === 1 ? 'match' : 'matches'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <MessageSquare className="w-12 h-12 text-stone-300" />
            <p className="text-stone-500 max-w-xs">
              {searchQuery 
                ? `No messages found matching "${searchQuery}"`
                : "Start a conversation with your AI tutor. You can type questions or upload images of problems."}
            </p>
          </div>
        )}
        {filteredMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              msg.role === 'user' ? "bg-stone-200" : "bg-stone-900"
            )}>
              {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-stone-600" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={cn(
              "max-w-[80%] space-y-2",
              msg.role === 'user' ? "text-right" : "text-left"
            )}>
              {msg.image && (
                <img src={msg.image} className="max-w-xs rounded-xl border border-black/5 shadow-sm ml-auto" alt="Homework" />
              )}
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed markdown-body",
                msg.role === 'user' 
                  ? "bg-stone-900 text-white rounded-tr-none" 
                  : "bg-stone-100 text-stone-900 rounded-tl-none"
              )}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => {
                      if (!searchQuery) return <p>{children}</p>;
                      return <p>{highlightText(children, searchQuery)}</p>;
                    },
                    li: ({ children }) => {
                      if (!searchQuery) return <li>{children}</li>;
                      return <li>{highlightText(children, searchQuery)}</li>;
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
              {msg.timestamp && (
                <p className="text-[10px] text-stone-400 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </motion.div>
        ))}
        {loading && !searchQuery && (
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-stone-100 p-4 rounded-2xl rounded-tl-none">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          </div>
        )}
      </div>

      {!searchQuery && (
        <form onSubmit={handleSubmit} className="p-4 bg-stone-50 border-t border-black/5 space-y-4">
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative inline-block"
              >
                <img src={selectedImage} className="h-20 w-20 object-cover rounded-lg border-2 border-stone-900" alt="Selected" />
                <button 
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-white border border-black/5 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors"
              title="Upload Image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              className={cn(
                "p-3 border rounded-xl transition-all flex items-center justify-center",
                isRecording 
                  ? "bg-red-500 border-red-500 text-white animate-pulse" 
                  : "bg-white border-black/5 text-stone-500 hover:bg-stone-100"
              )}
              title={isRecording ? "Stop Recording" : "Voice to Text"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-white border border-black/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage)}
              className="bg-stone-900 text-white p-3 rounded-xl hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}
      {searchQuery && (
        <div className="p-4 bg-stone-100 border-t border-black/5 text-center">
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-stone-500 hover:text-stone-900 uppercase tracking-widest"
          >
            Clear Search to Continue Chatting
          </button>
        </div>
      )}
    </div>
  );
}

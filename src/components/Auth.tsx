import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  githubProvider,
  microsoftProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from '../firebase';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Brain, Github, Monitor } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSocialLogin = async (provider: any) => {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different login method. Please try your original login method.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center shadow-xl shadow-stone-900/20 rotate-3">
              <Brain className="text-white w-10 h-10 -rotate-3" />
            </div>
            <h1 className="text-5xl font-sans font-bold tracking-tighter text-stone-900 italic">ScholarSync AI</h1>
          </div>
          <div className="space-y-1">
            <p className="text-stone-500">Your intelligent academic companion.</p>
            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.3em]">
              Powered by <span className="text-stone-900">DC-Tech</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl space-y-6">
          <div className="flex p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                isLogin ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                !isLogin ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {resetSent && (
              <div className="text-emerald-600 text-xs bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                Password reset email sent! Please check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Login' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                Forgot your password?
              </button>
            )}
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin(googleProvider)}
              className="flex flex-col items-center justify-center gap-1 bg-white border border-black/5 text-stone-900 py-3 rounded-xl font-medium hover:bg-stone-50 transition-all group"
              title="Google"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
              <span className="text-[10px] uppercase tracking-wider">Google</span>
            </button>
            <button
              onClick={() => handleSocialLogin(githubProvider)}
              className="flex flex-col items-center justify-center gap-1 bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-all group"
              title="GitHub"
            >
              <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase tracking-wider">GitHub</span>
            </button>
            <button
              onClick={() => handleSocialLogin(microsoftProvider)}
              className="flex flex-col items-center justify-center gap-1 bg-stone-100 border border-black/5 text-stone-900 py-3 rounded-xl font-medium hover:bg-stone-200 transition-all group"
              title="Microsoft"
            >
              <Monitor className="w-5 h-5 group-hover:scale-110 transition-transform text-blue-600" />
              <span className="text-[10px] uppercase tracking-wider">Microsoft</span>
            </button>
          </div>
          
          <p className="text-[10px] text-center text-stone-400 mt-4 leading-relaxed">
            By continuing, you agree to our Terms of Service. <br />
            Works with any email address.
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      if (isSignup) {
        setError(err.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 flex flex-col w-full relative overflow-x-hidden p-4 items-center justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-10 flex flex-col">
        <div className="flex items-center justify-center mb-4">
          <div className="text-primary flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <span className="material-symbols-outlined text-4xl">auto_awesome</span>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-[28px] font-bold leading-tight pb-2">{isSignup ? "Create Account" : "Welcome Back"}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-base">
            {isSignup ? "Join us to start building your professional career path with AI" : "Log in to continue building your professional career path with AI"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col w-full">
            <p className="text-sm font-semibold pb-2">Email Address</p>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div className="flex flex-col w-full">
            <div className="flex justify-between items-center pb-2">
              <p className="text-sm font-semibold">Password</p>
              {!isSignup && <button type="button" className="text-primary text-xs font-semibold hover:underline">Forgot password?</button>}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-12 focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Enter your password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (isSignup ? "Creating account..." : "Logging in...") : (isSignup ? "Sign Up" : "Log In")}
          </button>
        </form>

        <div className="relative flex items-center py-6">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-sm font-medium uppercase tracking-widest">OR</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold h-14 rounded-xl transition-colors flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          <span>{isSignup ? "Sign up with Google" : "Continue with Google"}</span>
        </button>

        <div className="mt-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {isSignup ? "Already have an account?" : "Don't have an account?"} 
            <button 
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-primary font-bold hover:underline ml-1"
            >
              {isSignup ? "Log in" : "Sign up for free"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

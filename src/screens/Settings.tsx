import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../App';
import { User, Shield, HelpCircle, LogOut, ChevronRight, Moon, Star, ExternalLink, X, Check, Sparkles, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { FullScreenLoader } from '../components/Loader';

const Settings: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleUpgrade = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: true
      });
      setShowSubscriptionModal(false);
      setToast({ message: "Congratulations! You are now a Premium member.", type: 'success' });
    } catch (error) {
      console.error("Error upgrading:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 pb-24 w-full max-w-3xl mx-auto">
      {isUpdating && <FullScreenLoader message="Processing..." />}
      <header className="pt-4 pb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <div className="space-y-8">
        <section>
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest mb-3 ml-1">Account</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
            >
              <div className="bg-primary/10 rounded-full p-2 text-primary">
                <User size={20} />
              </div>
              <div className="flex flex-col items-start flex-1">
                <p className="text-base font-semibold">Profile</p>
                <p className="text-slate-500 text-xs">{user?.email}</p>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </button>

            <button 
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
            >
              <div className="bg-primary/10 rounded-full p-2 text-primary">
                <Star size={20} />
              </div>
              <div className="flex flex-col items-start flex-1">
                <p className="text-base font-semibold">Subscription</p>
                <p className="text-slate-500 text-xs">{profile?.isPremium ? "Premium Active" : "Free Plan"}</p>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </button>

            <div className="w-full flex items-center gap-4 p-4">
              <div className="bg-primary/10 rounded-full p-2 text-primary">
                <Moon size={20} />
              </div>
              <div className="flex flex-col items-start flex-1">
                <p className="text-base font-semibold">Dark Mode</p>
                <p className="text-slate-500 text-xs">Adjust app appearance</p>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 size-4 bg-white rounded-full transition-all duration-300 ${isDarkMode ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-primary text-xs font-bold uppercase tracking-widest mb-3 ml-1">Legal & App</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
            <a 
              href="https://www.google.com/search?q=privacy+policy+template" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800"
            >
              <div className="bg-primary/10 rounded-full p-2 text-primary">
                <Shield size={20} />
              </div>
              <div className="flex flex-col items-start flex-1">
                <p className="text-base font-semibold">Privacy Policy</p>
              </div>
              <ExternalLink size={18} className="text-slate-300" />
            </a>

            <button 
              onClick={() => window.location.href = 'mailto:support@resumebuilder.ai'}
              className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="bg-primary/10 rounded-full p-2 text-primary">
                <HelpCircle size={20} />
              </div>
              <div className="flex flex-col items-start flex-1">
                <p className="text-base font-semibold">Help & Support</p>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </button>
          </div>
        </section>

        {profile?.role === 'admin' && (
          <section>
            <h3 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">Admin Management</h3>
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-amber-500/20 shadow-sm">
              <button className="w-full flex items-center gap-4 p-4 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                <div className="bg-amber-500/10 rounded-full p-2 text-amber-500">
                  <SettingsIcon size={20} />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <p className="text-base font-semibold">Manage User Plans</p>
                  <p className="text-slate-500 text-xs">Admin only access</p>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
              </button>
            </div>
          </section>
        )}

        <section className="pt-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-red-500/20 text-red-500 font-bold hover:bg-red-500/5 transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
          <p className="text-center text-slate-400 text-xs mt-6">Version 1.0.0 (Build 1)</p>
        </section>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">User Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-primary/5">
                <User size={48} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{profile?.displayName || "User"}</p>
                <p className="text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Account ID</p>
                <p className="text-xs font-mono break-all">{user?.uid}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Member Since</p>
                <p className="text-xs">{profile?.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>

            <button 
              onClick={() => setShowProfileModal(false)}
              className="w-full h-12 rounded-xl bg-primary text-white font-bold mt-6"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Subscription</h3>
              <button onClick={() => setShowSubscriptionModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className={`p-6 rounded-3xl border-2 mb-6 ${profile?.isPremium ? 'border-emerald-500 bg-emerald-500/5' : 'border-primary bg-primary/5'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Current Plan</p>
                  <h4 className="text-2xl font-bold">{profile?.isPremium ? 'Premium' : 'Free'}</h4>
                </div>
                <div className={`p-2 rounded-full ${profile?.isPremium ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}>
                  {profile?.isPremium ? <Check size={20} /> : <Star size={20} />}
                </div>
              </div>

              {!profile?.isPremium && (
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">₹499</span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Billed monthly. Cancel anytime.</p>
                </div>
              )}
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="font-medium">Unlimited Resumes</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="font-medium">AI Content Generation</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="font-medium">Premium Templates</span>
                </li>
              </ul>

              {!profile?.isPremium && (
                <button 
                  onClick={handleUpgrade}
                  disabled={isUpdating}
                  className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Sparkles size={18} />
                  {isUpdating ? "Processing..." : "Upgrade for ₹499"}
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowSubscriptionModal(false)}
              className="w-full h-12 rounded-xl border-2 border-slate-100 dark:border-slate-800 font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} z-50`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Settings;

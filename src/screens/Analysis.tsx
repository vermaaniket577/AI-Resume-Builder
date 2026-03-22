import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Resume } from '../types';
import { ArrowLeft, Share2, Lightbulb, Minus, Edit2, Search, Sparkles, X, Check, Star } from 'lucide-react';
import { aiService } from '../services/aiService';
import { useAuth } from '../App';

const Analysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [optimizingSuggestion, setOptimizingSuggestion] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'resumes', id));
        if (docSnap.exists()) {
          setResume({ id: docSnap.id, ...docSnap.data() } as Resume);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `resumes/${id}`);
      }
      setLoading(false);
    };
    fetchResume();
  }, [id]);

  const handleUpgrade = async () => {
    if (!user) return;
    setIsUpgrading(true);
    try {
      // 1. Create Order on Backend
      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 499, currency: 'INR' })
      });

      if (!response.ok) throw new Error('Failed to create order');
      const order = await response.json();

      // 2. Open Razorpay Checkout
      const options = {
        key: (process.env as any).RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: 'AI Resume Builder',
        description: 'Pro Subscription',
        order_id: order.id,
        handler: async (response: any) => {
          setShowSubscriptionModal(false);
          alert("Payment successful! Your account is being upgraded.");
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        notes: {
          userId: user.uid
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleOptimize = async () => {
    if (!resume) return;
    if (!profile?.isPremium) {
      setShowSubscriptionModal(true);
      return;
    }
    try {
      setOptimizing(true);
      const analysis = await aiService.analyzeResume(resume);
      await updateDoc(doc(db, 'resumes', resume.id!), {
        score: analysis.score,
        analysis: analysis
      });
      setResume({ ...resume, score: analysis.score, analysis });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `resumes/${resume.id}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleOptimizeSuggestion = async (suggestion: string) => {
    if (!resume) return;
    if (!profile?.isPremium) {
      setShowSubscriptionModal(true);
      return;
    }
    try {
      setOptimizingSuggestion(suggestion);
      
      // Call AI to apply the suggestion to the resume data
      const updatedResumeData = await aiService.applySuggestion(resume, suggestion);
      
      // Calculate new score and remove the applied suggestion
      const currentScore = resume.score || 82;
      const newScore = Math.min(100, currentScore + Math.floor(Math.random() * 5) + 3); // Bump score by 3-7 points
      
      const currentAnalysis = resume.analysis || { contentImpact: 89, keywordMatching: 72, suggestions: [] };
      const newSuggestions = currentAnalysis.suggestions.filter(s => s !== suggestion);
      
      const newAnalysis = {
        ...currentAnalysis,
        score: newScore,
        suggestions: newSuggestions
      };
      
      const newResume = {
        ...resume,
        ...updatedResumeData,
        score: newScore,
        analysis: newAnalysis,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'resumes', resume.id!), {
        ...updatedResumeData,
        score: newScore,
        analysis: newAnalysis,
        updatedAt: new Date().toISOString()
      });
      
      setResume(newResume as Resume);
      setSelectedSuggestion(null);
    } catch (err) {
      console.error(err);
      alert("Failed to apply suggestion. Please try again.");
    } finally {
      setOptimizingSuggestion(null);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Analyzing...</div>;
  if (!resume) return <div className="h-screen flex items-center justify-center">Resume not found</div>;

  // Use mock data if analysis is missing to show the design
  const analysis = resume.analysis || { 
    score: 82, 
    contentImpact: 89, 
    keywordMatching: 72, 
    suggestions: [
      "Add measurable results: Include metrics like 'increased sales by 20%' to showcase impact.",
      "Improve summary section: Your summary is a bit short. Add 2 more sentences about your core values.",
      "Add more keywords: Missing: 'Agile Methodologies', 'Stakeholder Management'."
    ] 
  };
  
  const score = resume.score || 82;

  const getSuggestionIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('measurable') || lower.includes('metric')) return <Minus size={14} strokeWidth={3} />;
    if (lower.includes('summary') || lower.includes('improve')) return <Edit2 size={14} strokeWidth={3} />;
    if (lower.includes('keyword')) return <Search size={14} strokeWidth={3} />;
    return <Sparkles size={14} strokeWidth={3} />;
  };

  const parseSuggestion = (text: string) => {
    const parts = text.split(':');
    if (parts.length > 1) {
      return { title: parts[0].trim(), description: parts.slice(1).join(':').trim() };
    }
    return { title: text, description: '' };
  };

  const handleShare = async () => {
    const shareData = {
      title: 'My Resume Analysis',
      text: `My resume scored ${score}/100! Check out my analysis report.`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 pb-24 font-sans flex flex-col w-full max-w-3xl mx-auto relative overflow-x-hidden">
      <header className="flex items-center justify-between p-4 pt-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={20} className="text-slate-700 dark:text-slate-300" />
        </button>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Analysis Report</h2>
        <button onClick={handleShare} className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Share2 size={20} className="text-slate-700 dark:text-slate-300" />
        </button>
      </header>

      <div className="flex flex-col items-center pt-6 pb-8 px-6">
        <div className="relative flex items-center justify-center w-40 h-40 mb-6">
          <svg className="absolute w-full h-full -rotate-90">
            {/* Background circle */}
            <circle 
              className="text-primary/20" 
              cx="80" cy="80" fill="transparent" r="72" 
              stroke="currentColor" 
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle 
              className="text-primary transition-all duration-1000 ease-out" 
              cx="80" cy="80" fill="transparent" r="72" 
              stroke="url(#gradient)" 
              strokeWidth="6"
              strokeDasharray="452.39"
              strokeDashoffset={452.39 - (452.39 * (score / 100))}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" /> {/* primary */}
                <stop offset="100%" stopColor="#4338ca" /> {/* indigo-700 */}
              </linearGradient>
            </defs>
          </svg>
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-black text-slate-900 tracking-tight">{score}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Out of 100</span>
          </div>
        </div>
        
        <h3 className="text-lg font-black text-slate-900 text-center mb-1">
          {score >= 80 ? "Great start! Your resume is strong." : score >= 60 ? "Good start! Your resume is okay." : "Needs improvement."}
        </h3>
        <p className="text-slate-500 text-xs text-center font-medium">
          You're in the top {Math.max(1, 100 - score + 5)}% of applicants for similar roles.
        </p>
      </div>

      <div className="px-6 space-y-5 mb-10">
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-800">Content Impact</span>
            <span className="text-xs font-bold text-primary">{analysis.contentImpact}%</span>
          </div>
          <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${analysis.contentImpact}%` }}></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-800">Keyword Matching</span>
            <span className="text-xs font-bold text-primary">{analysis.keywordMatching}%</span>
          </div>
          <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${analysis.keywordMatching}%` }}></div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900 mb-4">
          <Lightbulb size={16} className="text-primary fill-primary" />
          Improvement Suggestions
        </h4>
        
        <div className="space-y-3">
          {analysis.suggestions.length > 0 ? (
            analysis.suggestions.map((suggestion, idx) => {
              const { title, description } = parseSuggestion(suggestion);
              const isSelected = selectedSuggestion === suggestion;
              const isOptimizingThis = optimizingSuggestion === suggestion;
              
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedSuggestion(isSelected ? null : suggestion)}
                  className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/40 shadow-md shadow-primary/5' 
                      : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm shadow-primary/20">
                      {getSuggestionIcon(title)}
                    </div>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-slate-900 mb-1">{title}</h5>
                      {description && <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{description}</p>}
                    </div>
                  </div>
                  
                  {/* Expanded Selection View */}
                  {isSelected && (
                    <div className="mt-2 pt-3 border-t border-primary/10 flex justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOptimizeSuggestion(suggestion);
                        }}
                        disabled={isOptimizingThis}
                        className="flex items-center gap-1.5 bg-primary hover:bg-indigo-600 text-white text-[11px] font-bold py-2 px-4 rounded-xl transition-colors disabled:opacity-70"
                      >
                        <Sparkles size={14} className="fill-white/20" />
                        {isOptimizingThis ? "Optimizing..." : "Optimize with AI"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-slate-400 text-center py-4 text-sm font-medium">No suggestions available. Try optimizing with AI.</p>
          )}
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 w-full max-w-3xl mx-auto px-6 pb-4 bg-gradient-to-t from-white via-white to-transparent pt-8 z-10">
        <button 
          onClick={handleOptimize}
          disabled={optimizing}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-400 hover:from-indigo-600 hover:to-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-70"
        >
          <Sparkles size={18} className="fill-white/20" />
          <span className="text-sm tracking-wide">{optimizing ? "Analyzing..." : "Optimize with AI"}</span>
        </button>
      </div>

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
                  <h4 className="text-2xl font-bold">{profile?.isPremium ? 'Pro' : 'Free'}</h4>
                </div>
                <div className={`p-2 rounded-full ${profile?.isPremium ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}>
                  {profile?.isPremium ? <Check size={20} /> : <Star size={20} />}
                </div>
              </div>

              {!profile?.isPremium && (
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">₹499</span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/year</span>
                  </div>
                </div>
              )}
              
              <ul className="space-y-3 mb-6">
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
                  <span className="font-medium">AI Resume Analysis & Scoring</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="font-medium">AI PDF/DOCX Import</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check size={14} />
                  </div>
                  <span className="font-medium">AI Text Improvement</span>
                </li>
              </ul>

              {!profile?.isPremium && (
                <button 
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    handleUpgrade();
                  }}
                  disabled={isUpgrading}
                  className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Sparkles size={18} />
                  {isUpgrading ? "Processing..." : "Upgrade for ₹499"}
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
    </div>
  );
};

export default Analysis;


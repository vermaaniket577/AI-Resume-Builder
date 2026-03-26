import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { Resume, PlanConfig } from '../types';
import { PlusCircle, FileText, Star, Lightbulb, BarChart, ChevronRight, Sparkles, Trash2, X, AlertTriangle, FileUp, Wand2, Send, Loader2, Check, Shield } from 'lucide-react';
import { aiService } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser.js';
import { FullScreenLoader } from '../components/Loader';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null);

  useEffect(() => {
    const fetchPlanConfig = async () => {
      if (!user) return;
      try {
        const planDoc = await getDoc(doc(db, 'config', 'plan'));
        if (planDoc.exists()) {
          setPlanConfig(planDoc.data() as PlanConfig);
        } else {
          // Fallback if document doesn't exist yet
          setPlanConfig({
            price: 499,
            currency: 'INR',
            billingCycle: 'year',
            features: [
              "AI Content Generation",
              "AI Resume Analysis & Scoring",
              "AI Text Improvement"
            ]
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.warn("Firestore is offline. Using fallback plan config.");
        } else {
          console.error("Error fetching plan config:", error);
        }
      }
    };
    fetchPlanConfig();
  }, [user]);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'resumes'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resumeList: Resume[] = [];
      snapshot.forEach((doc) => {
        resumeList.push({ id: doc.id, ...doc.data() } as Resume);
      });
      setResumes(resumeList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resumes');
    });

    return unsubscribe;
  }, [user]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleImportFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setLoading(true);
      try {
        const fileName = file.name.toLowerCase();
        let resumeData: any = null;

        if (fileName.endsWith('.json')) {
          const content = await file.text();
          resumeData = JSON.parse(content);
        } else if (fileName.endsWith('.pdf')) {
          const text = await extractTextFromPDF(file);
          resumeData = await aiService.parseResumeFromText(text);
        } else if (fileName.endsWith('.docx')) {
          const text = await extractTextFromDOCX(file);
          resumeData = await aiService.parseResumeFromText(text);
        } else {
          setToast({ message: "Unsupported file format. Please upload PDF, DOCX, or JSON.", type: 'error' });
          setLoading(false);
          return;
        }

        if (resumeData) {
          const finalResumeData = {
            title: (resumeData.title || 'Imported Resume').substring(0, 90),
            originalFileName: file.name,
            personalInfo: {
              fullName: resumeData.personalInfo?.fullName || '',
              email: resumeData.personalInfo?.email || '',
              phone: resumeData.personalInfo?.phone || '',
              location: resumeData.personalInfo?.location || '',
              linkedin: resumeData.personalInfo?.linkedin || '',
              portfolio: resumeData.personalInfo?.portfolio || '',
              github: resumeData.personalInfo?.github || '',
              twitter: resumeData.personalInfo?.twitter || ''
            },
            summary: resumeData.summary || resumeData.personalInfo?.summary || '',
            experience: resumeData.experience || [],
            education: resumeData.education || [],
            skills: resumeData.skills || [],
            projects: resumeData.projects || [],
            certifications: resumeData.certifications || [],
            languages: resumeData.languages || [],
            score: typeof resumeData.score === 'number' ? Math.min(Math.max(resumeData.score, 0), 100) : 70,
            templateId: resumeData.templateId || 'modern',
            themeColor: resumeData.color || '#4f46e5',
            userId: user.uid,
            updatedAt: new Date()
          };
          
          Object.keys(finalResumeData).forEach(key => {
            if ((finalResumeData as any)[key] === undefined) {
              delete (finalResumeData as any)[key];
            }
          });
          
          const docRef = await addDoc(collection(db, 'resumes'), finalResumeData);
          
          await updateDoc(doc(db, 'users', user.uid), {
            lastResumeData: finalResumeData
          });

          navigate(`/preview/${docRef.id}`);
        }
      } catch (err) {
        console.error("Failed to import resume:", err);
        setToast({ message: "Failed to parse the file. Please ensure it's a valid resume.", type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'resumes', deleteId));
      setDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `resumes/${deleteId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setIsUpgrading(true);
    try {
      // 1. Create Order on Backend
      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 499, currency: 'INR' }) // Example price
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
          // Payment success!
          // The webhook will handle the backend update, but we can also update UI here
          setToast({ message: "Payment successful! Your account is being upgraded.", type: 'success' });
          setShowSubscriptionModal(false);
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
        setToast({ message: "Payment failed: " + response.error.description, type: 'error' });
      });
      rzp.open();

    } catch (error: any) {
      console.error("Upgrade Error:", error);
      setToast({ message: "Failed to initiate upgrade: " + error.message, type: 'error' });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !user) return;
    
    setIsGenerating(true);
    try {
      const generatedData = await aiService.generateResumeFromPrompt(aiPrompt);
      
      const resumeData = {
        title: (generatedData.title || 'AI Generated Resume').substring(0, 90),
        personalInfo: {
          fullName: generatedData.personalInfo?.fullName || '',
          email: generatedData.personalInfo?.email || '',
          phone: generatedData.personalInfo?.phone || '',
          location: generatedData.personalInfo?.location || '',
          linkedin: generatedData.personalInfo?.linkedin || '',
          portfolio: generatedData.personalInfo?.portfolio || '',
          github: generatedData.personalInfo?.github || '',
          twitter: generatedData.personalInfo?.twitter || ''
        },
        summary: generatedData.summary || generatedData.personalInfo?.summary || '',
        experience: generatedData.experience || [],
        education: generatedData.education || [],
        skills: generatedData.skills || [],
        projects: generatedData.projects || [],
        certifications: generatedData.certifications || [],
        languages: generatedData.languages || [],
        score: typeof generatedData.score === 'number' ? Math.min(Math.max(generatedData.score, 0), 100) : 70,
        templateId: generatedData.templateId || 'modern',
        themeColor: generatedData.color || '#4f46e5',
        userId: user.uid,
        updatedAt: new Date()
      };
      
      // Remove any undefined values that might have snuck in
      Object.keys(resumeData).forEach(key => {
        if ((resumeData as any)[key] === undefined) {
          delete (resumeData as any)[key];
        }
      });
      
      const docRef = await addDoc(collection(db, 'resumes'), resumeData);
      
      // Also update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        lastResumeData: resumeData
      });

      setIsAiModalOpen(false);
      navigate(`/preview/${docRef.id}`);
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      setToast({ message: "Something went wrong during generation: " + (error.message || error), type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <FullScreenLoader message="Loading your dashboard..." />;

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 pb-20">
      <header className="px-6 pt-12 pb-8 flex justify-between items-center">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter"
          >
            CV Builder
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 dark:text-slate-400 text-sm font-medium"
          >
            Crafted with AI precision.
          </motion.p>
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative group cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="size-10 rounded-full ring-2 ring-primary/20" />
          ) : (
            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-xs font-bold">{user?.displayName?.[0] || 'U'}</span>
            </div>
          )}
          {user?.email === 'vermaaniket577@gmail.com' && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-950 shadow-sm">
              <Shield size={10} fill="currentColor" />
            </div>
          )}
        </motion.div>
      </header>

      <main className="px-6 space-y-8">
        {/* Primary Actions - Stitch Style */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (profile?.isPremium) {
                setIsAiModalOpen(true);
              } else {
                setShowSubscriptionModal(true);
              }
            }}
            className="relative overflow-hidden group flex flex-col items-start justify-between p-6 rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 h-48 sm:h-auto sm:min-h-[12rem] shadow-2xl shadow-slate-900/20 dark:shadow-white/5"
          >
            <div className="flex justify-between items-start w-full">
              <div className="size-12 rounded-2xl bg-white/10 dark:bg-slate-900/10 flex items-center justify-center mb-4">
                <Wand2 size={24} className="text-white dark:text-slate-900" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-primary px-2 py-1 rounded-full text-white">Pro</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Create with AI</h2>
              <p className="text-white/60 dark:text-slate-900/60 text-sm font-medium">Describe your career in seconds.</p>
            </div>
            <Sparkles className="absolute -top-4 -right-4 size-32 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
          </motion.button>

          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/wizard')}
              className="flex flex-col items-start justify-between p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-36 sm:h-auto sm:min-h-[12rem]"
            >
              <PlusCircle size={20} className="text-primary" />
              <div className="text-left">
                <h3 className="font-bold text-sm">Manual Build</h3>
                <p className="text-[10px] text-slate-500">Step-by-step wizard</p>
              </div>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => importInputRef.current?.click()}
              className="flex flex-col items-start justify-between p-5 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-36 sm:h-auto sm:min-h-[12rem]"
            >
              <FileUp size={20} className="text-emerald-500" />
              <div className="text-left">
                <h3 className="font-bold text-sm">Import Resume</h3>
                <p className="text-[10px] text-slate-500">PDF, DOCX or JSON</p>
              </div>
            </motion.button>
          </div>
        </section>

        {/* Resumes List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black tracking-tight">Recent Work</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{resumes.length} Files</span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
              <FileText size={40} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400 font-medium">No resumes found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map((resume, index) => (
                <motion.div 
                  key={resume.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative flex items-center p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all"
                >
                  <div 
                    onClick={() => navigate(`/preview/${resume.id}`)}
                    className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform cursor-pointer overflow-hidden"
                  >
                    {resume.personalInfo.photoUrl ? (
                      <img src={resume.personalInfo.photoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <FileText className="text-primary" size={24} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/preview/${resume.id}`)}>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-0.5">{resume.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 ${getScoreColor(resume.score)}`}>
                        {resume.score}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {resume.updatedAt?.toDate ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(resume.updatedAt.toDate()) : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setDeleteId(resume.id || null)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Premium Banner */}
        {!profile?.isPremium && (
          <section>
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/20">
              <div className="flex justify-between items-start mb-4">
                <div className="size-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Star className="fill-white text-white" size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2 py-1 rounded-full">Pro</span>
              </div>
              <h3 className="text-xl font-bold mb-1">Unlock AI Power</h3>
              <p className="text-white/80 text-sm mb-6 leading-snug">Get unlimited AI generations and expert ATS optimization.</p>
              <button 
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full h-12 rounded-2xl bg-white text-orange-600 font-black text-sm hover:bg-white/90 transition-colors"
              >
                Go Pro
              </button>
            </div>
          </section>
        )}
      </main>

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
                    <span className="text-4xl font-black tracking-tight">{planConfig?.currency || '₹'}{planConfig?.price || '499'}</span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/{planConfig?.billingCycle || 'year'}</span>
                  </div>
                </div>
              )}
              
              <ul className="space-y-3 mb-6">
                {(planConfig?.features || [
                  "AI Content Generation",
                  "AI Resume Analysis & Scoring",
                  "AI Text Improvement"
                ]).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm">
                    <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <Check size={14} />
                    </div>
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
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
                  {isUpgrading ? "Processing..." : `Upgrade for ${planConfig?.currency || '₹'}${planConfig?.price || '499'}`}
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

      {/* AI Generation Modal - Stitch Inspired */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGenerating && setIsAiModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-emerald-500 z-20" />
              
              <div className="flex-1 overflow-y-auto p-5 sm:p-8">
                <div className="flex justify-between items-center mb-4 sm:mb-8">
                  <div className="size-10 sm:size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Wand2 size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <button 
                    onClick={() => setIsAiModalOpen(false)}
                    className="size-8 sm:size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                  >
                    <X size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>

                <h2 className="text-xl sm:text-3xl font-black tracking-tight mb-1 sm:mb-2">AI Generator</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-4 sm:mb-8 font-medium">
                  Tell us about your career, experience, and skills. We'll handle the rest.
                </p>

                <div className="relative group mb-1">
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. I am a Senior Product Designer with 8 years of experience in SaaS. I led design teams at Google and specialize in design systems..."
                    className="w-full h-24 sm:h-48 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all resize-none text-sm sm:text-base font-medium"
                    disabled={isGenerating}
                  />
                  <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {aiPrompt.length} chars
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button 
                  onClick={handleAiGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full h-12 sm:h-16 rounded-2xl sm:rounded-3xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm sm:text-lg flex items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-slate-900/20 dark:shadow-white/10 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      <span>Generating Magic...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Generate Resume</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={importInputRef} 
        className="hidden" 
        accept=".json,.pdf,.docx" 
        onChange={handleImportFromDevice} 
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="size-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">Delete Resume?</h3>
                <p className="text-slate-500 text-sm mb-8 font-medium">
                  This action is permanent and cannot be undone.
                </p>
                
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setDeleteId(null)}
                    disabled={isDeleting}
                    className="flex-1 h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 h-14 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 flex items-center justify-center"
                  >
                    {isDeleting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="px-6 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black tracking-tight">Templates</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pro Layouts</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {[
            { id: 'modern', name: 'Modern', color: 'bg-indigo-500' },
            { id: 'creative', name: 'Creative', color: 'bg-emerald-500' },
            { id: 'executive', name: 'Executive', color: 'bg-amber-500' },
            { id: 'ats', name: 'ATS Friendly', color: 'bg-slate-700' },
            { id: 'elegant', name: 'Elegant', color: 'bg-rose-500' }
          ].map(t => (
            <motion.div 
              key={t.id}
              whileHover={{ y: -5 }}
              onClick={() => navigate('/wizard')}
              className="min-w-[160px] aspect-[3/4.5] rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className={`h-2 w-full ${t.color}`} />
              <div className="p-4">
                <div className="h-1.5 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2" />
                <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full mb-1.5" />
                <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full mb-1.5" />
                <div className="h-1 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full mb-1.5" />
                <div className="h-1 w-1/2 bg-slate-50 dark:bg-slate-800/50 rounded-full mt-6" />
                <p className="text-[10px] font-black mt-8 text-slate-400 group-hover:text-primary transition-colors uppercase tracking-widest">{t.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 mb-12">
        <h3 className="text-xl font-black tracking-tight mb-6">Expert Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Lightbulb size={20} />
            </div>
            <h5 className="font-bold text-base mb-2">Use Action Verbs</h5>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Start your bullet points with strong words like "Executed", "Managed", or "Spearheaded".</p>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
              <BarChart size={20} />
            </div>
            <h5 className="font-bold text-base mb-2">Quantify Results</h5>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Numbers stand out. Instead of "Improved sales", use "Increased sales by 20% in 6 months".</p>
          </div>
        </div>
      </section>
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} z-50`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

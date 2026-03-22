import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { Resume, PersonalInfo, Experience, Education, Project } from '../types';
import { ArrowLeft, ChevronRight, ChevronLeft, Plus, Trash2, Sparkles, Camera, X, FileUp, Wand2, Loader2 } from 'lucide-react';
import { aiService } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser.js';
import { FullScreenLoader } from '../components/Loader';
import { AIAssistedTextarea } from '../components/AIAssistedTextarea';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const Wizard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form State
  const [title, setTitle] = useState('My New Resume');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    github: '',
    twitter: '',
    photoUrl: ''
  });
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({ name: '', description: '', link: '' });
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLang, setNewLang] = useState('');
  const [originalFileName, setOriginalFileName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchResume = async () => {
      if (!user) return;
      
      try {
        setFetching(true);
        
        if (id) {
          // Editing existing resume
          const docRef = doc(db, 'resumes', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Resume;
            if (data.userId !== user.uid) {
              setToast({ message: "Unauthorized access", type: 'error' });
              navigate('/');
              return;
            }
            setTitle(data.title);
            setOriginalFileName(data.originalFileName);
            setPersonalInfo(data.personalInfo);
            setSummary(data.summary);
            setExperience(data.experience);
            setEducation(data.education);
            setSkills(data.skills);
            setProjects(data.projects || []);
            setCertifications(data.certifications || []);
            setLanguages(data.languages || []);
          }
        } else {
          // New resume - try to pre-fill from profile
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.lastResumeData) {
              const data = userData.lastResumeData as Resume;
              // Pre-fill but keep title as "My New Resume" or similar
              setPersonalInfo(data.personalInfo || personalInfo);
              setSummary(data.summary || '');
              setExperience(data.experience || []);
              setEducation(data.education || []);
              setSkills(data.skills || []);
              setProjects(data.projects || []);
              setCertifications(data.certifications || []);
              setLanguages(data.languages || []);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchResume();
  }, [id, user, navigate]);

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const addExperience = () => {
    setExperience([...experience, { id: Date.now().toString(), company: '', role: '', startDate: '', endDate: '', description: '' }]);
  };

  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setExperience(experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };

  const removeExperience = (id: string) => {
    setExperience(experience.filter(exp => exp.id !== id));
  };

  const addEducation = () => {
    setEducation([...education, { id: Date.now().toString(), school: '', degree: '', gradDate: '' }]);
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setEducation(education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu));
  };

  const removeEducation = (id: string) => {
    setEducation(education.filter(edu => edu.id !== id));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addProject = () => {
    if (newProject.name.trim()) {
      setProjects([...projects, { ...newProject, id: Date.now().toString() }]);
      setNewProject({ name: '', description: '', link: '' });
    }
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter(item => item.id !== id));
  };

  const addCert = () => {
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const removeCert = (c: string) => setCertifications(certifications.filter(item => item !== c));

  const addLang = () => {
    if (newLang.trim() && !languages.includes(newLang.trim())) {
      setLanguages([...languages, newLang.trim()]);
      setNewLang('');
    }
  };

  const removeLang = (l: string) => setLanguages(languages.filter(item => item !== l));

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
    if (file) {
      setLoading(true);
      try {
        const fileName = file.name.toLowerCase();
        let resumeData: any = null;

        if (fileName.endsWith('.json')) {
          const content = await file.text();
          resumeData = JSON.parse(content);
        } else if (fileName.endsWith('.pdf')) {
          if (!profile?.isPremium) {
            setToast({ message: "PDF import is a premium feature. Please upgrade.", type: 'error' });
            setLoading(false);
            return;
          }
          const text = await extractTextFromPDF(file);
          resumeData = await aiService.parseResumeFromText(text);
        } else if (fileName.endsWith('.docx')) {
          if (!profile?.isPremium) {
            setToast({ message: "DOCX import is a premium feature. Please upgrade.", type: 'error' });
            setLoading(false);
            return;
          }
          const text = await extractTextFromDOCX(file);
          resumeData = await aiService.parseResumeFromText(text);
        } else {
          setToast({ message: "Unsupported file format. Please upload PDF, DOCX, or JSON.", type: 'error' });
          setLoading(false);
          return;
        }

        if (resumeData) {
          // Basic validation and mapping
          if (resumeData.personalInfo) setPersonalInfo(resumeData.personalInfo);
          if (resumeData.summary) setSummary(resumeData.summary);
          if (resumeData.experience) setExperience(resumeData.experience);
          if (resumeData.education) setEducation(resumeData.education);
          if (resumeData.skills) setSkills(resumeData.skills);
          if (resumeData.projects) setProjects(resumeData.projects);
          if (resumeData.certifications) setCertifications(resumeData.certifications);
          if (resumeData.languages) setLanguages(resumeData.languages);
          if (resumeData.title) setTitle(resumeData.title);
          setOriginalFileName(file.name);
          
          setToast({ message: "Resume data imported successfully!", type: 'success' });
        }
      } catch (err) {
        console.error("Failed to import resume:", err);
        setToast({ message: "Failed to parse the file. Please ensure it's a valid resume.", type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAISummary = async () => {
    if (!profile?.isPremium) {
      setToast({ message: "AI Summary is a premium feature. Please upgrade.", type: 'error' });
      return;
    }
    if (!personalInfo.fullName || experience.length === 0) {
      setToast({ message: "Please fill in your name and at least one experience first.", type: 'error' });
      return;
    }
    try {
      setLoading(true);
      const aiSummary = await aiService.generateSummary(personalInfo, experience, skills);
      setSummary(aiSummary || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        setToast({ message: "Photo size should be less than 500KB", type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPersonalInfo({ ...personalInfo, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setToast({ message: "You must be logged in to save a resume.", type: 'error' });
      return;
    }

    // Validation
    if (!personalInfo.fullName || !personalInfo.email) {
      setToast({ message: "Please fill in your full name and email address.", type: 'error' });
      setStep(1);
      return;
    }

    if (experience.length === 0) {
      setToast({ message: "Please add at least one work experience.", type: 'error' });
      setStep(2);
      return;
    }

    try {
      setLoading(true);
      const resumeData: Omit<Resume, 'id'> = {
        userId: user.uid,
        title: title || 'Untitled Resume',
        templateId: 'modern',
        personalInfo,
        summary: summary || 'No summary provided.',
        experience,
        education,
        skills,
        certifications,
        projects,
        languages,
        score: 0,
        updatedAt: serverTimestamp()
      };

      if (originalFileName) {
        resumeData.originalFileName = originalFileName;
      }

      // Initial analysis - this is the "AI generation" part for scoring
      if (profile?.isPremium) {
        console.log("Analyzing resume with AI...");
        const { updatedAt, ...resumeDataForAI } = resumeData;
        if (resumeDataForAI.personalInfo?.photoUrl) {
          resumeDataForAI.personalInfo = { ...resumeDataForAI.personalInfo, photoUrl: undefined };
        }
        const analysis = await aiService.analyzeResume(resumeDataForAI);
        resumeData.score = analysis.score;
        resumeData.analysis = analysis;
      } else {
        console.log("Skipping AI analysis for free user.");
        resumeData.score = 0;
        resumeData.analysis = undefined;
      }

      if (id) {
        console.log("Updating resume in Firestore...");
        await updateDoc(doc(db, 'resumes', id), resumeData);
        
        // Also update user profile with latest data for next time
        await updateDoc(doc(db, 'users', user.uid), {
          lastResumeData: resumeData
        });

        console.log("Updated! Navigating to templates...");
        navigate(`/templates/${id}`);
      } else {
        console.log("Saving to Firestore...");
        const docRef = await addDoc(collection(db, 'resumes'), resumeData);
        
        // Also update user profile with latest data for next time
        await updateDoc(doc(db, 'users', user.uid), {
          lastResumeData: resumeData
        });

        console.log("Saved! Navigating to templates...");
        navigate(`/templates/${docRef.id}`);
      }
    } catch (err: any) {
      console.error("Error generating resume:", err);
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'resumes');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <FullScreenLoader message="Loading editor..." />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col w-full max-w-3xl mx-auto relative overflow-x-hidden">
      {loading && <FullScreenLoader message="Processing..." />}
      <header className="flex items-center px-6 py-8 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
        <button onClick={() => navigate('/')} className="size-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 text-center pr-10">
          <h2 className="text-xl font-black tracking-tighter">Wizard</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step {step} of 6</p>
        </div>
      </header>

      <div className="px-6 mb-8">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / 6) * 100}%` }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.main 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 px-6 overflow-y-auto pb-32"
        >
        {step === 1 && (
          <div className="space-y-8">
            <h3 className="text-3xl font-black tracking-tight leading-tight">Let's start with your contact info</h3>
            
            <div className="flex flex-col items-center">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative size-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer group shadow-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {personalInfo.photoUrl ? (
                  <>
                    <img src={personalInfo.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPersonalInfo({ ...personalInfo, photoUrl: '' });
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <Camera size={32} />
                    <span className="text-[10px] font-black uppercase mt-2 tracking-widest">Photo</span>
                  </div>
                )}
              </motion.div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Full Name</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="John Doe"
                    value={personalInfo.fullName}
                    onChange={e => setPersonalInfo({...personalInfo, fullName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Email</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="john@example.com"
                    value={personalInfo.email}
                    onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Phone</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="+1 (555) 000-0000"
                    value={personalInfo.phone}
                    onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Location</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="New York, NY"
                    value={personalInfo.location}
                    onChange={e => setPersonalInfo({...personalInfo, location: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">LinkedIn</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="linkedin.com/in/..."
                    value={personalInfo.linkedin}
                    onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Portfolio</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="portfolio.com"
                    value={personalInfo.portfolio}
                    onChange={e => setPersonalInfo({...personalInfo, portfolio: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">GitHub</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="github.com/..."
                    value={personalInfo.github}
                    onChange={e => setPersonalInfo({...personalInfo, github: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Twitter</label>
                  <input 
                    className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                    placeholder="@username"
                    value={personalInfo.twitter}
                    onChange={e => setPersonalInfo({...personalInfo, twitter: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <input 
                type="file" 
                ref={importInputRef} 
                className="hidden" 
                accept=".json,.pdf,.docx" 
                onChange={handleImportFromDevice} 
              />
              <button 
                onClick={() => importInputRef.current?.click()}
                className="w-full h-14 rounded-3xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <FileUp size={18} />
                Import PDF, DOCX or JSON
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tight leading-tight">Work Experience</h3>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={addExperience}
                className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
              >
                <Plus size={24} />
              </motion.button>
            </div>
            
            <div className="space-y-6">
              {experience.map((exp) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={exp.id} 
                  className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-primary/10 transition-all relative group"
                >
                  <button 
                    onClick={() => removeExperience(exp.id)}
                    className="absolute -top-2 -right-2 size-8 bg-red-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-slate-300"
                        placeholder="Company Name"
                        value={exp.company}
                        onChange={e => updateExperience(exp.id, 'company', e.target.value)}
                      />
                      <input 
                        className="w-full bg-transparent font-medium outline-none placeholder:text-slate-300"
                        placeholder="Job Title / Role"
                        value={exp.role}
                        onChange={e => updateExperience(exp.id, 'role', e.target.value)}
                      />
                    </div>
                    <div className="flex gap-4">
                      <input 
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300"
                        placeholder="Start Date"
                        value={exp.startDate}
                        onChange={e => updateExperience(exp.id, 'startDate', e.target.value)}
                      />
                      <input 
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300"
                        placeholder="End Date"
                        value={exp.endDate}
                        onChange={e => updateExperience(exp.id, 'endDate', e.target.value)}
                      />
                    </div>
                    <AIAssistedTextarea 
                      className="w-full bg-transparent text-sm outline-none min-h-[100px] resize-none placeholder:text-slate-300 pb-12"
                      placeholder="Describe your achievements..."
                      value={exp.description}
                      onValueChange={val => updateExperience(exp.id, 'description', val)}
                      context={`experience description for ${exp.role} at ${exp.company}`}
                    />
                  </div>
                </motion.div>
              ))}
              {experience.length === 0 && (
                <div className="text-center py-12 px-6 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-bold text-sm">No experience added yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black tracking-tight leading-tight">Education</h3>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={addEducation}
                className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
              >
                <Plus size={24} />
              </motion.button>
            </div>
            
            <div className="space-y-6">
              {education.map((edu) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={edu.id} 
                  className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-primary/10 transition-all relative group"
                >
                  <button 
                    onClick={() => removeEducation(edu.id)}
                    className="absolute -top-2 -right-2 size-8 bg-red-500 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-slate-300"
                        placeholder="School / University"
                        value={edu.school}
                        onChange={e => updateEducation(edu.id, 'school', e.target.value)}
                      />
                      <input 
                        className="w-full bg-transparent font-medium outline-none placeholder:text-slate-300"
                        placeholder="Degree / Field of Study"
                        value={edu.degree}
                        onChange={e => updateEducation(edu.id, 'degree', e.target.value)}
                      />
                    </div>
                    <input 
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
                      placeholder="Graduation Date"
                      value={edu.gradDate}
                      onChange={e => updateEducation(edu.id, 'gradDate', e.target.value)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <h3 className="text-3xl font-black tracking-tight leading-tight">Skills</h3>
            <div className="space-y-6">
              <div className="flex gap-2">
                <input 
                  className="flex-1 h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                  placeholder="Add a skill (e.g. React)"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSkill()}
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addSkill}
                  className="size-16 rounded-3xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
                >
                  <Plus size={24} />
                </motion.button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <motion.span 
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={skill} 
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-800"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <h3 className="text-3xl font-black tracking-tight leading-tight">Projects & More</h3>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Projects</label>
                <div className="space-y-3 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800">
                  <input 
                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary/30 transition-all font-medium"
                    placeholder="Project Name"
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                  />
                  <input 
                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary/30 transition-all font-medium"
                    placeholder="Project Link (Optional)"
                    value={newProject.link}
                    onChange={e => setNewProject({...newProject, link: e.target.value})}
                  />
                  <AIAssistedTextarea 
                    className="w-full p-4 pb-12 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:border-primary/30 transition-all font-medium min-h-[80px] resize-none"
                    placeholder="Brief description..."
                    value={newProject.description}
                    onValueChange={val => setNewProject({...newProject, description: val})}
                    context={`project description for ${newProject.name}`}
                  />
                  <button 
                    onClick={addProject}
                    disabled={!newProject.name.trim()}
                    className="w-full h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    <Plus size={18} /> Add Project
                  </button>
                </div>
                <div className="space-y-3">
                  {projects.map(p => (
                    <div key={p.id} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h5 className="font-bold text-sm">{p.name}</h5>
                        {p.link && <p className="text-[10px] text-primary truncate mb-1">{p.link}</p>}
                        <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
                      </div>
                      <button onClick={() => removeProject(p.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Certifications</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 outline-none transition-all"
                      placeholder="Certification name"
                      value={newCert}
                      onChange={e => setNewCert(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addCert()}
                    />
                    <button onClick={addCert} className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><Plus size={20} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {certifications.map(c => (
                      <span key={c} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2">
                        {c}
                        <button onClick={() => removeCert(c)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Languages</label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 outline-none transition-all"
                      placeholder="Language"
                      value={newLang}
                      onChange={e => setNewLang(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addLang()}
                    />
                    <button onClick={addLang} className="size-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg"><Plus size={20} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {languages.map(l => (
                      <span key={l} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-2">
                        {l}
                        <button onClick={() => removeLang(l)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8">
            <h3 className="text-3xl font-black tracking-tight leading-tight">Final Review</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professional Summary</label>
                  <button 
                    onClick={handleAISummary}
                    disabled={loading}
                    className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    {loading ? "Polishing..." : "AI Polish"}
                  </button>
                </div>
                <AIAssistedTextarea 
                  className="w-full p-6 pb-14 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium min-h-[180px] resize-none"
                  placeholder="Tell your story..."
                  value={summary}
                  onValueChange={setSummary}
                  context="professional summary for a resume"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Resume Title</label>
                <input 
                  className="w-full h-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-950 outline-none transition-all font-medium"
                  placeholder="e.g. Senior Developer Resume"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </motion.main>
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 w-full max-w-3xl mx-auto p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-900 z-20">
        <div className="flex gap-4">
          {step > 1 && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={prevStep}
              className="size-14 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={step === 6 ? handleSave : nextStep}
            disabled={loading}
            className="flex-1 h-14 rounded-2xl bg-primary text-white font-black tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : step === 6 ? (
              <>
                <Sparkles size={20} />
                {id ? "Update Resume" : "Generate Resume"}
              </>
            ) : (
              <>
                Next Step
                <ChevronRight size={20} />
              </>
            )}
          </motion.button>
        </div>
      </footer>
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} z-50`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Wizard;

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, orderBy, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Resume, Job, PlanConfig } from '../types';
import { FullScreenLoader } from '../components/Loader';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Search, 
  ArrowLeft,
  Crown,
  ExternalLink,
  Calendar,
  Mail,
  Briefcase,
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
  Clock,
  Settings as SettingsIcon,
  Sparkles,
  Shield,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const Admin: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'resumes' | 'jobs' | 'stats' | 'settings'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'normal' | 'pro'>('all');
  const [resumeSearchTerm, setResumeSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [planConfig, setPlanConfig] = useState<PlanConfig>({
    price: 499,
    currency: 'INR',
    billingCycle: 'year',
    features: [
      'AI Resume Analysis',
      'AI Content Generation',
      'AI Score Improvement',
      'Pro Templates',
      'Priority Support'
    ]
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Job form state
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJob, setNewJob] = useState<Partial<Job>>({
    title: '',
    company: '',
    location: '',
    salary: '',
    type: 'Full-time',
    tags: []
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
        const usersData = usersSnap.docs.map(doc => doc.data() as UserProfile);
        setUsers(usersData);

        const resumesSnap = await getDocs(query(collection(db, 'resumes'), orderBy('updatedAt', 'desc')));
        const resumesData = resumesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resume));
        setResumes(resumesData);

        const jobsSnap = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')));
        const jobsData = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        setJobs(jobsData);

        const planSnap = await getDoc(doc(db, 'config', 'plan'));
        if (planSnap.exists()) {
          setPlanConfig(planSnap.data() as PlanConfig);
        } else {
          // Fallback if document doesn't exist yet
          setPlanConfig({
            price: 499,
            currency: 'INR',
            billingCycle: 'year',
            features: [
              'AI Resume Analysis',
              'AI Content Generation',
              'AI Score Improvement',
              'Pro Templates',
              'Priority Support'
            ]
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.warn("Firestore is offline. Using fallback plan config.");
        } else {
          handleFirestoreError(error, OperationType.LIST, 'admin_data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleProPlan = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isPremium: !currentStatus });
      setUsers(users.map(u => u.uid === userId ? { ...u, isPremium: !currentStatus } : u));
      if (selectedUser?.uid === userId) {
        setSelectedUser({ ...selectedUser, isPremium: !currentStatus });
      }
      setToast({ 
        message: `Plan ${!currentStatus ? 'activated' : 'revoked'} successfully for ${selectedUser?.displayName || 'user'}`, 
        type: 'success' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      setToast({ message: "Failed to update user plan", type: 'error' });
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jobData = {
        ...newJob,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'jobs'), jobData);
      setJobs([{ id: docRef.id, ...jobData } as Job, ...jobs]);
      setShowJobForm(false);
      setNewJob({ title: '', company: '', location: '', salary: '', type: 'Full-time', tags: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobs');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      setJobs(jobs.filter(j => j.id !== jobId));
      setDeletingJobId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `jobs/${jobId}`);
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPlan(true);
      await setDoc(doc(db, 'config', 'plan'), planConfig);
      setCopySuccess('plan');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleAddFeature = () => {
    setPlanConfig({
      ...planConfig,
      features: [...planConfig.features, '']
    });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...planConfig.features];
    newFeatures[index] = value;
    setPlanConfig({
      ...planConfig,
      features: newFeatures
    });
  };

  const handleRemoveFeature = (index: number) => {
    setPlanConfig({
      ...planConfig,
      features: planConfig.features.filter((_, i) => i !== index)
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (userFilter === 'normal') return matchesSearch && !u.isPremium;
    if (userFilter === 'pro') return matchesSearch && u.isPremium;
    return matchesSearch;
  });

  const filteredResumes = resumes.filter(r => {
    const user = users.find(u => u.uid === r.userId);
    const searchLower = resumeSearchTerm.toLowerCase();
    return (
      r.title.toLowerCase().includes(searchLower) ||
      user?.displayName.toLowerCase().includes(searchLower) ||
      user?.email.toLowerCase().includes(searchLower)
    );
  });

  const getUserResumes = (userId: string) => {
    return resumes.filter(r => r.userId === userId);
  };

  const stats = {
    totalUsers: users.length,
    proUsers: users.filter(u => u.isPremium).length,
    totalResumes: resumes.length,
    totalJobs: jobs.length,
    avgScore: resumes.length > 0 ? Math.round(resumes.reduce((acc, r) => acc + (r.score || 0), 0) / resumes.length) : 0
  };

  if (loading) return <FullScreenLoader message="Loading admin dashboard..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-slate-500">System overview and management</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Users size={16} /> Users
          </button>
          <button 
            onClick={() => setActiveTab('resumes')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'resumes' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <FileText size={16} /> Resumes
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'jobs' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Briefcase size={16} /> Jobs
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart3 size={16} /> Stats
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <SettingsIcon size={16} /> Settings
          </button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <Users size={24} />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                <TrendingUp size={12} /> +12%
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Users</p>
            <h3 className="text-3xl font-bold mt-1">{stats.totalUsers}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                <Crown size={24} />
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                {Math.round((stats.proUsers / stats.totalUsers) * 100)}% conversion
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Pro Users</p>
            <h3 className="text-3xl font-bold mt-1">{stats.proUsers}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <FileText size={24} />
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="size-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${i}/32/32`} alt="" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">Resumes Created</p>
            <h3 className="text-3xl font-bold mt-1">{stats.totalResumes}</h3>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <TrendingUp size={24} />
              </div>
              <span className="text-xs font-bold text-slate-400">Avg. Score</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Quality Index</p>
            <h3 className="text-3xl font-bold mt-1">{stats.avgScore}%</h3>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* User List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={18} className="text-primary" />
                  <h2 className="font-bold">Users ({filteredUsers.length})</h2>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button 
                    onClick={() => setUserFilter('all')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${userFilter === 'all' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setUserFilter('normal')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${userFilter === 'normal' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500'}`}
                  >
                    Normal
                  </button>
                  <button 
                    onClick={() => setUserFilter('pro')}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${userFilter === 'pro' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500'}`}
                  >
                    Pro
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {filteredUsers.map(u => (
                  <button 
                    key={u.uid}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-4 text-left border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center gap-3 ${selectedUser?.uid === u.uid ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="size-full object-cover" />
                      ) : (
                        <Users size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{u.displayName || 'Anonymous'}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    {u.isPremium && <Crown size={16} className="text-amber-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Details & Resumes */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="space-y-6">
                {/* User Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-900 shadow-lg">
                      {selectedUser.photoURL ? (
                        <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="size-full object-cover" />
                      ) : (
                        <Users size={32} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold">{selectedUser.displayName || 'Anonymous'}</h2>
                        {selectedUser.isPremium && (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown size={10} /> PRO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} />
                          {selectedUser.email}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          Joined {selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => toggleProPlan(selectedUser.uid, selectedUser.isPremium)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedUser.isPremium ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}
                      >
                        {selectedUser.isPremium ? (
                          <><XCircle size={18} /> Revoke Pro Plan</>
                        ) : (
                          <><CheckCircle size={18} /> Activate Pro Plan</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resumes List */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    User Resumes ({getUserResumes(selectedUser.uid).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getUserResumes(selectedUser.uid).map(resume => (
                      <div 
                        key={resume.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <FileText size={20} />
                          </div>
                          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Score: {resume.score}
                          </div>
                        </div>
                        <h4 className="font-bold mb-1 truncate">{resume.title}</h4>
                        <p className="text-xs text-slate-500 mb-4">
                          Updated {resume.updatedAt?.toDate ? resume.updatedAt.toDate().toLocaleDateString() : 'Unknown'}
                        </p>
                        <button 
                          onClick={() => navigate(`/preview/${resume.id}`)}
                          className="w-full py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={14} /> View Resume
                        </button>
                      </div>
                    ))}
                    {getUserResumes(selectedUser.uid).length === 0 && (
                      <div className="col-span-full p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                        <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500 text-sm">No resumes found for this user.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                <Users size={48} className="text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">Select a user to manage</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">
                  Click on a user from the list to view their details, manage their plan, and see their resumes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resumes' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText size={24} className="text-primary" />
              All Resumes ({resumes.length})
            </h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search resumes or users..." 
                value={resumeSearchTerm}
                onChange={(e) => setResumeSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResumes.map(resume => {
              const user = users.find(u => u.uid === resume.userId);
              return (
                <div 
                  key={resume.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                      <FileText size={24} />
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                      Score: {resume.score}%
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1 truncate">{resume.title}</h3>
                  
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="size-full object-cover" />
                      ) : (
                        <Users size={16} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{user?.displayName || 'Anonymous'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button 
                      onClick={() => navigate(`/preview/${resume.id}`)}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} /> View
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUser(user || null);
                        setActiveTab('users');
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      User
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredResumes.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">No resumes found</h3>
                <p className="text-slate-500 mt-2">Try adjusting your search term.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase size={24} className="text-primary" />
              Job Postings ({jobs.length})
            </h2>
            <button 
              onClick={() => setShowJobForm(!showJobForm)}
              className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={20} /> Post New Job
            </button>
          </div>

          {showJobForm && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-primary/20 shadow-xl animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold mb-4">Create New Job Posting</h3>
              <form onSubmit={handleCreateJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Job Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Senior Frontend Developer"
                    value={newJob.title}
                    onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Company</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. TechCorp Inc."
                    value={newJob.company}
                    onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Location</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Remote / New York, NY"
                    value={newJob.location}
                    onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Salary Range</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. $120k - $150k"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({...newJob, salary: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex gap-4 md:col-span-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
                  >
                    Create Posting
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowJobForm(false)}
                    className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <div 
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all relative group"
              >
                <button 
                  onClick={() => setDeletingJobId(job.id!)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
                {deletingJobId === job.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-10 flex flex-col items-center justify-center p-6 rounded-3xl animate-in fade-in duration-200">
                    <p className="text-sm font-bold mb-4">Delete this job?</p>
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => handleDeleteJob(job.id!)}
                        className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-bold"
                      >
                        Delete
                      </button>
                      <button 
                        onClick={() => setDeletingJobId(null)}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-xl font-bold mb-1">{job.title}</h3>
                <p className="text-primary font-semibold mb-4">{job.company}</p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Search size={14} /> {job.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock size={14} /> {job.type}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
                    {job.salary}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.tags?.map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {jobs.length === 0 && !showJobForm && (
              <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">No job postings yet</h3>
                <p className="text-slate-500 mt-2">Start by creating your first job opportunity for users.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Crown size={20} className="text-amber-500" />
                Subscription Plan Offer
              </h2>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleUpdatePlan} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</label>
                      <input 
                        type="number"
                        value={planConfig.price}
                        onChange={(e) => setPlanConfig({...planConfig, price: Number(e.target.value)})}
                        className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency</label>
                      <input 
                        type="text"
                        value={planConfig.currency}
                        onChange={(e) => setPlanConfig({...planConfig, currency: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Billing Cycle</label>
                    <select 
                      value={planConfig.billingCycle}
                      onChange={(e) => setPlanConfig({...planConfig, billingCycle: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-sm font-bold outline-none"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Features</label>
                      <button 
                        type="button"
                        onClick={handleAddFeature}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        + Add Feature
                      </button>
                    </div>
                    <div className="space-y-2">
                      {planConfig.features.map((feature, index) => (
                        <div key={index} className="flex gap-2">
                          <input 
                            type="text"
                            value={feature}
                            onChange={(e) => handleFeatureChange(index, e.target.value)}
                            placeholder="Feature description..."
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-xs"
                          />
                          <button 
                            type="button"
                            onClick={() => handleRemoveFeature(index)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={savingPlan}
                    className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {savingPlan ? (
                      'Saving...'
                    ) : (
                      <><Save size={18} /> {copySuccess === 'plan' ? 'Saved Successfully!' : 'Update Plan Offer'}</>
                    )}
                  </button>
                </form>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                Razorpay Integration
              </h2>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">App URL (for Razorpay Dashboard)</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly
                      value={window.location.origin}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-sm font-mono"
                    />
                    <button 
                      onClick={() => copyToClipboard(window.location.origin, 'app')}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs"
                    >
                      {copySuccess === 'app' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Webhook URL</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly
                      value={`${window.location.origin}/api/webhook/razorpay`}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-sm font-mono"
                    />
                    <button 
                      onClick={() => copyToClipboard(`${window.location.origin}/api/webhook/razorpay`, 'webhook')}
                      className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs"
                    >
                      {copySuccess === 'webhook' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    * Set this in Razorpay Dashboard → Settings → Webhooks. Event: <strong>payment.captured</strong>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                    <strong>Note:</strong> Ensure you have set <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code>, and <code>RAZORPAY_WEBHOOK_SECRET</code> in your environment variables for the integration to work.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                System Info
              </h2>
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-sm text-slate-500">Node Environment</span>
                  <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-primary">production</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-sm text-slate-500">Firebase Project</span>
                  <span className="text-sm font-mono">{firebaseConfig.projectId}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">App Version</span>
                  <span className="text-sm font-bold">1.0.0</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} z-50 animate-in fade-in slide-in-from-right-4`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Admin;


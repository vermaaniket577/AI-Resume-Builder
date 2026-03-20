import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { Resume } from '../types';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';

const Score: React.FC = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResumes = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'resumes'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedResumes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resume));
        setResumes(fetchedResumes);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'resumes');
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading scores...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 w-full max-w-7xl mx-auto">
      <header className="bg-white p-6 pt-8 border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-900">Resume Scores</h1>
        <p className="text-slate-500 text-sm mt-1">Select a resume to view its detailed AI analysis.</p>
      </header>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumes.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Resumes Found</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">Create your first resume to get an AI score.</p>
            <button 
              onClick={() => navigate('/wizard')}
              className="bg-primary hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold transition-colors inline-flex items-center gap-2"
            >
              <Sparkles size={18} />
              Create Resume
            </button>
          </div>
        ) : (
          resumes.map(resume => {
            const score = resume.score || 0;
            return (
              <div 
                key={resume.id} 
                onClick={() => navigate(`/analysis/${resume.id}`)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                    <svg className="absolute w-full h-full -rotate-90">
                      <circle className="text-slate-100" cx="28" cy="28" fill="transparent" r="24" stroke="currentColor" strokeWidth="4" />
                      <circle 
                        className="text-primary transition-all duration-1000" 
                        cx="28" cy="28" fill="transparent" r="24" 
                        stroke="currentColor" strokeWidth="4"
                        strokeDasharray="150.8"
                        strokeDashoffset={150.8 - (150.8 * (score / 100))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-sm font-black text-slate-900">{score}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{resume.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                      {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work'}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Score;

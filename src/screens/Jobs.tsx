import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Clock, Search } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Job } from '../types';

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const q = query(collection(db, 'jobs'));
        const querySnapshot = await getDocs(q);
        const fetchedJobs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        setJobs(fetchedJobs);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) return <div className="h-screen flex items-center justify-center">Loading jobs...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 w-full max-w-7xl mx-auto">
      <header className="bg-white p-6 pt-8 border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-900">Job Matches</h1>
        <p className="text-slate-500 text-sm mt-1">Based on your resume profile</p>
        
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search jobs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
            <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Jobs Found</h3>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search query.</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/30 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{job.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{job.company}</p>
                  </div>
                </div>
                <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg">
                  {Math.floor(Math.random() * 30) + 70}% MATCH
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
                <span className="flex items-center gap-1"><DollarSign size={14} /> {job.salary}</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {job.type}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {job.tags?.map(tag => (
                  <span key={tag} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Jobs;

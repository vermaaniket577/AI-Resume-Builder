import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Resume } from '../types';
import { ArrowLeft, Check, Sparkles, Layout, Briefcase, Zap, AlignLeft, ShieldCheck, Star, FileText, Palette } from 'lucide-react';

const TEMPLATES = [
  { 
    id: 'classic', 
    name: 'Classic Professional', 
    icon: <Briefcase size={24} />, 
    desc: 'Single column, clean typography. Best for corporate roles.',
    preview: 'https://picsum.photos/seed/classic/200/280'
  },
  { 
    id: 'modern', 
    name: 'Modern Professional', 
    icon: <Layout size={24} />, 
    desc: 'Header with colored bar and modern fonts. Great for tech.',
    preview: 'https://picsum.photos/seed/modern/200/280'
  },
  { 
    id: 'minimal', 
    name: 'Minimal Clean', 
    icon: <AlignLeft size={24} />, 
    desc: 'Lots of white space, easy to scan. Best for freshers.',
    preview: 'https://picsum.photos/seed/minimal/200/280'
  },
  { 
    id: 'two-column', 
    name: 'Two-Column', 
    icon: <Layout size={24} />, 
    desc: 'Sidebar layout for skills. Best for experienced pros.',
    preview: 'https://picsum.photos/seed/twocol/200/280'
  },
  { 
    id: 'ats', 
    name: 'ATS Friendly', 
    icon: <ShieldCheck size={24} />, 
    desc: 'No graphics or icons. Optimized for automated screening.',
    preview: 'https://picsum.photos/seed/ats/200/280'
  },
  { 
    id: 'creative', 
    name: 'Creative Designer', 
    icon: <Zap size={24} />, 
    desc: 'Colorful sections and icons. Best for creative roles.',
    preview: 'https://picsum.photos/seed/creative/200/280'
  },
  { 
    id: 'executive', 
    name: 'Executive', 
    icon: <Star size={24} />, 
    desc: 'Premium typography, achievement focused. For senior managers.',
    preview: 'https://picsum.photos/seed/executive/200/280'
  },
  { 
    id: 'academic', 
    name: 'Academic', 
    icon: <FileText size={24} />, 
    desc: 'Detailed history and research focus. For professors.',
    preview: 'https://picsum.photos/seed/academic/200/280'
  },
  { 
    id: 'modern-sidebar', 
    name: 'Modern Sidebar', 
    icon: <Layout size={24} />, 
    desc: 'Technology-focused layout with tech stack sidebar.',
    preview: 'https://picsum.photos/seed/modsidebar/200/280'
  },
  { 
    id: 'elegant', 
    name: 'Elegant', 
    icon: <Palette size={24} />, 
    desc: 'Centered header and elegant fonts. For consultants.',
    preview: 'https://picsum.photos/seed/elegant/200/280'
  },
];

const TemplateMiniPreview: React.FC<{ id: string }> = ({ id }) => {
  const getLayout = () => {
    switch (id) {
      case 'classic':
        return (
          <div className="w-full h-full p-2 flex flex-col gap-1">
            <div className="h-2 w-1/2 bg-slate-300 rounded mx-auto mb-2" />
            <div className="h-1 w-full bg-slate-200 rounded" />
            <div className="h-1 w-full bg-slate-200 rounded" />
            <div className="h-1 w-3/4 bg-slate-200 rounded" />
            <div className="mt-2 h-2 w-1/3 bg-slate-300 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
          </div>
        );
      case 'modern':
        return (
          <div className="w-full h-full flex flex-col">
            <div className="h-6 w-full bg-primary/20 p-2 flex items-center gap-2">
              <div className="size-3 bg-primary/40 rounded-full" />
              <div className="h-2 w-1/2 bg-primary/40 rounded" />
            </div>
            <div className="p-2 space-y-2">
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-3/4 bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
            </div>
          </div>
        );
      case 'minimal':
        return (
          <div className="w-full h-full p-3 flex flex-col gap-3">
            <div className="h-1 w-1/3 bg-slate-400 rounded" />
            <div className="space-y-1">
              <div className="h-0.5 w-full bg-slate-200 rounded" />
              <div className="h-0.5 w-full bg-slate-200 rounded" />
              <div className="h-0.5 w-full bg-slate-200 rounded" />
            </div>
            <div className="h-1 w-1/4 bg-slate-400 rounded" />
            <div className="space-y-1">
              <div className="h-0.5 w-full bg-slate-200 rounded" />
              <div className="h-0.5 w-full bg-slate-200 rounded" />
            </div>
          </div>
        );
      case 'two-column':
      case 'modern-sidebar':
        return (
          <div className="w-full h-full flex">
            <div className="w-1/3 h-full bg-slate-100 p-2 space-y-2">
              <div className="size-4 bg-slate-300 rounded-full mx-auto" />
              <div className="h-1 w-full bg-slate-300 rounded" />
              <div className="h-1 w-full bg-slate-300 rounded" />
              <div className="h-1 w-full bg-slate-300 rounded" />
            </div>
            <div className="flex-1 p-2 space-y-2">
              <div className="h-2 w-1/2 bg-slate-300 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
            </div>
          </div>
        );
      case 'ats':
        return (
          <div className="w-full h-full p-2 font-mono flex flex-col gap-1">
            <div className="text-[6px] font-bold">NAME SURNAME</div>
            <div className="text-[4px] text-slate-400">Email | Phone | Location</div>
            <div className="mt-2 h-0.5 w-full bg-slate-300" />
            <div className="text-[5px] font-bold mt-1">EXPERIENCE</div>
            <div className="h-0.5 w-full bg-slate-200" />
            <div className="h-0.5 w-3/4 bg-slate-200" />
          </div>
        );
      case 'creative':
        return (
          <div className="w-full h-full flex flex-col">
            <div className="h-8 w-full bg-primary p-2 flex items-center justify-between">
              <div className="h-3 w-1/3 bg-white/40 rounded" />
              <div className="size-4 bg-white/40 rounded-lg" />
            </div>
            <div className="p-2 space-y-2">
              <div className="h-2 w-full bg-slate-100 rounded-r-lg border-l-2 border-primary" />
              <div className="h-1 w-3/4 bg-slate-200 rounded" />
              <div className="h-2 w-full bg-slate-100 rounded-r-lg border-l-2 border-primary" />
              <div className="h-1 w-full bg-slate-200 rounded" />
            </div>
          </div>
        );
      case 'executive':
        return (
          <div className="w-full h-full p-3 flex flex-col items-center text-center gap-2">
            <div className="h-2 w-2/3 bg-slate-800 rounded" />
            <div className="h-1 w-1/2 bg-primary/40 rounded" />
            <div className="w-full border-b border-slate-200 my-1" />
            <div className="space-y-1 w-full">
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
            </div>
          </div>
        );
      case 'academic':
        return (
          <div className="w-full h-full p-2 flex flex-col gap-1">
            <div className="h-2 w-1/3 bg-slate-400 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
            <div className="mt-2 h-1.5 w-1/4 bg-slate-400 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
            <div className="h-1 w-full bg-slate-100 rounded" />
          </div>
        );
      case 'elegant':
        return (
          <div className="w-full h-full p-4 flex flex-col items-center gap-2">
            <div className="h-3 w-3/4 border-b-2 border-primary pb-4 flex items-center justify-center">
              <div className="h-2 w-1/2 bg-slate-800 rounded" />
            </div>
            <div className="mt-2 space-y-1 w-full">
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
              <div className="h-1 w-full bg-slate-200 rounded" />
            </div>
          </div>
        );
      default:
        return <div className="w-full h-full bg-slate-50" />;
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 shadow-inner">
      {getLayout()}
    </div>
  );
};

const TemplateSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'resumes', id));
        if (docSnap.exists()) {
          const data = docSnap.data() as Resume;
          setResume({ id: docSnap.id, ...data } as Resume);
          setSelectedTemplate(data.templateId || 'modern');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `resumes/${id}`);
      }
      setLoading(false);
    };
    fetchResume();
  }, [id]);

  const handleGenerate = async () => {
    if (!id) return;
    try {
      setIsGenerating(true);
      await updateDoc(doc(db, 'resumes', id), {
        templateId: selectedTemplate
      });
      navigate(`/preview/${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `resumes/${id}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading templates...</div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 flex flex-col w-full relative">
      <header className="flex items-center p-4 border-b border-primary/10 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Choose Template</h2>
      </header>

      <main className="flex-1 p-6 overflow-y-auto pb-32 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">Select a Layout</h3>
          <p className="text-slate-500 dark:text-slate-400">Choose the design that best represents your professional brand.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {TEMPLATES.map((template) => (
            <div 
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                selectedTemplate === template.id 
                  ? 'border-primary ring-4 ring-primary/10 scale-[1.02]' 
                  : 'border-slate-100 dark:border-slate-800 hover:border-primary/30'
              }`}
            >
              <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                <TemplateMiniPreview id={template.id} />
                {selectedTemplate === template.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-primary text-white p-2 rounded-full shadow-lg scale-110 animate-in zoom-in duration-200">
                      <Check size={24} />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-primary">{template.icon}</span>
                  <p className="font-bold text-sm">{template.name}</p>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">{template.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-4 z-10 flex justify-center">
        <div className="w-full max-w-md">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Generating Resume...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Final Resume
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default TemplateSelection;

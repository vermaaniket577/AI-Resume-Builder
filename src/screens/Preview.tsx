import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Resume } from '../types';
import { ArrowLeft, Download, Edit, BarChart2, Check, X, Palette, Layout as LayoutIcon, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FullScreenLoader } from '../components/Loader';

const TEMPLATES = [
  { id: 'classic', name: 'Classic', icon: <LayoutIcon size={16} /> },
  { id: 'modern', name: 'Modern', icon: <LayoutIcon size={16} /> },
  { id: 'minimal', name: 'Minimal', icon: <LayoutIcon size={16} /> },
  { id: 'two-column', name: 'Two-Column', icon: <LayoutIcon size={16} /> },
  { id: 'ats', name: 'ATS Friendly', icon: <LayoutIcon size={16} /> },
  { id: 'creative', name: 'Creative', icon: <LayoutIcon size={16} /> },
  { id: 'executive', name: 'Executive', icon: <LayoutIcon size={16} /> },
  { id: 'academic', name: 'Academic', icon: <LayoutIcon size={16} /> },
  { id: 'modern-sidebar', name: 'Modern Sidebar', icon: <LayoutIcon size={16} /> },
  { id: 'elegant', name: 'Elegant', icon: <LayoutIcon size={16} /> },
];

const COLORS = [
  { id: '#4f46e5', name: 'Indigo', class: 'bg-[#4f46e5]' },
  { id: '#10b981', name: 'Emerald', class: 'bg-[#10b981]' },
  { id: '#f59e0b', name: 'Amber', class: 'bg-[#f59e0b]' },
  { id: '#ef4444', name: 'Red', class: 'bg-[#ef4444]' },
  { id: '#334155', name: 'Slate', class: 'bg-[#334155]' },
];

const Preview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [selectedColor, setSelectedColor] = useState('#4f46e5');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const resumeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const padding = 32; // Total horizontal padding
        const availableWidth = containerWidth - padding;
        const newScale = Math.min(1, availableWidth / 794);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [loading]);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'resumes', id));
        if (docSnap.exists()) {
          const data = docSnap.data() as Resume;
          setResume({ id: docSnap.id, ...data } as Resume);
          setSelectedTemplate(data.templateId || 'modern');
          setSelectedColor(data.themeColor || '#4f46e5');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `resumes/${id}`);
      }
      setLoading(false);
    };
    fetchResume();
  }, [id]);

  const handleDownload = async () => {
    if (!resumeRef.current) return;
    
    try {
      setIsGenerating(true);
      // Save choices to Firestore
      if (id && resume) {
        await updateDoc(doc(db, 'resumes', id), {
          templateId: selectedTemplate,
          themeColor: selectedColor
        });
      }

      const canvas = await html2canvas(resumeRef.current, {
        scale: 2, // 2 is usually enough for high quality and more stable
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        onclone: (document, element) => {
          const el = element as HTMLElement;
          el.style.transform = 'none';
          el.style.transformOrigin = 'top center';
          el.style.width = '794px';
          el.style.margin = '0';
          el.style.padding = '48px';
          el.style.boxShadow = 'none';
          el.style.borderRadius = '0';
          el.style.border = 'none';
          
          // Force height to be at least A4 height
          const currentHeight = el.offsetHeight;
          const minA4Height = 1123;
          if (currentHeight < minA4Height) {
            el.style.minHeight = `${minA4Height}px`;
          }
          
          // Ensure all text is visible and correctly colored for print
          const textElements = el.querySelectorAll('*');
          textElements.forEach((node) => {
            const htmlNode = node as HTMLElement;
            const style = window.getComputedStyle(htmlNode);
            
            // Fix for transparent text
            if (style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent') {
              htmlNode.style.color = '#000000';
            }
            
            // Fix for potential issues with text-justify in html2canvas
            if (style.textAlign === 'justify') {
              htmlNode.style.textAlign = 'left';
            }
          });

          // Fix flex column for skills and centering in PDF
          const skillContainers = el.querySelectorAll('.flex.flex-col.items-center');
          skillContainers.forEach(s => {
            const container = s as HTMLElement;
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.width = '100%';
            
            // Ensure child spans are centered and have margin
            const items = container.querySelectorAll('span');
            items.forEach((item, idx) => {
              const span = item as HTMLElement;
              span.style.display = 'inline-block';
              span.style.textAlign = 'center';
              if (idx !== items.length - 1) {
                span.style.marginBottom = '8px';
              }
            });
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      let fileName = `${resume?.title || 'resume'}.pdf`;
      if (resume?.originalFileName) {
        // Use original file name, replace extension with .pdf if needed
        fileName = resume.originalFileName;
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName = fileName.replace(/\.[^/.]+$/, "") + ".pdf";
        }
      }
      
      pdf.save(fileName);
      setShowOptions(false);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <FullScreenLoader message="Preparing preview..." />;
  if (!resume) return <div className="h-screen flex items-center justify-center">Resume not found</div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 flex flex-col w-full max-w-3xl mx-auto shadow-2xl relative overflow-x-hidden">
      {isGenerating && <FullScreenLoader message="Generating PDF..." />}
      <header className="flex items-center p-4 border-b border-primary/10 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold flex-1 text-center">Resume Preview</h2>
        <button onClick={() => navigate(`/analysis/${id}`)} className="p-2 rounded-full hover:bg-primary/10 transition-colors text-primary">
          <BarChart2 size={24} />
        </button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto pb-32 bg-slate-100 dark:bg-slate-950/50" ref={containerRef}>
        {/* Resume Paper Preview Wrapper */}
        <div 
          className="flex justify-center transition-all duration-300"
          style={{ height: resumeRef.current ? `${resumeRef.current.offsetHeight * scale}px` : 'auto' }}
        >
          <div 
            ref={resumeRef}
            style={{ 
              width: '794px', 
              minHeight: '1123px',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              backgroundColor: 'white',
              color: '#1e293b',
              padding: '48px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            }}
            className={`flex flex-col text-[11px] leading-relaxed shrink-0 ${
              selectedTemplate === 'minimal' || selectedTemplate === 'ats' ? 'font-mono' : 
              selectedTemplate === 'elegant' || selectedTemplate === 'executive' ? 'font-serif' : 'font-sans'
            }`}
          >
            {/* Layout: Centered (Elegant, Executive, Professional/Classic) */}
            {(selectedTemplate === 'elegant' || selectedTemplate === 'executive' || selectedTemplate === 'classic') ? (
              <div className="flex flex-col items-center text-center mb-8 border-b-2 pb-6" style={{ borderColor: selectedColor }}>
                <h1 className="text-3xl font-bold uppercase tracking-tighter mb-2">{resume.personalInfo.fullName}</h1>
                <p className="font-bold text-sm mb-4" style={{ color: selectedColor }}>{resume.experience[0]?.role || 'Professional'}</p>
                <div className="flex flex-wrap justify-center -m-1 text-slate-500 text-[10px]">
                  <span className="m-1">{resume.personalInfo.email}</span>
                  <span className="m-1">{resume.personalInfo.phone}</span>
                  <span className="m-1">{resume.personalInfo.location}</span>
                  {resume.personalInfo.github && <span className="m-1">GitHub: {resume.personalInfo.github}</span>}
                  {resume.personalInfo.twitter && <span className="m-1">Twitter: {resume.personalInfo.twitter}</span>}
                  {resume.personalInfo.linkedin && <span className="m-1">LinkedIn: {resume.personalInfo.linkedin}</span>}
                  {resume.personalInfo.portfolio && <span className="m-1">Portfolio: {resume.personalInfo.portfolio}</span>}
                </div>
              </div>
            ) : (selectedTemplate === 'two-column' || selectedTemplate === 'modern-sidebar') ? (
              /* Layout: Two Column Header handled inside the main grid */
              null
            ) : (
              /* Layout: Standard (Modern, Minimal, ATS, Creative) */
              <div className={`pb-6 mb-6 flex justify-between items-start ${selectedTemplate === 'modern' ? 'border-l-8 pl-6' : 'border-b-2'} `} style={{ borderColor: selectedColor }}>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{resume.personalInfo.fullName}</h1>
                  <p className="font-bold text-sm" style={{ color: selectedColor }}>{resume.experience[0]?.role || 'Professional'}</p>
                  <div className="flex flex-wrap -m-1 mt-3 text-slate-500 text-[10px]">
                    <span className="m-1">{resume.personalInfo.email}</span>
                    <span className="m-1">{resume.personalInfo.phone}</span>
                    <span className="m-1">{resume.personalInfo.location}</span>
                    {resume.personalInfo.github && <span className="m-1">GH: {resume.personalInfo.github}</span>}
                    {resume.personalInfo.twitter && <span className="m-1">TW: {resume.personalInfo.twitter}</span>}
                    {resume.personalInfo.linkedin && <span className="m-1">LI: {resume.personalInfo.linkedin}</span>}
                    {resume.personalInfo.portfolio && <span className="m-1">Web: {resume.personalInfo.portfolio}</span>}
                  </div>
                </div>
                {resume.personalInfo.photoUrl && selectedTemplate !== 'ats' && (
                  <div className="size-24 rounded-lg overflow-hidden border-2 ml-6" style={{ borderColor: selectedColor }}>
                    <img src={resume.personalInfo.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}

            {/* Main Content Area */}
            {(selectedTemplate === 'two-column' || selectedTemplate === 'modern-sidebar') ? (
              <div className="flex -mx-4 flex-1">
                {/* Sidebar */}
                <aside className="w-1/3 space-y-8 border-r px-4" style={{ borderColor: `${selectedColor}20` }}>
                  {resume.personalInfo.photoUrl && (
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 mb-6" style={{ borderColor: selectedColor }}>
                      <img src={resume.personalInfo.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: selectedColor }}>Contact</h3>
                    <div className="space-y-2 text-slate-600 text-[10px]">
                      <p className="break-all">{resume.personalInfo.email}</p>
                      <p>{resume.personalInfo.phone}</p>
                      <p>{resume.personalInfo.location}</p>
                      {resume.personalInfo.github && <p className="break-all">GH: {resume.personalInfo.github}</p>}
                      {resume.personalInfo.twitter && <p className="break-all">TW: {resume.personalInfo.twitter}</p>}
                      {resume.personalInfo.linkedin && <p className="break-all">LI: {resume.personalInfo.linkedin}</p>}
                      {resume.personalInfo.portfolio && <p className="break-all">Web: {resume.personalInfo.portfolio}</p>}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: selectedColor }}>Skills</h3>
                    <div className="flex flex-col items-center">
                      {resume.skills.map((s, idx) => (
                        <span key={s} className={`px-2 py-1 bg-slate-100 rounded text-[10px] font-medium inline-block ${idx !== resume.skills.length - 1 ? 'mb-2' : ''}`}>{s}</span>
                      ))}
                    </div>
                  </section>

                  {resume.languages && resume.languages.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: selectedColor }}>Languages</h3>
                      <div className="space-y-2 text-[10px] text-center">
                        {resume.languages.map(l => <p key={l} className="text-slate-600">{l}</p>)}
                      </div>
                    </section>
                  )}
                </aside>

                {/* Main Column */}
                <div className="flex-1 space-y-8 px-4">
                  <header>
                    <h1 className="text-2xl font-bold uppercase">{resume.personalInfo.fullName}</h1>
                    <p className="font-bold text-sm" style={{ color: selectedColor }}>{resume.experience[0]?.role}</p>
                  </header>

                  <section>
                    <h3 className="text-xs font-bold border-b mb-3 uppercase tracking-wider" style={{ color: selectedColor, borderColor: `${selectedColor}20` }}>Summary</h3>
                    <p className="text-slate-700 leading-relaxed text-left text-[11px]">{resume.summary}</p>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold border-b mb-3 uppercase tracking-wider" style={{ color: selectedColor, borderColor: `${selectedColor}20` }}>Experience</h3>
                    <div className="space-y-6">
                      {resume.experience.map(exp => (
                        <div key={exp.id}>
                          <div className="flex justify-between font-bold text-[11px]">
                            <span>{exp.role}</span>
                            <span style={{ color: selectedColor }}>{exp.startDate} - {exp.endDate}</span>
                          </div>
                          <p className="italic text-slate-600 text-[10px]">{exp.company}</p>
                          <p className="mt-2 text-slate-700 whitespace-pre-line text-left text-[11px]">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold border-b mb-3 uppercase tracking-wider" style={{ color: selectedColor, borderColor: `${selectedColor}20` }}>Education</h3>
                    <div className="space-y-4">
                      {resume.education.map(edu => (
                        <div key={edu.id}>
                          <p className="font-bold text-[11px]">{edu.degree}</p>
                          <p className="text-slate-600 text-[10px]">{edu.school} | {edu.gradDate}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {resume.projects && resume.projects.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold border-b mb-3 uppercase tracking-wider" style={{ color: selectedColor, borderColor: `${selectedColor}20` }}>Projects</h3>
                      <div className="space-y-4">
                        {resume.projects.map(p => (
                          <div key={p.id}>
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-[11px]">{p.name}</span>
                              {p.link && <span className="text-[10px] text-primary italic">{p.link}</span>}
                            </div>
                            <p className="text-slate-700 leading-relaxed text-left text-[11px]">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              /* Standard Single Column Layout */
              <div className={`${selectedTemplate === 'minimal' || selectedTemplate === 'ats' ? 'space-y-8' : 'space-y-6'}`}>
                {/* Summary */}
                <section>
                  <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>
                    {selectedTemplate === 'minimal' ? 'Objective' : 'Summary'}
                  </h3>
                  <p className="text-slate-700 leading-relaxed text-left text-[11px]">{resume.summary}</p>
                </section>

                {/* Experience */}
                <section>
                  <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>Experience</h3>
                  <div className="space-y-5">
                    {resume.experience.map((exp) => (
                      <div key={exp.id}>
                        <div className="flex justify-between font-bold text-[11px]">
                          <span>{exp.role}</span>
                          <span style={{ color: selectedColor }}>{exp.startDate} - {exp.endDate}</span>
                        </div>
                        <p className="italic text-slate-600 font-semibold text-[10px]">{exp.company}</p>
                        <p className="mt-2 text-slate-700 whitespace-pre-line leading-snug text-left text-[11px]">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="flex items-center -mx-4">
                  {/* Education */}
                  <section className="w-1/2 px-4">
                    <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>Education</h3>
                    <div className="space-y-3">
                      {resume.education.map((edu) => (
                        <div key={edu.id}>
                          <p className="font-bold text-[11px]">{edu.degree}</p>
                          <p className="text-slate-600 text-[10px]">{edu.school}</p>
                          <p className="text-[10px] text-slate-400">{edu.gradDate}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Skills */}
                  <section className="w-1/2 px-4">
                    <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider text-center ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>Skills</h3>
                    <div className="flex flex-col items-center">
                      {resume.skills.map((skill, idx) => (
                        <span key={skill} className={`px-2 py-1 rounded text-slate-700 font-medium inline-block text-[10px] ${idx !== resume.skills.length - 1 ? 'mb-2' : ''} ${selectedTemplate === 'ats' ? 'bg-transparent border' : 'bg-slate-100'}`}>{skill}</span>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Projects & Certs */}
                <div className="flex flex-wrap -mx-4">
                  {resume.projects && resume.projects.length > 0 && (
                    <section className="w-full px-4 mb-6">
                      <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>Projects</h3>
                      <div className="space-y-3">
                        {resume.projects.map(p => (
                          <div key={p.id}>
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-[11px]">{p.name}</span>
                              {p.link && <span className="text-[10px] text-primary italic">{p.link}</span>}
                            </div>
                            <p className="text-slate-600 leading-tight text-left text-[11px]">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {resume.certifications && resume.certifications.length > 0 && (
                    <section className="w-1/2 px-4">
                      <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider text-center ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>Certifications</h3>
                      <ul className="list-disc list-inside text-slate-700 space-y-2 text-[10px] text-center">
                        {resume.certifications.map(c => <li key={c}>{c}</li>)}
                      </ul>
                    </section>
                  )}
                </div>

                {/* Languages */}
                {resume.languages && resume.languages.length > 0 && (
                  <section>
                    <h3 className={`text-xs font-bold border-b mb-3 uppercase tracking-wider text-center ${selectedTemplate === 'creative' ? 'bg-slate-100 p-2 rounded-r-lg border-l-4' : ''}`} style={{ color: selectedColor, borderColor: selectedTemplate === 'creative' ? selectedColor : `${selectedColor}20` }}>Languages</h3>
                    <div className="flex flex-wrap justify-center -m-1">
                      {resume.languages.map(l => <span key={l} className="m-1 text-slate-700 font-medium inline-block text-[10px]">{l}</span>)}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full max-w-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 p-4 flex gap-4 z-10">
        <button 
          onClick={() => navigate(`/wizard/${id}`)}
          className="flex-1 h-12 rounded-xl border-2 border-primary/20 text-primary font-bold flex items-center justify-center gap-2"
        >
          <Edit size={20} />
          Edit
        </button>
        <button 
          onClick={() => setShowOptions(true)}
          className="flex-[1.5] h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Download PDF
        </button>
      </footer>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md md:max-w-lg rounded-3xl p-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Customize PDF</h3>
              <button onClick={() => setShowOptions(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">Select Template</p>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedTemplate === t.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                    >
                      {t.icon}
                      <span className="text-xs font-bold">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-widest">Theme Color</p>
                <div className="flex justify-between">
                  {COLORS.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => setSelectedColor(c.id)}
                      className={`size-10 rounded-full flex items-center justify-center transition-transform ${c.class} ${selectedColor === c.id ? 'scale-110 ring-4 ring-primary/20' : 'hover:scale-105'}`}
                    >
                      {selectedColor === c.id && <Check size={20} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2 mt-4"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Generate & Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preview;

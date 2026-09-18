import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'button' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'nav' 
}) => {
  const { isInstalled } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running in standalone installed mode, don't show the prompt
  if (isInstalled) {
    return null;
  }

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all ${className}`}
        >
          <Smartphone size={16} />
          <span>Get APK / Install App</span>
        </button>
        <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (variant === 'badge') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 transition-all ${className}`}
        >
          <Download size={14} />
          <span>Download App / APK</span>
        </button>
        <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-2 transition-colors relative md:px-4 md:py-2 md:rounded-full text-slate-400 dark:text-slate-500 hover:text-primary md:hover:bg-slate-100 dark:md:hover:bg-slate-800 ${className}`}
        title="Install Mobile App / Download APK"
      >
        <Smartphone size={20} strokeWidth={2} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-[10px] md:text-sm font-bold tracking-wide text-indigo-600 dark:text-indigo-400">
          App / APK
        </span>
      </button>
      <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

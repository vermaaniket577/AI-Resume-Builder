import React from 'react';
import { Loader2 } from 'lucide-react';

export const FullScreenLoader = ({ message = "Loading..." }: { message?: string }) => {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm text-slate-900 dark:text-slate-100">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in duration-300">
        <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <p className="text-sm font-bold">{message}</p>
      </div>
    </div>
  );
};

export const Spinner = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} />
);

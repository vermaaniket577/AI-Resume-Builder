import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PenLine, BarChart2, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, profile } = useAuth();

  const navItems = [
    { path: '/', icon: PenLine, label: 'Builder', match: (p: string) => p === '/' || p.startsWith('/wizard') || p.startsWith('/preview') },
    { path: '/score', icon: BarChart2, label: 'Score', match: (p: string) => p.startsWith('/score') || p.startsWith('/analysis') },
    { path: '/settings', icon: User, label: 'Profile', match: (p: string) => p.startsWith('/settings') },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 flex flex-col w-full relative overflow-x-hidden">
      <nav className="fixed bottom-0 md:bottom-auto md:top-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t md:border-t-0 md:border-b border-slate-100 dark:border-slate-800 flex justify-around md:justify-center items-center py-3 px-4 pb-6 md:pb-3 z-50 gap-2 md:gap-8">
        {navItems.map((item) => {
          const isActive = item.match(location.pathname);
          const isProfile = item.label === 'Profile';
          
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col md:flex-row items-center gap-1.5 md:gap-2 transition-colors relative md:px-4 md:py-2 md:rounded-full",
                isActive ? "text-primary md:bg-primary/10" : "text-slate-400 dark:text-slate-500 hover:text-primary md:hover:bg-slate-100 dark:md:hover:bg-slate-800"
              )}
            >
              {isActive && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary/10 rounded-full blur-md -z-10 md:hidden"></div>
              )}
              {isProfile && user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className={cn(
                    "size-6 rounded-full object-cover border-2",
                    isActive ? "border-primary" : "border-transparent"
                  )} 
                />
              ) : (
                <item.icon size={22} className={isActive ? "fill-primary/10 md:fill-none" : ""} strokeWidth={isActive ? 2.5 : 2} />
              )}
              <span className="text-[10px] md:text-sm font-bold tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pb-24 md:pb-8 md:pt-24 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;

import React, { useState } from 'react';
import { Sparkles, Loader2, Crown } from 'lucide-react';
import { aiService } from '../services/aiService';
import { useAuth } from '../App';

interface AIAssistedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (value: string) => void;
  context?: string;
}

export const AIAssistedTextarea: React.FC<AIAssistedTextareaProps> = ({ 
  value, 
  onValueChange, 
  context = "resume",
  className = "",
  ...props 
}) => {
  const { profile } = useAuth();
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    if (!profile?.isPremium) {
      alert("This is a premium feature. Please upgrade to use AI assistance.");
      return;
    }
    if (!value.trim()) return;
    setIsImproving(true);
    try {
      const improvedText = await aiService.improveText(value, context);
      onValueChange(improvedText);
    } catch (error) {
      console.error("Failed to improve text:", error);
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="relative group w-full">
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={`w-full ${className}`}
        {...props}
      />
      
      <div className="absolute bottom-3 right-3 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={handleImprove}
          disabled={isImproving || !value.trim()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${profile?.isPremium ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'} disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors shadow-sm backdrop-blur-sm`}
          title={profile?.isPremium ? "Suggest to improve score" : "Pro Feature"}
        >
          {isImproving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            profile?.isPremium ? <Sparkles size={14} /> : <Crown size={14} />
          )}
          <span>{isImproving ? "Improving..." : profile?.isPremium ? "Improve Score" : "Pro Improve"}</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { aiService } from '../services/aiService';

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
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors shadow-sm backdrop-blur-sm"
          title="Suggest to improve score"
        >
          {isImproving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{isImproving ? "Improving..." : "Improve Score"}</span>
        </button>
      </div>
    </div>
  );
};

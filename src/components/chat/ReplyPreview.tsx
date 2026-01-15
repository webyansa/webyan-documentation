import React from 'react';
import { X, Reply } from 'lucide-react';

interface ReplyPreviewProps {
  replyTo: {
    id: string;
    body: string;
    sender_name?: string;
    sender_type: string;
  };
  onClear: () => void;
  isDark?: boolean;
  webyanSecondary?: string;
}

export default function ReplyPreview({ replyTo, onClear, isDark = false, webyanSecondary = '#24c2ec' }: ReplyPreviewProps) {
  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div 
      className={`flex items-center gap-3 px-4 py-2 border-b transition-all ${
        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div 
        className="w-1 h-10 rounded-full"
        style={{ backgroundColor: webyanSecondary }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Reply className="h-3 w-3" style={{ color: webyanSecondary }} />
          <span 
            className="text-xs font-medium"
            style={{ color: webyanSecondary }}
          >
            رد على {replyTo.sender_type === 'client' ? 'رسالتك' : (replyTo.sender_name || 'الدعم')}
          </span>
        </div>
        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {truncateText(replyTo.body)}
        </p>
      </div>
      <button
        onClick={onClear}
        className={`p-1.5 rounded-lg transition-colors ${
          isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
        }`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

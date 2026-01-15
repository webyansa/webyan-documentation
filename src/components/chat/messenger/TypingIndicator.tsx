import React from 'react';

interface TypingIndicatorProps {
  name?: string;
  isDark?: boolean;
  primaryColor?: string;
}

export function TypingIndicator({ name, isDark = false, primaryColor }: TypingIndicatorProps) {
  const dotColor = primaryColor || (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)');
  
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl ${
      isDark ? 'bg-slate-800' : 'bg-slate-100'
    }`}>
      <div className="flex gap-1">
        <span 
          className="w-2 h-2 rounded-full animate-bounce" 
          style={{ backgroundColor: dotColor, animationDelay: '0ms', animationDuration: '0.6s' }} 
        />
        <span 
          className="w-2 h-2 rounded-full animate-bounce" 
          style={{ backgroundColor: dotColor, animationDelay: '150ms', animationDuration: '0.6s' }} 
        />
        <span 
          className="w-2 h-2 rounded-full animate-bounce" 
          style={{ backgroundColor: dotColor, animationDelay: '300ms', animationDuration: '0.6s' }} 
        />
      </div>
      {name && (
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {name} يكتب...
        </span>
      )}
    </div>
  );
}

export default TypingIndicator;

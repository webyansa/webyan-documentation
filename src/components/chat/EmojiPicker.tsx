import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const emojiCategories = {
  'الشائعة': ['😀', '😊', '😃', '😄', '😁', '🥰', '😍', '🤩', '😘', '😗', '😚', '🙂', '🤗', '🤔', '🤭', '🥳'],
  'المشاعر': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💓', '💘', '💝', '✨', '🌟'],
  'الأيدي': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '🙏'],
  'الأنشطة': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '💡', '📌', '📍', '✅', '❌', '⭕', '❗', '❓', '💬'],
  'الأعمال': ['💼', '📊', '📈', '📉', '💰', '💳', '💎', '🔧', '⚙️', '🔗', '📧', '📞', '💻', '🖥️', '📱', '⌨️']
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isDark?: boolean;
}

export default function EmojiPicker({ onEmojiSelect, isDark = false }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('الشائعة');

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 rounded-xl transition-all duration-200 hover:scale-110 ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={`w-80 p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
        side="top"
        align="start"
      >
        {/* Category tabs */}
        <div className={`flex gap-1 pb-2 mb-2 border-b overflow-x-auto ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all ${
                activeCategory === category
                  ? isDark 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-cyan-50 text-cyan-600'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-700'
                    : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
          {emojiCategories[activeCategory as keyof typeof emojiCategories].map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              className={`w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-all hover:scale-125 ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

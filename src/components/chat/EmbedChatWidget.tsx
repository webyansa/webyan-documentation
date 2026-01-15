import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Loader2, CheckCheck, Headphones, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmbedChatWidgetProps {
  embedToken: string;
  organizationName?: string;
  contactEmail?: string;
  primaryColor?: string;
  theme?: 'light' | 'dark';
}

const statusLabels = {
  unassigned: 'في انتظار الرد',
  assigned: 'متصل الآن',
  closed: 'المحادثة مغلقة'
};

const statusColors = {
  unassigned: 'bg-amber-400',
  assigned: 'bg-emerald-400',
  closed: 'bg-slate-400'
};

export default function EmbedChatWidget({ 
  embedToken, 
  organizationName = 'الدعم الفني', 
  contactEmail,
  primaryColor,
  theme = 'light'
}: EmbedChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(contactEmail || '');
  const [messageText, setMessageText] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentConversation,
    messages,
    sending,
    startConversation,
    sendMessage
  } = useChat({ embedToken, autoFetch: false });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    window.parent.postMessage({ 
      type: isOpen ? 'WEBYAN_CHAT_OPENED' : 'WEBYAN_CHAT_CLOSED' 
    }, '*');
  }, [isOpen]);

  const handleStartChat = async () => {
    if (!name.trim() || !initialMessage.trim()) return;
    await startConversation('محادثة جديدة', initialMessage, name, email);
    setInitialMessage('');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    await sendMessage(currentConversation.id, messageText, undefined, name);
    setMessageText('');
  };

  const isDark = theme === 'dark';

  // Webyan brand colors
  const webyanPrimary = '#263c84'; // Dark blue
  const webyanSecondary = '#24c2ec'; // Cyan
  const gradientStyle = `linear-gradient(135deg, ${webyanPrimary} 0%, ${webyanSecondary} 100%)`;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 group z-50"
      >
        {/* Pulse animation ring */}
        <span 
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ background: webyanSecondary }}
        />
        {/* Main button */}
        <div 
          className="relative h-16 w-16 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl"
          style={{ background: gradientStyle }}
        >
          <MessageCircle className="h-7 w-7" />
        </div>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div 
            className="text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap shadow-lg"
            style={{ background: webyanPrimary }}
          >
            مرحباً! كيف يمكننا مساعدتك؟
          </div>
          <div 
            className="w-3 h-3 rotate-45 mx-auto -mt-1.5"
            style={{ background: webyanPrimary }}
          />
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 left-6 w-[380px] sm:w-[420px] h-[580px] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border ${
      isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'
    }`}
    style={{ boxShadow: '0 25px 50px -12px rgba(38, 60, 132, 0.25)' }}
    >
      {/* Header with gradient */}
      <div 
        className="text-white p-5 relative overflow-hidden"
        style={{ background: gradientStyle }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{organizationName}</h3>
              {currentConversation ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${statusColors[currentConversation.status]} animate-pulse`} />
                  <span className="text-sm text-white/90">
                    {statusLabels[currentConversation.status]}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-white/80">نحن هنا لمساعدتك</p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-xl text-white hover:bg-white/20 transition-colors" 
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {!currentConversation ? (
        /* Start Chat Form */
        <div className="flex-1 p-6 overflow-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div 
              className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${webyanSecondary}20 0%, ${webyanPrimary}20 100%)` }}
            >
              <Sparkles className="h-10 w-10" style={{ color: webyanSecondary }} />
            </div>
            <h3 className={`font-bold text-xl mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              مرحباً بك! 👋
            </h3>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              يسعدنا التواصل معك. أخبرنا كيف يمكننا مساعدتك اليوم؟
            </p>
          </div>
          
          {/* Form */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="اسمك الكريم *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`h-12 rounded-xl text-base px-4 transition-all duration-200 focus:ring-2 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20' 
                    : 'bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
              />
            </div>
            <div className="relative">
              <Input
                placeholder="البريد الإلكتروني (اختياري)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-12 rounded-xl text-base px-4 transition-all duration-200 focus:ring-2 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20' 
                    : 'bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
              />
            </div>
            <div className="relative">
              <Textarea
                placeholder="اكتب رسالتك هنا... *"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={4}
                className={`rounded-xl text-base px-4 py-3 resize-none transition-all duration-200 focus:ring-2 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20' 
                    : 'bg-slate-50 border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleStartChat} 
            className="w-full h-14 rounded-xl mt-6 text-base font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            style={{ background: gradientStyle }}
            disabled={!name.trim() || !initialMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin ml-2" />
            ) : (
              <Send className="h-5 w-5 ml-2" />
            )}
            إرسال الرسالة
          </Button>

          {/* Trust badge */}
          <p className={`text-center text-xs mt-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            🔒 محادثاتك آمنة ومشفرة
          </p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-4">
              {/* Welcome message */}
              <div className={`text-center py-3 px-4 rounded-2xl text-sm ${
                isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                <Sparkles className="h-4 w-4 inline-block ml-1" style={{ color: webyanSecondary }} />
                مرحباً! كيف يمكننا مساعدتك اليوم؟
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'client' ? 'justify-start' : 'justify-end'}`}
                >
                  {msg.sender_type === 'system' ? (
                    <div className={`text-center text-xs rounded-full px-4 py-2 w-full ${
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {msg.body}
                    </div>
                  ) : (
                    <div className="max-w-[85%] group">
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm shadow-sm transition-shadow ${
                          msg.sender_type === 'client'
                            ? 'text-white rounded-bl-md'
                            : isDark 
                              ? 'bg-slate-800 rounded-br-md border border-slate-700' 
                              : 'bg-slate-100 rounded-br-md'
                        }`}
                        style={msg.sender_type === 'client' ? { background: gradientStyle } : {}}
                      >
                        {msg.sender_type === 'agent' && (
                          <p className="text-xs font-semibold mb-1.5" style={{ color: webyanSecondary }}>
                            {msg.sender_name || 'فريق الدعم'}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      } ${msg.sender_type === 'client' ? 'justify-start' : 'justify-end'}`}>
                        <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                        {msg.is_read && msg.sender_type === 'client' && (
                          <CheckCheck className="h-3.5 w-3.5" style={{ color: webyanSecondary }} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {currentConversation.status !== 'closed' ? (
            <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sending}
                    className={`h-12 rounded-xl text-base px-4 border-2 transition-all duration-200 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-600 focus:border-cyan-500' 
                        : 'bg-white border-slate-200 focus:border-cyan-500'
                    }`}
                  />
                </div>
                <Button 
                  size="icon" 
                  onClick={handleSendMessage} 
                  disabled={sending || !messageText.trim()}
                  className="h-12 w-12 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 disabled:opacity-50"
                  style={{ background: gradientStyle }}
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className={`p-4 text-center ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm">تم إغلاق هذه المحادثة</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Powered by Webyan */}
      <div className={`px-4 py-2 text-center text-[10px] border-t ${
        isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'
      }`}>
        مدعوم من <span className="font-semibold" style={{ color: webyanSecondary }}>ويبيان</span>
      </div>
    </div>
  );
}

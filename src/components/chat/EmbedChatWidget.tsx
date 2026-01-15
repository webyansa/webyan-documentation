import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Loader2, CheckCheck, Headphones, Sparkles, User, Mail, Edit3, Image, Reply, CornerDownLeft, Volume2, VolumeX } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import EmojiPicker from './EmojiPicker';
import ImagePreviewModal from './ImagePreviewModal';
import ReplyPreview from './ReplyPreview';
import { TypingIndicator } from './messenger/TypingIndicator';

interface Message {
  id: string;
  body: string;
  sender_type: string;
  sender_name?: string;
  created_at: string;
  is_read?: boolean;
  attachments?: string[];
  reply_to_id?: string;
  reply_to_body?: string;
  reply_to_sender?: string;
}

interface EmbedChatWidgetProps {
  embedToken: string;
  organizationName?: string;
  contactEmail?: string;
  primaryColor?: string;
  secondaryColor?: string;
  theme?: 'light' | 'dark';
  prefillName?: string;
  prefillEmail?: string;
  defaultMessage?: string;
  welcomeMessage?: string;
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

// Professional preset messages
const presetMessages = [
  { icon: '💬', text: 'مرحباً، أحتاج المساعدة بخصوص حسابي', label: 'حسابي' },
  { icon: '❓', text: 'لدي استفسار حول الخدمات المتاحة', label: 'استفسار' },
  { icon: '🔧', text: 'أواجه مشكلة تقنية أحتاج مساعدة في حلها', label: 'مشكلة تقنية' },
  { icon: '📋', text: 'أريد متابعة طلب سابق', label: 'متابعة طلب' },
];

export default function EmbedChatWidget({ 
  embedToken, 
  organizationName = 'الدعم الفني', 
  contactEmail,
  primaryColor = '#263c84',
  secondaryColor = '#24c2ec',
  theme = 'light',
  prefillName = '',
  prefillEmail = '',
  defaultMessage = '',
  welcomeMessage = 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.'
}: EmbedChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail || contactEmail || '');
  const [messageText, setMessageText] = useState('');
  const [initialMessage, setInitialMessage] = useState(defaultMessage);
  const [isPolling, setIsPolling] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or retrieve a unique session ID for this embed user
  const getSessionId = () => {
    const storageKey = `webyan_chat_session_${embedToken}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;
    const newId = `embed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, newId);
    return newId;
  };
  const sessionId = useRef(getSessionId());
  
  // Conversation persistence key
  const conversationStorageKey = `webyan_chat_conversation_${embedToken}`;

  // Notification sound hook
  const { playNotificationSound } = useNotificationSound();

  // Update fields when props change
  useEffect(() => {
    if (prefillName) setName(prefillName);
  }, [prefillName]);

  useEffect(() => {
    if (prefillEmail || contactEmail) setEmail(prefillEmail || contactEmail || '');
  }, [prefillEmail, contactEmail]);

  useEffect(() => {
    if (defaultMessage) setInitialMessage(defaultMessage);
  }, [defaultMessage]);

  const {
    currentConversation,
    messages,
    sending,
    startConversation,
    sendMessage,
    fetchMessages,
    restoreConversation,
    setCurrentConversation
  } = useChat({ embedToken, autoFetch: false });

  // State to track if we've tried to restore
  const [restorationAttempted, setRestorationAttempted] = useState(false);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const tryRestoreConversation = async () => {
      const storedConversationId = localStorage.getItem(conversationStorageKey);
      if (storedConversationId && !currentConversation && !restorationAttempted) {
        setRestorationAttempted(true);
        const restored = await restoreConversation(storedConversationId);
        if (!restored) {
          // Conversation expired or closed, clear storage
          localStorage.removeItem(conversationStorageKey);
        }
      } else {
        setRestorationAttempted(true);
      }
    };
    
    tryRestoreConversation();
  }, [conversationStorageKey, restoreConversation, currentConversation, restorationAttempted]);

  // Save conversation ID to localStorage when a new conversation is started
  useEffect(() => {
    if (currentConversation?.id) {
      localStorage.setItem(conversationStorageKey, currentConversation.id);
    }
  }, [currentConversation?.id, conversationStorageKey]);

  // Typing indicator hook
  const { typingUsers, handleTyping, stopTyping } = useTypingIndicator({
    conversationId: currentConversation?.id || null,
    userId: sessionId.current,
    userName: name || 'زائر',
    userType: 'embed'
  });

  // Check if client data is prefilled
  const hasPrefilledData = !!(prefillName || prefillEmail);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Play notification sound for new agent messages
  useEffect(() => {
    if (messages.length > lastMessageCount && lastMessageCount > 0) {
      const newMessages = messages.slice(lastMessageCount);
      const hasNewAgentMessage = newMessages.some(msg => msg.sender_type === 'agent');
      
      if (hasNewAgentMessage && soundEnabled && isOpen) {
        playNotificationSound();
      }
    }
    setLastMessageCount(messages.length);
  }, [messages.length, soundEnabled, isOpen, playNotificationSound, lastMessageCount]);

  // Notify parent of widget state
  useEffect(() => {
    window.parent.postMessage({ 
      type: isOpen ? 'WEBYAN_CHAT_OPENED' : 'WEBYAN_CHAT_CLOSED' 
    }, '*');
  }, [isOpen]);

  // Polling for new messages - optimized with longer interval and throttling
  const lastPollRef = useRef<number>(0);
  const pollMessages = useCallback(async () => {
    const now = Date.now();
    // Throttle: don't poll if we polled in the last 3 seconds
    if (now - lastPollRef.current < 3000) return;
    
    if (currentConversation?.id && !sending) {
      lastPollRef.current = now;
      try {
        await fetchMessages(currentConversation.id);
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }
  }, [currentConversation?.id, fetchMessages, sending]);

  // Start/stop polling when conversation is active - use 5 second interval
  useEffect(() => {
    if (currentConversation?.id && isOpen) {
      pollMessages();
      pollingRef.current = setInterval(pollMessages, 5000);
      setIsPolling(true);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setIsPolling(false);
      };
    }
  }, [currentConversation?.id, isOpen, pollMessages]);

  // Stop polling when widget is closed
  useEffect(() => {
    if (!isOpen && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setIsPolling(false);
    }
  }, [isOpen]);

  const handleStartChat = async () => {
    if (!name.trim() || !initialMessage.trim()) return;
    await startConversation('محادثة جديدة', initialMessage, name, email);
    setInitialMessage('');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversation) return;
    const msg = messageText;
    const replyToId = replyTo?.id;
    const replyToBody = replyTo?.body;
    const replyToSender = replyTo?.sender_name || (replyTo?.sender_type === 'client' ? 'أنت' : 'الدعم');
    
    setMessageText('');
    setReplyTo(null);
    stopTyping(); // Stop typing when message is sent
    
    // Include reply info in the message body for display
    let fullMessage = msg;
    if (replyToBody) {
      fullMessage = `↩️ رد على: "${replyToBody.substring(0, 30)}${replyToBody.length > 30 ? '...' : ''}"\n\n${msg}`;
    }
    
    await sendMessage(currentConversation.id, fullMessage, undefined, name);
    setTimeout(pollMessages, 500);
  };

  // Handle typing in the message input
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    handleTyping();
  };

  const handleEmojiSelect = (emoji: string) => {
    if (currentConversation) {
      setMessageText(prev => prev + emoji);
      inputRef.current?.focus();
    } else {
      setInitialMessage(prev => prev + emoji);
      textareaRef.current?.focus();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentConversation) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة فقط');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `chat-${Date.now()}.${fileExt}`;
      const filePath = `conversations/${currentConversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      // Send message with image in attachments array
      await sendMessage(
        currentConversation.id, 
        '📷 صورة مرفقة', 
        [publicUrl], 
        name
      );
      setTimeout(pollMessages, 500);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('فشل في رفع الصورة');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    inputRef.current?.focus();
  };

  const handlePresetClick = (text: string) => {
    setInitialMessage(text);
    textareaRef.current?.focus();
  };

  const extractImageUrl = (body: string): string | null => {
    const urlMatch = body.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i);
    return urlMatch ? urlMatch[0] : null;
  };

  const isDark = theme === 'dark';

  // Use provided colors
  const webyanPrimary = primaryColor;
  const webyanSecondary = secondaryColor;
  const gradientStyle = `linear-gradient(135deg, ${webyanPrimary} 0%, ${webyanSecondary} 100%)`;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 group z-50"
      >
        <span 
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ background: webyanSecondary }}
        />
        <div 
          className="relative h-16 w-16 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl"
          style={{ background: gradientStyle }}
        >
          <MessageCircle className="h-7 w-7" />
        </div>
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
    <>
      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreviewModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
          isDark={isDark}
        />
      )}

      <div className={`fixed bottom-6 left-6 w-[380px] sm:w-[420px] h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 border ${
        isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'
      }`}
      style={{ boxShadow: '0 25px 50px -12px rgba(38, 60, 132, 0.25)' }}
      >
        {/* Header */}
        <div 
          className="text-white p-5 relative overflow-hidden"
          style={{ background: gradientStyle }}
        >
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
                    <span className={`w-2 h-2 rounded-full ${statusColors[currentConversation.status]} ${currentConversation.status === 'assigned' ? 'animate-pulse' : ''}`} />
                    <span className="text-sm text-white/90">
                      {statusLabels[currentConversation.status]}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-white/80">نحن هنا لمساعدتك</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Sound toggle button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-colors" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
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
        </div>

        {!currentConversation ? (
          /* Start Chat Form */
          <div className="flex-1 p-5 overflow-auto">
            {/* Welcome Section */}
            <div className="text-center mb-5">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${webyanSecondary}20 0%, ${webyanPrimary}20 100%)` }}
              >
                <Sparkles className="h-8 w-8" style={{ color: webyanSecondary }} />
              </div>
              <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                أهلاً وسهلاً! 👋
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {welcomeMessage}
              </p>
            </div>
            
            {/* Quick message presets */}
            <div className="mb-4">
              <p className={`text-xs mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                اختر موضوع المحادثة:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {presetMessages.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset.text)}
                    className={`p-3 rounded-xl text-xs text-right transition-all hover:scale-[1.02] ${
                      initialMessage === preset.text
                        ? isDark 
                          ? 'bg-cyan-500/20 border-cyan-500/50 border' 
                          : 'bg-cyan-50 border-cyan-200 border'
                        : isDark 
                          ? 'bg-slate-800 border-slate-700 border hover:border-slate-600' 
                          : 'bg-slate-50 border-slate-200 border hover:border-slate-300'
                    }`}
                  >
                    <span className="text-base block mb-1">{preset.icon}</span>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prefilled Client Info Display */}
            {hasPrefilledData && !isEditingProfile ? (
              <div className={`mb-4 p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-br from-slate-50 to-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    بياناتك المسجلة
                  </span>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${
                      isDark ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-cyan-600 hover:bg-cyan-50'
                    }`}
                  >
                    <Edit3 className="h-3 w-3" />
                    تعديل
                  </button>
                </div>
                <div className="space-y-2">
                  {name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" style={{ color: webyanSecondary }} />
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{name}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" style={{ color: webyanSecondary }} />
                      <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{email}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {isEditingProfile && hasPrefilledData && (
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>تعديل البيانات</span>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className={`text-xs ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      إلغاء
                    </button>
                  </div>
                )}
                <Input
                  placeholder="اسمك الكريم *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`h-11 rounded-xl text-sm px-4 ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 focus:border-cyan-500' 
                      : 'bg-slate-50 border-slate-200 focus:border-cyan-500'
                  }`}
                />
                <Input
                  placeholder="البريد الإلكتروني (اختياري)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-11 rounded-xl text-sm px-4 ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 focus:border-cyan-500' 
                      : 'bg-slate-50 border-slate-200 focus:border-cyan-500'
                  }`}
                />
              </div>
            )}

            {/* Message Input with Emoji */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="اكتب رسالتك هنا... *"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={3}
                className={`rounded-xl text-sm px-4 py-3 resize-none pr-12 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 focus:border-cyan-500' 
                    : 'bg-slate-50 border-slate-200 focus:border-cyan-500'
                }`}
              />
              <div className="absolute top-2 left-2">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} isDark={isDark} />
              </div>
            </div>
            
            <Button 
              onClick={handleStartChat} 
              className="w-full h-12 rounded-xl mt-4 text-sm font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
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

            <p className={`text-center text-[10px] mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              🔒 محادثاتك آمنة ومشفرة
            </p>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {/* Welcome message */}
                <div className={`text-center py-2 px-3 rounded-xl text-xs ${
                  isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Sparkles className="h-3 w-3 inline-block ml-1" style={{ color: webyanSecondary }} />
                  {welcomeMessage}
                </div>

                {messages.map((msg) => {
                  const imageUrl = extractImageUrl(msg.body);
                  const isImage = !!imageUrl;
                  const textContent = isImage ? msg.body.replace(imageUrl, '').replace('📷 صورة مرفقة', '').trim() : msg.body;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'client' ? 'justify-start' : 'justify-end'} group`}
                    >
                      {msg.sender_type === 'system' ? (
                        <div className={`text-center text-[10px] rounded-full px-3 py-1.5 w-full ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {msg.body}
                        </div>
                      ) : (
                        <div className="max-w-[85%] relative">
                          {/* Reply button */}
                          <button
                            onClick={() => handleReply(msg)}
                            className={`absolute ${msg.sender_type === 'client' ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full ${
                              isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            <CornerDownLeft className="h-3 w-3" />
                          </button>

                          <div
                            className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              msg.sender_type === 'client'
                                ? 'text-white rounded-bl-md'
                                : isDark 
                                  ? 'bg-slate-800 rounded-br-md border border-slate-700' 
                                  : 'bg-slate-100 rounded-br-md'
                            }`}
                            style={msg.sender_type === 'client' ? { background: gradientStyle } : {}}
                          >
                            {msg.sender_type === 'agent' && (
                              <p className="text-xs font-semibold mb-1" style={{ color: webyanSecondary }}>
                                {msg.sender_name || 'فريق الدعم'}
                              </p>
                            )}

                            {/* Image display */}
                            {isImage && (
                              <div 
                                className="mb-2 cursor-pointer rounded-lg overflow-hidden"
                                onClick={() => setSelectedImage(imageUrl)}
                              >
                                <img 
                                  src={imageUrl} 
                                  alt="صورة مرفقة" 
                                  className="max-w-full h-auto max-h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                                />
                              </div>
                            )}

                            {textContent && (
                              <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{textContent}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${
                            isDark ? 'text-slate-500' : 'text-slate-400'
                          } ${msg.sender_type === 'client' ? 'justify-start' : 'justify-end'}`}>
                            <span>{format(new Date(msg.created_at), 'p', { locale: ar })}</span>
                            {msg.is_read && msg.sender_type === 'client' && (
                              <CheckCheck className="h-3 w-3" style={{ color: webyanSecondary }} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {typingUsers.filter(u => u.user_type === 'agent').length > 0 && (
                  <div className="flex justify-end">
                    <TypingIndicator 
                      name={typingUsers.find(u => u.user_type === 'agent')?.user_name || 'فريق الدعم'}
                      isDark={isDark}
                      primaryColor={webyanSecondary}
                    />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Reply Preview */}
            {replyTo && (
              <ReplyPreview 
                replyTo={replyTo}
                onClear={() => setReplyTo(null)}
                isDark={isDark}
                webyanSecondary={webyanSecondary}
              />
            )}

            {/* Input */}
            {currentConversation.status !== 'closed' ? (
              <div className={`p-3 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex gap-2 items-center">
                  {/* Emoji picker */}
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} isDark={isDark} />

                  {/* Image upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className={`h-10 w-10 rounded-xl ${
                      isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                  </Button>

                  <div className="flex-1">
                    <Input
                      ref={inputRef}
                      placeholder={replyTo ? 'اكتب ردك...' : 'اكتب رسالتك...'}
                      value={messageText}
                      onChange={handleMessageChange}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      onBlur={stopTyping}
                      disabled={sending}
                      className={`h-11 rounded-xl text-sm px-4 ${
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
                    className="h-11 w-11 rounded-xl shadow-lg transition-all hover:scale-105 disabled:opacity-50"
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
              <div className={`p-3 text-center ${
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
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmbedChatWidgetProps {
  embedToken: string;
  organizationName?: string;
  contactEmail?: string;
}

export default function EmbedChatWidget({ embedToken, organizationName, contactEmail }: EmbedChatWidgetProps) {
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

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 w-80 h-[500px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold">محادثة الدعم</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary/80" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!currentConversation ? (
        /* Start Chat Form */
        <div className="flex-1 p-4 space-y-4">
          <div className="text-center mb-6">
            <h3 className="font-semibold text-lg">مرحباً! 👋</h3>
            <p className="text-sm text-muted-foreground">كيف يمكننا مساعدتك اليوم؟</p>
          </div>
          
          <Input
            placeholder="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="البريد الإلكتروني (اختياري)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Textarea
            placeholder="اكتب رسالتك هنا..."
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            rows={4}
          />
          <Button 
            onClick={handleStartChat} 
            className="w-full"
            disabled={!name.trim() || !initialMessage.trim() || sending}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}
            بدء المحادثة
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender_type === 'system' ? (
                    <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1 w-full">
                      {msg.body}
                    </div>
                  ) : (
                    <div className="max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm ${
                          msg.sender_type === 'client'
                            ? 'bg-primary text-primary-foreground rounded-tl-none'
                            : 'bg-muted rounded-tr-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), 'p', { locale: ar })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="اكتب رسالتك..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={sending}
                className="text-sm"
              />
              <Button size="icon" onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

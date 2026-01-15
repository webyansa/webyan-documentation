import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmbedChatWidget from '@/components/chat/EmbedChatWidget';
import { supabase } from '@/integrations/supabase/client';

interface ClientInfo {
  name: string;
  email: string;
  organizationName: string;
}

interface TokenSettings {
  welcomeMessage: string;
  defaultMessage: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function EmbedChatPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const theme = searchParams.get('theme') as 'light' | 'dark' || 'light';
  
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [tokenSettings, setTokenSettings] = useState<TokenSettings>({
    welcomeMessage: 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.',
    defaultMessage: 'مرحباً، أحتاج المساعدة بخصوص...',
    primaryColor: '#263c84',
    secondaryColor: '#24c2ec'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token and get organization info + custom settings
        const { data: tokenData, error: tokenError } = await supabase
          .from('embed_tokens')
          .select(`
            id,
            organization_id,
            is_active,
            welcome_message,
            default_message,
            primary_color,
            secondary_color,
            organization:client_organizations(
              id,
              name,
              contact_email
            )
          `)
          .eq('token', token)
          .single();

        if (tokenError || !tokenData || !tokenData.is_active) {
          console.error('Invalid embed token:', tokenError);
          setLoading(false);
          return;
        }

        // Set custom token settings
        setTokenSettings({
          welcomeMessage: tokenData.welcome_message || 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.',
          defaultMessage: tokenData.default_message || 'مرحباً، أحتاج المساعدة بخصوص...',
          primaryColor: tokenData.primary_color || '#263c84',
          secondaryColor: tokenData.secondary_color || '#24c2ec'
        });

        const org = tokenData.organization as any;
        const organizationId = tokenData.organization_id;

        // Try to get primary contact for this organization
        const { data: primaryContact } = await supabase
          .from('client_accounts')
          .select('full_name, email')
          .eq('organization_id', organizationId)
          .eq('is_primary_contact', true)
          .eq('is_active', true)
          .maybeSingle();

        // If no primary contact, get any active contact
        let contact = primaryContact;
        if (!contact) {
          const { data: anyContact } = await supabase
            .from('client_accounts')
            .select('full_name, email')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          contact = anyContact;
        }

        setClientInfo({
          name: contact?.full_name || '',
          email: contact?.email || org?.contact_email || '',
          organizationName: org?.name || 'الدعم الفني'
        });
      } catch (error) {
        console.error('Error fetching client info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientInfo();
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-destructive font-medium">رمز التضمين مطلوب</p>
          <p className="text-sm text-muted-foreground mt-2">
            يرجى التأكد من صحة رابط التضمين
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <EmbedChatWidget 
        embedToken={token}
        theme={theme}
        primaryColor={tokenSettings.primaryColor}
        secondaryColor={tokenSettings.secondaryColor}
        organizationName={clientInfo?.organizationName}
        prefillName={clientInfo?.name}
        prefillEmail={clientInfo?.email}
        defaultMessage={tokenSettings.defaultMessage}
        welcomeMessage={tokenSettings.welcomeMessage}
      />
    </div>
  );
}

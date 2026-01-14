import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-embed-origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { token } = await req.json();
    const origin = req.headers.get('x-embed-origin') || req.headers.get('origin') || '';

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch token from database
    const { data: embedToken, error } = await supabase
      .from('embed_tokens')
      .select(`
        *,
        organization:client_organizations(id, name, logo_url, contact_email)
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !embedToken) {
      console.log('Token not found or inactive:', token);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or inactive token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (embedToken.expires_at && new Date(embedToken.expires_at) < new Date()) {
      console.log('Token expired:', token);
      return new Response(
        JSON.stringify({ valid: false, error: 'Token has expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check allowed domains
    if (embedToken.allowed_domains && embedToken.allowed_domains.length > 0) {
      const originDomain = origin.replace(/^https?:\/\//, '').split('/')[0];
      const isAllowed = embedToken.allowed_domains.some((domain: string) => {
        // Support wildcard domains like *.example.com
        if (domain.startsWith('*.')) {
          const baseDomain = domain.slice(2);
          return originDomain === baseDomain || originDomain.endsWith('.' + baseDomain);
        }
        return domain === originDomain || domain === origin;
      });

      if (!isAllowed) {
        console.log('Origin not allowed:', origin, 'Allowed:', embedToken.allowed_domains);
        return new Response(
          JSON.stringify({ valid: false, error: 'Origin not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update usage stats
    await supabase
      .from('embed_tokens')
      .update({
        usage_count: (embedToken.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', embedToken.id);

    return new Response(
      JSON.stringify({
        valid: true,
        organization: embedToken.organization,
        tokenId: embedToken.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying embed token:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

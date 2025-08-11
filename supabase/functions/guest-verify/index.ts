import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return new Response('Missing token', { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: sub, error } = await supabase
      .from('guest_submissions')
      .select('*')
      .eq('token', token)
      .single();
    if (error || !sub) throw new Error('Invalid or expired token');

    // Mark as verified/published
    const { error: upErr } = await supabase
      .from('guest_submissions')
      .update({ status: 'published' })
      .eq('id', sub.id);
    if (upErr) throw upErr;

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Post Verified</title></head>
<body style="font-family: system-ui; padding: 24px;">
  <h1>Thanks! Your post is now published.</h1>
  <p>You can close this tab and return to the app.</p>
</body></html>`;

    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders } });
  } catch (err: any) {
    console.error('guest-verify error', err);
    return new Response(`Verification failed: ${err?.message || 'Unexpected error'}`, { status: 400, headers: { 'Content-Type': 'text/plain', ...corsHeaders } });
  }
});

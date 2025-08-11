import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function baseUrl(req: Request) {
  try {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return `https://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}`;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const required = ['item_type','email','title','description','category','location'];
    for (const k of required) if (!payload[k]) throw new Error(`Missing field: ${k}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2);

    const { data: submission, error } = await supabase
      .from('guest_submissions')
      .insert({
        token,
        email: payload.email,
        item_type: payload.item_type,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        date_lost_found: payload.date_lost_found ?? null,
        location: payload.location,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        contact_name: payload.contact_name ?? null,
        contact_phone: payload.contact_phone ?? null,
        contact_email: payload.contact_email ?? payload.email,
        reward: payload.reward ?? null,
        additional_info: payload.additional_info ?? null,
        photos: payload.photos ?? [],
        verification_questions: payload.verification_questions ?? [],
      })
      .select()
      .single();

    if (error) throw error;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('Missing RESEND_API_KEY');
      return new Response(JSON.stringify({ ok: true, message: 'Submission stored. Email not sent: missing RESEND_API_KEY.' }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const verifyLink = `${baseUrl(req).replace('/functions/v1/guest-submit','')}/guest-verify?token=${token}`
      .replace(/\/$/, '')
      .replace('/guest-submit','');

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "FindIt <onboarding@resend.dev>",
      to: [payload.email],
      subject: "Verify your post on FindIt",
      html: `<h2>Verify your post</h2>
      <p>Click the link below to verify and publish your ${payload.item_type} post:</p>
      <p><a href="${`https://dmarkaigzovaqwpigtxe.functions.supabase.co/guest-verify?token=${token}`}">Verify & Publish</a></p>
      <p>If you did not request this, ignore this email.</p>`
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err: any) {
    console.error('guest-submit error', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});

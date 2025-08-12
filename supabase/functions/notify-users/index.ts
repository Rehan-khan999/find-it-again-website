import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, userId, title, message, relatedItemId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Insert notification record
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        related_item_id: relatedItemId || null,
        read: false
      })
      .select()
      .single()

    if (error) throw error

    // 2) Try to send Web Push to all user devices (best-effort)
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        webpush.setVapidDetails('mailto:support@findit.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', userId)

        if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title,
            message,
            url: relatedItemId ? `/browse?highlight=${relatedItemId}` : '/',
          })

          for (const s of subs) {
            try {
              await webpush.sendNotification({
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth }
              } as any, payload)
            } catch (err: any) {
              // Clean up invalid subscriptions
              const status = err?.statusCode || err?.code
              if (status === 404 || status === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', s.id)
              } else {
                console.error('Push send error:', err)
              }
            }
          }
        }
      } catch (err) {
        console.error('Web Push error:', err)
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

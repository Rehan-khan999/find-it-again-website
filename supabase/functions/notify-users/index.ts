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
    const { type, userId, title, message, relatedItemId, latitude, longitude, radiusKm } = await req.json()

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

    // 2) Try to send Web Push with geotargeting
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        webpush.setVapidDetails('mailto:support@findit.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

        // Get subscriptions with optional geotargeting
        let subscriptionsQuery = supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth, lat, lng, radius_km')
          .eq('user_id', userId)

        // If geotargeting data provided, filter by location
        if (latitude && longitude && radiusKm) {
          // Use Haversine formula to find nearby subscriptions
          subscriptionsQuery = supabase
            .from('push_subscriptions')
            .select('id, endpoint, p256dh, auth, lat, lng, radius_km')
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .filter('user_id', 'neq', userId) // Don't send to the same user who created the item

          const { data: allSubs } = await subscriptionsQuery

          // Filter by distance using Haversine formula
          const targetSubs = allSubs?.filter(sub => {
            if (!sub.lat || !sub.lng) return false
            
            const R = 6371 // Earth's radius in km
            const dLat = (sub.lat - latitude) * Math.PI / 180
            const dLng = (sub.lng - longitude) * Math.PI / 180
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(latitude * Math.PI / 180) * Math.cos(sub.lat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const distance = R * c

            return distance <= (sub.radius_km || 5) // Use user's preferred radius or default 5km
          }) || []

          console.log(`Geotargeted notifications: ${targetSubs.length} subscriptions within range`)

          if (targetSubs.length > 0) {
            const payload = JSON.stringify({
              title: `New ${type} Item Nearby!`,
              message: `${title} - ${message}`,
              url: relatedItemId ? `/browse?highlight=${relatedItemId}` : '/',
            })

            for (const s of targetSubs) {
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
        } else {
          // Standard notification to specific user
          const { data: subs } = await subscriptionsQuery

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { itemId, userId, verificationData } = await req.json()

    if (!itemId || !userId) {
      throw new Error('Missing required fields: itemId and userId')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1) Verify the user owns the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, user_id, title, description, created_at')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single()

    if (itemError || !item) {
      throw new Error('Item not found or access denied')
    }

    // 2) Create verification hash using item data + verification data + timestamp
    const timestamp = new Date().toISOString()
    const hashInput = JSON.stringify({
      itemId: item.id,
      userId: item.user_id,
      title: item.title,
      description: item.description,
      createdAt: item.created_at,
      verificationData,
      timestamp
    })

    // Create SHA-256 hash
    const encoder = new TextEncoder()
    const data = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 3) Simulate blockchain anchoring (in real implementation, this would call a blockchain API)
    // For demo purposes, we'll create a mock transaction hash
    const mockTransactionHash = `0x${hashHex.slice(0, 40)}`
    const mockBlockNumber = Math.floor(Math.random() * 1000000) + 18000000

    console.log(`Blockchain verification for item ${itemId}:`)
    console.log(`Hash: ${hashHex}`)
    console.log(`Mock TX: ${mockTransactionHash}`)
    console.log(`Mock Block: ${mockBlockNumber}`)

    // 4) Store verification record
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .insert({
        item_id: itemId,
        user_id: userId,
        verification_type: 'ownership',
        blockchain_hash: hashHex,
        transaction_hash: mockTransactionHash,
        block_number: mockBlockNumber,
        verification_data: verificationData || {},
        status: 'verified',
        verified_at: timestamp
      })
      .select()
      .single()

    if (verificationError) throw verificationError

    // 5) Update item status to verified
    await supabase
      .from('items')
      .update({ 
        additional_info: `${item.additional_info || ''}\n\n🔒 Blockchain Verified: ${hashHex.slice(0, 16)}...`
      })
      .eq('id', itemId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        verification,
        blockchainHash: hashHex,
        transactionHash: mockTransactionHash,
        blockNumber: mockBlockNumber
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Blockchain verification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
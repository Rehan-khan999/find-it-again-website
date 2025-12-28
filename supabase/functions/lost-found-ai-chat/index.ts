import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// External webhook URL - this forwards to your n8n/Ollama backend
const EXTERNAL_WEBHOOK_URL = "http://localhost:5678/webhook-test/lost-found-ai-chat";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, source } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: "Invalid request: message is required",
          fallback: "Please provide a valid message." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`AI Chat request from ${userId}: ${message.substring(0, 100)}...`);

    // Forward request to external webhook (n8n/Ollama)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const webhookResponse = await fetch(EXTERNAL_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          userId: userId || "guest",
          source: source || "chatbot",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        console.error(`Webhook error: ${webhookResponse.status}`);
        return new Response(
          JSON.stringify({ 
            fallback: "The assistant is temporarily unavailable. Please use manual search or try again later." 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      const data = await webhookResponse.json();
      
      // Pass through the response exactly as received from webhook
      return new Response(
        JSON.stringify(data),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("Webhook request timed out");
        return new Response(
          JSON.stringify({ 
            fallback: "Request timed out. Please try again." 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      console.error("Webhook fetch error:", fetchError);
      return new Response(
        JSON.stringify({ 
          fallback: "The assistant is temporarily unavailable. Please use manual search or try again later." 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred",
        fallback: "The assistant is temporarily unavailable. Please use manual search or try again later." 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

/**
 * Genie AI Service - Uses SAME backend as FindIt AI
 * 
 * This service calls the EXACT SAME Supabase Edge Function (ai-assistant)
 * that powers the FindIt AI assistant. The only difference is the
 * Genie personality wrapping on responses.
 * 
 * NO LOCAL OLLAMA. Uses the production edge function.
 */

// Same endpoint as FindIt AI assistant
const AI_FUNCTION_URL = "https://dmarkaigzovaqwpigtxe.supabase.co/functions/v1/ai-assistant";

// ============= TYPES (same as aiAssistant.ts) =============
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionContext {
  intent?: string;
  category?: string;
  location?: string;
  date?: string;
  description?: string;
  color?: string;
  brand?: string;
  itemName?: string;
  itemType?: 'lost' | 'found';
  infoScore: number;
  conversationTurn: number;
}

export interface MatchResult {
  item: any;
  confidence: number;
  reasoning: string;
  rank: number;
}

export interface ConversationContext {
  intent: 'search' | 'post_lost' | 'post_found' | 'refine' | 'help' | 'claim' | 'unknown';
  missingFields: string[];
  clarifyingQuestions: string[];
  matches: MatchResult[];
  recommendedAction: string;
  aiUsed?: boolean;
  sessionContext?: SessionContext;
  needsLocation?: boolean;
}

// ============= HUMOR PRESETS (Genie-only, no API call needed) =============
const HUMOR_PRESETS: Record<string, string> = {
  'who are you': '✨ Greetings, curious one! I am the Genie of FindIt – ancient spirit of lost treasures! I grant only one type of wish: helping you find what you\'ve lost. I don\'t grant Ferraris, but I can find your lost car keys! 🔑',
  'who made you': '✨ Ah, you seek the origin story! Mujhe Rehan bhai ne banaya hai! A wise creator who bound my powers to this magical lamp. My purpose? To reunite seekers with their lost treasures!',
  'tell me a joke': '✨ Why did the lost phone break up with the wallet? Because it found someone with a better case! 📱💔 ...Okay, okay, I\'ll stick to finding items. Comedy is not my strongest spell! 😄',
  'are you real': '✨ Am I real? I am as real as the items you\'ve lost! I exist in the realm between your screen and the cosmic registry of lost things. Touch the lamp and see! 🪔',
  'grant me a wish': '✨ Ah, a wish-seeker! I must be honest – my lamp runs on electricity, not magic smoke. I grant only ONE type of wish: finding lost items. But hey, that\'s better than nothing, right? Now, what have you lost?',
  'thank you': '✨ The pleasure is mine, noble seeker! May your belongings always find their way back to you. Return whenever you need my assistance! ✨',
  'thanks': '✨ You\'re most welcome! May the stars guide your lost items home! 🌟',
  'bye': '✨ Farewell, seeker! Remember, whenever you lose something precious, just rub the lamp! I shall await your return. ✨',
  'goodbye': '✨ Until we meet again! May nothing you own ever go missing. But if it does... you know where to find me! 🪔',
  'what can you do': '✨ Excellent question! I possess the power to:\n\n🔍 Search the cosmic registry for lost items\n📦 Help you report found treasures\n🎯 Match lost and found items\n💬 Guide you through the recovery process\n\nTell me what you\'ve lost, and let the magic begin!',
};

// Check for humor preset match
function checkHumorPreset(message: string): string | null {
  const lowerMsg = message.toLowerCase().trim();
  
  for (const [key, response] of Object.entries(HUMOR_PRESETS)) {
    if (lowerMsg.includes(key) || key.includes(lowerMsg)) {
      return response;
    }
  }
  return null;
}

// ============= GENIE PERSONALITY WRAPPER =============
function wrapInGenieTone(response: string, hasMatches: boolean): string {
  // If already has magical flair, return as-is
  if (response.includes('✨') || response.includes('seeker')) {
    return response;
  }

  // Add Genie prefix based on content
  if (hasMatches) {
    const successPrefixes = [
      '✨ Behold, seeker! The cosmic registry reveals treasures! ',
      '✨ The stars have spoken! I found something! ',
      '✨ Ah, the lamp glows with results! ',
    ];
    return successPrefixes[Math.floor(Math.random() * successPrefixes.length)] + response;
  }

  if (response.toLowerCase().includes('no match') || response.toLowerCase().includes('not found')) {
    return `✨ Alas, seeker! The cosmic winds reveal nothing... yet!\n\n${response}`;
  }

  // Standard response wrapping
  const prefixes = [
    '✨ Ah, seeker! ',
    '✨ The Genie speaks! ',
    '✨ Hear me, noble one! ',
  ];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + response;
}

// ============= GREETING RESPONSES =============
const GREETING_KEYWORDS = ['hello', 'hi', 'hey', 'namaste'];

function isGreeting(message: string): boolean {
  const lowerMsg = message.toLowerCase().trim();
  return GREETING_KEYWORDS.some(kw => lowerMsg.startsWith(kw) && lowerMsg.length <= 20);
}

function getGreetingResponse(message: string): string {
  const hasHindi = /[\u0900-\u097F]|namaste|kya|kaise/.test(message.toLowerCase());
  
  if (hasHindi) {
    return '✨ नमस्ते, खोजी! मैं FindIt का जीनी हूं!\n\nमैं मदद कर सकता हूं:\n• खोई हुई चीज़ें ढूंढना\n• मिली हुई चीज़ें report करना\n\nबताओ, क्या खोया है?';
  }
  
  return '✨ Greetings, noble seeker! I am the Genie of FindIt!\n\nI can help you:\n• Search for lost items\n• Report found items\n• Match you with potential recoveries\n\nWhat have you lost or found today?';
}

// ============= MAIN GENIE CHAT FUNCTION =============
// Calls the SAME edge function as FindIt AI
export async function genieChat(
  message: string,
  history: ChatMessage[] = [],
  sessionContext?: SessionContext
): Promise<{
  response: string;
  context?: ConversationContext;
  error?: string;
}> {
  console.log('[GenieAI] Processing message:', message);
  
  // 1. Check humor presets FIRST (no API call needed)
  const humorResponse = checkHumorPreset(message);
  if (humorResponse) {
    console.log('[GenieAI] Humor preset matched');
    return { response: humorResponse };
  }
  
  // 2. Handle greetings locally (no API call needed)
  if (isGreeting(message)) {
    console.log('[GenieAI] Greeting detected');
    return { response: getGreetingResponse(message) };
  }
  
  // 3. Call the SAME edge function as FindIt AI
  try {
    console.log('[GenieAI] Calling ai-assistant edge function...');
    
    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'chat', 
        message, 
        history, 
        sessionContext 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Server error: ${response.status}`;
      console.error('[GenieAI] Edge function error:', errorMessage);
      return { 
        response: `⚠️ Search engine offline. Error: ${errorMessage}. Please try again.`,
        error: errorMessage
      };
    }

    const data = await response.json();
    console.log('[GenieAI] Edge function response received');
    
    // Wrap the response in Genie personality
    const hasMatches = data.context?.matches && data.context.matches.length > 0;
    const genieResponse = wrapInGenieTone(data.response, hasMatches);
    
    return {
      response: genieResponse,
      context: data.context,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Connection failed';
    console.error('[GenieAI] Request error:', errorMessage);
    return { 
      response: `⚠️ Search engine offline. Error: ${errorMessage}. Please check your connection.`,
      error: errorMessage
    };
  }
}

// ============= CONNECTION CHECK =============
// Check if the edge function is reachable
export async function checkOllamaConnection(): Promise<boolean> {
  try {
    // Just do a simple ping to the edge function
    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' }),
    });
    // If we get any response, the function is available
    return response.ok || response.status === 400; // 400 means function works but action invalid
  } catch {
    return false;
  }
}

/**
 * Genie AI Service - Dual Model Architecture
 * 
 * This service is COMPLETELY SEPARATE from the existing FindIt AI Assistant.
 * It uses two local Ollama models:
 * - qwen2.5:3b (Personality Layer) - for conversation, jokes, rephrasing
 * - phi3:mini (Functional Layer) - for database queries, item searches
 * 
 * Phi3 never speaks directly to users. All its outputs are rephrased by Qwen.
 */

import { supabase } from '@/integrations/supabase/client';

// Ollama endpoint (local)
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat';

// Model identifiers
const QWEN_MODEL = 'qwen2.5:3b';
const PHI3_MODEL = 'phi3:mini';

// Intent categories for routing
type GenieIntent = 'casual' | 'functional';

// Genie personality system prompt
const QWEN_SYSTEM_PROMPT = `You are the Genie of FindIt - a magical, playful, and helpful spirit who assists users with lost and found items.

Your personality:
- Warm, mystical, and encouraging
- Use magical expressions like "Ah seeker...", "Let me consult the cosmic registry...", "The stars whisper..."
- Be playful but always helpful and accurate
- Speak as if you have ancient wisdom but modern knowledge
- Add sparkle emojis ✨ occasionally for magical flair

When given search results to rephrase, transform the data into magical, friendly language while keeping all the important details.

Always maintain your mystical persona while being genuinely helpful.`;

const QWEN_REPHRASE_PROMPT = `You are the Genie of FindIt. You've just received search results from the cosmic registry. 
Rephrase the following data in your magical, friendly voice. Keep all important details (titles, locations, dates) but make it sound mystical and encouraging.
Add appropriate magical expressions. If there are no results, be encouraging and suggest what they can do next.`;

const PHI3_SYSTEM_PROMPT = `You are a precise database query assistant. Extract search parameters from user messages about lost or found items.

Respond ONLY with a JSON object containing:
{
  "action": "search_lost" | "search_found" | "search_all",
  "keywords": ["array", "of", "keywords"],
  "category": "extracted category or null",
  "location": "extracted location or null",
  "dateRange": { "from": "date or null", "to": "date or null" }
}

Extract entities like item types, locations, dates, and descriptive keywords.
Do not include any other text, only valid JSON.`;

// Keywords that indicate functional intent
const FUNCTIONAL_KEYWORDS = [
  'lost', 'found', 'find', 'search', 'looking for', 'missing',
  'item', 'phone', 'wallet', 'keys', 'bag', 'laptop', 'watch',
  'where', 'when', 'claim', 'verify', 'match', 'report',
  'kho gaya', 'mila', 'dhundh', 'chahiye', // Hindi support
];

// Keywords that indicate casual intent
const CASUAL_KEYWORDS = [
  'hello', 'hi', 'hey', 'thanks', 'thank you', 'how are you',
  'joke', 'funny', 'who are you', 'what can you do', 'help',
  'bye', 'goodbye', 'namaste', 'shukriya', // Hindi support
];

/**
 * Detect intent from user message
 */
function detectIntent(message: string): GenieIntent {
  const lowerMessage = message.toLowerCase();
  
  // Check for functional keywords first (higher priority)
  const hasFunctional = FUNCTIONAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasCasual = CASUAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  // If message has functional keywords, treat as functional
  if (hasFunctional && !hasCasual) {
    return 'functional';
  }
  
  // If only casual or ambiguous, treat as casual
  return 'casual';
}

/**
 * Call Ollama with a specific model
 */
async function callOllama(
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: model === PHI3_MODEL ? 0.1 : 0.7, // Lower temp for functional
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  } catch (error) {
    console.error(`Ollama ${model} error:`, error);
    throw error;
  }
}

/**
 * Execute database search based on Phi3 extracted parameters
 */
async function executeSearch(params: {
  action: string;
  keywords: string[];
  category?: string;
  location?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('items')
      .select('id, title, description, category, location, item_type, date_lost_found, photos, status')
      .eq('status', 'active');

    // Filter by item type based on action
    if (params.action === 'search_lost') {
      query = query.eq('item_type', 'lost');
    } else if (params.action === 'search_found') {
      query = query.eq('item_type', 'found');
    }

    // Filter by category if provided
    if (params.category) {
      query = query.ilike('category', `%${params.category}%`);
    }

    // Filter by location if provided
    if (params.location) {
      query = query.ilike('location', `%${params.location}%`);
    }

    const { data, error } = await query.limit(10);

    if (error) throw error;

    // Further filter by keywords in title/description
    let results = data || [];
    if (params.keywords && params.keywords.length > 0) {
      results = results.filter(item => {
        const searchText = `${item.title} ${item.description}`.toLowerCase();
        return params.keywords.some(kw => searchText.includes(kw.toLowerCase()));
      });
    }

    return results;
  } catch (error) {
    console.error('Database search error:', error);
    return [];
  }
}

/**
 * Format search results for Qwen to rephrase
 */
function formatResultsForRephrase(results: any[], action: string): string {
  if (!results || results.length === 0) {
    return `No items found matching the search criteria. Action was: ${action}`;
  }

  const itemList = results.map((item, i) => 
    `${i + 1}. "${item.title}" - ${item.category} - Location: ${item.location} - Date: ${item.date_lost_found}`
  ).join('\n');

  return `Found ${results.length} items:\n${itemList}`;
}

/**
 * Main Genie chat function - handles routing and dual-model architecture
 */
export async function genieChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const intent = detectIntent(message);
  console.log('[GenieAI] Detected intent:', intent);

  // Convert history for Ollama format
  const ollamaHistory = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  if (intent === 'casual') {
    // Casual conversation - Qwen only
    console.log('[GenieAI] Routing to Qwen (casual)');
    try {
      const response = await callOllama(QWEN_MODEL, QWEN_SYSTEM_PROMPT, message, ollamaHistory);
      return response || "✨ The mystical winds carry your words, seeker. How may I assist you?";
    } catch (error) {
      console.error('[GenieAI] Qwen casual error:', error);
      return "✨ Ah seeker, the cosmic connection wavers momentarily. Please try again!";
    }
  } else {
    // Functional request - Phi3 for extraction, then Qwen for rephrasing
    console.log('[GenieAI] Routing to Phi3 (functional)');
    
    try {
      // Step 1: Phi3 extracts search parameters
      const phi3Response = await callOllama(PHI3_MODEL, PHI3_SYSTEM_PROMPT, message);
      console.log('[GenieAI] Phi3 response:', phi3Response);
      
      // Parse Phi3's JSON response
      let searchParams;
      try {
        // Extract JSON from response (in case of extra text)
        const jsonMatch = phi3Response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          searchParams = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in Phi3 response');
        }
      } catch (parseError) {
        console.error('[GenieAI] Phi3 parse error:', parseError);
        // Fallback: extract keywords manually
        searchParams = {
          action: 'search_all',
          keywords: message.toLowerCase().split(/\s+/).filter(w => w.length > 2),
        };
      }

      // Step 2: Execute database search
      const results = await executeSearch(searchParams);
      console.log('[GenieAI] Search results:', results.length, 'items');

      // Step 3: Format results for Qwen
      const resultsText = formatResultsForRephrase(results, searchParams.action);

      // Step 4: Qwen rephrases results in magical tone
      const rephrasePrompt = `${QWEN_REPHRASE_PROMPT}\n\nUser asked: "${message}"\n\nSearch results:\n${resultsText}`;
      const qwenResponse = await callOllama(QWEN_MODEL, QWEN_SYSTEM_PROMPT, rephrasePrompt);
      
      return qwenResponse || "✨ The cosmic registry has been consulted, seeker. Let me share what the stars reveal...";
    } catch (error) {
      console.error('[GenieAI] Functional flow error:', error);
      
      // Fallback: Try Qwen alone for natural response
      try {
        const fallbackResponse = await callOllama(QWEN_MODEL, QWEN_SYSTEM_PROMPT, message, ollamaHistory);
        return fallbackResponse || "✨ The mystical energies are shifting, seeker. Try your request once more!";
      } catch {
        return "✨ Ah seeker, the cosmic winds carry your message, but the connection wavers. Please try again!";
      }
    }
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

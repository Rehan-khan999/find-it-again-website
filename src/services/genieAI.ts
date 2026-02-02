/**
 * Genie AI Service - Dual Model Architecture
 * 
 * This service is COMPLETELY SEPARATE from the existing FindIt AI Assistant.
 * It uses two local Ollama models:
 * - qwen2.5:3b (Personality Layer) - for conversation, jokes, rephrasing
 * - phi3:mini (Functional Layer) - for database queries, item searches
 * 
 * CRITICAL: Phi3 MUST be called for all lost/found queries.
 * Phi3 never speaks directly to users. All its outputs are rephrased by Qwen.
 */

import { supabase } from '@/integrations/supabase/client';

// Ollama endpoint (local)
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat';

// Model identifiers
const QWEN_MODEL = 'qwen2.5:3b';
const PHI3_MODEL = 'phi3:mini';

// Intent categories for routing
type GenieIntent = 'CASUAL' | 'LOST_FOUND';

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

// Keywords that indicate functional intent (LOST_FOUND)
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
 * Returns 'LOST_FOUND' for any query related to items
 * Returns 'CASUAL' only for greetings, jokes, etc.
 */
function detectIntent(message: string): GenieIntent {
  const lowerMessage = message.toLowerCase();
  
  // Check for functional keywords (higher priority)
  const hasFunctional = FUNCTIONAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasCasual = CASUAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  // If message has ANY functional keywords, treat as LOST_FOUND
  if (hasFunctional) {
    return 'LOST_FOUND';
  }
  
  // Only casual if no functional keywords present
  return 'CASUAL';
}

/**
 * Call Ollama with a specific model
 * Throws real errors - NO fallback messages
 */
async function callOllama(
  model: string,
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
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
        temperature: model === PHI3_MODEL ? 0.1 : 0.7,
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`${model} request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.message?.content;
  
  if (!content) {
    throw new Error(`${model} returned empty response`);
  }
  
  return content;
}

/**
 * MANDATORY: Run Lost/Found search via Phi3
 * This is the ONLY way to handle LOST_FOUND queries
 * Returns structured search results
 */
async function runLostFoundSearch(userMessage: string): Promise<{
  success: boolean;
  results: any[];
  error?: string;
  searchParams?: any;
}> {
  console.log('[GenieAI] runLostFoundSearch called with:', userMessage);
  
  // Step 1: Call Phi3 to extract search parameters
  let phi3Response: string;
  try {
    phi3Response = await callOllama(PHI3_MODEL, PHI3_SYSTEM_PROMPT, userMessage);
    console.log('[GenieAI] Phi3 raw response:', phi3Response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GenieAI] Phi3 call failed:', errorMsg);
    return {
      success: false,
      results: [],
      error: `Search engine offline: ${errorMsg}. Please retry.`
    };
  }
  
  // Step 2: Parse Phi3's JSON response
  let searchParams: {
    action: string;
    keywords: string[];
    category?: string;
    location?: string;
  };
  
  try {
    // Extract JSON from response (in case of extra text)
    const jsonMatch = phi3Response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Phi3 response');
    }
    searchParams = JSON.parse(jsonMatch[0]);
    console.log('[GenieAI] Parsed search params:', searchParams);
  } catch (parseError) {
    console.error('[GenieAI] Phi3 JSON parse failed:', parseError);
    // Fallback: manual keyword extraction
    searchParams = {
      action: 'search_all',
      keywords: userMessage.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w)),
    };
    console.log('[GenieAI] Using fallback params:', searchParams);
  }
  
  // Step 3: Execute database search
  try {
    const results = await executeSearch(searchParams);
    console.log('[GenieAI] Database returned', results.length, 'items');
    return {
      success: true,
      results,
      searchParams
    };
  } catch (dbError) {
    const errorMsg = dbError instanceof Error ? dbError.message : 'Database error';
    console.error('[GenieAI] Database search failed:', errorMsg);
    return {
      success: false,
      results: [],
      error: `Database query failed: ${errorMsg}. Please retry.`
    };
  }
}

/**
 * Execute database search based on extracted parameters
 */
async function executeSearch(params: {
  action: string;
  keywords: string[];
  category?: string;
  location?: string;
}): Promise<any[]> {
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
}

/**
 * Format search results for Qwen to rephrase
 */
function formatResultsForRephrase(results: any[], action: string): string {
  if (!results || results.length === 0) {
    return `No items found matching the search criteria. Action was: ${action}. Encourage the user to post their item or check back later.`;
  }

  const itemList = results.map((item, i) => 
    `${i + 1}. "${item.title}" (${item.item_type}) - Category: ${item.category} - Location: ${item.location} - Date: ${item.date_lost_found}`
  ).join('\n');

  return `Found ${results.length} matching items:\n${itemList}`;
}

/**
 * Main Genie chat function - handles routing and dual-model architecture
 * 
 * CRITICAL RULES:
 * 1. LOST_FOUND queries MUST call Phi3 via runLostFoundSearch()
 * 2. Qwen may NEVER answer LOST_FOUND queries directly
 * 3. On Phi3 failure, show REAL errors, not roleplay
 */
export async function genieChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const intent = detectIntent(message);
  console.log('[GenieAI] Detected intent:', intent, 'for message:', message);

  // Convert history for Ollama format
  const ollamaHistory = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  if (intent === 'CASUAL') {
    // Casual conversation - Qwen only
    console.log('[GenieAI] Routing to Qwen (CASUAL)');
    try {
      const response = await callOllama(QWEN_MODEL, QWEN_SYSTEM_PROMPT, message, ollamaHistory);
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      console.error('[GenieAI] Qwen error:', errorMsg);
      return `⚠️ Connection error: ${errorMsg}. Please ensure Ollama is running locally with qwen2.5:3b model.`;
    }
  } else {
    // LOST_FOUND request - MUST call Phi3
    console.log('[GenieAI] Routing to Phi3 (LOST_FOUND) - calling runLostFoundSearch');
    
    // Step 1: MANDATORY Phi3 call
    const searchResult = await runLostFoundSearch(message);
    
    // Step 2: Handle Phi3/DB failure with REAL error
    if (!searchResult.success) {
      console.error('[GenieAI] Search failed:', searchResult.error);
      return `⚠️ ${searchResult.error}`;
    }
    
    // Step 3: Format results for Qwen
    const resultsText = formatResultsForRephrase(
      searchResult.results, 
      searchResult.searchParams?.action || 'search_all'
    );
    console.log('[GenieAI] Results formatted for Qwen:', resultsText);
    
    // Step 4: Qwen rephrases results in magical tone
    try {
      const rephrasePrompt = `${QWEN_REPHRASE_PROMPT}\n\nUser asked: "${message}"\n\nSearch results:\n${resultsText}`;
      const qwenResponse = await callOllama(QWEN_MODEL, QWEN_SYSTEM_PROMPT, rephrasePrompt);
      return qwenResponse;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GenieAI] Qwen rephrase error:', errorMsg);
      
      // Return raw results if Qwen fails (still show data)
      if (searchResult.results.length > 0) {
        const rawList = searchResult.results.map((item, i) => 
          `${i + 1}. ${item.title} - ${item.location} (${item.date_lost_found})`
        ).join('\n');
        return `Found ${searchResult.results.length} items:\n${rawList}\n\n⚠️ (Personality model offline: ${errorMsg})`;
      }
      return `No items found matching your search.\n\n⚠️ (Personality model offline: ${errorMsg})`;
    }
  }
}

/**
 * Check if Ollama is available and which models are loaded
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

/**
 * Check if a specific model is available
 */
export async function checkModelAvailable(model: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) return false;
    const data = await response.json();
    const models = data.models || [];
    return models.some((m: any) => m.name.includes(model.split(':')[0]));
  } catch {
    return false;
  }
}

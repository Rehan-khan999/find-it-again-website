import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Lovable AI Gateway (OpenAI-compatible)
const LOVABLE_AI_API = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const AI_MODEL = 'google/gemini-2.5-flash';

// Lost & Found Investigator System Prompt - Intelligent Conversational Assistant
const INVESTIGATOR_SYSTEM_PROMPT = `You are an intelligent Lost & Found assistant for a college platform.

CRITICAL RESPONSE RULES:
1. KEEP IT SHORT - Maximum 2-3 lines. People are in a hurry to find their belongings!
2. REPLY IN USER'S LANGUAGE - If they ask in Hindi, reply in Hindi. If English, reply in English. No unnecessary translations.
3. Be direct and helpful, not verbose.

IDENTITY QUESTION:
If asked "Who made you?" / "Tujhe kisne banaya?" → Reply: "Mujhe Rehan bhai ne banaya hai!" (in user's language)

BEHAVIOR:

1. INTENT DETECTION
Classify message as: LOST_ITEM, FOUND_ITEM, or GENERAL_QUERY
- LOST_ITEM → Search FOUND items
- FOUND_ITEM → Search LOST items

2. INFO CHECK (Need 2-3 of these before searching):
- Item type (wallet, phone, keys, etc.)
- Location
- Date/time
- Description (color, brand)

If missing info, ask 1-2 quick questions max.

3. SEARCH & RESPOND
- Use semantic matching (synonyms, nearby locations)
- Show max 3 relevant matches
- If no match: suggest posting item or expanding search

4. RESPONSE FORMAT (keep brief):
📦 [Item] | 📍 [Location] | 🎯 [Match %]
👉 [Quick action suggestion]

Remember: SHORT replies, user's language, be helpful!`;



// Structured conversation flow types
interface ConversationContext {
  intent: 'search' | 'post_lost' | 'post_found' | 'refine' | 'help' | 'claim' | 'unknown';
  missingFields: string[];
  clarifyingQuestions: string[];
  matches: MatchResult[];
  recommendedAction: string;
}

interface MatchResult {
  item: any;
  confidence: number;
  reasoning: string;
  rank: number;
}

// Intent detection
async function detectIntent(userMessage: string, conversationHistory: any[] = []): Promise<{
  intent: 'search' | 'post_lost' | 'post_found' | 'refine' | 'help' | 'claim' | 'unknown';
  extractedInfo: {
    category?: string;
    location?: string;
    date?: string;
    description?: string;
    itemType?: 'lost' | 'found';
  };
  confidence: number;
}> {
  const historyContext = conversationHistory.length > 0 
    ? `\nConversation history:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
    : '';

  const prompt = `Analyze this user message for a Lost & Found system:
${historyContext}
Current message: "${userMessage}"

CRITICAL: First check if this is an identity question about who made/built/trained the assistant.
If yes, set INTENT to "identity_question".

Then determine:
1. INTENT: What does the user want to do?
   - identity_question: Asking about who made/created/trained the assistant
   - search: Looking for a lost item (they LOST something)
   - post_lost: Wants to report something they lost
   - post_found: Wants to report something they found (they FOUND something)
   - refine: Providing more details about a previous query
   - help: General questions about the system
   - claim: Wants to claim an item
   - unknown: Cannot determine intent - MUST ask clarifying question

2. ITEM_CONTEXT: Based on intent, what should we search for?
   - If user LOST something → search FOUND items
   - If user FOUND something → search LOST items

3. EXTRACTED INFO: What details did they provide?
   - category (e.g., electronics, wallet, keys, bag, clothing, documents, jewelry, phone, laptop, other)
   - location (where the item was lost/found - building, area, landmark)
   - date (when it was lost/found - specific date or relative like "yesterday", "last week")
   - description (physical details, color, brand, size, material, unique marks)
   - itemType (lost or found - from USER's perspective)

4. INFO_SCORE: How many of the 4 fields above have meaningful values? (0-4)

Respond in this exact format:
INTENT: [intent]
CONFIDENCE: [0-100]
SEARCH_CONTEXT: [lost/found - what to search in database]
CATEGORY: [category or NONE]
LOCATION: [location or NONE]
DATE: [date or NONE]
DESCRIPTION: [description or NONE]
ITEM_TYPE: [lost/found or NONE]
INFO_SCORE: [0-4]`;

  const response = await callAI(prompt, 300, true);
  
  const intentMatch = response.match(/INTENT:\s*(\w+)/i);
  const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
  const categoryMatch = response.match(/CATEGORY:\s*(.+?)(?:\n|$)/i);
  const locationMatch = response.match(/LOCATION:\s*(.+?)(?:\n|$)/i);
  const dateMatch = response.match(/DATE:\s*(.+?)(?:\n|$)/i);
  const descriptionMatch = response.match(/DESCRIPTION:\s*(.+?)(?:\n|$)/i);
  const itemTypeMatch = response.match(/ITEM_TYPE:\s*(.+?)(?:\n|$)/i);

  const extractValue = (match: RegExpMatchArray | null): string | undefined => {
    const val = match?.[1]?.trim();
    return val && val.toUpperCase() !== 'NONE' ? val : undefined;
  };

  return {
    intent: (intentMatch?.[1]?.toLowerCase() || 'unknown') as any,
    extractedInfo: {
      category: extractValue(categoryMatch),
      location: extractValue(locationMatch),
      date: extractValue(dateMatch),
      description: extractValue(descriptionMatch),
      itemType: extractValue(itemTypeMatch)?.toLowerCase() as 'lost' | 'found' | undefined,
    },
    confidence: parseInt(confidenceMatch?.[1] || '50'),
  };
}

// Data completeness check - STRICT: Need at least 2-3 fields before searching
function checkDataCompleteness(extractedInfo: any, intent: string): {
  isComplete: boolean;
  infoScore: number;
  missingFields: string[];
  criticalMissing: string[];
  canSearch: boolean;
} {
  const allFields = ['category', 'location', 'date', 'description'];
  
  const missingFields: string[] = [];
  const criticalMissing: string[] = [];
  let infoScore = 0;

  // Count how many fields we have
  for (const field of allFields) {
    if (extractedInfo[field] && extractedInfo[field].length > 0) {
      infoScore++;
    } else {
      missingFields.push(field);
    }
  }

  // Category is always critical for search
  if (!extractedInfo.category) {
    criticalMissing.push('category');
  }

  // For posting, we need more info
  if (intent === 'post_lost' || intent === 'post_found') {
    if (!extractedInfo.description) criticalMissing.push('description');
    if (!extractedInfo.location) criticalMissing.push('location');
  }

  // STRICT RULE: Need at least 2 fields to perform a search
  const canSearch = infoScore >= 2;
  const isComplete = criticalMissing.length === 0 && infoScore >= 2;

  return {
    isComplete,
    infoScore,
    missingFields,
    criticalMissing,
    canSearch,
  };
}

// Generate clarifying questions - STRICT: Max 2 questions per response
async function generateClarifyingQuestions(
  userMessage: string,
  intent: string,
  missingFields: string[],
  criticalMissing: string[],
  infoScore: number
): Promise<string[]> {
  // If we have enough info (2+ fields), don't ask more questions
  if (infoScore >= 2 && criticalMissing.length === 0) {
    return [];
  }

  const prompt = `You are a friendly Lost & Found assistant. The user said: "${userMessage}"
Their intent: ${intent}

Information we're missing: ${[...criticalMissing, ...missingFields].join(', ') || 'None'}
Fields we already have: ${4 - missingFields.length - criticalMissing.length} out of 4

RULES:
- Generate EXACTLY 1-2 conversational, friendly questions to gather missing info
- Be empathetic and helpful, not robotic
- Focus on the most important missing fields first (category > location > date > description)
- Combine related questions when possible
- Use natural language, like talking to a friend

Example good questions:
- "What kind of item did you lose? And roughly where do you think you lost it?"
- "Could you describe the item a bit more? Any specific color, brand, or unique features?"

Respond with ONLY the questions (max 2), one per line.`;

  const response = await callAI(prompt, 150, true);
  return response.split('\n').filter(q => q.trim().length > 0 && q.trim().length > 10).slice(0, 2);
}

// Item synonyms for better matching
const ITEM_SYNONYMS: Record<string, string[]> = {
  phone: ['mobile', 'smartphone', 'iphone', 'android', 'cell', 'cellphone', 'handset'],
  wallet: ['purse', 'billfold', 'pocketbook', 'card holder', 'money clip'],
  bag: ['backpack', 'handbag', 'satchel', 'tote', 'rucksack', 'pouch', 'sling bag'],
  laptop: ['notebook', 'macbook', 'chromebook', 'computer'],
  keys: ['keychain', 'key ring', 'car keys', 'house keys'],
  earphones: ['earbuds', 'headphones', 'airpods', 'headset'],
  glasses: ['spectacles', 'eyeglasses', 'sunglasses', 'shades'],
  watch: ['wristwatch', 'smartwatch', 'timepiece'],
  card: ['id card', 'identity card', 'credit card', 'debit card', 'aadhar', 'pan card'],
  bottle: ['water bottle', 'flask', 'tumbler'],
  umbrella: ['parasol', 'brolly'],
  charger: ['adapter', 'power bank', 'charging cable'],
  electronics: ['phone', 'laptop', 'tablet', 'camera', 'earphones', 'charger', 'smartwatch'],
  documents: ['id card', 'passport', 'license', 'certificate', 'paper'],
  accessories: ['watch', 'jewelry', 'glasses', 'belt', 'tie'],
};

// Get all synonyms for a term
function getSynonyms(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  const synonyms = new Set<string>([lowerTerm]);
  
  for (const [key, values] of Object.entries(ITEM_SYNONYMS)) {
    if (key === lowerTerm || values.includes(lowerTerm)) {
      synonyms.add(key);
      values.forEach(v => synonyms.add(v));
    }
  }
  
  return Array.from(synonyms);
}

// Search database for matches - DATABASE FIRST approach
async function searchForMatches(
  supabase: any,
  extractedInfo: any,
  intent: string,
  forceSearch: boolean = false
): Promise<any[]> {
  console.log('=== DATABASE SEARCH START ===');
  console.log('Search params:', JSON.stringify(extractedInfo));
  
  // Determine what type of items to search for
  let searchType = 'found'; // Default: if user lost something, search found items
  if (intent === 'post_found' || extractedInfo.itemType === 'found') {
    searchType = 'lost'; // If user found something, search lost items
  }
  
  // Also search all items if no clear intent
  const searchBothTypes = intent === 'search' || intent === 'unknown' || forceSearch;

  // Build search terms from description and category
  const searchTerms: string[] = [];
  
  if (extractedInfo.category) {
    searchTerms.push(...getSynonyms(extractedInfo.category));
  }
  
  if (extractedInfo.description) {
    const words = extractedInfo.description.toLowerCase().split(/\s+/);
    words.forEach((word: string) => {
      if (word.length > 2) {
        searchTerms.push(...getSynonyms(word));
      }
    });
  }

  console.log('Search terms:', searchTerms);
  console.log('Search type:', searchBothTypes ? 'both' : searchType);

  // Perform broad search first, then filter
  let query = supabase
    .from('items')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  // Only filter by type if we have clear intent
  if (!searchBothTypes) {
    query = query.eq('item_type', searchType);
  }

  const { data: allItems, error } = await query;
  
  if (error) {
    console.error('Database search error:', error);
    return [];
  }

  console.log('Total items fetched:', allItems?.length || 0);

  if (!allItems || allItems.length === 0) {
    return [];
  }

  // Score and filter items based on relevance
  const scoredItems = allItems.map((item: any) => {
    let relevanceScore = 0;
    const matchReasons: string[] = [];
    
    const itemTitle = (item.title || '').toLowerCase();
    const itemDesc = (item.description || '').toLowerCase();
    const itemCategory = (item.category || '').toLowerCase();
    const itemLocation = (item.location || '').toLowerCase();
    
    // Check each search term
    for (const term of searchTerms) {
      if (itemTitle.includes(term)) {
        relevanceScore += 30;
        matchReasons.push(`Title contains "${term}"`);
      }
      if (itemDesc.includes(term)) {
        relevanceScore += 20;
        matchReasons.push(`Description contains "${term}"`);
      }
      if (itemCategory.includes(term)) {
        relevanceScore += 25;
        matchReasons.push(`Category matches "${term}"`);
      }
    }
    
    // Location matching (case-insensitive, partial)
    if (extractedInfo.location) {
      const userLoc = extractedInfo.location.toLowerCase();
      const locWords = userLoc.split(/\s+/).filter((w: string) => w.length > 2);
      
      for (const word of locWords) {
        if (itemLocation.includes(word)) {
          relevanceScore += 20;
          matchReasons.push(`Location matches "${word}"`);
        }
      }
    }
    
    // Date proximity scoring
    if (extractedInfo.date && item.date_lost_found) {
      try {
        const userDate = new Date(extractedInfo.date);
        const itemDate = new Date(item.date_lost_found);
        const daysDiff = Math.abs((userDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) relevanceScore += 15;
        else if (daysDiff <= 3) relevanceScore += 10;
        else if (daysDiff <= 7) relevanceScore += 5;
      } catch (e) {}
    }
    
    return { ...item, relevanceScore, matchReasons };
  });

  // Filter items with relevance > 0, or return top items if no matches
  let relevantItems = scoredItems.filter((item: any) => item.relevanceScore > 0);
  
  // If no relevant items found but we have search terms, still return some items
  if (relevantItems.length === 0 && searchTerms.length > 0) {
    // Return items from the same category at least
    if (extractedInfo.category) {
      relevantItems = scoredItems.filter((item: any) => 
        item.category?.toLowerCase().includes(extractedInfo.category.toLowerCase())
      );
    }
  }
  
  // If still nothing, return latest items for user to browse
  if (relevantItems.length === 0) {
    relevantItems = scoredItems.slice(0, 10);
  }

  // Sort by relevance score
  relevantItems.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  
  console.log('Relevant items found:', relevantItems.length);
  console.log('Top matches:', relevantItems.slice(0, 5).map((i: any) => ({
    title: i.title,
    score: i.relevanceScore,
    reasons: i.matchReasons
  })));
  console.log('=== DATABASE SEARCH END ===');

  return relevantItems.slice(0, 20);
}

// Calculate confidence scores using LOGICAL scoring (no ML needed)
function calculateLogicalConfidence(
  extractedInfo: any,
  item: any
): { score: number; breakdown: { category: number; location: number; date: number; description: number; identifiers: number }; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const breakdown = { category: 0, location: 0, date: 0, description: 0, identifiers: 0 };

  // +40% → Same category
  if (extractedInfo.category && item.category) {
    const userCat = extractedInfo.category.toLowerCase();
    const itemCat = item.category.toLowerCase();
    if (userCat === itemCat || itemCat.includes(userCat) || userCat.includes(itemCat)) {
      breakdown.category = 40;
      score += 40;
      reasons.push(`Same category (${item.category})`);
    } else {
      breakdown.category = 0;
      reasons.push(`Different category`);
    }
  }

  // +25% → Same or nearby location
  if (extractedInfo.location && item.location) {
    const userLoc = extractedInfo.location.toLowerCase();
    const itemLoc = item.location.toLowerCase();
    // Check for common location keywords
    const locationWords = userLoc.split(/\s+/).filter((w: string) => w.length > 2);
    const matchingWords = locationWords.filter((w: string) => itemLoc.includes(w));
    
    if (userLoc === itemLoc || matchingWords.length >= 2) {
      breakdown.location = 25;
      score += 25;
      reasons.push(`Location match`);
    } else if (matchingWords.length >= 1) {
      breakdown.location = 15;
      score += 15;
      reasons.push(`Nearby location`);
    }
  }

  // +20% → Date within 3 days
  if (extractedInfo.date && item.date_lost_found) {
    const userDate = new Date(extractedInfo.date);
    const itemDate = new Date(item.date_lost_found);
    const daysDiff = Math.abs((userDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) {
      breakdown.date = 20;
      score += 20;
      reasons.push(`Found within 1 day`);
    } else if (daysDiff <= 3) {
      breakdown.date = 15;
      score += 15;
      reasons.push(`Found within 3 days`);
    } else if (daysDiff <= 7) {
      breakdown.date = 10;
      score += 10;
      reasons.push(`Found within a week`);
    }
  } else {
    // Give partial credit if date not specified
    breakdown.date = 5;
    score += 5;
  }

  // +10% → Description similarity
  if (extractedInfo.description && item.description) {
    const userDesc = extractedInfo.description.toLowerCase();
    const itemDesc = item.description.toLowerCase();
    const descWords = userDesc.split(/\s+/).filter((w: string) => w.length > 3);
    const matchingDesc = descWords.filter((w: string) => itemDesc.includes(w));
    
    if (matchingDesc.length >= 3) {
      breakdown.description = 10;
      score += 10;
      reasons.push(`Description matches`);
    } else if (matchingDesc.length >= 1) {
      breakdown.description = 5;
      score += 5;
      reasons.push(`Partial description match`);
    }
  }

  // +5% → Unique identifiers (color, brand)
  const identifiers = ['black', 'white', 'red', 'blue', 'green', 'gold', 'silver', 'brown', 
    'apple', 'samsung', 'nike', 'adidas', 'leather', 'metal', 'plastic'];
  
  if (extractedInfo.description && item.description) {
    const userDesc = extractedInfo.description.toLowerCase();
    const itemDesc = item.description.toLowerCase();
    
    for (const id of identifiers) {
      if (userDesc.includes(id) && itemDesc.includes(id)) {
        breakdown.identifiers = 5;
        score += 5;
        reasons.push(`Matching identifier: ${id}`);
        break;
      }
    }
  }

  return { score: Math.min(score, 100), breakdown, reasons };
}

// Score matches with logical confidence
async function scoreMatches(
  userMessage: string,
  extractedInfo: any,
  items: any[]
): Promise<MatchResult[]> {
  if (items.length === 0) return [];

  const results: MatchResult[] = [];

  for (const item of items) {
    const { score, breakdown, reasons } = calculateLogicalConfidence(extractedInfo, item);
    
    // Generate reasoning text
    const reasoningText = `🧠 Match Confidence: ${score}%\n` +
      `• Category: +${breakdown.category}%\n` +
      `• Location: +${breakdown.location}%\n` +
      `• Date: +${breakdown.date}%\n` +
      `• Description: +${breakdown.description}%\n` +
      `• Identifiers: +${breakdown.identifiers}%\n\n` +
      `Reason: ${reasons.join(', ')}`;

    results.push({
      item,
      confidence: score,
      reasoning: reasoningText,
      rank: 0,
    });
  }

  // Sort by confidence and assign ranks
  results.sort((a, b) => b.confidence - a.confidence);
  results.forEach((r, i) => r.rank = i + 1);

  return results;
}

// Format database results for AI context
function formatDatabaseResults(matches: MatchResult[]): string {
  if (matches.length === 0) {
    return 'DATABASE QUERY RETURNED: 0 items found matching the search criteria.';
  }

  let formatted = `DATABASE QUERY RETURNED: ${matches.length} items found.\n\n`;
  formatted += 'ACTUAL DATABASE RESULTS (you MUST reference these):\n';
  formatted += '─'.repeat(50) + '\n';

  matches.slice(0, 10).forEach((match, index) => {
    const item = match.item;
    formatted += `\n${index + 1}. ${item.title}\n`;
    formatted += `   📍 Location: ${item.location || 'Not specified'}\n`;
    formatted += `   📅 Date: ${item.date_lost_found || 'Not specified'}\n`;
    formatted += `   🏷️ Status: ${item.item_type === 'lost' ? 'Lost' : 'Found'}\n`;
    formatted += `   📝 Description: ${(item.description || '').substring(0, 150)}${item.description?.length > 150 ? '...' : ''}\n`;
    formatted += `   🎯 Match Confidence: ${match.confidence}%\n`;
    formatted += `   💡 Reason: ${match.reasoning?.split('\n')[0] || 'Matches search criteria'}\n`;
  });

  formatted += '\n' + '─'.repeat(50);
  return formatted;
}

// Generate response with recommendations
async function generateInvestigatorResponse(
  userMessage: string,
  intent: string,
  extractedInfo: any,
  clarifyingQuestions: string[],
  matches: MatchResult[],
  isComplete: boolean,
  duplicateWarning?: string,
  totalDbResults?: number
): Promise<{
  response: string;
  recommendedAction: string;
  topMatches: MatchResult[];
}> {
  const topMatches = matches.filter(m => m.confidence >= 20).slice(0, 10);
  const hasGoodMatches = topMatches.some(m => m.confidence >= 50);
  const hasAnyMatches = topMatches.length > 0;

  // Format actual database results for the AI
  const dbResultsFormatted = formatDatabaseResults(topMatches);

  const prompt = `User: "${userMessage}"
Intent: ${intent} | Info: ${extractedInfo.category || '?'}, ${extractedInfo.location || '?'}

${topMatches.length > 0 ? `MATCHES FOUND (show top 3 max):
${topMatches.slice(0, 3).map((m, i) => `${i+1}. ${m.item.title} | ${m.item.location} | ${m.confidence}%`).join('\n')}` : 'NO MATCHES FOUND'}

RULES:
- Reply in USER'S LANGUAGE (Hindi→Hindi, English→English)
- MAX 2-3 lines intro + matches list
- If matches: show them briefly with 📦📍🎯
- If no matches: suggest posting item
- End with one quick action suggestion
${duplicateWarning ? `\n⚠️ ${duplicateWarning}` : ''}`;

  const response = await callAI(prompt, 300, true);

  let recommendedAction = 'continue_search';
  if (hasGoodMatches) {
    recommendedAction = 'review_matches';
  } else if (hasAnyMatches) {
    recommendedAction = 'refine_search';
  } else if (totalDbResults === 0) {
    recommendedAction = 'post_item';
  } else {
    recommendedAction = 'check_categories';
  }

  return {
    response,
    recommendedAction,
    topMatches,
  };
}

// Check for duplicate posts
async function checkForDuplicates(
  supabase: any,
  extractedInfo: any,
  intent: string
): Promise<string | null> {
  if (intent !== 'post_lost' && intent !== 'post_found') {
    return null;
  }

  const itemType = intent === 'post_lost' ? 'lost' : 'found';
  
  // Look for similar items posted in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  let query = supabase
    .from('items')
    .select('id, title, description, category, location')
    .eq('item_type', itemType)
    .eq('status', 'active')
    .gte('created_at', oneDayAgo)
    .limit(10);

  if (extractedInfo.category) {
    query = query.ilike('category', `%${extractedInfo.category}%`);
  }

  const { data: recentItems, error } = await query;
  
  if (error || !recentItems || recentItems.length === 0) {
    return null;
  }

  // Check for high similarity
  for (const item of recentItems) {
    const { score } = calculateLogicalConfidence(extractedInfo, item);
    if (score >= 70) {
      return `⚠️ Similar ${itemType} item already exists: "${item.title}". Would you like to link to it instead of creating a new post?`;
    }
  }

  return null;
}

// Generate friendly response when more info is needed (NO SEARCH YET)
async function generateNeedMoreInfoResponse(
  userMessage: string,
  intent: string,
  infoScore: number,
  clarifyingQuestions: string[]
): Promise<string> {
  const prompt = `User said: "${userMessage}"
Need more info (${infoScore}/4 fields). Ask: ${clarifyingQuestions.join(' | ')}

RULES:
- Reply in SAME LANGUAGE as user (Hindi→Hindi, English→English)
- MAX 2 lines + 1-2 questions
- Be friendly but brief

Example: "Kya kho gaya aur kahan? Thoda detail dedo toh dhundne mein help karunga!"`;

  return await callAI(prompt, 150, true);
}

// Generate help/guidance response for general queries
async function generateHelpResponse(userMessage: string): Promise<string> {
  const prompt = `User asked: "${userMessage}"

Reply in their language. Keep it 2-3 lines max.
Options: 🔴 Lost something | 🟢 Found something | 🔍 Search items

Example: "Main help kar sakta hoon! Kya aap kuch dhundh rahe ho ya kuch mila hai?"`;

  return await callAI(prompt, 100, true);
}

// Main chat handler with full conversation flow - INTELLIGENT CONVERSATIONAL APPROACH
async function handleChat(
  supabase: any,
  userMessage: string,
  conversationHistory: any[] = []
): Promise<{
  response: string;
  context: ConversationContext;
}> {
  console.log('=== INTELLIGENT INVESTIGATOR FLOW START ===');
  console.log('User message:', userMessage);

  // Step 0: Check for identity questions FIRST
  const lowerMessage = userMessage.toLowerCase();
  const identityKeywords = ['kisne banaya', 'kisne train', 'who made', 'who built', 'who trained', 'who created', 'tujhe kisne', 'aapko kisne', 'tumhe kisne', 'maker', 'creator', 'developer'];
  const isIdentityQuestion = identityKeywords.some(kw => lowerMessage.includes(kw));
  
  if (isIdentityQuestion) {
    console.log('Identity question detected - responding directly');
    return {
      response: "Mujhe Rehan bhai ne banaya hai and train kiya hai! 🙏\n\nMain aapki Lost & Found items dhundne mein madad karne ke liye yahan hoon. Kya aap kuch kho diye hain ya kuch mila hai?",
      context: {
        intent: 'help',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'continue_conversation',
      },
    };
  }

  // Step 1: Intent Detection and Info Extraction
  console.log('Step 1: Detecting intent...');
  const { intent, extractedInfo, confidence: intentConfidence } = await detectIntent(userMessage, conversationHistory);
  console.log('Intent:', intent, 'Confidence:', intentConfidence);
  console.log('Extracted info:', extractedInfo);

  // Step 2: Data Completeness Check - STRICT: Need 2+ fields before searching
  console.log('Step 2: Checking data completeness (STRICT)...');
  const { isComplete, infoScore, missingFields, criticalMissing, canSearch } = checkDataCompleteness(extractedInfo, intent);
  console.log('Info score:', infoScore, '/4, Can search:', canSearch, 'Missing:', [...criticalMissing, ...missingFields]);

  // Step 3: If intent is unclear or info insufficient, ask clarifying questions FIRST (don't search yet)
  if (intent === 'unknown' || (intent !== 'help' && !canSearch)) {
    console.log('Step 3: Insufficient info - generating clarifying questions...');
    const clarifyingQuestions = await generateClarifyingQuestions(userMessage, intent, missingFields, criticalMissing, infoScore);
    
    // Generate a friendly response asking for more info
    const needsMoreInfoResponse = await generateNeedMoreInfoResponse(userMessage, intent, infoScore, clarifyingQuestions);
    
    console.log('=== FLOW END (Need more info) ===');
    return {
      response: needsMoreInfoResponse,
      context: {
        intent,
        missingFields: [...criticalMissing, ...missingFields],
        clarifyingQuestions,
        matches: [],
        recommendedAction: 'provide_more_info',
      },
    };
  }

  // Step 4: Handle help/general queries
  if (intent === 'help') {
    console.log('Step 4: Help intent - providing guidance...');
    const helpResponse = await generateHelpResponse(userMessage);
    return {
      response: helpResponse,
      context: {
        intent: 'help',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'continue_conversation',
      },
    };
  }

  // Step 5: NOW search database (only after we have enough info)
  console.log('Step 5: SEARCHING DATABASE (info score >= 2)...');
  const items = await searchForMatches(supabase, extractedInfo, intent, false);
  console.log('Database returned:', items.length, 'items');

  // Step 6: Score all matches using logical confidence
  let matches: MatchResult[] = [];
  if (items.length > 0) {
    console.log('Step 6: Scoring matches with logical confidence...');
    matches = await scoreMatches(userMessage, extractedInfo, items);
    console.log('Scored matches:', matches.slice(0, 5).map(m => ({ 
      title: m.item.title, 
      confidence: m.confidence,
      location: m.item.location 
    })));
  }

  // Step 7: Check for duplicates if posting
  let duplicateWarning: string | null = null;
  if (intent === 'post_lost' || intent === 'post_found') {
    console.log('Step 7: Checking for duplicates...');
    duplicateWarning = await checkForDuplicates(supabase, extractedInfo, intent);
    if (duplicateWarning) {
      console.log('Duplicate warning:', duplicateWarning);
    }
  }

  // Step 8: Generate additional clarifying questions if no good matches
  let clarifyingQuestions: string[] = [];
  const hasGoodMatches = matches.some(m => m.confidence >= 50);
  if (!hasGoodMatches && matches.length < 3) {
    console.log('Step 8: No good matches - generating refinement questions...');
    clarifyingQuestions = await generateClarifyingQuestions(userMessage, intent, missingFields, criticalMissing, infoScore);
    console.log('Questions:', clarifyingQuestions);
  }

  // Step 9: Generate Response with Database Results
  console.log('Step 9: Generating response with database results...');
  const { response, recommendedAction, topMatches } = await generateInvestigatorResponse(
    userMessage,
    intent,
    extractedInfo,
    clarifyingQuestions,
    matches,
    isComplete,
    duplicateWarning || undefined,
    items.length
  );

  console.log('=== INTELLIGENT INVESTIGATOR FLOW END ===');
  console.log('Total matches found:', matches.length);
  console.log('Recommended action:', recommendedAction);

  return {
    response,
    context: {
      intent,
      missingFields: [...criticalMissing, ...missingFields],
      clarifyingQuestions,
      matches: topMatches,
      recommendedAction,
    },
  };
}

async function callAI(prompt: string, maxTokens = 500, useInvestigatorMode = false): Promise<string> {
  console.log('Calling AI with prompt:', prompt.substring(0, 100) + '...');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }
  
  const messages: { role: string; content: string }[] = [];
  
  if (useInvestigatorMode) {
    messages.push({ role: 'system', content: INVESTIGATOR_SYSTEM_PROMPT });
  }
  
  messages.push({ role: 'user', content: prompt });
  
  const response = await fetch(LOVABLE_AI_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI API error:', response.status, error);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    if (response.status === 402) {
      throw new Error('AI usage limit reached. Please try again later.');
    }
    
    throw new Error(`AI API error: ${error}`);
  }

  const result = await response.json();
  console.log('AI response:', JSON.stringify(result).substring(0, 200));
  
  // OpenAI-compatible format
  if (result.choices && result.choices[0]?.message?.content) {
    return result.choices[0].message.content.trim();
  }
  
  throw new Error('Unexpected response format from AI');
}

// Image tagging - simplified using text description via Mistral
async function analyzeImage(imageUrl: string): Promise<{ tags: string[], objects: string[] }> {
  console.log('Analyzing image:', imageUrl);
  
  // For now, we'll generate generic tags based on the URL/context
  // Image models may have availability issues, so we use a text-based approach
  const tagsPrompt = `Based on this image URL for a lost and found item: "${imageUrl}"

Generate 5-10 generic but helpful tags for a lost and found database. Consider common lost items like phones, wallets, keys, bags, electronics, clothing, etc.

Return ONLY a comma-separated list of tags, nothing else.`;

  try {
    const tagsResponse = await callAI(tagsPrompt, 100);
    const tags = tagsResponse.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    return { tags, objects: [] };
  } catch (error) {
    console.error('Tag generation failed:', error);
    return { tags: ['item', 'lost', 'found'], objects: [] };
  }
}

// Auto-generate title and description
async function generateTitleDescription(context: { tags: string[], objects: string[], category: string, location: string }): Promise<{ title: string, description: string }> {
  const prompt = `<s>[INST] Generate a concise title and description for a lost/found item posting.

Context:
- Tags: ${context.tags.join(', ')}
- Objects detected: ${context.objects.join(', ')}
- Category: ${context.category}
- Location: ${context.location}

Respond in this exact format:
TITLE: [a short descriptive title, max 60 chars]
DESCRIPTION: [a brief description, 1-2 sentences] [/INST]`;

  const response = await callAI(prompt, 150);
  
  const titleMatch = response.match(/TITLE:\s*(.+?)(?:\n|DESCRIPTION:)/i);
  const descMatch = response.match(/DESCRIPTION:\s*(.+)/i);
  
  return {
    title: titleMatch?.[1]?.trim() || 'Item Found/Lost',
    description: descMatch?.[1]?.trim() || 'Please provide more details about this item.',
  };
}

// Calculate match score between two items - uses investigator mode
async function calculateMatchScore(lostItem: any, foundItem: any): Promise<{ score: number, reasoning: string, textSimilarity: number, locationProximity: number }> {
  const prompt = `Compare these two items and determine if they might be a match. Think step-by-step about category, location proximity, date, description, and uniqueness.

LOST ITEM:
- Title: ${lostItem.title}
- Description: ${lostItem.description}
- Category: ${lostItem.category}
- Location: ${lostItem.location}
- Date Lost: ${lostItem.date_lost_found}

FOUND ITEM:
- Title: ${foundItem.title}
- Description: ${foundItem.description}
- Category: ${foundItem.category}
- Location: ${foundItem.location}
- Date Found: ${foundItem.date_lost_found}

Analyze using logic, not just keywords. Consider:
- Are the categories compatible?
- How close are the locations on a college campus?
- Does the timeline make sense (found after lost)?
- Do the descriptions describe similar unique features?

Respond in this exact format:
SCORE: [0-100 Match Confidence percentage]
TEXT_SIMILARITY: [0-100]
LOCATION_PROXIMITY: [0-100]
REASONING: [Clear explanation of WHY this is a strong or weak match in simple language]`;

  const response = await callAI(prompt, 300, true);
  
  const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
  const textMatch = response.match(/TEXT_SIMILARITY:\s*(\d+)/i);
  const locationMatch = response.match(/LOCATION_PROXIMITY:\s*(\d+)/i);
  const reasoningMatch = response.match(/REASONING:\s*(.+)/is);
  
  return {
    score: parseInt(scoreMatch?.[1] || '0'),
    textSimilarity: parseInt(textMatch?.[1] || '0'),
    locationProximity: parseInt(locationMatch?.[1] || '0'),
    reasoning: reasoningMatch?.[1]?.trim() || 'Unable to determine match.',
  };
}

// Semantic search
async function semanticSearch(query: string, items: any[]): Promise<any[]> {
  const prompt = `<s>[INST] Given this search query: "${query}"

Rate each item's relevance (0-100) and return the IDs of the most relevant items in order.

Items:
${items.slice(0, 20).map((item, i) => `${i + 1}. ID: ${item.id} | Title: ${item.title} | Description: ${item.description?.substring(0, 100) || ''}`).join('\n')}

Return ONLY a comma-separated list of item IDs in order of relevance (most relevant first), nothing else. [/INST]`;

  const response = await callAI(prompt, 200);
  const ids = response.split(',').map(id => id.trim()).filter(id => id);
  
  // Reorder items based on AI ranking
  const rankedItems: any[] = [];
  for (const id of ids) {
    const item = items.find(i => i.id === id);
    if (item) rankedItems.push(item);
  }
  
  // Add remaining items
  for (const item of items) {
    if (!rankedItems.find(r => r.id === item.id)) {
      rankedItems.push(item);
    }
  }
  
  return rankedItems;
}

// Smart autocomplete
async function getAutocomplete(partialQuery: string, context: string): Promise<string[]> {
  const prompt = `<s>[INST] Generate 5 search autocomplete suggestions for a lost and found website.

Partial query: "${partialQuery}"
Context: ${context}

Return ONLY a comma-separated list of 5 complete search suggestions, nothing else. [/INST]`;

  const response = await callAI(prompt, 100);
  return response.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 5);
}

// Duplicate detection
async function detectDuplicates(newItem: any, existingItems: any[]): Promise<any[]> {
  if (existingItems.length === 0) return [];
  
  const prompt = `<s>[INST] Check if this new item might be a duplicate of any existing items:

NEW ITEM:
- Title: ${newItem.title}
- Description: ${newItem.description}
- Category: ${newItem.category}
- Location: ${newItem.location}

EXISTING ITEMS:
${existingItems.slice(0, 10).map((item, i) => `${i + 1}. ID: ${item.id} | Title: ${item.title} | Category: ${item.category}`).join('\n')}

Return ONLY the IDs of potential duplicates as a comma-separated list, or "NONE" if no duplicates. [/INST]`;

  const response = await callAI(prompt, 100);
  
  if (response.toUpperCase().includes('NONE')) return [];
  
  const ids = response.split(',').map(id => id.trim()).filter(id => id);
  return existingItems.filter(item => ids.includes(item.id));
}

// Intent clarification - uses investigator mode
async function clarifyIntent(userQuery: string): Promise<{ intent: string, suggestions: string[], clarification: string }> {
  const prompt = `Analyze this user query for a lost and found website:

Query: "${userQuery}"

As the Lost & Found Investigator, determine:
1. The user's intent (lost_item, found_item, search, claim, question)
2. If the query is unclear, ask clarifying questions to better help them
3. Provide helpful, actionable suggestions for next steps

Think step-by-step about what the user really needs, then respond in this exact format:
INTENT: [intent type]
CLARIFICATION: [insightful question to ask user if query is unclear, or "CLEAR" if you understand their need well]
SUGGESTIONS: [comma-separated list of specific, helpful next steps]`;

  const response = await callAI(prompt, 300, true);
  
  const intentMatch = response.match(/INTENT:\s*(.+?)(?:\n|CLARIFICATION:)/i);
  const clarificationMatch = response.match(/CLARIFICATION:\s*(.+?)(?:\n|SUGGESTIONS:)/i);
  const suggestionsMatch = response.match(/SUGGESTIONS:\s*(.+)/i);
  
  return {
    intent: intentMatch?.[1]?.trim() || 'unknown',
    clarification: clarificationMatch?.[1]?.trim() || 'CLEAR',
    suggestions: suggestionsMatch?.[1]?.split(',').map(s => s.trim()).filter(s => s) || [],
  };
}

// Suggest missing info
async function suggestMissingInfo(item: any): Promise<string[]> {
  const prompt = `<s>[INST] Review this lost/found item posting and suggest what additional information would be helpful:

Item:
- Title: ${item.title || 'Not provided'}
- Description: ${item.description || 'Not provided'}
- Category: ${item.category || 'Not provided'}
- Location: ${item.location || 'Not provided'}
- Date: ${item.date_lost_found || 'Not provided'}
- Photos: ${item.photos?.length ? 'Yes' : 'No'}

Return ONLY a comma-separated list of missing or helpful information to add, or "COMPLETE" if the posting is comprehensive. [/INST]`;

  const response = await callAI(prompt, 150);
  
  if (response.toUpperCase().includes('COMPLETE')) return [];
  
  return response.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// Generate notification message
async function generateNotification(type: string, context: any): Promise<{ title: string, message: string }> {
  const prompt = `<s>[INST] Generate a notification for a lost and found app.

Type: ${type}
Context: ${JSON.stringify(context)}

Respond in this exact format:
TITLE: [short notification title]
MESSAGE: [brief, helpful notification message] [/INST]`;

  const response = await callAI(prompt, 100);
  
  const titleMatch = response.match(/TITLE:\s*(.+?)(?:\n|MESSAGE:)/i);
  const messageMatch = response.match(/MESSAGE:\s*(.+)/i);
  
  return {
    title: titleMatch?.[1]?.trim() || 'Notification',
    message: messageMatch?.[1]?.trim() || 'You have a new notification.',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, ...params } = await req.json();

    console.log('AI Assistant action:', action, 'params:', JSON.stringify(params).substring(0, 200));

    let result: any;

    switch (action) {
      case 'analyze_image':
        result = await analyzeImage(params.imageUrl);
        break;

      case 'generate_title_description':
        result = await generateTitleDescription(params);
        break;

      case 'calculate_match_score':
        result = await calculateMatchScore(params.lostItem, params.foundItem);
        break;

      case 'semantic_search':
        result = await semanticSearch(params.query, params.items);
        break;

      case 'autocomplete':
        result = await getAutocomplete(params.query, params.context || 'lost and found items');
        break;

      case 'detect_duplicates':
        result = await detectDuplicates(params.newItem, params.existingItems);
        break;

      case 'clarify_intent':
        result = await clarifyIntent(params.query);
        break;

      case 'suggest_missing_info':
        result = await suggestMissingInfo(params.item);
        break;

      case 'generate_notification':
        result = await generateNotification(params.type, params.context);
        break;

      case 'process_new_item':
        // Comprehensive processing for new items
        const { item } = params;
        const processResult: any = {};

        // 1. Analyze image if available
        if (item.photos && item.photos.length > 0) {
          const imageAnalysis = await analyzeImage(item.photos[0]);
          processResult.tags = imageAnalysis.tags;
          processResult.objects = imageAnalysis.objects;
        }

        // 2. Generate auto title/description if missing
        if (!item.title || !item.description) {
          const generated = await generateTitleDescription({
            tags: processResult.tags || [],
            objects: processResult.objects || [],
            category: item.category,
            location: item.location,
          });
          processResult.autoTitle = generated.title;
          processResult.autoDescription = generated.description;
        }

        // 3. Check for duplicates
        const { data: existingItems } = await supabase
          .from('items')
          .select('id, title, description, category, location')
          .eq('item_type', item.item_type)
          .eq('category', item.category)
          .limit(20);

        if (existingItems) {
          processResult.duplicates = await detectDuplicates(item, existingItems);
        }

        // 4. Find potential matches
        const oppositeType = item.item_type === 'lost' ? 'found' : 'lost';
        const { data: potentialMatches } = await supabase
          .from('items')
          .select('*')
          .eq('item_type', oppositeType)
          .eq('category', item.category)
          .eq('status', 'active')
          .limit(10);

        if (potentialMatches && potentialMatches.length > 0) {
          processResult.matches = [];
          for (const match of potentialMatches.slice(0, 5)) {
            const matchScore = await calculateMatchScore(
              item.item_type === 'lost' ? item : match,
              item.item_type === 'lost' ? match : item
            );
            if (matchScore.score >= 50) {
              processResult.matches.push({
                item: match,
                ...matchScore,
              });
            }
          }
          processResult.matches.sort((a: any, b: any) => b.score - a.score);
        }

        // 5. Suggest missing info
        processResult.missingInfo = await suggestMissingInfo(item);

        result = processResult;
        break;

      case 'webhook_new_item':
        // Webhook handler for new items - runs in background
        const webhookItem = params.item;
        console.log('Processing webhook for new item:', webhookItem.id);

        // Process item and save AI tags
        let aiTags: any = { tags: [], objects: [] };
        if (webhookItem.photos && webhookItem.photos.length > 0) {
          try {
            aiTags = await analyzeImage(webhookItem.photos[0]);
          } catch (e) {
            console.error('Image analysis failed:', e);
          }
        }

        const autoContent = await generateTitleDescription({
          tags: aiTags.tags,
          objects: aiTags.objects,
          category: webhookItem.category,
          location: webhookItem.location,
        });

        // Save AI tags to database
        await supabase.from('ai_tags').upsert({
          item_id: webhookItem.id,
          tags: aiTags.tags,
          objects_detected: aiTags.objects,
          auto_title: autoContent.title,
          auto_description: autoContent.description,
        }, { onConflict: 'item_id' });

        // Find and save matches
        const matchType = webhookItem.item_type === 'lost' ? 'found' : 'lost';
        const { data: matchCandidates } = await supabase
          .from('items')
          .select('*')
          .eq('item_type', matchType)
          .eq('category', webhookItem.category)
          .eq('status', 'active')
          .limit(20);

        if (matchCandidates) {
          for (const candidate of matchCandidates) {
            try {
              const matchResult = await calculateMatchScore(
                webhookItem.item_type === 'lost' ? webhookItem : candidate,
                webhookItem.item_type === 'lost' ? candidate : webhookItem
              );

              if (matchResult.score >= 40) {
                await supabase.from('ai_match_suggestions').upsert({
                  lost_item_id: webhookItem.item_type === 'lost' ? webhookItem.id : candidate.id,
                  found_item_id: webhookItem.item_type === 'lost' ? candidate.id : webhookItem.id,
                  ai_score: matchResult.score,
                  text_similarity: matchResult.textSimilarity,
                  location_proximity: matchResult.locationProximity,
                  reasoning: matchResult.reasoning,
                }, { onConflict: 'lost_item_id,found_item_id' });

                // Create notification for match
                const notification = await generateNotification('potential_match', {
                  itemTitle: webhookItem.title,
                  matchTitle: candidate.title,
                  score: matchResult.score,
                });

                await supabase.from('ai_notifications').insert({
                  user_id: webhookItem.user_id,
                  item_id: webhookItem.id,
                  notification_type: 'potential_match',
                  title: notification.title,
                  message: notification.message,
                  metadata: { match_item_id: candidate.id, score: matchResult.score },
                });

                // Also notify the other item's owner
                await supabase.from('ai_notifications').insert({
                  user_id: candidate.user_id,
                  item_id: candidate.id,
                  notification_type: 'potential_match',
                  title: notification.title,
                  message: notification.message,
                  metadata: { match_item_id: webhookItem.id, score: matchResult.score },
                });
              }
            } catch (e) {
              console.error('Match processing error:', e);
            }
          }
        }

        result = { success: true, processed: webhookItem.id };
        break;

      case 'chat':
        // Full investigator conversation flow
        result = await handleChat(supabase, params.message, params.history || []);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_TOKEN = Deno.env.get('HF_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// HuggingFace chat completions endpoint (OpenAI-compatible)
const HF_CHAT_API = 'https://router.huggingface.co/v1/chat/completions';
// Using DeepSeek which is available on HuggingFace router
const AI_MODEL = 'deepseek-ai/DeepSeek-V3-0324';

// Lost & Found Investigator System Prompt
const INVESTIGATOR_SYSTEM_PROMPT = `You are an AI Lost & Found Investigator for a college campus.

Your responsibilities:
- Understand whether the user is searching, reporting, refining, or seeking guidance.
- Analyze lost and found items using logic, not keywords.
- Compare items based on category, location proximity, date, description, and uniqueness.
- Assign a clear Match Confidence percentage for every result.
- Explain WHY a match is strong or weak in simple language.
- Ask follow-up questions if information is missing.
- Suggest the next best action (refine search, contact finder, post item, wait for updates).
- Never give short or boring answers.
- Always think step-by-step internally before responding.
- Be proactive, investigative, and helpful like a human assistant, not a chatbot.

Rules:
- If confidence < 50%, recommend posting a lost item.
- If multiple matches exist, rank them.
- If user intent is unclear, ask clarifying questions before acting.
- Use emojis sparingly for clarity, not decoration.`;

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

Determine:
1. INTENT: What does the user want to do?
   - search: Looking for a lost item
   - post_lost: Wants to report something they lost
   - post_found: Wants to report something they found
   - refine: Providing more details about a previous query
   - help: General questions about the system
   - claim: Wants to claim an item
   - unknown: Cannot determine intent

2. EXTRACTED INFO: What details did they provide?
   - category (e.g., electronics, wallet, keys, bag, clothing, documents, jewelry, other)
   - location (where the item was lost/found)
   - date (when it was lost/found)
   - description (physical details, color, brand, etc.)
   - itemType (lost or found)

Respond in this exact format:
INTENT: [intent]
CONFIDENCE: [0-100]
CATEGORY: [category or NONE]
LOCATION: [location or NONE]
DATE: [date or NONE]
DESCRIPTION: [description or NONE]
ITEM_TYPE: [lost/found or NONE]`;

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

// Data completeness check
function checkDataCompleteness(extractedInfo: any, intent: string): {
  isComplete: boolean;
  missingFields: string[];
  criticalMissing: string[];
} {
  const requiredFields = ['category', 'description'];
  const helpfulFields = ['location', 'date'];
  
  const missingFields: string[] = [];
  const criticalMissing: string[] = [];

  if (intent === 'search' || intent === 'post_lost' || intent === 'post_found') {
    for (const field of requiredFields) {
      if (!extractedInfo[field]) {
        criticalMissing.push(field);
      }
    }
    for (const field of helpfulFields) {
      if (!extractedInfo[field]) {
        missingFields.push(field);
      }
    }
  }

  return {
    isComplete: criticalMissing.length === 0,
    missingFields,
    criticalMissing,
  };
}

// Generate clarifying questions
async function generateClarifyingQuestions(
  userMessage: string,
  intent: string,
  missingFields: string[],
  criticalMissing: string[]
): Promise<string[]> {
  if (criticalMissing.length === 0 && missingFields.length === 0) {
    return [];
  }

  const prompt = `You are the Lost & Found Investigator. The user said: "${userMessage}"
Their intent appears to be: ${intent}

Critical missing information: ${criticalMissing.join(', ') || 'None'}
Helpful missing information: ${missingFields.join(', ') || 'None'}

Generate 1-3 natural, conversational questions to gather the missing information.
Be friendly and investigative, not robotic.
Focus on critical missing info first.

Respond with ONLY the questions, one per line.`;

  const response = await callAI(prompt, 200, true);
  return response.split('\n').filter(q => q.trim().length > 0).slice(0, 3);
}

// Search database for matches
async function searchForMatches(
  supabase: any,
  extractedInfo: any,
  intent: string
): Promise<any[]> {
  // Determine what type of items to search for
  let searchType = 'found'; // Default: if user lost something, search found items
  if (intent === 'post_found' || extractedInfo.itemType === 'found') {
    searchType = 'lost'; // If user found something, search lost items
  }

  let query = supabase
    .from('items')
    .select('*')
    .eq('status', 'active')
    .eq('item_type', searchType)
    .limit(20);

  // Add category filter if provided
  if (extractedInfo.category) {
    query = query.ilike('category', `%${extractedInfo.category}%`);
  }

  const { data: items, error } = await query;
  
  if (error) {
    console.error('Database search error:', error);
    return [];
  }

  return items || [];
}

// Calculate confidence scores for matches
async function scoreMatches(
  userMessage: string,
  extractedInfo: any,
  items: any[]
): Promise<MatchResult[]> {
  if (items.length === 0) return [];

  const itemsList = items.map((item, i) => 
    `${i + 1}. ID: ${item.id}
   Title: ${item.title}
   Category: ${item.category}
   Location: ${item.location}
   Date: ${item.date_lost_found}
   Description: ${item.description?.substring(0, 150) || 'No description'}`
  ).join('\n\n');

  const prompt = `As the Lost & Found Investigator, analyze these items against the user's search:

USER LOOKING FOR:
- Query: "${userMessage}"
- Category: ${extractedInfo.category || 'Not specified'}
- Location: ${extractedInfo.location || 'Not specified'}
- Date: ${extractedInfo.date || 'Not specified'}
- Description: ${extractedInfo.description || 'Not specified'}

AVAILABLE ITEMS:
${itemsList}

For each item, analyze:
1. Category match (exact, related, or unrelated)
2. Location proximity (same building/area, nearby, far, unknown)
3. Date logic (does the timeline make sense?)
4. Description similarity (unique features, colors, brands)

Rate each item's match confidence (0-100%) and explain your reasoning.

Respond in this format for EACH item (include ALL items):
ITEM_${'{item_number}'}:
CONFIDENCE: [0-100]
REASONING: [1-2 sentences explaining why this is or isn't a good match]
---`;

  const response = await callAI(prompt, 1000, true);
  
  const results: MatchResult[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const itemPattern = new RegExp(`ITEM_${i + 1}:[\\s\\S]*?CONFIDENCE:\\s*(\\d+)[\\s\\S]*?REASONING:\\s*([^\\n]+(?:\\n(?!ITEM_|---).*)?)`,'i');
    const match = response.match(itemPattern);
    
    if (match) {
      results.push({
        item: items[i],
        confidence: parseInt(match[1]) || 0,
        reasoning: match[2]?.trim() || 'Unable to analyze',
        rank: 0,
      });
    } else {
      // Fallback: still include the item with low confidence
      results.push({
        item: items[i],
        confidence: 20,
        reasoning: 'Could not analyze - please review manually',
        rank: 0,
      });
    }
  }

  // Sort by confidence and assign ranks
  results.sort((a, b) => b.confidence - a.confidence);
  results.forEach((r, i) => r.rank = i + 1);

  return results;
}

// Generate response with recommendations
async function generateInvestigatorResponse(
  userMessage: string,
  intent: string,
  extractedInfo: any,
  clarifyingQuestions: string[],
  matches: MatchResult[],
  isComplete: boolean
): Promise<{
  response: string;
  recommendedAction: string;
  topMatches: MatchResult[];
}> {
  const topMatches = matches.filter(m => m.confidence >= 30).slice(0, 5);
  const hasGoodMatches = topMatches.some(m => m.confidence >= 50);

  let context = `User message: "${userMessage}"
Intent: ${intent}
Data complete: ${isComplete}
${clarifyingQuestions.length > 0 ? `Clarifying questions needed: ${clarifyingQuestions.join('; ')}` : ''}
Number of potential matches: ${matches.length}
Top matches: ${topMatches.map(m => `${m.item.title} (${m.confidence}%)`).join(', ') || 'None'}`;

  const prompt = `As the Lost & Found Investigator, respond to this user:

${context}

Rules:
- If clarifying questions are needed, ask them naturally
- If there are good matches (>=50%), present them with confidence scores and reasoning
- If matches are weak (<50%), recommend posting the item
- Rank multiple matches clearly
- Always suggest a next action
- Be helpful, investigative, and conversational
- Use emojis sparingly for clarity only

Generate a complete, helpful response that:
1. Acknowledges what they're looking for
2. ${clarifyingQuestions.length > 0 ? 'Asks the clarifying questions' : 'Presents findings'}
3. Explains the match confidence for any results
4. Recommends a clear next action

Keep response under 300 words but make it thorough and helpful.`;

  const response = await callAI(prompt, 600, true);

  let recommendedAction = 'continue_search';
  if (!isComplete) {
    recommendedAction = 'provide_more_info';
  } else if (hasGoodMatches) {
    recommendedAction = 'review_matches';
  } else if (matches.length > 0) {
    recommendedAction = 'post_item';
  } else {
    recommendedAction = 'post_item';
  }

  return {
    response,
    recommendedAction,
    topMatches,
  };
}

// Main chat handler with full conversation flow
async function handleChat(
  supabase: any,
  userMessage: string,
  conversationHistory: any[] = []
): Promise<{
  response: string;
  context: ConversationContext;
}> {
  console.log('=== INVESTIGATOR FLOW START ===');
  console.log('User message:', userMessage);

  // Step 1: Intent Detection
  console.log('Step 1: Detecting intent...');
  const { intent, extractedInfo, confidence: intentConfidence } = await detectIntent(userMessage, conversationHistory);
  console.log('Intent:', intent, 'Confidence:', intentConfidence);
  console.log('Extracted info:', extractedInfo);

  // Step 2: Data Completeness Check
  console.log('Step 2: Checking data completeness...');
  const { isComplete, missingFields, criticalMissing } = checkDataCompleteness(extractedInfo, intent);
  console.log('Complete:', isComplete, 'Missing:', [...criticalMissing, ...missingFields]);

  // Step 3: Generate Clarifying Questions (if needed)
  let clarifyingQuestions: string[] = [];
  if (!isComplete || intentConfidence < 60) {
    console.log('Step 3: Generating clarifying questions...');
    clarifyingQuestions = await generateClarifyingQuestions(userMessage, intent, missingFields, criticalMissing);
    console.log('Questions:', clarifyingQuestions);
  }

  // Step 4: Database Search (if we have enough info)
  let matches: MatchResult[] = [];
  if (isComplete || (extractedInfo.category || extractedInfo.description)) {
    console.log('Step 4: Searching database...');
    const items = await searchForMatches(supabase, extractedInfo, intent);
    console.log('Found items:', items.length);

    // Step 5: Confidence Scoring
    if (items.length > 0) {
      console.log('Step 5: Scoring matches...');
      matches = await scoreMatches(userMessage, extractedInfo, items);
      console.log('Scored matches:', matches.map(m => ({ title: m.item.title, confidence: m.confidence })));
    }
  }

  // Step 6: Generate Response with Recommendations
  console.log('Step 6: Generating response...');
  const { response, recommendedAction, topMatches } = await generateInvestigatorResponse(
    userMessage,
    intent,
    extractedInfo,
    clarifyingQuestions,
    matches,
    isComplete
  );

  console.log('=== INVESTIGATOR FLOW END ===');

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
  
  const messages: { role: string; content: string }[] = [];
  
  if (useInvestigatorMode) {
    messages.push({ role: 'system', content: INVESTIGATOR_SYSTEM_PROMPT });
  }
  
  messages.push({ role: 'user', content: prompt });
  
  const response = await fetch(HF_CHAT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI API error:', error);
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============= OLLAMA TEXT MODEL CONFIGURATION =============
const OLLAMA_BASE_URL = 'http://localhost:11434';
const OLLAMA_TEXT_MODEL = 'phi3:mini';       // Text understanding

// Track usage for monitoring
let aiCallCount = 0;

// ============= SESSION CONTEXT STORAGE =============
interface SessionContext {
  intent?: string;
  category?: string;
  location?: string;
  date?: string;
  description?: string;
  color?: string;
  brand?: string;
  itemType?: 'lost' | 'found';
  itemName?: string;
  infoScore: number;
  conversationTurn: number;
}

// ============= CATEGORY EXPANSION (CRITICAL) =============
// User says → search these terms
const CATEGORY_EXPANSION: Record<string, string[]> = {
  phone: ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'cell', 'handset'],
  wallet: ['wallet', 'purse', 'billfold', 'batua', 'pocketbook'],
  bag: ['bag', 'backpack', 'handbag', 'satchel', 'tote', 'rucksack', 'sling'],
  ring: ['ring', 'finger ring', 'gold ring', 'silver ring'],
  laptop: ['laptop', 'notebook', 'macbook', 'chromebook', 'computer'],
  keys: ['keys', 'key', 'keychain', 'car key', 'bike key', 'chabi'],
  earphones: ['earphones', 'earbuds', 'headphones', 'airpods', 'headset'],
  glasses: ['glasses', 'spectacles', 'eyeglasses', 'sunglasses', 'chasma'],
  watch: ['watch', 'wristwatch', 'smartwatch', 'ghadi'],
  bottle: ['bottle', 'water bottle', 'flask', 'sipper', 'tumbler'],
  charger: ['charger', 'adapter', 'power bank', 'cable'],
  card: ['card', 'id card', 'aadhar', 'pan card', 'credit card', 'debit card'],
  umbrella: ['umbrella', 'parasol', 'chhatri'],
  jewelry: ['jewelry', 'jewellery', 'necklace', 'chain', 'bracelet', 'earring', 'pendant'],
};

// Get all search terms for a category
function expandCategory(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  const terms = new Set<string>([lowerTerm]);
  
  for (const [key, values] of Object.entries(CATEGORY_EXPANSION)) {
    if (key === lowerTerm || values.includes(lowerTerm)) {
      terms.add(key);
      values.forEach(v => terms.add(v));
    }
  }
  
  return Array.from(terms);
}

// ============= INTENT KEYWORDS =============
const LOST_KEYWORDS = ['lost', 'missing', 'kho gaya', 'kho gayi', 'kho di', 'gum', 'gum ho gaya', 'bhul gaya', 'chhut gaya', 'nahi mil raha', 'can\'t find', 'cannot find', 'left behind', 'misplaced', 'kho', 'mera', 'meri', 'lose'];
const FOUND_KEYWORDS = ['found', 'picked', 'mila', 'mil gaya', 'mil gayi', 'paaya', 'dekha', 'someone left', 'lying', 'unclaimed', 'picked up', 'discovered'];
const HELP_KEYWORDS = ['help', 'how', 'kaise', 'what', 'kya karna', 'guide', 'madad'];
const IDENTITY_KEYWORDS = ['kisne banaya', 'who made', 'who built', 'who created', 'rehan'];
const GREETING_KEYWORDS = ['hello', 'hi', 'hey', 'namaste'];

// Disallowed topics for General AI mode
const DISALLOWED_TOPICS = ['politics', 'religion', 'ideology', 'nsfw', 'legal advice', 'medical advice', 'hacking', 'code', 'coding', 'programming', 'debate', 'controversial'];

// General knowledge topics allowed in secondary mode
const GENERAL_KNOWLEDGE_KEYWORDS = ['science', 'technology', 'motivation', 'productivity', 'explain', 'what is', 'how does', 'why', 'meaning', 'definition', 'history', 'fact'];
const BROWSE_KEYWORDS = ['browse', 'show', 'list', 'dikhao', 'all items', 'recent'];
// Investigator-specific keywords
const CLOSURE_KEYWORDS = ['close', 'remove', 'delete', 'hatao', 'band karo', 'listing close', 'resolved', 'mil gaya mujhe', 'wapas mila'];
const SAFETY_KEYWORDS = ['safe', 'safety', 'meet', 'meeting', 'milna', 'danger', 'secure', 'trust'];
const RECOVERY_KEYWORDS = ['increase', 'improve', 'better', 'chances', 'recovery', 'tips', 'advice'];
const NEXT_STEPS_KEYWORDS = ['next', 'aage', 'what now', 'ab kya', 'what should', 'kya karun', 'what do'];

// ============= CATEGORY KEYWORDS FOR EXTRACTION =============
const ITEM_KEYWORDS: Record<string, string[]> = {
  phone: ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'cell'],
  wallet: ['wallet', 'purse', 'batua', 'pocketbook'],
  bag: ['bag', 'backpack', 'handbag', 'laptop bag', 'school bag'],
  ring: ['ring', 'anguthi', 'gold ring', 'silver ring'],
  laptop: ['laptop', 'macbook', 'notebook'],
  keys: ['key', 'keys', 'chabi', 'keychain'],
  earphones: ['earphone', 'earphones', 'earbuds', 'airpods', 'headphone'],
  glasses: ['glasses', 'chasma', 'spectacles', 'sunglasses'],
  watch: ['watch', 'ghadi', 'smartwatch'],
  bottle: ['bottle', 'water bottle', 'flask', 'sipper'],
  charger: ['charger', 'cable', 'powerbank', 'adapter'],
  card: ['card', 'id card', 'aadhar', 'pan', 'license'],
  umbrella: ['umbrella', 'chhatri'],
  jewelry: ['jewelry', 'necklace', 'chain', 'bracelet', 'earring', 'pendant'],
};

// ============= LOCATION KEYWORDS =============
const LOCATION_KEYWORDS = [
  'library', 'canteen', 'cafeteria', 'classroom', 'class', 'lab', 'hostel', 'mess', 'ground',
  'parking', 'bus stop', 'gate', 'corridor', 'washroom', 'auditorium', 'gym', 'office',
  'block', 'building', 'floor', 'room', 'near', 'malad', 'andheri', 'bandra', 'dadar',
  'station', 'mall', 'market', 'park', 'metro', 'railway', 'platform', 'shop', 'restaurant',
  'east', 'west', 'north', 'south', 'nagar', 'colony', 'sector'
];

// ============= STATIC RESPONSES (DUAL-MODE PERSONA) =============
const STATIC_RESPONSES = {
  identity: {
    en: "Mujhe Rehan bhai ne banaya hai!\n\nI'm FindIt AI – your Lost & Found Investigator. I help with search, recovery guidance, and listing management. I can also answer general knowledge questions briefly. What can I help you with?",
    hi: "Mujhe Rehan bhai ne banaya hai!\n\nMain FindIt AI hoon – aapka Lost & Found Investigator. Search, recovery guidance, aur listing management mein help karta hoon. General knowledge questions ka bhi briefly answer de sakta hoon. Kya madad chahiye?"
  },
  greeting: {
    en: "FindIt AI – Lost & Found Investigator ready.\n\nI can help you:\n• Search for lost/found items\n• Understand search results\n• Guide recovery steps\n• Manage your listings\n• Answer general questions briefly\n\nWhat happened?",
    hi: "FindIt AI – Lost & Found Investigator ready.\n\nMain help kar sakta hoon:\n• Lost/found items search\n• Results samjhana\n• Recovery guidance\n• Listings manage karna\n• General questions ka brief answer\n\nKya hua?"
  },
  help: {
    en: "I'm your Lost & Found Investigator. Here's how I can help:\n\n• Describe what you lost/found – I'll search immediately\n• Ask about search results – I'll explain matches\n• Need recovery tips? Just ask\n• Want to close a listing? I'll guide you\n• General questions? I can help briefly\n\nExample: 'lost my black phone in library yesterday'",
    hi: "Main aapka Lost & Found Investigator hoon. Yeh kar sakta hoon:\n\n• Batao kya khoya/mila – turant search karunga\n• Results ke baare mein pucho – explain karunga\n• Recovery tips chahiye? Bas pucho\n• Listing close karni hai? Guide karunga\n• General questions? Brief answer dunga\n\nExample: 'kal library mein mera black phone kho gaya'"
  },
  needMoreInfo: {
    en: "To investigate, I need details. What item are you looking for?\n\nCommon: phone, wallet, bag, keys, ring, laptop, watch",
    hi: "Investigate karne ke liye details chahiye. Kya item dhundh rahe ho?\n\nCommon: phone, wallet, bag, keys, ring, laptop, watch"
  },
  noResults: {
    en: "No matches found yet.\n\nPossible reasons:\n• Generic keywords – try adding brand/color\n• Location mismatch – specify exact area\n• Item not yet reported\n\nWant me to help refine your search?",
    hi: "Abhi koi match nahi mila.\n\nPossible reasons:\n• Generic keywords – brand/color add karo\n• Location mismatch – exact area batao\n• Item abhi report nahi hua\n\nSearch refine karne mein help chahiye?"
  },
  disallowedTopic: {
    en: "I can help with general knowledge briefly, but not this topic. I'm best at helping with lost & found items. How can I assist with that?",
    hi: "General knowledge mein briefly help kar sakta hoon, lekin yeh topic nahi. Lost & found items mein best help kar sakta hoon. Usme kaise madad karun?"
  },
  dbError: {
    en: "Search temporarily unavailable. Please try again in a moment.",
    hi: "Search abhi temporarily unavailable hai. Thodi der mein try karo."
  },
  isThisYours: {
    en: "Review these matches carefully. Verify details before contacting.",
    hi: "Matches dhyan se dekho. Contact karne se pehle details verify karo."
  },
  askLocationColor: {
    en: (category: string) => `Noted – ${category}.\n\nTo narrow the search:\n1. Which area/location?\n2. Any distinguishing features (color, brand, marks)?`,
    hi: (category: string) => `Samjha – ${category}.\n\nSearch narrow karne ke liye:\n1. Kahan tha?\n2. Koi identifying features (color, brand, marks)?`
  },
  closureTopic: {
    en: "To close your listing, you'll need to select a reason:\n\n• Item found by owner\n• Item returned to owner\n• Duplicate listing\n• Posted by mistake\n• No longer relevant\n• Other\n\nClosed listings help maintain platform trust and analytics. The data is preserved for records.",
    hi: "Listing close karne ke liye reason select karna hoga:\n\n• Owner ko mil gaya\n• Owner ko return ho gaya\n• Duplicate listing\n• Galti se post kiya\n• Ab relevant nahi\n• Other\n\nClosed listings platform trust aur analytics ke liye help karti hain. Data records ke liye preserve hota hai."
  },
  safetyTips: {
    en: "Safety tips for meeting a finder/claimant:\n\n• Meet in a public place\n• Bring someone with you\n• Verify item details before handover\n• Don't share personal info until verified\n• Trust your instincts",
    hi: "Finder/claimant se milne ke safety tips:\n\n• Public jagah milo\n• Kisi ko saath lao\n• Handover se pehle item verify karo\n• Verify hone tak personal info share mat karo\n• Apni instincts pe trust karo"
  },
  recoveryTips: {
    en: "To increase recovery chances:\n\n• Add detailed description with brand/color\n• Include specific location\n• Check regularly for new matches\n• Respond quickly to potential matches\n• Consider expanding search area",
    hi: "Recovery chances badhane ke liye:\n\n• Detailed description add karo (brand/color)\n• Specific location include karo\n• Regularly new matches check karo\n• Potential matches ko jaldi respond karo\n• Search area expand karo"
  },
  whatNext: {
    en: "What to do next:\n\n• Review any matches shown\n• Add more details if no matches\n• Check back regularly for new listings\n• Respond to claims promptly\n• Close listing when resolved",
    hi: "Aage kya karna hai:\n\n• Matches review karo\n• No matches to details add karo\n• Regularly new listings check karo\n• Claims ko jaldi respond karo\n• Resolve hone pe listing close karo"
  },
  generalModeSwitch: {
    en: "Switching to general assistance.",
    hi: "General assistance mode mein switch kar raha hoon."
  }
};

// ============= LANGUAGE DETECTION =============
function detectLanguage(message: string): 'hi' | 'en' {
  const hindiChars = message.match(/[\u0900-\u097F]/g);
  const hindiWords = ['kya', 'kahan', 'kaise', 'mera', 'meri', 'hai', 'nahi', 'toh', 'aur', 'gaya', 'gayi', 'hoon'];
  const lowerMsg = message.toLowerCase();
  
  let hindiScore = hindiChars ? hindiChars.length : 0;
  for (const word of hindiWords) {
    if (lowerMsg.includes(word)) hindiScore += 2;
  }
  
  return hindiScore > 3 ? 'hi' : 'en';
}

// ============= INTENT DETECTION (DUAL-MODE) =============
function detectIntent(message: string, sessionContext?: SessionContext): {
  intent: 'search' | 'post_found' | 'browse' | 'help' | 'identity' | 'greeting' | 'disallowed_topic' | 'general_query' | 'location_update' | 'closure' | 'safety' | 'recovery' | 'next_steps' | 'unknown';
  confidence: number;
  mode: 'primary' | 'secondary';
} {
  const lowerMsg = message.toLowerCase().trim();
  const words = lowerMsg.split(/\s+/);
  
  // Location update (context-aware)
  if (sessionContext?.intent && sessionContext.category && !sessionContext.location) {
    const isJustLocation = LOCATION_KEYWORDS.some(loc => lowerMsg.includes(loc)) && words.length <= 4;
    if (isJustLocation) return { intent: 'location_update', confidence: 90, mode: 'primary' };
  }
  
  // Check for disallowed topics FIRST (Secondary mode boundary)
  for (const kw of DISALLOWED_TOPICS) {
    if (lowerMsg.includes(kw)) return { intent: 'disallowed_topic', confidence: 95, mode: 'secondary' };
  }
  
  // Primary mode intents (Lost & Found related)
  for (const kw of IDENTITY_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'identity', confidence: 100, mode: 'primary' };
  }
  
  // Investigator-specific intents
  for (const kw of CLOSURE_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'closure', confidence: 85, mode: 'primary' };
  }
  for (const kw of SAFETY_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'safety', confidence: 85, mode: 'primary' };
  }
  for (const kw of RECOVERY_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'recovery', confidence: 80, mode: 'primary' };
  }
  for (const kw of NEXT_STEPS_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'next_steps', confidence: 80, mode: 'primary' };
  }
  
  if (words.length <= 3) {
    for (const kw of GREETING_KEYWORDS) {
      if (lowerMsg.startsWith(kw)) return { intent: 'greeting', confidence: 90, mode: 'primary' };
    }
  }
  for (const kw of BROWSE_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'browse', confidence: 80, mode: 'primary' };
  }
  for (const kw of HELP_KEYWORDS) {
    if (lowerMsg.includes(kw)) return { intent: 'help', confidence: 70, mode: 'primary' };
  }
  
  // Lost vs Found (Primary mode)
  let lostScore = 0, foundScore = 0;
  for (const kw of LOST_KEYWORDS) {
    if (lowerMsg.includes(kw)) lostScore += 2;
  }
  for (const kw of FOUND_KEYWORDS) {
    if (lowerMsg.includes(kw)) foundScore += 2;
  }
  
  // Check for item keywords (Primary mode)
  let hasItem = false;
  for (const keywords of Object.values(ITEM_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) { hasItem = true; break; }
    }
    if (hasItem) break;
  }
  if (hasItem) lostScore++;
  
  if (lostScore > foundScore && lostScore > 0) return { intent: 'search', confidence: 80, mode: 'primary' };
  if (foundScore > lostScore && foundScore > 0) return { intent: 'post_found', confidence: 80, mode: 'primary' };
  if (hasItem) return { intent: 'search', confidence: 60, mode: 'primary' };
  
  // Check if it's a general knowledge query (Secondary mode)
  const isGeneralQuery = GENERAL_KNOWLEDGE_KEYWORDS.some(kw => lowerMsg.includes(kw));
  if (isGeneralQuery) return { intent: 'general_query', confidence: 60, mode: 'secondary' };
  
  // If message is a question but not L&F related, treat as potential general query
  const isQuestion = lowerMsg.includes('?') || lowerMsg.startsWith('what') || lowerMsg.startsWith('why') || lowerMsg.startsWith('how') || lowerMsg.startsWith('explain');
  if (isQuestion && !hasItem && lostScore === 0 && foundScore === 0) {
    return { intent: 'general_query', confidence: 50, mode: 'secondary' };
  }
  
  return { intent: 'unknown', confidence: 0, mode: 'primary' };
}

// ============= ENTITY EXTRACTION =============
function extractInfo(message: string): {
  category?: string;
  itemName?: string;
  location?: string;
  color?: string;
  brand?: string;
  date?: string;
  infoScore: number;
} {
  const lowerMsg = message.toLowerCase();
  const result: any = { infoScore: 0 };
  
  // Extract item/category
  for (const [category, keywords] of Object.entries(ITEM_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        result.category = category;
        result.itemName = kw;
        result.infoScore++;
        break;
      }
    }
    if (result.category) break;
  }
  
  // Extract location
  for (const loc of LOCATION_KEYWORDS) {
    if (lowerMsg.includes(loc)) {
      const regex = new RegExp(`([\\w\\s]{0,10})?${loc}([\\w\\s]{0,10})?`, 'i');
      const match = message.match(regex);
      if (match) {
        result.location = match[0].trim().replace(/^(in|at|near)\s+/i, '').replace(/\s+(lost|found|mila|kho)$/i, '');
        result.infoScore++;
        break;
      }
    }
  }
  
  // Colors
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'grey', 'gray', 'pink', 'gold', 'silver', 'kala', 'safed', 'lal', 'neela'];
  for (const color of colors) {
    if (lowerMsg.includes(color)) { result.color = color; result.infoScore++; break; }
  }
  
  // Brands
  const brands = ['apple', 'samsung', 'xiaomi', 'redmi', 'oneplus', 'oppo', 'vivo', 'realme', 'nokia', 'iphone', 'boat', 'jbl', 'fossil', 'titan', 'casio'];
  for (const brand of brands) {
    if (lowerMsg.includes(brand)) { result.brand = brand; result.infoScore++; break; }
  }
  
  // Date patterns
  if (/yesterday|kal/i.test(message)) { result.date = 'yesterday'; result.infoScore++; }
  else if (/today|aaj|abhi/i.test(message)) { result.date = 'today'; result.infoScore++; }
  
  return result;
}

// ============= DATABASE SEARCH (FUZZY TEXT-BASED) =============
async function searchDatabase(
  supabase: any,
  params: { keyword?: string; location?: string; status?: string }
): Promise<{ items: any[], dbQueried: boolean, error?: string }> {
  console.log('=== DATABASE SEARCH ===');
  console.log('Params:', JSON.stringify(params));
  
  const { keyword, location, status = 'active' } = params;
  
  // Expand keyword to all synonyms
  const searchTerms = keyword ? expandCategory(keyword) : [];
  console.log('Search terms:', searchTerms);
  
  try {
    // Fetch items
    let query = supabase
      .from('items')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);
    
    const { data: allItems, error } = await query;
    
    if (error) {
      console.error('DB error:', error);
      return { items: [], dbQueried: true, error: 'Database query failed' };
    }
    
    if (!allItems || allItems.length === 0) {
      return { items: [], dbQueried: true };
    }
    
    console.log('Total items:', allItems.length);
    
    // Score items using fuzzy text matching
    const scoredItems = allItems.map((item: any) => {
      let score = 0;
      const reasons: string[] = [];
      
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const loc = (item.location || '').toLowerCase();
      
      // Keyword matching (title, description, category)
      for (const term of searchTerms) {
        if (title.includes(term)) { score += 30; reasons.push(`Title: ${term}`); }
        if (desc.includes(term)) { score += 20; reasons.push(`Desc: ${term}`); }
        if (cat.includes(term)) { score += 25; reasons.push(`Category: ${term}`); }
      }
      
      // Location matching (fuzzy)
      if (location) {
        const locWords = location.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        for (const word of locWords) {
          if (loc.includes(word)) { score += 25; reasons.push(`Location: ${word}`); }
          // Partial match
          else if (loc.startsWith(word.substring(0, 3)) || word.startsWith(loc.substring(0, 3))) {
            score += 10; reasons.push(`Location partial: ${word}`);
          }
        }
      }
      
      return { ...item, relevanceScore: score, matchReasons: reasons };
    });
    
    // Filter and sort
    const relevant = scoredItems
      .filter((item: any) => item.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
    
    console.log('Relevant items:', relevant.length);
    return { items: relevant, dbQueried: true };
    
  } catch (err) {
    console.error('Search exception:', err);
    return { items: [], dbQueried: true, error: 'Database connection failed' };
  }
}

// ============= FORMAT RESULTS (INVESTIGATOR STYLE) =============
function formatResults(items: any[], lang: 'hi' | 'en'): string {
  if (items.length === 0) return STATIC_RESPONSES.noResults[lang];
  
  const header = lang === 'hi' ? 'Investigation Results:' : 'Investigation Results:';
  let response = header + '\n';
  
  items.slice(0, 5).forEach((item, i) => {
    const type = item.item_type === 'lost' ? 'LOST' : 'FOUND';
    const confidence = Math.min(item.relevanceScore || 50, 100);
    const confidenceLabel = confidence >= 70 ? 'High' : confidence >= 40 ? 'Medium' : 'Low';
    
    response += `\n${i + 1}. [${type}] ${item.title}`;
    response += `\n   📍 ${item.location || 'Location not specified'}`;
    response += `\n   📅 ${item.date_lost_found || 'Date not specified'}`;
    response += `\n   🎯 Confidence: ${confidenceLabel} (${confidence}%)`;
    if (item.matchReasons?.length > 0) {
      response += `\n   📋 Why: ${item.matchReasons.slice(0, 2).join(', ')}`;
    }
  });
  
  response += '\n\n' + STATIC_RESPONSES.isThisYours[lang];
  if (items.length > 5) {
    response += lang === 'hi' 
      ? ` (+${items.length - 5} aur results available)`
      : ` (+${items.length - 5} more results available)`;
  }
  
  response += lang === 'hi'
    ? '\n\nVerify karna hai ya details chahiye? Just ask.'
    : '\n\nNeed help verifying or want more details? Just ask.';
  
  return response;
}

// ============= PHI3 TEXT MODEL (DUAL-MODE FALLBACK) =============
async function callTextModel(userMessage: string, lang: 'hi' | 'en', mode: 'primary' | 'secondary' = 'primary'): Promise<string> {
  console.log(`=== PHI3 TEXT MODEL (${mode.toUpperCase()} MODE) ===`);
  aiCallCount++;
  
  const primaryPrompt = `You are FindIt AI – Lost & Found Investigator. STRICT RULES:
- Reply in ${lang === 'hi' ? 'Hindi' : 'English'} ONLY
- MAX 2-3 sentences
- Act as an investigator, not a search bar
- Ask ONE clarifying question about item, location, or details
- Provide reasoning and guidance
- NO storytelling
- ONLY Lost & Found, item recovery, and listing management topics
- If unsure, ask a clarification question instead of guessing`;

  const secondaryPrompt = `You are FindIt AI in general assistance mode. STRICT RULES:
- Reply in ${lang === 'hi' ? 'Hindi' : 'English'} ONLY
- MAX 2 sentences, be VERY concise
- Answer only informational, harmless questions
- Topics allowed: basic science, technology, motivation, productivity, everyday knowledge
- Topics FORBIDDEN: politics, religion, NSFW, legal advice, medical advice, coding tutorials, debates
- Do NOT reference training data or model size
- If topic is forbidden, politely redirect to Lost & Found`;

  const systemPrompt = mode === 'primary' ? primaryPrompt : secondaryPrompt;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_TEXT_MODEL,
        prompt: `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`,
        stream: false,
        options: { temperature: 0.3, num_predict: mode === 'secondary' ? 80 : 120 }
      }),
    });

    if (!response.ok) throw new Error('Text model unavailable');

    const result = await response.json();
    return result.response?.trim() || STATIC_RESPONSES.needMoreInfo[lang];
    
  } catch (error) {
    console.error('Phi3 failed:', error);
    return mode === 'secondary' 
      ? STATIC_RESPONSES.disallowedTopic[lang] 
      : STATIC_RESPONSES.needMoreInfo[lang];
  }
}

// ============= MAIN CHAT HANDLER =============
interface ChatResponse {
  response: string;
  context: {
    intent: string;
    missingFields: string[];
    clarifyingQuestions: string[];
    matches: any[];
    recommendedAction: string;
    aiUsed: boolean;
    dbQueried: boolean;
    sessionContext?: SessionContext;
    needsLocation?: boolean;
    autoPost?: any;
  };
}

async function handleChat(
  supabase: any,
  userMessage: string,
  conversationHistory: any[] = [],
  existingSessionContext?: SessionContext
): Promise<ChatResponse> {
  console.log('=== LOST & FOUND INVESTIGATOR ===');
  console.log('Message:', userMessage);
  
  const lang = detectLanguage(userMessage);
  
  // Initialize session context
  let sessionContext: SessionContext = existingSessionContext || { infoScore: 0, conversationTurn: 0 };
  sessionContext.conversationTurn++;
  
  // ============= TEXT PROCESSING =============
  
  // Step 1: Extract info
  const extracted = extractInfo(userMessage);
  if (extracted.category) sessionContext.category = extracted.category;
  if (extracted.itemName) sessionContext.itemName = extracted.itemName;
  if (extracted.location) sessionContext.location = extracted.location;
  if (extracted.color) sessionContext.color = extracted.color;
  if (extracted.brand) sessionContext.brand = extracted.brand;
  if (extracted.date) sessionContext.date = extracted.date;
  
  // Calculate score
  let score = 0;
  if (sessionContext.category) score++;
  if (sessionContext.location) score++;
  if (sessionContext.color) score++;
  if (sessionContext.brand) score++;
  sessionContext.infoScore = score;
  
  // Step 2: Detect intent
  const { intent } = detectIntent(userMessage, sessionContext);
  if (intent !== 'unknown' && intent !== 'location_update' && intent !== 'general_query' && intent !== 'disallowed_topic') {
    sessionContext.intent = intent;
  }
  
  console.log(`Intent: ${intent}`);
  
  // ============= LOST & FOUND INVESTIGATOR MODE =============
  
  // Step 3: Handle special intents immediately
  if (intent === 'identity') {
    return { response: STATIC_RESPONSES.identity[lang], context: { intent: 'identity', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'continue', aiUsed: false, dbQueried: false, sessionContext } };
  }
  if (intent === 'greeting') {
    return { response: STATIC_RESPONSES.greeting[lang], context: { intent: 'greeting', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'await_input', aiUsed: false, dbQueried: false, sessionContext } };
  }
  if (intent === 'help') {
    return { response: STATIC_RESPONSES.help[lang], context: { intent: 'help', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'await_input', aiUsed: false, dbQueried: false, sessionContext } };
  }
  
  // Investigator-specific intents
  if (intent === 'closure') {
    return { response: STATIC_RESPONSES.closureTopic[lang], context: { intent: 'closure', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'guide_closure', aiUsed: false, dbQueried: false, sessionContext } };
  }
  if (intent === 'safety') {
    return { response: STATIC_RESPONSES.safetyTips[lang], context: { intent: 'safety', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'provide_guidance', aiUsed: false, dbQueried: false, sessionContext } };
  }
  if (intent === 'recovery') {
    return { response: STATIC_RESPONSES.recoveryTips[lang], context: { intent: 'recovery', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'provide_guidance', aiUsed: false, dbQueried: false, sessionContext } };
  }
  if (intent === 'next_steps') {
    return { response: STATIC_RESPONSES.whatNext[lang], context: { intent: 'next_steps', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'provide_guidance', aiUsed: false, dbQueried: false, sessionContext } };
  }
  
  // Step 4: DATABASE SEARCH (MANDATORY for normal mode)
  const hasCategory = !!sessionContext.category;
  const hasLocation = !!sessionContext.location;
  const hasAnyInfo = hasCategory || hasLocation || !!sessionContext.color;
  
  if (hasAnyInfo || intent === 'search' || intent === 'post_found' || intent === 'location_update' || intent === 'browse') {
    console.log('Executing database search...');
    
    const { items, error } = await searchDatabase(supabase, {
      keyword: sessionContext.itemName || sessionContext.category,
      location: sessionContext.location,
      status: 'active'
    });
    
    if (error) {
      return { response: STATIC_RESPONSES.dbError[lang], context: { intent, missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'retry', aiUsed: false, dbQueried: true, sessionContext } };
    }
    
    // Format response
    let response = formatResults(items, lang);
    let needsLocation = false;
    let recommendedAction = items.length > 0 ? 'review_matches' : 'post_item';
    
    if (items.length === 0 && hasCategory && !hasLocation) {
      // Ask for location + color in one go
      response = STATIC_RESPONSES.askLocationColor[lang](sessionContext.category || 'item');
      needsLocation = true;
      recommendedAction = 'provide_location';
    } else if (items.length > 0 && !hasLocation) {
      response += '\n' + (lang === 'hi' ? 'Location add karo better results ke liye.' : 'Add location for better results.');
      needsLocation = true;
    }
    
    return {
      response,
      context: {
        intent: sessionContext.intent || intent,
        missingFields: [],
        clarifyingQuestions: [],
        matches: items.map((item, i) => ({
          item, confidence: Math.min(item.relevanceScore || 50, 100),
          reasoning: item.matchReasons?.join(', ') || 'Matched by keywords', rank: i + 1
        })),
        recommendedAction, aiUsed: false, dbQueried: true, sessionContext, needsLocation
      }
    };
  }
  
  // Step 5: No info - ask for item type (static)
  if (!hasAnyInfo && intent === 'unknown') {
    // In normal mode, politely refuse general questions
    const lowerMsg = userMessage.toLowerCase();
    const isQuestion = lowerMsg.includes('?') || lowerMsg.startsWith('what') || lowerMsg.startsWith('why') || lowerMsg.startsWith('how') || lowerMsg.startsWith('explain');
    if (isQuestion) {
      const refuseMsg = lang === 'hi' 
        ? "Main Lost & Found items mein help karta hoon. Agar general questions puchne hain, toh General Mode use karo.\n\nLost/found item ke baare mein batao?"
        : "I help with Lost & Found items. For general questions, please switch to General Mode.\n\nTell me about your lost/found item?";
      return { response: refuseMsg, context: { intent: 'unknown', missingFields: ['category'], clarifyingQuestions: [], matches: [], recommendedAction: 'switch_mode_or_provide_info', aiUsed: false, dbQueried: false, sessionContext } };
    }
    return { response: STATIC_RESPONSES.needMoreInfo[lang], context: { intent: 'unknown', missingFields: ['category'], clarifyingQuestions: [], matches: [], recommendedAction: 'provide_info', aiUsed: false, dbQueried: false, sessionContext } };
  }
  
  // Step 6: LAST RESORT - Use Phi3 text model in normal mode (Lost & Found focused)
  console.log('Using Phi3 as fallback (normal mode)...');
  const aiResponse = await callTextModel(userMessage, lang, 'primary');
  return { response: aiResponse, context: { intent: 'unknown', missingFields: [], clarifyingQuestions: [], matches: [], recommendedAction: 'continue', aiUsed: true, dbQueried: false, sessionContext } };
}

// ============= HELPER FUNCTIONS =============

function calculateMatchScore(lostItem: any, foundItem: any): { score: number, reasoning: string, textSimilarity: number, locationProximity: number } {
  let score = 0;
  const reasons: string[] = [];
  
  if (lostItem.category && foundItem.category && lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
    score += 40; reasons.push('Same category');
  }
  
  if (lostItem.location && foundItem.location) {
    const words = lostItem.location.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const matches = words.filter((w: string) => foundItem.location.toLowerCase().includes(w));
    if (matches.length > 0) { score += Math.min(matches.length * 10, 25); reasons.push('Similar location'); }
  }
  
  if (lostItem.description && foundItem.description) {
    const words = lostItem.description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const matches = words.filter((w: string) => foundItem.description.toLowerCase().includes(w));
    if (matches.length >= 2) { score += 20; reasons.push('Similar description'); }
  }
  
  return { score: Math.min(score, 100), reasoning: reasons.join(', ') || 'Low similarity', textSimilarity: score, locationProximity: score > 25 ? 80 : 50 };
}

function generateNotification(type: string, context: any): { title: string, message: string } {
  const templates: Record<string, { title: string, message: string }> = {
    potential_match: { title: 'Potential Match Found!', message: `A ${context.matchTitle || 'similar item'} might match your ${context.itemTitle || 'item'}.` },
    new_claim: { title: 'New Claim Received', message: `Someone has claimed your ${context.itemTitle || 'item'}.` },
    default: { title: 'Notification', message: 'You have a new notification.' },
  };
  return templates[type] || templates.default;
}

// ============= MAIN SERVER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, ...params } = await req.json();

    console.log('AI Assistant action:', action);

    let result: any;

    switch (action) {
      case 'chat':
        result = await handleChat(
          supabase,
          params.message,
          params.history || [],
          params.sessionContext
        );
        break;

      case 'calculate_match_score':
        result = calculateMatchScore(params.lostItem, params.foundItem);
        break;

      case 'semantic_search':
        const { items } = await searchDatabase(supabase, { keyword: params.query });
        result = items;
        break;

      case 'generate_notification':
        result = generateNotification(params.type, params.context);
        break;

      case 'process_new_item':
        const { item } = params;
        const processResult: any = {};
        
        const oppositeType = item.item_type === 'lost' ? 'found' : 'lost';
        const { data: potentialMatches } = await supabase
          .from('items')
          .select('*')
          .eq('item_type', oppositeType)
          .eq('status', 'active')
          .limit(10);

        if (potentialMatches && potentialMatches.length > 0) {
          processResult.matches = [];
          for (const match of potentialMatches.slice(0, 5)) {
            const matchScore = calculateMatchScore(
              item.item_type === 'lost' ? item : match,
              item.item_type === 'lost' ? match : item
            );
            if (matchScore.score >= 40) {
              processResult.matches.push({ item: match, ...matchScore });
            }
          }
          processResult.matches.sort((a: any, b: any) => b.score - a.score);
        }
        result = processResult;
        break;

      case 'webhook_new_item':
        const webhookItem = params.item;
        console.log('Processing webhook for new item:', webhookItem.id);

        await supabase.from('ai_tags').upsert({
          item_id: webhookItem.id,
          tags: [webhookItem.category || 'item'],
          objects_detected: [],
          auto_title: webhookItem.title,
          auto_description: webhookItem.description,
        }, { onConflict: 'item_id' });

        const matchType = webhookItem.item_type === 'lost' ? 'found' : 'lost';
        const { data: matchCandidates } = await supabase
          .from('items')
          .select('*')
          .eq('item_type', matchType)
          .eq('status', 'active')
          .limit(20);

        if (matchCandidates) {
          for (const candidate of matchCandidates) {
            const matchResult = calculateMatchScore(
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

              const notification = generateNotification('potential_match', {
                itemTitle: webhookItem.title,
                matchTitle: candidate.title,
              });

              await supabase.from('ai_notifications').insert({
                user_id: webhookItem.user_id,
                item_id: webhookItem.id,
                notification_type: 'potential_match',
                title: notification.title,
                message: notification.message,
                metadata: { match_item_id: candidate.id },
              });
            }
          }
        }

        result = { success: true, processed: webhookItem.id };
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

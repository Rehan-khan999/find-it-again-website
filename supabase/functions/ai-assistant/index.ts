import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Lovable AI Gateway (OpenAI-compatible) - ONLY USED WHEN NECESSARY
const LOVABLE_AI_API = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const AI_MODEL = 'google/gemini-2.5-flash';

// Track AI usage for monitoring
let aiCallCount = 0;

// ============= SESSION CONTEXT STORAGE =============
// In-memory cache for session context (per request, stored in frontend via response)
interface SessionContext {
  intent?: string;
  category?: string;
  location?: string;
  date?: string;
  description?: string;
  color?: string;
  brand?: string;
  itemType?: 'lost' | 'found';
  infoScore: number;
  conversationTurn: number;
}

// ============= AUTO POST TEMPLATES (NO AI) =============
const POST_TEMPLATES = {
  lost: {
    en: (ctx: SessionContext) => ({
      title: `Lost ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'Item'}`,
      description: `I lost my ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'item'}${ctx.location ? ' near ' + ctx.location : ''}${ctx.date ? ' on ' + ctx.date : ''}. ${ctx.description || 'Please contact if found.'}`,
    }),
    hi: (ctx: SessionContext) => ({
      title: `खोया: ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'सामान'}`,
      description: `मेरा ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'सामान'} खो गया${ctx.location ? ' ' + ctx.location + ' के पास' : ''}${ctx.date ? ' ' + ctx.date + ' को' : ''}। ${ctx.description || 'कृपया मिलने पर संपर्क करें।'}`,
    }),
  },
  found: {
    en: (ctx: SessionContext) => ({
      title: `Found ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'Item'}`,
      description: `I found a ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'item'}${ctx.location ? ' near ' + ctx.location : ''}${ctx.date ? ' on ' + ctx.date : ''}. ${ctx.description || 'Owner can claim with proper identification.'}`,
    }),
    hi: (ctx: SessionContext) => ({
      title: `मिला: ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'सामान'}`,
      description: `मुझे एक ${ctx.color ? ctx.color + ' ' : ''}${ctx.brand ? ctx.brand + ' ' : ''}${ctx.category || 'सामान'} मिला${ctx.location ? ' ' + ctx.location + ' के पास' : ''}${ctx.date ? ' ' + ctx.date + ' को' : ''}। ${ctx.description || 'मालिक पहचान के साथ दावा कर सकते हैं।'}`,
    }),
  },
};

// Generate auto post preview (NO AI)
function generateAutoPost(ctx: SessionContext, lang: 'hi' | 'en'): {
  title: string;
  description: string;
  category: string;
  location: string;
  itemType: 'lost' | 'found';
  canGenerate: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  // Check required fields
  if (!ctx.category) missingFields.push('category');
  if (!ctx.location) missingFields.push('location');
  
  // Determine item type from intent
  const itemType: 'lost' | 'found' = ctx.intent === 'post_found' ? 'found' : 'lost';
  
  // Can generate if we have at least category
  const canGenerate = !!ctx.category && ctx.infoScore >= 2;
  
  if (!canGenerate) {
    return {
      title: '',
      description: '',
      category: ctx.category || '',
      location: ctx.location || '',
      itemType,
      canGenerate: false,
      missingFields,
    };
  }
  
  // Generate using template
  const template = POST_TEMPLATES[itemType][lang];
  const { title, description } = template(ctx);
  
  return {
    title,
    description,
    category: ctx.category || 'other',
    location: ctx.location || '',
    itemType,
    canGenerate: true,
    missingFields,
  };
}

// ============= RULE-BASED INTENT DETECTION (NO AI) =============

// Keywords for intent detection
const LOST_KEYWORDS = ['lost', 'missing', 'kho gaya', 'kho gayi', 'kho di', 'gum', 'gum ho gaya', 'bhul gaya', 'chhut gaya', 'nahi mil raha', 'can\'t find', 'cannot find', 'left behind', 'misplaced'];
const FOUND_KEYWORDS = ['found', 'picked', 'mila', 'mil gaya', 'mil gayi', 'paaya', 'dekha', 'someone left', 'lying', 'unclaimed'];
const HELP_KEYWORDS = ['help', 'how', 'kaise', 'what', 'kya', 'guide', 'madad', 'sahayata', 'explain'];
const IDENTITY_KEYWORDS = ['kisne banaya', 'kisne train', 'who made', 'who built', 'who trained', 'who created', 'tujhe kisne', 'aapko kisne', 'tumhe kisne', 'maker', 'creator', 'developer', 'coder'];
const GREETING_KEYWORDS = ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'good afternoon'];
const CLAIM_KEYWORDS = ['claim', 'mine', 'mera', 'meri', 'belong', 'owner', 'return'];
const CONFIRM_KEYWORDS = ['yes', 'ok', 'okay', 'confirm', 'post', 'submit', 'haan', 'ha', 'theek', 'kar do', 'kardo', 'post karo', 'save'];
const CANCEL_KEYWORDS = ['no', 'nahi', 'cancel', 'nope', 'edit', 'change', 'modify', 'badlo'];

// Category keywords mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'electronics': ['phone', 'mobile', 'laptop', 'charger', 'earphone', 'headphone', 'airpod', 'tablet', 'ipad', 'camera', 'watch', 'smartwatch', 'powerbank', 'cable', 'adapter'],
  'wallet': ['wallet', 'purse', 'money', 'cash', 'card', 'credit card', 'debit card', 'batua'],
  'keys': ['key', 'keys', 'keychain', 'car key', 'bike key', 'room key', 'chabi', 'chaabi'],
  'bag': ['bag', 'backpack', 'handbag', 'suitcase', 'luggage', 'pouch', 'sling', 'tote', 'laptop bag'],
  'documents': ['document', 'id', 'id card', 'aadhar', 'aadhaar', 'pan', 'passport', 'license', 'certificate', 'marksheet'],
  'accessories': ['glasses', 'sunglasses', 'watch', 'ring', 'chain', 'bracelet', 'earring', 'jewelry', 'jewellery', 'belt', 'umbrella', 'cap', 'hat'],
  'clothing': ['jacket', 'coat', 'sweater', 'hoodie', 'shirt', 'jeans', 'shoes', 'sandal', 'scarf'],
  'bottle': ['bottle', 'water bottle', 'flask', 'sipper', 'tumbler'],
  'other': []
};

// Location keywords (common campus/city locations)
const LOCATION_KEYWORDS = [
  'library', 'canteen', 'cafeteria', 'classroom', 'lab', 'laboratory', 'hostel', 'mess', 'ground', 'playground',
  'parking', 'bus stop', 'gate', 'entrance', 'exit', 'corridor', 'hallway', 'washroom', 'bathroom',
  'auditorium', 'seminar hall', 'gym', 'sports complex', 'admin', 'office', 'department',
  'block', 'building', 'floor', 'room', 'near', 'behind', 'front', 'beside', 'opposite'
];

// Check if user is confirming or canceling
function checkConfirmation(message: string): 'confirm' | 'cancel' | null {
  const lowerMsg = message.toLowerCase();
  
  for (const kw of CONFIRM_KEYWORDS) {
    if (lowerMsg.includes(kw)) return 'confirm';
  }
  for (const kw of CANCEL_KEYWORDS) {
    if (lowerMsg.includes(kw)) return 'cancel';
  }
  
  return null;
}

// Extract intent using ONLY keyword matching (NO AI)
function detectIntentByRules(message: string): {
  intent: 'search' | 'post_lost' | 'post_found' | 'help' | 'identity' | 'greeting' | 'claim' | 'unknown';
  confidence: number;
  matchedKeywords: string[];
} {
  const lowerMsg = message.toLowerCase();
  const matchedKeywords: string[] = [];
  
  // Check identity first
  for (const kw of IDENTITY_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      return { intent: 'identity', confidence: 100, matchedKeywords: [kw] };
    }
  }
  
  // Check greetings
  for (const kw of GREETING_KEYWORDS) {
    if (lowerMsg.startsWith(kw) || lowerMsg === kw) {
      return { intent: 'greeting', confidence: 90, matchedKeywords: [kw] };
    }
  }
  
  // Check claim intent
  for (const kw of CLAIM_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length > 0) {
    return { intent: 'claim', confidence: 70, matchedKeywords };
  }
  
  // Check lost intent
  let lostScore = 0;
  for (const kw of LOST_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      lostScore++;
      matchedKeywords.push(kw);
    }
  }
  
  // Check found intent
  let foundScore = 0;
  for (const kw of FOUND_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      foundScore++;
      matchedKeywords.push(kw);
    }
  }
  
  // Determine intent based on scores
  if (lostScore > foundScore && lostScore > 0) {
    return { intent: 'search', confidence: Math.min(lostScore * 30 + 40, 95), matchedKeywords };
  }
  if (foundScore > lostScore && foundScore > 0) {
    return { intent: 'post_found', confidence: Math.min(foundScore * 30 + 40, 95), matchedKeywords };
  }
  
  // Check help intent
  for (const kw of HELP_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      return { intent: 'help', confidence: 70, matchedKeywords: [kw] };
    }
  }
  
  // If no clear intent but has category keywords, assume search
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        return { intent: 'search', confidence: 60, matchedKeywords: [kw] };
      }
    }
  }
  
  return { intent: 'unknown', confidence: 0, matchedKeywords: [] };
}

// Extract item details using ONLY keyword matching (NO AI)
function extractInfoByRules(message: string): {
  category?: string;
  location?: string;
  description?: string;
  color?: string;
  brand?: string;
  infoScore: number;
} {
  const lowerMsg = message.toLowerCase();
  const result: any = { infoScore: 0 };
  
  // Extract category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        result.category = category;
        result.infoScore++;
        break;
      }
    }
    if (result.category) break;
  }
  
  // Extract location
  for (const loc of LOCATION_KEYWORDS) {
    if (lowerMsg.includes(loc)) {
      // Find the surrounding context for location
      const regex = new RegExp(`(\\w+\\s+)?${loc}(\\s+\\w+)?`, 'i');
      const match = message.match(regex);
      if (match) {
        result.location = match[0].trim();
        result.infoScore++;
        break;
      }
    }
  }
  
  // Extract colors
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'grey', 'gray', 'pink', 'orange', 'purple', 'gold', 'silver'];
  for (const color of colors) {
    if (lowerMsg.includes(color)) {
      result.color = color;
      result.infoScore++;
      break;
    }
  }
  
  // Extract brands
  const brands = ['apple', 'samsung', 'xiaomi', 'redmi', 'oneplus', 'oppo', 'vivo', 'realme', 'nokia', 'sony', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'nike', 'adidas', 'puma', 'boat', 'jbl'];
  for (const brand of brands) {
    if (lowerMsg.includes(brand)) {
      result.brand = brand;
      result.infoScore++;
      break;
    }
  }
  
  // Build description from extracted info
  const descParts: string[] = [];
  if (result.color) descParts.push(result.color);
  if (result.brand) descParts.push(result.brand);
  if (result.category) descParts.push(result.category);
  if (descParts.length > 0) {
    result.description = descParts.join(' ');
  }
  
  return result;
}

// ============= STATIC RESPONSES (NO AI) =============

const STATIC_RESPONSES = {
  identity: {
    en: "I was created and trained by Rehan bhai! 🙏\n\nI'm here to help you find lost items. Have you lost something or found something?",
    hi: "Mujhe Rehan bhai ne banaya hai and train kiya hai! 🙏\n\nMain aapki Lost & Found items dhundne mein madad karne ke liye yahan hoon. Kya aap kuch kho diye hain ya kuch mila hai?"
  },
  greeting: {
    en: "Hello! 👋 I'm FindIt AI, your Lost & Found assistant.\n\nHow can I help you today?\n🔴 Report a lost item\n🟢 Report a found item\n🔍 Search for items",
    hi: "Namaste! 👋 Main FindIt AI hoon, aapka Lost & Found assistant.\n\nAaj main aapki kaise madad kar sakta hoon?\n🔴 Kuch kho diya - report karein\n🟢 Kuch mila - report karein\n🔍 Items search karein"
  },
  help: {
    en: "I can help you with:\n🔴 **Lost something?** - Describe it and I'll search found items\n🟢 **Found something?** - Report it so the owner can find it\n🔍 **Search** - Browse all items by category/location\n\nJust tell me what you need!",
    hi: "Main aapki madad kar sakta hoon:\n🔴 **Kuch kho gaya?** - Batao kya kho gaya, main dhundhta hoon\n🟢 **Kuch mila?** - Report karo taaki owner mil sake\n🔍 **Search** - Category/location se items dekho\n\nBas batao kya chahiye!"
  },
  needMoreInfo: {
    en: "I need a bit more info to search:\n• What item? (phone, wallet, bag, etc.)\n• Where did you lose it? (library, canteen, etc.)\n• Any details? (color, brand)\n\nTell me more! 🔍",
    hi: "Thoda aur detail chahiye search ke liye:\n• Kya item hai? (phone, wallet, bag, etc.)\n• Kahan kho gaya? (library, canteen, etc.)\n• Koi detail? (color, brand)\n\nBatao! 🔍"
  },
  noResults: {
    en: "No matching items found yet. 😔\n\n**Suggestions:**\n• Post your lost item so others can help\n• Try different keywords\n• Check back later - new items are added daily!",
    hi: "Abhi koi matching item nahi mila. 😔\n\n**Suggestions:**\n• Apna lost item post karo taaki log help kar sakein\n• Different keywords try karo\n• Baad mein check karo - naye items daily add hote hain!"
  },
  resultsFound: {
    en: "Found some potential matches! 🎯\n\nCheck these items:",
    hi: "Kuch matches mil gaye! 🎯\n\nYe items dekho:"
  },
  claim: {
    en: "To claim an item, click on it to view details and submit a claim with verification answers. The item owner will review your claim.",
    hi: "Item claim karne ke liye, us par click karo aur verification answers ke saath claim submit karo. Item owner review karega."
  },
  error: {
    en: "I'm having trouble processing your request. Please try again or use the navigation menu to explore the site.",
    hi: "Mujhe kuch problem ho rahi hai. Please dobara try karo ya navigation menu use karo."
  }
};

// Detect language (simple approach)
function detectLanguage(message: string): 'hi' | 'en' {
  const hindiChars = message.match(/[\u0900-\u097F]/g);
  const hindiWords = ['kya', 'kahan', 'kaise', 'mera', 'meri', 'hai', 'hain', 'nahi', 'toh', 'aur', 'se', 'mein', 'ko', 'gaya', 'gayi', 'ho', 'raha', 'rahi', 'kar', 'karo'];
  const lowerMsg = message.toLowerCase();
  
  let hindiScore = hindiChars ? hindiChars.length : 0;
  for (const word of hindiWords) {
    if (lowerMsg.includes(word)) hindiScore += 2;
  }
  
  return hindiScore > 3 ? 'hi' : 'en';
}

// ============= DATABASE SEARCH (NO AI) =============

// Item synonyms for better matching
const ITEM_SYNONYMS: Record<string, string[]> = {
  phone: ['mobile', 'smartphone', 'iphone', 'android', 'cell', 'cellphone', 'handset'],
  wallet: ['purse', 'billfold', 'pocketbook', 'card holder', 'money clip', 'batua'],
  bag: ['backpack', 'handbag', 'satchel', 'tote', 'rucksack', 'pouch', 'sling bag'],
  laptop: ['notebook', 'macbook', 'chromebook', 'computer'],
  keys: ['keychain', 'key ring', 'car keys', 'house keys', 'chabi'],
  earphones: ['earbuds', 'headphones', 'airpods', 'headset'],
  glasses: ['spectacles', 'eyeglasses', 'sunglasses', 'shades', 'chasma'],
  watch: ['wristwatch', 'smartwatch', 'timepiece', 'ghadi'],
  card: ['id card', 'identity card', 'credit card', 'debit card', 'aadhar', 'pan card'],
  bottle: ['water bottle', 'flask', 'tumbler', 'sipper'],
  umbrella: ['parasol', 'brolly', 'chhatri'],
  charger: ['adapter', 'power bank', 'charging cable'],
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

// Database-first search with NO AI
async function searchDatabase(
  supabase: any,
  extractedInfo: { category?: string; location?: string; description?: string; color?: string; brand?: string },
  searchType: 'lost' | 'found' | 'both' = 'both'
): Promise<any[]> {
  console.log('=== DATABASE SEARCH (NO AI) ===');
  console.log('Search params:', JSON.stringify(extractedInfo));
  
  // Build search terms from all extracted info
  const searchTerms: string[] = [];
  
  if (extractedInfo.category) {
    searchTerms.push(...getSynonyms(extractedInfo.category));
  }
  if (extractedInfo.color) {
    searchTerms.push(extractedInfo.color);
  }
  if (extractedInfo.brand) {
    searchTerms.push(extractedInfo.brand);
  }
  if (extractedInfo.description) {
    const words = extractedInfo.description.toLowerCase().split(/\s+/);
    words.forEach((word: string) => {
      if (word.length > 2) {
        searchTerms.push(...getSynonyms(word));
      }
    });
  }

  console.log('Search terms:', [...new Set(searchTerms)]);

  // Perform broad search first
  let query = supabase
    .from('items')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  // Filter by type if specified
  if (searchType !== 'both') {
    query = query.eq('item_type', searchType);
  }

  const { data: allItems, error } = await query;
  
  if (error) {
    console.error('Database search error:', error);
    return [];
  }

  if (!allItems || allItems.length === 0) {
    console.log('No items in database');
    return [];
  }

  console.log('Total items fetched:', allItems.length);

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
        matchReasons.push(`Title: "${term}"`);
      }
      if (itemDesc.includes(term)) {
        relevanceScore += 20;
        matchReasons.push(`Desc: "${term}"`);
      }
      if (itemCategory.includes(term)) {
        relevanceScore += 25;
        matchReasons.push(`Category: "${term}"`);
      }
    }
    
    // Location matching
    if (extractedInfo.location) {
      const userLoc = extractedInfo.location.toLowerCase();
      const locWords = userLoc.split(/\s+/).filter((w: string) => w.length > 2);
      
      for (const word of locWords) {
        if (itemLocation.includes(word)) {
          relevanceScore += 25;
          matchReasons.push(`Location: "${word}"`);
        }
      }
    }
    
    return { ...item, relevanceScore, matchReasons };
  });

  // Filter items with relevance > 0
  let relevantItems = scoredItems.filter((item: any) => item.relevanceScore > 0);
  
  // If no relevant items, return empty (don't show random items)
  if (relevantItems.length === 0) {
    console.log('No relevant items found');
    return [];
  }

  // Sort by relevance score
  relevantItems.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
  
  console.log('Relevant items found:', relevantItems.length);

  return relevantItems.slice(0, 10);
}

// Format search results for display (NO AI)
function formatResults(items: any[], lang: 'hi' | 'en'): string {
  if (items.length === 0) {
    return STATIC_RESPONSES.noResults[lang];
  }
  
  let response = STATIC_RESPONSES.resultsFound[lang] + '\n\n';
  
  items.slice(0, 5).forEach((item, i) => {
    const emoji = item.item_type === 'lost' ? '🔴' : '🟢';
    const confidence = Math.min(item.relevanceScore, 100);
    response += `${i + 1}. ${emoji} **${item.title}**\n`;
    response += `   📍 ${item.location || 'Location not specified'}\n`;
    response += `   🎯 Match: ${confidence}%\n\n`;
  });
  
  if (items.length > 5) {
    response += lang === 'hi' 
      ? `_...aur ${items.length - 5} items. Browse page par dekho!_`
      : `_...and ${items.length - 5} more items. Check the Browse page!_`;
  }
  
  return response;
}

// ============= MAIN CHAT HANDLER (DATABASE-FIRST, AI-LAST) =============

interface ChatResponse {
  response: string;
  context: {
    intent: string;
    missingFields: string[];
    clarifyingQuestions: string[];
    matches: any[];
    recommendedAction: string;
    aiUsed: boolean;
    sessionContext?: SessionContext;
    autoPost?: {
      title: string;
      description: string;
      category: string;
      location: string;
      itemType: 'lost' | 'found';
      canGenerate: boolean;
      missingFields: string[];
    };
  };
}

async function handleChat(
  supabase: any,
  userMessage: string,
  conversationHistory: any[] = [],
  existingSessionContext?: SessionContext
): Promise<ChatResponse> {
  console.log('=== DATABASE-FIRST CHAT HANDLER ===');
  console.log('User message:', userMessage);
  console.log('AI calls so far this session:', aiCallCount);
  console.log('Existing session context:', existingSessionContext);

  const lang = detectLanguage(userMessage);
  console.log('Detected language:', lang);

  // Initialize or merge session context
  let sessionContext: SessionContext = existingSessionContext || {
    infoScore: 0,
    conversationTurn: 0,
  };
  sessionContext.conversationTurn++;

  // Step 0: Check for confirmation/cancellation if we have a pending auto post
  if (sessionContext.infoScore >= 2 && sessionContext.category) {
    const confirmation = checkConfirmation(userMessage);
    
    if (confirmation === 'confirm') {
      // User confirmed - return action to create post
      const autoPost = generateAutoPost(sessionContext, lang);
      return {
        response: lang === 'hi' 
          ? `✅ Bahut badhiya! Aapka post ready hai. Ab "Post ${autoPost.itemType === 'lost' ? 'Lost' : 'Found'}" page par jaake submit kar sakte ho.\n\n📝 Title: ${autoPost.title}`
          : `✅ Great! Your post is ready. You can now go to "Post ${autoPost.itemType === 'lost' ? 'Lost' : 'Found'}" page to submit it.\n\n📝 Title: ${autoPost.title}`,
        context: {
          intent: sessionContext.intent || 'search',
          missingFields: [],
          clarifyingQuestions: [],
          matches: [],
          recommendedAction: 'navigate_to_post',
          aiUsed: false,
          sessionContext,
          autoPost,
        },
      };
    }
    
    if (confirmation === 'cancel') {
      // User wants to edit - reset and ask for details
      sessionContext = { infoScore: 0, conversationTurn: 1 };
      return {
        response: lang === 'hi'
          ? "Theek hai, phir se batao - kya kho gaya ya mila?"
          : "Alright, let's start over - what did you lose or find?",
        context: {
          intent: 'unknown',
          missingFields: ['category', 'location', 'description'],
          clarifyingQuestions: [],
          matches: [],
          recommendedAction: 'provide_info',
          aiUsed: false,
          sessionContext,
        },
      };
    }
  }

  // Step 1: RULE-BASED intent detection (NO AI)
  const { intent, confidence, matchedKeywords } = detectIntentByRules(userMessage);
  console.log('Rule-based intent:', intent, 'Confidence:', confidence, 'Keywords:', matchedKeywords);

  // Update session context with detected intent
  if (intent !== 'unknown') {
    sessionContext.intent = intent;
  }

  // Handle identity questions immediately (NO AI)
  if (intent === 'identity') {
    return {
      response: STATIC_RESPONSES.identity[lang],
      context: {
        intent: 'identity',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'continue',
        aiUsed: false,
        sessionContext,
      },
    };
  }

  // Handle greetings immediately (NO AI)
  if (intent === 'greeting') {
    return {
      response: STATIC_RESPONSES.greeting[lang],
      context: {
        intent: 'greeting',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'await_input',
        aiUsed: false,
        sessionContext,
      },
    };
  }

  // Handle help requests (NO AI)
  if (intent === 'help') {
    return {
      response: STATIC_RESPONSES.help[lang],
      context: {
        intent: 'help',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'await_input',
        aiUsed: false,
        sessionContext,
      },
    };
  }

  // Handle claim requests (NO AI)
  if (intent === 'claim') {
    return {
      response: STATIC_RESPONSES.claim[lang],
      context: {
        intent: 'claim',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'show_claims',
        aiUsed: false,
        sessionContext,
      },
    };
  }

  // Step 2: RULE-BASED info extraction (NO AI) - merge with session context
  const extractedInfo = extractInfoByRules(userMessage);
  console.log('Extracted info:', extractedInfo);

  // Merge new info with session context (accumulate details)
  if (extractedInfo.category) sessionContext.category = extractedInfo.category;
  if (extractedInfo.location) sessionContext.location = extractedInfo.location;
  if (extractedInfo.color) sessionContext.color = extractedInfo.color;
  if (extractedInfo.brand) sessionContext.brand = extractedInfo.brand;
  if (extractedInfo.description) sessionContext.description = extractedInfo.description;
  
  // Calculate cumulative info score
  let cumulativeScore = 0;
  if (sessionContext.category) cumulativeScore++;
  if (sessionContext.location) cumulativeScore++;
  if (sessionContext.color) cumulativeScore++;
  if (sessionContext.brand) cumulativeScore++;
  sessionContext.infoScore = cumulativeScore;

  console.log('Updated session context:', sessionContext);

  // If we have at least some info, search database immediately
  if (sessionContext.infoScore >= 1 || intent === 'search' || intent === 'post_found') {
    console.log('Sufficient info - searching database directly');
    
    // Determine search type: if user lost something, search found items
    const searchType = intent === 'search' ? 'found' : (intent === 'post_found' ? 'lost' : 'both');
    
    const results = await searchDatabase(supabase, {
      category: sessionContext.category,
      location: sessionContext.location,
      color: sessionContext.color,
      brand: sessionContext.brand,
      description: sessionContext.description,
    }, searchType);
    
    // Format results (NO AI)
    let response = formatResults(results, lang);
    
    // If no results and we have enough info, offer to generate a post
    let autoPost = undefined;
    let recommendedAction = results.length > 0 ? 'review_matches' : 'post_item';
    
    if (results.length === 0 && sessionContext.infoScore >= 2) {
      autoPost = generateAutoPost(sessionContext, lang);
      
      if (autoPost.canGenerate) {
        response += '\n\n' + (lang === 'hi' 
          ? `📝 **Auto Post Preview:**\n**Title:** ${autoPost.title}\n**Description:** ${autoPost.description}\n\n_"Yes" bolo confirm karne ke liye ya "No" bolo edit karne ke liye._`
          : `📝 **Auto Post Preview:**\n**Title:** ${autoPost.title}\n**Description:** ${autoPost.description}\n\n_Say "Yes" to confirm or "No" to edit._`);
        recommendedAction = 'confirm_auto_post';
      }
    }
    
    return {
      response,
      context: {
        intent,
        missingFields: [],
        clarifyingQuestions: [],
        matches: results.map((item, index) => ({
          item,
          confidence: item.relevanceScore,
          reasoning: item.matchReasons?.join(', ') || 'Matched by keywords',
          rank: index + 1,
        })),
        recommendedAction,
        aiUsed: false,
        sessionContext,
        autoPost,
      },
    };
  }

  // Step 3: If intent is unknown and no info, ask for more details (NO AI)
  if (intent === 'unknown' && sessionContext.infoScore === 0) {
    return {
      response: STATIC_RESPONSES.needMoreInfo[lang],
      context: {
        intent: 'unknown',
        missingFields: ['category', 'location', 'description'],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'provide_info',
        aiUsed: false,
        sessionContext,
      },
    };
  }

  // Step 4: ONLY use AI if absolutely necessary (ambiguous or complex query)
  // This is the LAST RESORT
  console.log('=== AI FALLBACK (Last Resort) ===');
  
  try {
    aiCallCount++;
    console.log('AI call count:', aiCallCount);
    
    const aiResponse = await callAIMinimal(userMessage, lang);
    
    return {
      response: aiResponse,
      context: {
        intent: 'unknown',
        missingFields: [],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'continue',
        aiUsed: true,
        sessionContext,
      },
    };
  } catch (error) {
    console.error('AI fallback failed:', error);
    // If AI fails, use static response
    return {
      response: STATIC_RESPONSES.needMoreInfo[lang],
      context: {
        intent: 'unknown',
        missingFields: ['category', 'location', 'description'],
        clarifyingQuestions: [],
        matches: [],
        recommendedAction: 'provide_info',
        aiUsed: false,
        sessionContext,
      },
    };
  }
}

// ============= MINIMAL AI CALL (ONLY WHEN NECESSARY) =============

async function callAIMinimal(userMessage: string, lang: 'hi' | 'en'): Promise<string> {
  console.log('Calling AI (minimal) for message:', userMessage.substring(0, 50));
  
  if (!LOVABLE_API_KEY) {
    throw new Error('AI not configured');
  }
  
  const systemPrompt = `You are FindIt AI, a Lost & Found assistant. 
RULES:
- Reply in ${lang === 'hi' ? 'Hindi' : 'English'} ONLY
- MAX 2-3 sentences
- Ask what item they lost/found and where
- Be friendly but brief
- DO NOT give long explanations`;

  const response = await fetch(LOVABLE_AI_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 100,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.choices && result.choices[0]?.message?.content) {
    return result.choices[0].message.content.trim();
  }
  
  throw new Error('Unexpected AI response format');
}

// ============= FULL AI CALL (For specific features that NEED AI) =============

async function callAI(prompt: string, maxTokens = 500, useSystemPrompt = false): Promise<string> {
  console.log('Calling AI with prompt:', prompt.substring(0, 100) + '...');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }
  
  aiCallCount++;
  console.log('AI call count:', aiCallCount);
  
  const messages: { role: string; content: string }[] = [];
  
  if (useSystemPrompt) {
    messages.push({ 
      role: 'system', 
      content: 'You are a helpful Lost & Found assistant. Be brief and direct.' 
    });
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
      throw new Error('Rate limit exceeded');
    }
    if (response.status === 402) {
      throw new Error('Usage limit reached');
    }
    
    throw new Error(`AI API error: ${error}`);
  }

  const result = await response.json();
  console.log('AI response:', JSON.stringify(result).substring(0, 200));
  
  if (result.choices && result.choices[0]?.message?.content) {
    return result.choices[0].message.content.trim();
  }
  
  throw new Error('Unexpected response format from AI');
}

// ============= OTHER FUNCTIONS (Keep AI usage minimal) =============

// Image tagging - simplified, minimal AI
async function analyzeImage(imageUrl: string): Promise<{ tags: string[], objects: string[] }> {
  console.log('Analyzing image (minimal AI):', imageUrl);
  
  try {
    const prompt = `List 5 relevant tags for a lost/found item image. Return ONLY comma-separated tags.`;
    const response = await callAI(prompt, 50);
    const tags = response.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    return { tags, objects: [] };
  } catch (error) {
    console.error('Image analysis failed:', error);
    return { tags: ['item'], objects: [] };
  }
}

// Auto-generate title and description (minimal AI)
async function generateTitleDescription(context: { tags: string[], objects: string[], category: string, location: string }): Promise<{ title: string, description: string }> {
  // Try to generate without AI first
  const parts: string[] = [];
  if (context.category) parts.push(context.category);
  if (context.location) parts.push(`at ${context.location}`);
  
  const title = parts.length > 0 ? `${parts.join(' ')} item` : 'Item Found/Lost';
  const description = `A ${context.category || 'item'} was reported ${context.location ? 'near ' + context.location : ''}.`;
  
  return { title, description };
}

// Calculate match score - RULE-BASED (NO AI)
function calculateMatchScore(lostItem: any, foundItem: any): { score: number, reasoning: string, textSimilarity: number, locationProximity: number } {
  let score = 0;
  const reasons: string[] = [];
  
  // Category match: +40%
  if (lostItem.category && foundItem.category) {
    if (lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
      score += 40;
      reasons.push('Same category');
    }
  }
  
  // Location match: +25%
  if (lostItem.location && foundItem.location) {
    const lostLoc = lostItem.location.toLowerCase();
    const foundLoc = foundItem.location.toLowerCase();
    const words = lostLoc.split(/\s+/).filter((w: string) => w.length > 2);
    const matches = words.filter((w: string) => foundLoc.includes(w));
    if (matches.length > 0) {
      score += Math.min(matches.length * 10, 25);
      reasons.push('Similar location');
    }
  }
  
  // Date proximity: +15%
  if (lostItem.date_lost_found && foundItem.date_lost_found) {
    const lostDate = new Date(lostItem.date_lost_found);
    const foundDate = new Date(foundItem.date_lost_found);
    const daysDiff = Math.abs((lostDate.getTime() - foundDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 3) {
      score += 15;
      reasons.push('Close dates');
    } else if (daysDiff <= 7) {
      score += 10;
      reasons.push('Within a week');
    }
  }
  
  // Description similarity: +20%
  if (lostItem.description && foundItem.description) {
    const lostDesc = lostItem.description.toLowerCase();
    const foundDesc = foundItem.description.toLowerCase();
    const words = lostDesc.split(/\s+/).filter((w: string) => w.length > 3);
    const matches = words.filter((w: string) => foundDesc.includes(w));
    if (matches.length >= 3) {
      score += 20;
      reasons.push('Similar description');
    } else if (matches.length >= 1) {
      score += 10;
      reasons.push('Partial description match');
    }
  }
  
  return {
    score: Math.min(score, 100),
    reasoning: reasons.join(', ') || 'Low similarity',
    textSimilarity: score,
    locationProximity: score > 25 ? 80 : 50,
  };
}

// Smart autocomplete - RULE-BASED (minimal AI)
async function getAutocomplete(partialQuery: string, context: string): Promise<string[]> {
  const query = partialQuery.toLowerCase();
  const suggestions: string[] = [];
  
  // Category-based suggestions
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (kw.startsWith(query)) {
        suggestions.push(`Lost ${kw}`);
        suggestions.push(`Found ${kw}`);
      }
    }
  }
  
  // Location-based suggestions
  for (const loc of LOCATION_KEYWORDS) {
    if (loc.startsWith(query)) {
      suggestions.push(`Item near ${loc}`);
    }
  }
  
  // If no rule-based suggestions, use AI as fallback (but minimal)
  if (suggestions.length === 0 && query.length > 2) {
    try {
      const prompt = `<s>[INST] Generate 5 search autocomplete suggestions for a lost and found website.

Partial query: "${partialQuery}"
Context: ${context}

Return ONLY a comma-separated list of 5 complete search suggestions, nothing else. [/INST]`;

      const response = await callAI(prompt, 100);
      return response.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 5);
    } catch (error) {
      console.error('Autocomplete AI failed:', error);
    }
  }
  
  return suggestions.slice(0, 5);
}

// Duplicate detection - RULE-BASED (NO AI)
function detectDuplicates(newItem: any, existingItems: any[]): any[] {
  if (existingItems.length === 0) return [];
  
  const duplicates: any[] = [];
  
  for (const item of existingItems) {
    const { score } = calculateMatchScore(newItem, item);
    if (score >= 70) {
      duplicates.push({ ...item, similarityScore: score });
    }
  }
  
  return duplicates;
}

// Intent clarification - RULE-BASED (NO AI)
function clarifyIntent(userQuery: string): { intent: string, suggestions: string[], clarification: string } {
  const { intent, confidence, matchedKeywords } = detectIntentByRules(userQuery);
  
  let suggestions: string[] = [];
  let clarification = 'CLEAR';
  
  if (intent === 'unknown' || confidence < 50) {
    clarification = 'Are you looking for a lost item or did you find something?';
    suggestions = ['Search for lost item', 'Report found item', 'Browse all items'];
  } else if (intent === 'search') {
    suggestions = ['Provide item details', 'Specify location', 'Add description'];
  } else if (intent === 'post_found') {
    suggestions = ['Upload photo', 'Add location', 'Describe the item'];
  }
  
  return { intent, suggestions, clarification };
}

// Suggest missing info - RULE-BASED (NO AI)
function suggestMissingInfo(item: any): string[] {
  const missing: string[] = [];
  
  if (!item.title) missing.push('Add a descriptive title');
  if (!item.description) missing.push('Add a detailed description');
  if (!item.category) missing.push('Select a category');
  if (!item.location) missing.push('Specify the location');
  if (!item.date_lost_found) missing.push('Add the date');
  if (!item.photos || item.photos.length === 0) missing.push('Upload a photo');
  
  return missing;
}

// Generate notification - TEMPLATE-BASED (NO AI)
function generateNotification(type: string, context: any): { title: string, message: string } {
  const templates: Record<string, { title: string, message: string }> = {
    potential_match: {
      title: '🎯 Potential Match Found!',
      message: `A ${context.matchTitle || 'similar item'} might match your ${context.itemTitle || 'item'}!`,
    },
    new_claim: {
      title: '📋 New Claim Received',
      message: `Someone has claimed your ${context.itemTitle || 'item'}. Review the claim now.`,
    },
    claim_approved: {
      title: '✅ Claim Approved',
      message: `Your claim for ${context.itemTitle || 'the item'} has been approved!`,
    },
    claim_rejected: {
      title: '❌ Claim Rejected',
      message: `Your claim for ${context.itemTitle || 'the item'} was not approved.`,
    },
    default: {
      title: '🔔 Notification',
      message: 'You have a new notification.',
    },
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
        result = calculateMatchScore(params.lostItem, params.foundItem);
        break;

      case 'semantic_search':
        // Use database search instead of AI semantic search
        const searchResults = await searchDatabase(supabase, { description: params.query }, 'both');
        result = searchResults;
        break;

      case 'autocomplete':
        result = await getAutocomplete(params.query, params.context || 'lost and found items');
        break;

      case 'detect_duplicates':
        result = detectDuplicates(params.newItem, params.existingItems);
        break;

      case 'clarify_intent':
        result = clarifyIntent(params.query);
        break;

      case 'suggest_missing_info':
        result = suggestMissingInfo(params.item);
        break;

      case 'generate_notification':
        result = generateNotification(params.type, params.context);
        break;

      case 'process_new_item':
        // Simplified processing with minimal AI
        const { item } = params;
        const processResult: any = {};

        // 1. Generate title/description without AI
        if (!item.title || !item.description) {
          const generated = await generateTitleDescription({
            tags: [],
            objects: [],
            category: item.category,
            location: item.location,
          });
          processResult.autoTitle = generated.title;
          processResult.autoDescription = generated.description;
        }

        // 2. Check for duplicates (rule-based)
        const { data: existingItems } = await supabase
          .from('items')
          .select('id, title, description, category, location, date_lost_found')
          .eq('item_type', item.item_type)
          .eq('category', item.category)
          .limit(20);

        if (existingItems) {
          processResult.duplicates = detectDuplicates(item, existingItems);
        }

        // 3. Find potential matches (rule-based)
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
            const matchScore = calculateMatchScore(
              item.item_type === 'lost' ? item : match,
              item.item_type === 'lost' ? match : item
            );
            if (matchScore.score >= 40) {
              processResult.matches.push({
                item: match,
                ...matchScore,
              });
            }
          }
          processResult.matches.sort((a: any, b: any) => b.score - a.score);
        }

        // 4. Suggest missing info (rule-based)
        processResult.missingInfo = suggestMissingInfo(item);

        result = processResult;
        break;

      case 'webhook_new_item':
        // Webhook handler - minimal AI usage
        const webhookItem = params.item;
        console.log('Processing webhook for new item:', webhookItem.id);

        // Save basic tags without AI
        await supabase.from('ai_tags').upsert({
          item_id: webhookItem.id,
          tags: [webhookItem.category || 'item'],
          objects_detected: [],
          auto_title: webhookItem.title,
          auto_description: webhookItem.description,
        }, { onConflict: 'item_id' });

        // Find and save matches (rule-based)
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

              // Create notification (template-based, no AI)
              const notification = generateNotification('potential_match', {
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
          }
        }

        result = { success: true, processed: webhookItem.id };
        break;

      case 'chat':
        // Full database-first conversation flow with session context
        result = await handleChat(supabase, params.message, params.history || [], params.sessionContext);
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

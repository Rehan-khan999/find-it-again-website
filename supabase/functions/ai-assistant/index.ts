import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Ollama Local LLM Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'phi3:mini';

// Track AI usage for monitoring
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
  
  if (!ctx.category) missingFields.push('category');
  if (!ctx.location) missingFields.push('location');
  
  const itemType: 'lost' | 'found' = ctx.intent === 'post_found' ? 'found' : 'lost';
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

// ============= INTELLIGENT INVESTIGATOR RULES =============

// Intent keywords - detect from natural language immediately
const LOST_KEYWORDS = ['lost', 'missing', 'kho gaya', 'kho gayi', 'kho di', 'gum', 'gum ho gaya', 'bhul gaya', 'chhut gaya', 'nahi mil raha', 'can\'t find', 'cannot find', 'left behind', 'misplaced', 'kho', 'mera', 'meri', 'apna', 'apni', 'lose', 'losing'];
const FOUND_KEYWORDS = ['found', 'picked', 'mila', 'mil gaya', 'mil gayi', 'paaya', 'dekha', 'someone left', 'lying', 'unclaimed', 'picked up', 'discovered'];
const HELP_KEYWORDS = ['help', 'how', 'kaise', 'what', 'kya karna', 'guide', 'madad', 'sahayata', 'explain', 'kya hai'];
const IDENTITY_KEYWORDS = ['kisne banaya', 'kisne train', 'who made', 'who built', 'who trained', 'who created', 'tujhe kisne', 'aapko kisne', 'tumhe kisne', 'maker', 'creator', 'developer', 'coder', 'rehan'];
const GREETING_KEYWORDS = ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'good afternoon'];
const CLAIM_KEYWORDS = ['claim', 'mine', 'mera hai', 'meri hai', 'belong', 'owner', 'return', 'wapas'];
const CONFIRM_KEYWORDS = ['yes', 'ok', 'okay', 'confirm', 'post', 'submit', 'haan', 'ha', 'theek', 'kar do', 'kardo', 'post karo', 'save', 'done'];
const CANCEL_KEYWORDS = ['no', 'nahi', 'cancel', 'nope', 'edit', 'change', 'modify', 'badlo', 'ruko', 'nahi chahiye'];
const OFF_TOPIC_KEYWORDS = ['weather', 'news', 'movie', 'song', 'cricket', 'football', 'politics', 'joke', 'story', 'poem', 'recipe', 'game', 'temperature', 'stock'];
const BROWSE_KEYWORDS = ['browse', 'show', 'list', 'dekho', 'dikhao', 'all items', 'sab', 'everything', 'recent'];

// Enhanced category keywords for better extraction
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'electronics': ['phone', 'mobile', 'laptop', 'charger', 'earphone', 'headphone', 'airpod', 'airpods', 'tablet', 'ipad', 'camera', 'watch', 'smartwatch', 'powerbank', 'cable', 'adapter', 'speaker', 'bluetooth', 'pendrive', 'usb', 'mouse', 'keyboard'],
  'wallet': ['wallet', 'purse', 'money', 'cash', 'card', 'credit card', 'debit card', 'batua', 'pocketbook', 'billfold'],
  'keys': ['key', 'keys', 'keychain', 'car key', 'bike key', 'room key', 'chabi', 'chaabi', 'lock'],
  'bag': ['bag', 'backpack', 'handbag', 'suitcase', 'luggage', 'pouch', 'sling', 'tote', 'laptop bag', 'school bag', 'office bag', 'duffle'],
  'documents': ['document', 'id', 'id card', 'aadhar', 'aadhaar', 'pan', 'passport', 'license', 'certificate', 'marksheet', 'degree', 'admit card', 'hall ticket'],
  'accessories': ['glasses', 'sunglasses', 'watch', 'ring', 'chain', 'bracelet', 'earring', 'jewelry', 'jewellery', 'belt', 'umbrella', 'cap', 'hat', 'scarf', 'tie', 'necklace'],
  'clothing': ['jacket', 'coat', 'sweater', 'hoodie', 'shirt', 'jeans', 'shoes', 'sandal', 'scarf', 'tshirt', 't-shirt', 'blazer', 'suit'],
  'bottle': ['bottle', 'water bottle', 'flask', 'sipper', 'tumbler', 'thermos'],
  'other': []
};

// Location keywords for extraction
const LOCATION_KEYWORDS = [
  // Campus locations
  'library', 'canteen', 'cafeteria', 'classroom', 'class', 'lab', 'laboratory', 'hostel', 'mess', 'ground', 'playground',
  'parking', 'bus stop', 'gate', 'entrance', 'exit', 'corridor', 'hallway', 'washroom', 'bathroom', 'toilet',
  'auditorium', 'seminar hall', 'gym', 'sports complex', 'admin', 'office', 'department', 'reception',
  'block', 'building', 'floor', 'room', 'near', 'behind', 'front', 'beside', 'opposite', 'staircase', 'lift', 'elevator',
  // City locations
  'malad', 'andheri', 'bandra', 'dadar', 'mumbai', 'delhi', 'station', 'mall', 'market', 'park', 'garden',
  'road', 'street', 'lane', 'nagar', 'colony', 'sector', 'phase', 'east', 'west', 'north', 'south',
  'metro', 'railway', 'airport', 'bus stand', 'terminal', 'platform', 'shop', 'store', 'restaurant', 'hotel', 'cafe',
  // Hindi locations
  'ghar', 'dukaan', 'bazaar', 'mandir', 'masjid', 'church', 'gurudwara', 'hospital', 'clinic'
];

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

function isOffTopic(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  for (const kw of OFF_TOPIC_KEYWORDS) {
    if (lowerMsg.includes(kw)) return true;
  }
  return false;
}

// Intelligent intent detection - understand what user wants immediately
function detectIntentByRules(message: string, sessionContext?: SessionContext): {
  intent: 'search' | 'post_lost' | 'post_found' | 'browse' | 'help' | 'identity' | 'greeting' | 'claim' | 'off_topic' | 'location_update' | 'unknown';
  confidence: number;
  matchedKeywords: string[];
} {
  const lowerMsg = message.toLowerCase().trim();
  const matchedKeywords: string[] = [];
  const words = lowerMsg.split(/\s+/);
  
  // Check if this is just a location update (context-aware)
  if (sessionContext?.intent && sessionContext.category && !sessionContext.location) {
    const isJustLocation = LOCATION_KEYWORDS.some(loc => lowerMsg.includes(loc)) && 
                          words.length <= 4 &&
                          !LOST_KEYWORDS.some(kw => lowerMsg.includes(kw)) &&
                          !FOUND_KEYWORDS.some(kw => lowerMsg.includes(kw));
    if (isJustLocation) {
      return { intent: 'location_update', confidence: 90, matchedKeywords: [] };
    }
  }
  
  // Check off-topic first
  if (isOffTopic(message)) {
    return { intent: 'off_topic', confidence: 90, matchedKeywords: [] };
  }
  
  // Check identity
  for (const kw of IDENTITY_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      return { intent: 'identity', confidence: 100, matchedKeywords: [kw] };
    }
  }
  
  // Check greetings (only if message is short)
  if (words.length <= 3) {
    for (const kw of GREETING_KEYWORDS) {
      if (lowerMsg.startsWith(kw) || lowerMsg === kw) {
        return { intent: 'greeting', confidence: 90, matchedKeywords: [kw] };
      }
    }
  }
  
  // Check browse intent
  for (const kw of BROWSE_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      return { intent: 'browse', confidence: 80, matchedKeywords: [kw] };
    }
  }
  
  // Check claim intent
  for (const kw of CLAIM_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length > 0 && words.length < 5) {
    return { intent: 'claim', confidence: 70, matchedKeywords };
  }
  
  // Check lost vs found intent
  let lostScore = 0;
  let foundScore = 0;
  
  for (const kw of LOST_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      lostScore += 2;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of FOUND_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      foundScore += 2;
      matchedKeywords.push(kw);
    }
  }
  
  // If message mentions an item category, boost confidence
  let hasCategory = false;
  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        hasCategory = true;
        break;
      }
    }
    if (hasCategory) break;
  }
  
  if (hasCategory) {
    lostScore += 1;
  }
  
  if (lostScore > foundScore && lostScore > 0) {
    return { intent: 'search', confidence: Math.min(lostScore * 20 + 40, 95), matchedKeywords };
  }
  if (foundScore > lostScore && foundScore > 0) {
    return { intent: 'post_found', confidence: Math.min(foundScore * 20 + 40, 95), matchedKeywords };
  }
  
  // If has category keywords but no explicit lost/found, assume search (most common)
  if (hasCategory) {
    return { intent: 'search', confidence: 60, matchedKeywords: [] };
  }
  
  // Check help intent
  for (const kw of HELP_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      return { intent: 'help', confidence: 70, matchedKeywords: [kw] };
    }
  }
  
  return { intent: 'unknown', confidence: 0, matchedKeywords: [] };
}

// Enhanced entity extraction - extract as much as possible immediately
function extractInfoByRules(message: string): {
  category?: string;
  location?: string;
  description?: string;
  color?: string;
  brand?: string;
  date?: string;
  itemName?: string;
  infoScore: number;
} {
  const lowerMsg = message.toLowerCase();
  const result: any = { infoScore: 0 };
  
  // Extract specific item name for better matching
  let foundItemKeyword = '';
  
  // Extract category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        result.category = category;
        foundItemKeyword = kw;
        result.infoScore++;
        break;
      }
    }
    if (result.category) break;
  }
  
  // Store the specific item name (e.g., "phone" not just "electronics")
  if (foundItemKeyword) {
    result.itemName = foundItemKeyword;
  }
  
  // Extract location - more aggressive matching
  for (const loc of LOCATION_KEYWORDS) {
    if (lowerMsg.includes(loc)) {
      // Try to capture surrounding context for better location
      const regex = new RegExp(`([\\w\\s]{0,15})?${loc}([\\w\\s]{0,15})?`, 'i');
      const match = message.match(regex);
      if (match) {
        // Clean up the match
        let location = match[0].trim();
        // Remove common words that aren't part of location
        location = location.replace(/^(in|at|near|beside|behind|front|opposite)\s+/i, '');
        location = location.replace(/\s+(lost|found|mila|kho|gaya|gayi|hai)$/i, '');
        result.location = location.trim();
        result.infoScore++;
        break;
      }
    }
  }
  
  // Extract colors (including Hindi colors)
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'grey', 'gray', 'pink', 'orange', 'purple', 'gold', 'silver', 'kala', 'safed', 'lal', 'neela', 'hara', 'peela'];
  for (const color of colors) {
    if (lowerMsg.includes(color)) {
      result.color = color;
      result.infoScore++;
      break;
    }
  }
  
  // Extract brands (more extensive list)
  const brands = ['apple', 'samsung', 'xiaomi', 'redmi', 'oneplus', 'oppo', 'vivo', 'realme', 'nokia', 'sony', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'nike', 'adidas', 'puma', 'boat', 'jbl', 'iphone', 'macbook', 'mi', 'poco', 'motorola', 'lg', 'huawei', 'google', 'pixel', 'nothing', 'iqoo', 'fossil', 'titan', 'fastrack', 'casio', 'rolex', 'tommy', 'levis', 'zara', 'h&m'];
  for (const brand of brands) {
    if (lowerMsg.includes(brand)) {
      result.brand = brand;
      result.infoScore++;
      break;
    }
  }
  
  // Extract date patterns (more patterns)
  const datePatterns = [
    { pattern: /yesterday/i, value: 'yesterday' },
    { pattern: /today/i, value: 'today' },
    { pattern: /kal/i, value: 'yesterday' },
    { pattern: /aaj/i, value: 'today' },
    { pattern: /abhi/i, value: 'today' },
    { pattern: /last\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, value: null },
    { pattern: /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/, value: null },
    { pattern: /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, value: null },
  ];
  for (const { pattern, value } of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      result.date = value || match[0];
      result.infoScore++;
      break;
    }
  }
  
  // Build description from extracted info
  const descParts: string[] = [];
  if (result.color) descParts.push(result.color);
  if (result.brand) descParts.push(result.brand);
  if (result.itemName) descParts.push(result.itemName);
  else if (result.category) descParts.push(result.category);
  if (descParts.length > 0) {
    result.description = descParts.join(' ');
  }
  
  return result;
}

// ============= INVESTIGATOR STATIC RESPONSES (NO AI) =============

const STATIC_RESPONSES = {
  identity: {
    en: "Mujhe Rehan bhai ne banaya hai and train kiya hai!\n\nI'm your Lost & Found investigator. Tell me what you lost or found.",
    hi: "Mujhe Rehan bhai ne banaya hai and train kiya hai!\n\nMain aapka Lost & Found investigator hoon. Batao kya kho gaya ya mila?"
  },
  greeting: {
    en: "I'm your Lost & Found investigator. Tell me what happened - what did you lose or find?",
    hi: "Main aapka Lost & Found investigator hoon. Batao kya hua - kya kho gaya ya mila?"
  },
  help: {
    en: "Just tell me naturally:\n- 'Lost my phone in library'\n- 'Found a wallet near canteen'\n\nI'll search the database immediately.",
    hi: "Bas naturally batao:\n- 'Mera phone library mein kho gaya'\n- 'Canteen ke paas wallet mila'\n\nMain turant database search karunga."
  },
  needMoreInfo: {
    en: "What item? Tell me - phone, wallet, bag, keys, etc.",
    hi: "Kya item hai? Batao - phone, wallet, bag, keys, etc."
  },
  noResults: {
    en: "No matching items in database yet.",
    hi: "Database mein abhi koi match nahi mila."
  },
  resultsFound: {
    en: "Found these items:",
    hi: "Ye items mile:"
  },
  claim: {
    en: "Click on any item to view details and submit a claim.",
    hi: "Kisi bhi item par click karo details dekhne aur claim karne ke liye."
  },
  offTopic: {
    en: "I only handle Lost & Found. What did you lose or find?",
    hi: "Main sirf Lost & Found ke liye hoon. Kya kho gaya ya mila?"
  },
  dbError: {
    en: "Database temporarily unavailable. Please try again.",
    hi: "Database abhi available nahi hai. Thodi der baad try karo."
  },
  askLocation: {
    en: "Where did you lose/find it?",
    hi: "Kahan kho gaya/mila tha?"
  },
  isThisYours: {
    en: "Is any of these yours?",
    hi: "Kya inme se koi tumhara hai?"
  },
  noneMatch: {
    en: "If none match, I can help you post your lost item so others can find it.",
    hi: "Agar koi match nahi, toh main tumhara lost item post karne mein help kar sakta hoon."
  }
};

function detectLanguage(message: string): 'hi' | 'en' {
  const hindiChars = message.match(/[\u0900-\u097F]/g);
  const hindiWords = ['kya', 'kahan', 'kaise', 'mera', 'meri', 'hai', 'hain', 'nahi', 'toh', 'aur', 'se', 'mein', 'ko', 'gaya', 'gayi', 'ho', 'raha', 'rahi', 'kar', 'karo', 'tha', 'thi', 'hoon', 'yahan', 'wahan'];
  const lowerMsg = message.toLowerCase();
  
  let hindiScore = hindiChars ? hindiChars.length : 0;
  for (const word of hindiWords) {
    if (lowerMsg.includes(word)) hindiScore += 2;
  }
  
  return hindiScore > 3 ? 'hi' : 'en';
}

// ============= DATABASE SEARCH (ALWAYS FIRST) =============

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

async function searchDatabase(
  supabase: any,
  extractedInfo: { category?: string; location?: string; description?: string; color?: string; brand?: string },
  searchType: 'lost' | 'found' | 'both' = 'both'
): Promise<{ items: any[], dbQueried: boolean, error?: string }> {
  console.log('=== DATABASE SEARCH (MANDATORY FIRST) ===');
  console.log('Search params:', JSON.stringify(extractedInfo));
  
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

  try {
    let query = supabase
      .from('items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (searchType !== 'both') {
      query = query.eq('item_type', searchType);
    }

    const { data: allItems, error } = await query;
    
    if (error) {
      console.error('Database search error:', error);
      return { items: [], dbQueried: true, error: 'Database query failed' };
    }

    if (!allItems || allItems.length === 0) {
      console.log('No items in database');
      return { items: [], dbQueried: true };
    }

    console.log('Total items fetched:', allItems.length);

    // Score and filter items
    const scoredItems = allItems.map((item: any) => {
      let relevanceScore = 0;
      const matchReasons: string[] = [];
      
      const itemTitle = (item.title || '').toLowerCase();
      const itemDesc = (item.description || '').toLowerCase();
      const itemCategory = (item.category || '').toLowerCase();
      const itemLocation = (item.location || '').toLowerCase();
      
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
      
      // Location matching with fuzzy support
      if (extractedInfo.location) {
        const userLoc = extractedInfo.location.toLowerCase();
        const locWords = userLoc.split(/\s+/).filter((w: string) => w.length > 2);
        
        for (const word of locWords) {
          if (itemLocation.includes(word)) {
            relevanceScore += 25;
            matchReasons.push(`Location: "${word}"`);
          }
          // Fuzzy: Check if location starts with or contains partial match
          if (itemLocation.startsWith(word.substring(0, 3))) {
            relevanceScore += 10;
            matchReasons.push(`Location partial: "${word}"`);
          }
        }
      }
      
      return { ...item, relevanceScore, matchReasons };
    });

    let relevantItems = scoredItems.filter((item: any) => item.relevanceScore > 0);
    
    if (relevantItems.length === 0) {
      console.log('No relevant items found');
      return { items: [], dbQueried: true };
    }

    relevantItems.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    
    console.log('Relevant items found:', relevantItems.length);

    return { items: relevantItems.slice(0, 10), dbQueried: true };
  } catch (err) {
    console.error('Database search exception:', err);
    return { items: [], dbQueried: true, error: 'Database connection failed' };
  }
}

// Investigator-style results formatting - direct and informative
function formatResults(items: any[], lang: 'hi' | 'en', sessionContext?: SessionContext): string {
  if (items.length === 0) {
    // Smart follow-up based on what's missing
    if (sessionContext?.category && !sessionContext?.location) {
      return lang === 'hi' 
        ? `${sessionContext.category} ke liye koi match nahi mila. Kahan ${sessionContext.intent === 'post_found' ? 'mila' : 'kho gaya'} tha?`
        : `No ${sessionContext.category} found. Where did you ${sessionContext.intent === 'post_found' ? 'find' : 'lose'} it?`;
    }
    return STATIC_RESPONSES.noResults[lang];
  }
  
  // Direct results - no fluff
  let response = STATIC_RESPONSES.resultsFound[lang] + '\n\n';
  
  items.slice(0, 5).forEach((item, i) => {
    const typeLabel = item.item_type === 'lost' ? '[LOST]' : '[FOUND]';
    const confidence = Math.min(item.relevanceScore || 50, 100);
    
    response += `${i + 1}. ${typeLabel} ${item.title}\n`;
    response += `   📍 ${item.location || 'Location not specified'}\n`;
    response += `   📅 ${item.date_lost_found || 'Date not specified'}\n`;
    response += `   🎯 Match: ${confidence}%\n\n`;
  });
  
  // Add smart follow-up question
  response += '\n' + STATIC_RESPONSES.isThisYours[lang];
  
  if (items.length > 5) {
    response += '\n\n' + (lang === 'hi' 
      ? `+${items.length - 5} aur items available.`
      : `+${items.length - 5} more items available.`);
  }
  
  return response;
}

// ============= OLLAMA LOCAL LLM (LAST RESORT ONLY) =============

async function callOllamaLLM(userMessage: string, lang: 'hi' | 'en'): Promise<string> {
  console.log('=== CALLING OLLAMA (LAST RESORT) ===');
  console.log('Message:', userMessage.substring(0, 50));
  
  aiCallCount++;
  console.log('AI call count:', aiCallCount);
  
  const systemPrompt = `You are FindIt AI, a Lost & Found assistant. STRICT RULES:
- Reply in ${lang === 'hi' ? 'Hindi' : 'English'} ONLY
- MAX 2 sentences
- Ask ONE clarifying question about what item they lost/found or where
- NO storytelling, NO motivational talk
- ONLY assist with Lost & Found tasks
- If question is unrelated, politely redirect to Lost & Found`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 100,
        }
      }),
    });

    if (!response.ok) {
      console.error('Ollama API error:', response.status);
      throw new Error('Ollama unavailable');
    }

    const result = await response.json();
    
    if (result.response) {
      return result.response.trim();
    }
    
    throw new Error('Unexpected Ollama response format');
  } catch (error) {
    console.error('Ollama call failed:', error);
    // Fallback to static response if Ollama fails
    return STATIC_RESPONSES.needMoreInfo[lang];
  }
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
    dbQueried: boolean;
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
  console.log('=== INVESTIGATOR MODE: DATABASE-FIRST ===');
  console.log('User message:', userMessage);
  console.log('Existing context:', JSON.stringify(existingSessionContext));

  const lang = detectLanguage(userMessage);
  console.log('Language:', lang);

  // Initialize or continue session context
  let sessionContext: SessionContext = existingSessionContext || {
    infoScore: 0,
    conversationTurn: 0,
  };
  sessionContext.conversationTurn++;

  // STEP 1: Extract info from current message FIRST (before intent detection)
  const extractedInfo = extractInfoByRules(userMessage);
  console.log('Extracted info:', JSON.stringify(extractedInfo));

  // Merge extracted info into session context
  if (extractedInfo.category) sessionContext.category = extractedInfo.category;
  if (extractedInfo.location) sessionContext.location = extractedInfo.location;
  if (extractedInfo.color) sessionContext.color = extractedInfo.color;
  if (extractedInfo.brand) sessionContext.brand = extractedInfo.brand;
  if (extractedInfo.date) sessionContext.date = extractedInfo.date;
  if (extractedInfo.description) sessionContext.description = extractedInfo.description;

  // Calculate cumulative info score
  let cumulativeScore = 0;
  if (sessionContext.category) cumulativeScore++;
  if (sessionContext.location) cumulativeScore++;
  if (sessionContext.color) cumulativeScore++;
  if (sessionContext.brand) cumulativeScore++;
  if (sessionContext.date) cumulativeScore++;
  sessionContext.infoScore = cumulativeScore;

  console.log('Session context after merge:', JSON.stringify(sessionContext));

  // STEP 2: Detect intent (context-aware)
  const { intent, confidence, matchedKeywords } = detectIntentByRules(userMessage, sessionContext);
  console.log('Intent:', intent, 'Confidence:', confidence);

  // Update session intent (preserve previous if just updating location/info)
  if (intent === 'location_update' && sessionContext.intent) {
    // Keep previous intent, just update location
    console.log('Location update detected, keeping previous intent:', sessionContext.intent);
  } else if (intent !== 'unknown') {
    sessionContext.intent = intent;
  }

  // STEP 3: Handle special intents immediately (NO database needed)
  
  // Off-topic
  if (intent === 'off_topic') {
    return {
      response: STATIC_RESPONSES.offTopic[lang],
      context: {
        intent: 'off_topic', missingFields: [], clarifyingQuestions: [], matches: [],
        recommendedAction: 'redirect', aiUsed: false, dbQueried: false, sessionContext,
      },
    };
  }

  // Identity question
  if (intent === 'identity') {
    return {
      response: STATIC_RESPONSES.identity[lang],
      context: {
        intent: 'identity', missingFields: [], clarifyingQuestions: [], matches: [],
        recommendedAction: 'continue', aiUsed: false, dbQueried: false, sessionContext,
      },
    };
  }

  // Greeting (only for short messages)
  if (intent === 'greeting') {
    return {
      response: STATIC_RESPONSES.greeting[lang],
      context: {
        intent: 'greeting', missingFields: [], clarifyingQuestions: [], matches: [],
        recommendedAction: 'await_input', aiUsed: false, dbQueried: false, sessionContext,
      },
    };
  }

  // Help
  if (intent === 'help') {
    return {
      response: STATIC_RESPONSES.help[lang],
      context: {
        intent: 'help', missingFields: [], clarifyingQuestions: [], matches: [],
        recommendedAction: 'await_input', aiUsed: false, dbQueried: false, sessionContext,
      },
    };
  }

  // Claim
  if (intent === 'claim') {
    return {
      response: STATIC_RESPONSES.claim[lang],
      context: {
        intent: 'claim', missingFields: [], clarifyingQuestions: [], matches: [],
        recommendedAction: 'show_claims', aiUsed: false, dbQueried: false, sessionContext,
      },
    };
  }

  // Check for confirmation/cancellation of auto post
  if (sessionContext.infoScore >= 2 && sessionContext.category) {
    const confirmation = checkConfirmation(userMessage);
    
    if (confirmation === 'confirm') {
      const autoPost = generateAutoPost(sessionContext, lang);
      return {
        response: lang === 'hi' 
          ? `Post ready. "${autoPost.itemType === 'lost' ? 'Post Lost' : 'Post Found'}" page par submit karo.`
          : `Post ready. Submit on "${autoPost.itemType === 'lost' ? 'Post Lost' : 'Post Found'}" page.`,
        context: {
          intent: sessionContext.intent || 'search', missingFields: [], clarifyingQuestions: [], matches: [],
          recommendedAction: 'navigate_to_post', aiUsed: false, dbQueried: false, sessionContext, autoPost,
        },
      };
    }
    
    if (confirmation === 'cancel') {
      sessionContext = { infoScore: 0, conversationTurn: 1 };
      return {
        response: lang === 'hi' ? "Theek hai, phir se batao - kya kho gaya ya mila?" : "Alright - what did you lose or find?",
        context: {
          intent: 'unknown', missingFields: ['category', 'location', 'description'], clarifyingQuestions: [], matches: [],
          recommendedAction: 'provide_info', aiUsed: false, dbQueried: false, sessionContext,
        },
      };
    }
  }

  // STEP 4: INVESTIGATOR ACTION - Query database IMMEDIATELY if we have ANY info
  // Don't wait, don't ask questions first - ACT NOW
  
  const hasAnyInfo = sessionContext.category || sessionContext.location || sessionContext.color || sessionContext.brand;
  const shouldSearch = hasAnyInfo || intent === 'search' || intent === 'post_found' || intent === 'location_update' || intent === 'browse';
  
  if (shouldSearch) {
    console.log('=== EXECUTING DATABASE SEARCH (INVESTIGATOR MODE) ===');
    
    // Determine search type based on intent
    // If user lost something, search FOUND items
    // If user found something, search LOST items (to find owner)
    let searchType: 'lost' | 'found' | 'both' = 'both';
    if (sessionContext.intent === 'search' || intent === 'search') {
      searchType = 'found'; // User lost item, search found items
    } else if (sessionContext.intent === 'post_found' || intent === 'post_found') {
      searchType = 'lost'; // User found item, search lost items
    }
    
    console.log('Search type:', searchType);
    
    const { items: results, dbQueried, error } = await searchDatabase(supabase, {
      category: sessionContext.category,
      location: sessionContext.location,
      color: sessionContext.color,
      brand: sessionContext.brand,
      description: sessionContext.description,
    }, searchType);
    
    if (error) {
      return {
        response: STATIC_RESPONSES.dbError[lang],
        context: {
          intent: intent, missingFields: [], clarifyingQuestions: [], matches: [],
          recommendedAction: 'retry', aiUsed: false, dbQueried: true, sessionContext,
        },
      };
    }
    
    // Format results with smart follow-up
    let response = formatResults(results, lang, sessionContext);
    let autoPost = undefined;
    let recommendedAction = results.length > 0 ? 'review_matches' : 'post_item';
    
    // If no results found, ask ONE smart clarifying question based on what's missing
    if (results.length === 0) {
      if (!sessionContext.location && sessionContext.category) {
        // Have category, need location
        response = lang === 'hi'
          ? `${sessionContext.category} ke liye abhi koi match nahi mila. Kahan ${sessionContext.intent === 'post_found' ? 'mila' : 'kho gaya'} tha?`
          : `No ${sessionContext.category} found yet. Where did you ${sessionContext.intent === 'post_found' ? 'find' : 'lose'} it?`;
        recommendedAction = 'provide_location';
      } else if (sessionContext.infoScore >= 2) {
        // Enough info to offer auto post
        autoPost = generateAutoPost(sessionContext, lang);
        if (autoPost.canGenerate) {
          response += '\n\n' + (lang === 'hi' 
            ? `Post karna chahte ho?\nTitle: ${autoPost.title}\n\n"Yes" bolo.`
            : `Want to post it?\nTitle: ${autoPost.title}\n\nSay "Yes".`);
          recommendedAction = 'confirm_auto_post';
        }
      }
    }
    
    return {
      response,
      context: {
        intent: sessionContext.intent || intent,
        missingFields: [],
        clarifyingQuestions: [],
        matches: results.map((item, index) => ({
          item,
          confidence: Math.min(item.relevanceScore || 50, 100),
          reasoning: item.matchReasons?.join(', ') || 'Matched by keywords',
          rank: index + 1,
        })),
        recommendedAction,
        aiUsed: false,
        dbQueried: true,
        sessionContext,
        autoPost,
      },
    };
  }

  // STEP 5: No info extracted - ask for item type (NO AI, just static question)
  if (!hasAnyInfo && intent === 'unknown') {
    return {
      response: STATIC_RESPONSES.needMoreInfo[lang],
      context: {
        intent: 'unknown', missingFields: ['category', 'location'], clarifyingQuestions: [], matches: [],
        recommendedAction: 'provide_info', aiUsed: false, dbQueried: false, sessionContext,
      },
    };
  }

  // STEP 6: LAST RESORT - Use Ollama only for truly unclear/complex queries
  // This should rarely happen if our rules are comprehensive
  console.log('=== OLLAMA FALLBACK (LAST RESORT) ===');
  console.log('Reason: Could not determine intent or extract info');
  
  const ollamaResponse = await callOllamaLLM(userMessage, lang);
  
  return {
    response: ollamaResponse,
    context: {
      intent: 'unknown', missingFields: [], clarifyingQuestions: [], matches: [],
      recommendedAction: 'continue', aiUsed: true, dbQueried: false, sessionContext,
    },
  };
}

// ============= RULE-BASED FUNCTIONS (NO AI) =============

function calculateMatchScore(lostItem: any, foundItem: any): { score: number, reasoning: string, textSimilarity: number, locationProximity: number } {
  let score = 0;
  const reasons: string[] = [];
  
  if (lostItem.category && foundItem.category) {
    if (lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
      score += 40;
      reasons.push('Same category');
    }
  }
  
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

function generateNotification(type: string, context: any): { title: string, message: string } {
  const templates: Record<string, { title: string, message: string }> = {
    potential_match: {
      title: 'Potential Match Found!',
      message: `A ${context.matchTitle || 'similar item'} might match your ${context.itemTitle || 'item'}.`,
    },
    new_claim: {
      title: 'New Claim Received',
      message: `Someone has claimed your ${context.itemTitle || 'item'}. Review the claim now.`,
    },
    claim_approved: {
      title: 'Claim Approved',
      message: `Your claim for ${context.itemTitle || 'the item'} has been approved.`,
    },
    claim_rejected: {
      title: 'Claim Rejected',
      message: `Your claim for ${context.itemTitle || 'the item'} was not approved.`,
    },
    default: {
      title: 'Notification',
      message: 'You have a new notification.',
    },
  };
  
  return templates[type] || templates.default;
}

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
      case 'calculate_match_score':
        result = calculateMatchScore(params.lostItem, params.foundItem);
        break;

      case 'semantic_search':
        const { items } = await searchDatabase(supabase, { description: params.query }, 'both');
        result = items;
        break;

      case 'detect_duplicates':
        result = detectDuplicates(params.newItem, params.existingItems);
        break;

      case 'suggest_missing_info':
        result = suggestMissingInfo(params.item);
        break;

      case 'generate_notification':
        result = generateNotification(params.type, params.context);
        break;

      case 'process_new_item':
        const { item } = params;
        const processResult: any = {};

        if (!item.title || !item.description) {
          const ctx: SessionContext = {
            category: item.category,
            location: item.location,
            infoScore: 2,
            conversationTurn: 1,
          };
          const autoPost = generateAutoPost(ctx, 'en');
          processResult.autoTitle = autoPost.title;
          processResult.autoDescription = autoPost.description;
        }

        const { data: existingItems } = await supabase
          .from('items')
          .select('id, title, description, category, location, date_lost_found')
          .eq('item_type', item.item_type)
          .eq('category', item.category)
          .limit(20);

        if (existingItems) {
          processResult.duplicates = detectDuplicates(item, existingItems);
        }

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

        processResult.missingInfo = suggestMissingInfo(item);
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

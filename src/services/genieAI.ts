/**
 * Genie AI Service - Rebuilt with phi3:mini ONLY
 * 
 * CRITICAL: This mirrors the FindIt AI backend logic exactly.
 * Same API flow, same database queries, same model (phi3:mini).
 * 
 * ONLY DIFFERENCE:
 * - Genie personality tone (magical, playful)
 * - Built-in humor presets for common casual inputs
 * 
 * NO QWEN. NO MULTI-MODEL ROUTING.
 */

import { supabase } from '@/integrations/supabase/client';

// Ollama endpoint (local)
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat';
const PHI3_MODEL = 'phi3:mini';

// ============= CATEGORY EXPANSION (same as FindIt AI) =============
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

// ============= INTENT KEYWORDS (same as FindIt AI) =============
const LOST_KEYWORDS = ['lost', 'missing', 'kho gaya', 'kho gayi', 'kho di', 'gum', 'gum ho gaya', 'bhul gaya', 'chhut gaya', 'nahi mil raha', "can't find", 'cannot find', 'left behind', 'misplaced', 'kho', 'mera', 'meri', 'lose'];
const FOUND_KEYWORDS = ['found', 'picked', 'mila', 'mil gaya', 'mil gayi', 'paaya', 'dekha', 'someone left', 'lying', 'unclaimed', 'picked up', 'discovered'];
const HELP_KEYWORDS = ['help', 'how', 'kaise', 'what', 'kya karna', 'guide', 'madad'];
const GREETING_KEYWORDS = ['hello', 'hi', 'hey', 'namaste'];

// Item keywords for extraction
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

// Location keywords
const LOCATION_KEYWORDS = [
  'library', 'canteen', 'cafeteria', 'classroom', 'class', 'lab', 'hostel', 'mess', 'ground',
  'parking', 'bus stop', 'gate', 'corridor', 'washroom', 'auditorium', 'gym', 'office',
  'block', 'building', 'floor', 'room', 'near', 'malad', 'andheri', 'bandra', 'dadar',
  'station', 'mall', 'market', 'park', 'metro', 'railway', 'platform', 'shop', 'restaurant',
  'east', 'west', 'north', 'south', 'nagar', 'colony', 'sector'
];

// ============= BUILT-IN HUMOR PRESETS (Handled locally, no LLM needed) =============
const HUMOR_PRESETS: Record<string, string> = {
  'who are you': '✨ Greetings, curious one! I am the Genie of FindIt – ancient spirit of lost treasures! I grant only one type of wish: helping you find what you\'ve lost. I don\'t grant Ferraris, but I can find your lost car keys! 🔑',
  'who made you': '✨ Ah, you seek the origin story! I was brought to life by Rehan bhai – a wise creator who bound my powers to this magical lamp. My purpose? To reunite seekers with their lost treasures!',
  'tell me a joke': '✨ Why did the lost phone break up with the wallet? Because it found someone with a better case! 📱💔 ...Okay, okay, I\'ll stick to finding items. Comedy is not my strongest spell! 😄',
  'are you real': '✨ Am I real? I am as real as the items you\'ve lost! I exist in the realm between your screen and the cosmic registry of lost things. Touch the lamp and see! 🪔',
  'grant me a wish': '✨ Ah, a wish-seeker! I must be honest – my lamp runs on electricity, not magic smoke. I grant only ONE type of wish: finding lost items. But hey, that\'s better than nothing, right? Now, what have you lost?',
  'hello': '✨ Greetings, seeker! The lamp glows in your presence! I am the Genie of FindIt, guardian of lost treasures. Tell me – what brings you to my mystical realm today?',
  'hi': '✨ Ah, welcome! The cosmic winds foretold your arrival! I am here to help you find what was lost. What treasure do you seek?',
  'hey': '✨ Hey there, adventurer! Ready to embark on a quest to find your lost belongings? Just describe what you\'ve lost, and let the search begin!',
  'namaste': '✨ नमस्ते, खोजी! स्वागत है! मैं FindIt का जीनी हूं। बताओ, क्या खो गया है? 🙏',
  'thank you': '✨ The pleasure is mine, noble seeker! May your belongings always find their way back to you. Return whenever you need my assistance! ✨',
  'thanks': '✨ You\'re most welcome! May the stars guide your lost items home! 🌟',
  'bye': '✨ Farewell, seeker! Remember, whenever you lose something precious, just rub the lamp! I shall await your return. ✨',
  'goodbye': '✨ Until we meet again! May nothing you own ever go missing. But if it does... you know where to find me! 🪔',
  'what can you do': '✨ Excellent question! I possess the power to:\n\n🔍 Search the cosmic registry for lost items\n📦 Help you report found treasures\n🎯 Match lost and found items\n💬 Guide you through the recovery process\n\nTell me what you\'ve lost, and let the magic begin!',
};

// ============= GENIE PERSONALITY WRAPPER =============
// Wraps responses in Genie tone without using another model
function wrapInGenieTone(response: string, isNoResults: boolean = false): string {
  // If already has magical flair, return as-is
  if (response.includes('✨') || response.includes('seeker')) {
    return response;
  }

  if (isNoResults) {
    return `✨ Alas, seeker! The cosmic registry reveals nothing... yet!\n\n${response}\n\nBut fear not – new treasures are reported daily. Shall I help you post your lost item?`;
  }

  // Add Genie prefix to regular responses
  const prefixes = [
    '✨ The stars have spoken! ',
    '✨ Behold, seeker! ',
    '✨ The cosmic registry reveals... ',
    '✨ Ah, the lamp glows with results! ',
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  
  return `${prefix}${response}`;
}

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

// ============= INTENT DETECTION =============
type GenieIntent = 'search' | 'post_found' | 'browse' | 'help' | 'humor' | 'greeting' | 'unknown';

function detectIntent(message: string): { intent: GenieIntent; humorKey?: string } {
  const lowerMsg = message.toLowerCase().trim();
  
  // Check humor presets first (exact or partial match)
  for (const key of Object.keys(HUMOR_PRESETS)) {
    if (lowerMsg.includes(key) || key.includes(lowerMsg)) {
      return { intent: 'humor', humorKey: key };
    }
  }
  
  // Check greetings
  for (const kw of GREETING_KEYWORDS) {
    if (lowerMsg.startsWith(kw) && lowerMsg.length <= 20) {
      return { intent: 'greeting' };
    }
  }
  
  // Check help
  for (const kw of HELP_KEYWORDS) {
    if (lowerMsg.includes(kw)) {
      return { intent: 'help' };
    }
  }
  
  // Lost vs Found
  let lostScore = 0, foundScore = 0;
  for (const kw of LOST_KEYWORDS) {
    if (lowerMsg.includes(kw)) lostScore += 2;
  }
  for (const kw of FOUND_KEYWORDS) {
    if (lowerMsg.includes(kw)) foundScore += 2;
  }
  
  // Check for item keywords
  let hasItem = false;
  for (const keywords of Object.values(ITEM_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) { hasItem = true; break; }
    }
    if (hasItem) break;
  }
  if (hasItem) lostScore++;
  
  if (lostScore > foundScore && lostScore > 0) return { intent: 'search' };
  if (foundScore > lostScore && foundScore > 0) return { intent: 'post_found' };
  if (hasItem) return { intent: 'search' };
  
  return { intent: 'unknown' };
}

// ============= ENTITY EXTRACTION =============
function extractInfo(message: string): {
  category?: string;
  itemName?: string;
  location?: string;
  color?: string;
  brand?: string;
  date?: string;
} {
  const lowerMsg = message.toLowerCase();
  const result: any = {};
  
  // Extract item/category
  for (const [category, keywords] of Object.entries(ITEM_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerMsg.includes(kw)) {
        result.category = category;
        result.itemName = kw;
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
        break;
      }
    }
  }
  
  // Colors
  const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'grey', 'gray', 'pink', 'gold', 'silver', 'kala', 'safed', 'lal', 'neela'];
  for (const color of colors) {
    if (lowerMsg.includes(color)) { result.color = color; break; }
  }
  
  // Brands
  const brands = ['apple', 'samsung', 'xiaomi', 'redmi', 'oneplus', 'oppo', 'vivo', 'realme', 'nokia', 'iphone', 'boat', 'jbl', 'fossil', 'titan', 'casio'];
  for (const brand of brands) {
    if (lowerMsg.includes(brand)) { result.brand = brand; break; }
  }
  
  // Date patterns
  if (/yesterday|kal/i.test(message)) { result.date = 'yesterday'; }
  else if (/today|aaj|abhi/i.test(message)) { result.date = 'today'; }
  
  return result;
}

// ============= DATABASE SEARCH (same as FindIt AI) =============
async function searchDatabase(params: { 
  keyword?: string; 
  location?: string; 
  itemType?: 'lost' | 'found';
}): Promise<{ items: any[], error?: string }> {
  console.log('[GenieAI] Database search params:', params);
  
  const { keyword, location, itemType } = params;
  
  // Expand keyword to all synonyms
  const searchTerms = keyword ? expandCategory(keyword) : [];
  console.log('[GenieAI] Search terms:', searchTerms);
  
  try {
    let query = supabase
      .from('items')
      .select('id, title, description, category, location, item_type, date_lost_found, photos, status, contact_name')
      .eq('status', 'active');
    
    // Apply item type filter (lost people search found, found people search lost)
    if (itemType === 'lost') {
      query = query.eq('item_type', 'found');
    } else if (itemType === 'found') {
      query = query.eq('item_type', 'lost');
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(20);
    
    if (error) {
      console.error('[GenieAI] DB error:', error);
      return { items: [], error: `Database error: ${error.message}` };
    }
    
    let results = data || [];
    
    // Filter by search terms
    if (searchTerms.length > 0) {
      results = results.filter(item => {
        const searchText = `${item.title} ${item.description} ${item.category}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });
    }
    
    // Filter by location
    if (location) {
      const locLower = location.toLowerCase();
      results = results.filter(item => 
        item.location?.toLowerCase().includes(locLower)
      );
    }
    
    console.log('[GenieAI] Found', results.length, 'items');
    return { items: results };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GenieAI] Search error:', errorMsg);
    return { items: [], error: `Search failed: ${errorMsg}` };
  }
}

// ============= CALL OLLAMA (phi3:mini only) =============
async function callPhi3(userMessage: string): Promise<{ response: string; error?: string }> {
  const systemPrompt = `You are a helpful lost & found assistant with a magical, playful personality. You help users find lost items and report found items.

Your style:
- Be warm, mystical, and encouraging
- Use magical expressions like "Ah seeker...", "The cosmic registry reveals..."
- Always be helpful and accurate
- Keep responses concise and focused

When users describe lost/found items, ask for:
1. Location (where lost/found)
2. Distinguishing features (color, brand, marks)

If no matches found, encourage them to post their item.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: PHI3_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: false,
        options: { temperature: 0.7 }
      }),
    });

    if (!response.ok) {
      return { response: '', error: `Phi3 request failed: ${response.status}` };
    }

    const data = await response.json();
    const content = data.message?.content;
    
    if (!content) {
      return { response: '', error: 'Phi3 returned empty response' };
    }
    
    return { response: content };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed';
    return { response: '', error: `Ollama connection error: ${errorMsg}` };
  }
}

// ============= FORMAT SEARCH RESULTS FOR DISPLAY =============
function formatResults(items: any[], lang: 'hi' | 'en'): string {
  if (!items || items.length === 0) {
    return lang === 'hi' 
      ? 'Abhi koi match nahi mila.\n\nKya karein:\n• Search refine karo (brand/color add karo)\n• Apna item post karo\n• Baad mein check karo'
      : 'No matches found yet.\n\nNext steps:\n• Refine search (add brand/color)\n• Post your lost item\n• Check back later';
  }

  const intro = lang === 'hi' ? `${items.length} items mile:` : `Found ${items.length} matching items:`;
  
  const itemList = items.slice(0, 5).map((item, i) => {
    const type = item.item_type === 'lost' ? '🔴 Lost' : '🟢 Found';
    return `\n${i + 1}. **${item.title}** ${type}\n   📍 ${item.location}\n   📅 ${item.date_lost_found}`;
  }).join('\n');

  const suffix = lang === 'hi' 
    ? '\n\n✅ "View Details" click karke details dekho.' 
    : '\n\n✅ Click "View Details" to see full information.';

  return intro + itemList + suffix;
}

// ============= MAIN GENIE CHAT FUNCTION =============
export async function genieChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ 
  response: string; 
  items?: any[];
  error?: string;
}> {
  const lang = detectLanguage(message);
  const { intent, humorKey } = detectIntent(message);
  
  console.log('[GenieAI] Intent:', intent, 'Language:', lang, 'Message:', message);
  
  // 1. Handle humor presets (NO LLM needed)
  if (intent === 'humor' && humorKey) {
    console.log('[GenieAI] Humor preset triggered:', humorKey);
    return { response: HUMOR_PRESETS[humorKey] };
  }
  
  // 2. Handle greetings (NO LLM needed)
  if (intent === 'greeting') {
    return { 
      response: lang === 'hi' 
        ? '✨ नमस्ते, खोजी! मैं FindIt का जीनी हूं!\n\nमैं मदद कर सकता हूं:\n• खोई हुई चीज़ें ढूंढना\n• मिली हुई चीज़ें report करना\n\nबताओ, क्या खोया है?'
        : '✨ Greetings, seeker! I am the Genie of FindIt!\n\nI can help you:\n• Search for lost items\n• Report found items\n\nWhat have you lost or found?'
    };
  }
  
  // 3. Handle help (NO LLM needed)
  if (intent === 'help') {
    return {
      response: lang === 'hi'
        ? '✨ मैं आपका Lost & Found Genie हूं!\n\n🔍 खोया कुछ? बस बताओ क्या और कहाँ\n📦 कुछ मिला? Report करने में मदद करूंगा\n\nExample: "kal library mein mera phone kho gaya"'
        : '✨ I am your Lost & Found Genie!\n\n🔍 Lost something? Just tell me what and where\n📦 Found something? I\'ll help you report it\n\nExample: "I lost my black phone in the library yesterday"'
    };
  }
  
  // 4. Handle search queries (DATABASE + OPTIONAL LLM)
  if (intent === 'search' || intent === 'post_found') {
    const extracted = extractInfo(message);
    console.log('[GenieAI] Extracted info:', extracted);
    
    // If we have a category, search immediately
    if (extracted.category || extracted.location) {
      const { items, error } = await searchDatabase({
        keyword: extracted.category || extracted.itemName,
        location: extracted.location,
        itemType: intent === 'search' ? 'lost' : 'found'
      });
      
      if (error) {
        return { response: `⚠️ ${error}. Please try again.`, error };
      }
      
      const resultText = formatResults(items, lang);
      return { 
        response: wrapInGenieTone(resultText, items.length === 0),
        items 
      };
    }
    
    // Need more info - ask for location/details
    const askDetails = lang === 'hi'
      ? `✨ Samjha – ${extracted.category || 'item'} dhundh rahe ho!\n\nSearch narrow karne ke liye batao:\n1. Kahan khoya/mila?\n2. Koi identifying marks (color, brand)?`
      : `✨ Understood – searching for ${extracted.category || 'your item'}!\n\nTo narrow the search, please tell me:\n1. Where did you lose/find it?\n2. Any identifying features (color, brand)?`;
    
    return { response: askDetails };
  }
  
  // 5. Unknown intent - use phi3 for natural conversation OR ask to clarify
  if (intent === 'unknown') {
    // Try phi3 for natural conversation
    const { response, error } = await callPhi3(message);
    
    if (error) {
      console.error('[GenieAI] Phi3 error:', error);
      // Fallback to static response
      return { 
        response: lang === 'hi'
          ? '✨ Hmm, samajh nahi aaya. Kya aapne kuch khoya hai ya kuch mila?\n\nExample: "mera phone kho gaya"'
          : '✨ Hmm, I\'m not sure what you mean. Did you lose something or find something?\n\nExample: "I lost my phone"',
        error 
      };
    }
    
    return { response: wrapInGenieTone(response) };
  }
  
  // Fallback
  return { 
    response: lang === 'hi'
      ? '✨ Kya aapne kuch khoya hai ya mila? Batao, main search karunga!'
      : '✨ Did you lose something or find something? Tell me and I\'ll search!'
  };
}

// ============= CONNECTION CHECK =============
export async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

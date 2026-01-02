import { supabase } from "@/integrations/supabase/client";

const AI_FUNCTION_URL = "https://dmarkaigzovaqwpigtxe.supabase.co/functions/v1/ai-assistant";

interface AIResponse<T> {
  data: T | null;
  error: string | null;
}

async function callAI<T>(action: string, params: Record<string, any>): Promise<AIResponse<T>> {
  try {
    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.error || 'AI request failed' };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('AI Assistant error:', error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Conversation context from the investigator flow
export interface ConversationContext {
  intent: 'search' | 'post_lost' | 'post_found' | 'refine' | 'help' | 'claim' | 'unknown';
  missingFields: string[];
  clarifyingQuestions: string[];
  matches: MatchResult[];
  recommendedAction: string;
  aiUsed?: boolean;
  sessionContext?: SessionContext;
  autoPost?: AutoPost;
  needsLocation?: boolean;
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

export interface AutoPost {
  title: string;
  description: string;
  category: string;
  location: string;
  itemType: 'lost' | 'found';
  canGenerate: boolean;
  missingFields: string[];
}

export interface MatchResult {
  item: any;
  confidence: number;
  reasoning: string;
  rank: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Main chat function - uses full investigator flow with session context
export async function chat(
  message: string,
  history: ChatMessage[] = [],
  sessionContext?: SessionContext
): Promise<AIResponse<{
  response: string;
  context: ConversationContext;
}>> {
  return callAI('chat', { message, history, sessionContext });
}

// Calculate match score between items
export async function calculateMatchScore(
  lostItem: any,
  foundItem: any
): Promise<AIResponse<{ score: number; reasoning: string; textSimilarity: number; locationProximity: number }>> {
  return callAI('calculate_match_score', { lostItem, foundItem });
}

// Semantic search
export async function semanticSearch(query: string, items: any[]): Promise<AIResponse<any[]>> {
  return callAI('semantic_search', { query, items });
}

// Smart autocomplete
export async function getAutocomplete(query: string, context?: string): Promise<AIResponse<string[]>> {
  // Simple client-side autocomplete for common items
  const suggestions = [
    'phone', 'wallet', 'bag', 'keys', 'laptop', 'watch', 'glasses', 
    'earphones', 'charger', 'bottle', 'umbrella', 'card', 'ring'
  ];
  
  const lowerQuery = query.toLowerCase();
  const matches = suggestions.filter(s => s.includes(lowerQuery));
  
  return { data: matches.slice(0, 5), error: null };
}

// Generate notification
export async function generateNotification(
  type: string,
  context: any
): Promise<AIResponse<{ title: string; message: string }>> {
  return callAI('generate_notification', { type, context });
}

// Process new item (comprehensive)
export async function processNewItem(item: any): Promise<AIResponse<{
  tags?: string[];
  objects?: string[];
  autoTitle?: string;
  autoDescription?: string;
  duplicates?: any[];
  matches?: any[];
  missingInfo?: string[];
}>> {
  return callAI('process_new_item', { item });
}

// Trigger webhook processing for a new item
export async function triggerItemWebhook(item: any): Promise<AIResponse<{ success: boolean }>> {
  return callAI('webhook_new_item', { item });
}

// Fetch AI notifications for current user
export async function fetchAINotifications() {
  const { data, error } = await supabase
    .from('ai_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return { data, error };
}

// Mark AI notification as sent/read
export async function markAINotificationSent(notificationId: string) {
  const { error } = await supabase
    .from('ai_notifications')
    .update({ sent: true })
    .eq('id', notificationId);

  return { error };
}

// Fetch AI match suggestions for user's items
export async function fetchAIMatchSuggestions() {
  const { data: userItems } = await supabase
    .from('items')
    .select('id');

  if (!userItems || userItems.length === 0) {
    return { data: [], error: null };
  }

  const itemIds = userItems.map(i => i.id);

  const { data, error } = await supabase
    .from('ai_match_suggestions')
    .select(`
      *,
      lost_item:lost_item_id(id, title, description, photos, category, location),
      found_item:found_item_id(id, title, description, photos, category, location)
    `)
    .or(`lost_item_id.in.(${itemIds.join(',')}),found_item_id.in.(${itemIds.join(',')})`)
    .gte('ai_score', 40)
    .order('ai_score', { ascending: false });

  return { data, error };
}

// Fetch AI tags for an item
export async function fetchAITags(itemId: string) {
  const { data, error } = await supabase
    .from('ai_tags')
    .select('*')
    .eq('item_id', itemId)
    .single();

  return { data, error };
}

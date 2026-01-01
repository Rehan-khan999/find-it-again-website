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

// Image tagging and object recognition
export async function analyzeImage(imageUrl: string): Promise<AIResponse<{ tags: string[], objects: string[] }>> {
  return callAI('analyze_image', { imageUrl });
}

// Auto-generate title and description
export async function generateTitleDescription(context: {
  tags: string[];
  objects: string[];
  category: string;
  location: string;
}): Promise<AIResponse<{ title: string; description: string }>> {
  return callAI('generate_title_description', context);
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
  return callAI('autocomplete', { query, context });
}

// Duplicate detection
export async function detectDuplicates(newItem: any, existingItems: any[]): Promise<AIResponse<any[]>> {
  return callAI('detect_duplicates', { newItem, existingItems });
}

// Intent clarification
export async function clarifyIntent(query: string): Promise<AIResponse<{
  intent: string;
  suggestions: string[];
  clarification: string;
}>> {
  return callAI('clarify_intent', { query });
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

// Suggest missing info
export async function suggestMissingInfo(item: any): Promise<AIResponse<string[]>> {
  return callAI('suggest_missing_info', { item });
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

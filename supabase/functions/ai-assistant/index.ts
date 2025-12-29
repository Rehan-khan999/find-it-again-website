import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_TOKEN = Deno.env.get('HF_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Mistral model endpoint
const MISTRAL_API = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';

async function callMistral(prompt: string, maxTokens = 500): Promise<string> {
  console.log('Calling Mistral with prompt:', prompt.substring(0, 100) + '...');
  
  const response = await fetch(MISTRAL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Mistral API error:', error);
    throw new Error(`Mistral API error: ${error}`);
  }

  const result = await response.json();
  console.log('Mistral response:', JSON.stringify(result).substring(0, 200));
  
  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text.trim();
  }
  
  throw new Error('Unexpected response format from Mistral');
}

// Image tagging using CLIP via HuggingFace
async function analyzeImage(imageUrl: string): Promise<{ tags: string[], objects: string[] }> {
  console.log('Analyzing image:', imageUrl);
  
  // Use BLIP for image captioning
  const blipResponse = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: imageUrl }),
  });

  let caption = '';
  if (blipResponse.ok) {
    const blipResult = await blipResponse.json();
    caption = blipResult[0]?.generated_text || '';
    console.log('Image caption:', caption);
  }

  // Use object detection
  const detectionResponse = await fetch('https://api-inference.huggingface.co/models/facebook/detr-resnet-50', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: imageUrl }),
  });

  let objects: string[] = [];
  if (detectionResponse.ok) {
    const detectionResult = await detectionResponse.json();
    if (Array.isArray(detectionResult)) {
      objects = [...new Set(detectionResult.map((d: any) => d.label).filter(Boolean))];
    }
    console.log('Detected objects:', objects);
  }

  // Generate tags from caption using Mistral
  const tagsPrompt = `<s>[INST] Based on this image description: "${caption}"
Objects detected: ${objects.join(', ')}

Generate 5-10 relevant tags for a lost and found item database. Return ONLY a comma-separated list of tags, nothing else. [/INST]`;

  const tagsResponse = await callMistral(tagsPrompt, 100);
  const tags = tagsResponse.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

  return { tags, objects };
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

  const response = await callMistral(prompt, 150);
  
  const titleMatch = response.match(/TITLE:\s*(.+?)(?:\n|DESCRIPTION:)/i);
  const descMatch = response.match(/DESCRIPTION:\s*(.+)/i);
  
  return {
    title: titleMatch?.[1]?.trim() || 'Item Found/Lost',
    description: descMatch?.[1]?.trim() || 'Please provide more details about this item.',
  };
}

// Calculate match score between two items
async function calculateMatchScore(lostItem: any, foundItem: any): Promise<{ score: number, reasoning: string, textSimilarity: number, locationProximity: number }> {
  const prompt = `<s>[INST] Compare these two items and determine if they might be a match:

LOST ITEM:
- Title: ${lostItem.title}
- Description: ${lostItem.description}
- Category: ${lostItem.category}
- Location: ${lostItem.location}
- Date: ${lostItem.date_lost_found}

FOUND ITEM:
- Title: ${foundItem.title}
- Description: ${foundItem.description}
- Category: ${foundItem.category}
- Location: ${foundItem.location}
- Date: ${foundItem.date_lost_found}

Respond in this exact format:
SCORE: [0-100 match percentage]
TEXT_SIMILARITY: [0-100]
LOCATION_PROXIMITY: [0-100]
REASONING: [brief explanation of why these items might or might not be a match] [/INST]`;

  const response = await callMistral(prompt, 200);
  
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

  const response = await callMistral(prompt, 200);
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

  const response = await callMistral(prompt, 100);
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

  const response = await callMistral(prompt, 100);
  
  if (response.toUpperCase().includes('NONE')) return [];
  
  const ids = response.split(',').map(id => id.trim()).filter(id => id);
  return existingItems.filter(item => ids.includes(item.id));
}

// Intent clarification
async function clarifyIntent(userQuery: string): Promise<{ intent: string, suggestions: string[], clarification: string }> {
  const prompt = `<s>[INST] Analyze this user query for a lost and found website:

Query: "${userQuery}"

Determine:
1. The user's intent (lost_item, found_item, search, claim, question)
2. If the query is unclear, suggest clarifying questions
3. Provide helpful suggestions

Respond in this exact format:
INTENT: [intent type]
CLARIFICATION: [question to ask user if query is unclear, or "CLEAR" if understood]
SUGGESTIONS: [comma-separated list of helpful next steps] [/INST]`;

  const response = await callMistral(prompt, 200);
  
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

  const response = await callMistral(prompt, 150);
  
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

  const response = await callMistral(prompt, 100);
  
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

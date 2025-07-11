
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  type: string;
  userId: string;
  title: string;
  message: string;
  relatedItemId?: string;
}

export const sendNotification = async (notificationData: NotificationData) => {
  try {
    const { data, error } = await supabase.functions.invoke('notify-users', {
      body: notificationData
    });

    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
};

export const findPotentialMatches = async (itemId: string) => {
  try {
    // Get the current item details
    const { data: currentItem, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    // Find opposite type items in similar categories and locations
    const oppositeType = currentItem.item_type === 'lost' ? 'found' : 'lost';
    
    const { data: potentialMatches, error: matchError } = await supabase
      .from('items')
      .select('*')
      .eq('item_type', oppositeType)
      .eq('category', currentItem.category)
      .eq('status', 'active')
      .neq('user_id', currentItem.user_id);

    if (matchError) throw matchError;

    // Create match records and send notifications
    for (const match of potentialMatches || []) {
      // Create match record
      const { error: matchRecordError } = await supabase
        .from('matches')
        .insert({
          lost_item_id: currentItem.item_type === 'lost' ? currentItem.id : match.id,
          found_item_id: currentItem.item_type === 'found' ? currentItem.id : match.id,
          status: 'pending',
          similarity_score: 0.8 // Basic scoring based on category match
        });

      if (matchRecordError) {
        console.error('Error creating match record:', matchRecordError);
        continue;
      }

      // Send notification
      await sendNotification({
        type: 'match',
        userId: match.user_id,
        title: 'Potential Match Found!',
        message: `A ${currentItem.item_type} item similar to your ${match.item_type} "${match.title}" has been posted.`,
        relatedItemId: currentItem.id
      });
    }

    return potentialMatches;
  } catch (error) {
    console.error('Error finding potential matches:', error);
    throw error;
  }
};

export const notifyNearbyUsers = async (itemId: string) => {
  try {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError) throw itemError;

    if (!item.latitude || !item.longitude) return;

    // Find users with items in the same general area (rough proximity)
    const { data: nearbyItems, error: nearbyError } = await supabase
      .from('items')
      .select('user_id, title')
      .neq('user_id', item.user_id)
      .eq('status', 'active')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (nearbyError) throw nearbyError;

    // Get unique user IDs
    const uniqueUserIds = [...new Set(nearbyItems?.map(i => i.user_id) || [])];

    // Send notifications to nearby users
    for (const userId of uniqueUserIds) {
      await sendNotification({
        type: 'nearby',
        userId,
        title: `New ${item.item_type} item posted nearby`,
        message: `"${item.title}" has been posted in ${item.location}`,
        relatedItemId: item.id
      });
    }

  } catch (error) {
    console.error('Error notifying nearby users:', error);
  }
};

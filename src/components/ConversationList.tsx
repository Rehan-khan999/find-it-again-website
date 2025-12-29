import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from './UserAvatar';

interface Conversation {
  other_user_id: string;
  user_name: string;
  user_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface ConversationListProps {
  selectedUserId?: string;
  onSelectConversation: (userId: string, userName: string) => void;
}

export const ConversationList = ({ selectedUserId, onSelectConversation }: ConversationListProps) => {
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_conversations', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
          <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
          <p className="text-muted-foreground text-sm">
            Start a conversation by contacting someone about their lost or found items.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-0">
        <div className="space-y-0">
          {conversations.map((conversation) => (
            <div
              key={conversation.other_user_id}
              className={cn(
                "flex items-center space-x-3 p-4 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 transition-colors",
                selectedUserId === conversation.other_user_id && "bg-muted"
              )}
              onClick={() => onSelectConversation(conversation.other_user_id, conversation.user_name)}
            >
              <UserAvatar 
                userId={conversation.other_user_id} 
                userName={conversation.user_name}
                size="md"
                clickable={true}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm truncate">
                    {conversation.user_name || conversation.user_email}
                  </h4>
                  {conversation.unread_count > 0 && (
                    <Badge variant="secondary" className="ml-2 px-2 py-1 text-xs">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {conversation.last_message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conversation.last_message_time).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
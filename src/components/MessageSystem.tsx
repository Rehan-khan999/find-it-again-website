import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export const MessageSystem = () => {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  if (!user) {
    return (
      <Card className="h-[600px]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sign in to access messages</h3>
            <p className="text-muted-foreground">
              You need to be signed in to view and send messages.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSelectConversation = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Conversations List */}
      <div className="lg:col-span-1">
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <MessageCircle className="w-5 h-5 text-primary" />
            Conversations
          </h2>
        </div>
        <ConversationList
          selectedUserId={selectedUserId}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      
      {/* Chat Window */}
      <div className="lg:col-span-2">
        {selectedUserId ? (
          <ChatWindow
            otherUserId={selectedUserId}
            otherUserName={selectedUserName}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start messaging.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
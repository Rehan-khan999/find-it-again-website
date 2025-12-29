import { MessageSystem } from "@/components/MessageSystem";

const Messages = () => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-2">Connect with other users about found and lost items</p>
        </div>
        <MessageSystem />
      </div>
    </div>
  );
};

export default Messages;

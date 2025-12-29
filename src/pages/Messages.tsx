import { MessageSystem } from "@/components/MessageSystem";

const Messages = () => {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

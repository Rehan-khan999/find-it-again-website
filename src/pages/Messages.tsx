import { MessageSystem } from "@/components/MessageSystem";

const Messages = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-2">Connect with other users about found and lost items</p>
        </div>
        <MessageSystem />
      </div>
    </div>
  );
};

export default Messages;
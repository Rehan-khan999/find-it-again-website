import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AIAssistant } from './AIAssistant';

export const AIAssistantButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-50 h-auto w-auto px-4 py-3 rounded-2xl shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 hover:shadow-xl flex flex-col items-center gap-0.5"
          aria-label="Open AI Assistant"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <span className="text-lg font-bold leading-none tracking-tight">AI</span>
              <span className="text-[10px] font-medium leading-none opacity-90">Assistant</span>
            </>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0">
        <div className="h-full">
          <AIAssistant />
        </div>
      </SheetContent>
    </Sheet>
  );
};

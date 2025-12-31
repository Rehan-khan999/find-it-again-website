import { useEffect, useCallback } from 'react';

type TabType = 'lost' | 'found';

// Custom event for AI-driven tab switching
const AI_TAB_SWITCH_EVENT = 'ai-tab-switch';

interface AITabSwitchDetail {
  tab: TabType;
  searchContext: 'lost' | 'found'; // What type of items to search in DB
}

// Hook for components that want to listen for tab changes (Browse page)
export function useAITabListener(onTabSwitch: (tab: TabType) => void) {
  useEffect(() => {
    const handler = (event: CustomEvent<AITabSwitchDetail>) => {
      onTabSwitch(event.detail.tab);
    };

    window.addEventListener(AI_TAB_SWITCH_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(AI_TAB_SWITCH_EVENT, handler as EventListener);
    };
  }, [onTabSwitch]);
}

// Hook for components that want to trigger tab changes (AI Assistant)
export function useAITabController() {
  const switchTab = useCallback((intent: string) => {
    // Based on intent, determine which tab to show and what to search
    // LOST_ITEM intent: User lost something -> Show Lost tab, search Found items
    // FOUND_ITEM intent: User found something -> Show Found tab, search Lost items
    
    let tabToShow: TabType;
    let searchContext: 'lost' | 'found';

    if (intent === 'search' || intent === 'post_lost') {
      // User is looking for their lost item
      // Show Lost Items tab (so they see context of lost items)
      // But AI will search Found items to find matches
      tabToShow = 'lost';
      searchContext = 'found';
    } else if (intent === 'post_found') {
      // User found something
      // Show Found Items tab
      // AI will search Lost items to find owner
      tabToShow = 'found';
      searchContext = 'lost';
    } else {
      // Default - don't change tabs
      return;
    }

    const event = new CustomEvent<AITabSwitchDetail>(AI_TAB_SWITCH_EVENT, {
      detail: { tab: tabToShow, searchContext }
    });
    
    window.dispatchEvent(event);
  }, []);

  return { switchTab };
}

// Store last detected intent for reference
let lastDetectedIntent: string | null = null;

export function setLastIntent(intent: string) {
  lastDetectedIntent = intent;
  sessionStorage.setItem('ai_last_intent', intent);
}

export function getLastIntent(): string | null {
  return lastDetectedIntent || sessionStorage.getItem('ai_last_intent');
}

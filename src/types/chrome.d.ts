declare namespace chrome {
  export const runtime: {
    sendMessage: (message: any, callback: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => void) => void;
    };
    lastError?: {
      message: string;
    };
    
  };

  export const storage: {
    local: {
      get: (keys: string | string[] | Record<string, any>, callback: (items: Record<string, any>) => void) => void;
      set: (items: Record<string, any>, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
  };

  export const tabs: {
    query: (
      queryInfo: {
        active?: boolean;
        currentWindow?: boolean;
        url?: string | string[]; // Add url filter here
        windowId?: number;
        index?: number;
      },
      callback: (result: Array<{ id?: number; url?: string; [key: string]: any }>) => void
    ) => void;
  
    sendMessage: (
      tabId: number,
      message: any,
      callback?: (response: any) => void
    ) => void;
    create: (
      createProperties: { url: string; active?: boolean },
      callback?: (tab: { id?: number; [key: string]: any }) => void
    ) => void;
    update: (
      tabId: number,
      updateProperties: { active?: boolean; url?: string },
      callback?: (tab?: { id?: number; [key: string]: any }) => void
    ) => void; // Added update method

    reload: (tabId?: number, reloadProperties?: { bypassCache?: boolean }) => void;
  };
}



interface Window {
  chrome: typeof chrome;
}
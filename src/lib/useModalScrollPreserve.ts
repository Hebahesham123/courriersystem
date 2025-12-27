import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook to preserve scroll position inside modal cards and other scrollable containers
 * @param key - Unique key for this modal/container (e.g., 'orders-modal', 'requests-card')
 * @param options - Configuration options
 */
export function useModalScrollPreserve(
  key: string,
  options: {
    persistToLocalStorage?: boolean;
    restoreDelay?: number;
    saveOnScroll?: boolean;
    autoRestore?: boolean;
  } = {}
) {
  const {
    persistToLocalStorage = true,
    restoreDelay = 150,
    saveOnScroll = true,
    autoRestore = true
  } = options;

  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    if (!autoRestore) return;

    const restoreScroll = () => {
      try {
        // Try sessionStorage first (for same session)
        let saved = sessionStorage.getItem(`modal-scroll:${key}`);
        
        // If not in sessionStorage and persistToLocalStorage is true, try localStorage
        if (!saved && persistToLocalStorage) {
          saved = localStorage.getItem(`modal-scroll:${key}`);
        }
        
        if (containerRef.current && saved) {
          const position = parseInt(saved, 10);
          setScrollPosition(position);
          
          // Use setTimeout to ensure DOM is fully rendered
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = position;
            }
          }, restoreDelay);
        }
      } catch (error) {
        console.warn(`Failed to restore modal scroll position for ${key}:`, error);
      }
    };

    // Restore immediately if ref is available
    if (containerRef.current) {
      restoreScroll();
    } else {
      // Wait for ref to be available
      const timer = setTimeout(restoreScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [key, persistToLocalStorage, restoreDelay, autoRestore]);

  // Save scroll position on scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current && saveOnScroll) {
      const position = containerRef.current.scrollTop;
      setScrollPosition(position);
      
      try {
        // Always save to sessionStorage for current session
        sessionStorage.setItem(`modal-scroll:${key}`, String(position));
        
        // Optionally save to localStorage for persistence across sessions
        if (persistToLocalStorage) {
          localStorage.setItem(`modal-scroll:${key}`, String(position));
        }
      } catch (error) {
        console.warn(`Failed to save modal scroll position for ${key}:`, error);
      }
    }
  }, [key, persistToLocalStorage, saveOnScroll]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container && saveOnScroll) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, saveOnScroll]);

  // Save scroll position before page unload or modal close
  useEffect(() => {
    const save = () => {
      if (containerRef.current) {
        try {
          const position = containerRef.current.scrollTop;
          sessionStorage.setItem(`modal-scroll:${key}`, String(position));
          
          if (persistToLocalStorage) {
            localStorage.setItem(`modal-scroll:${key}`, String(position));
          }
        } catch (error) {
          console.warn(`Failed to save modal scroll position before unload for ${key}:`, error);
        }
      }
    };

    // Save on page unload
    window.addEventListener("beforeunload", save);
    window.addEventListener("pagehide", save);
    
    // Save on visibility change (when user switches tabs)
    document.addEventListener("visibilitychange", save);
    
    return () => {
      save(); // Save current position
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, [key, persistToLocalStorage]);

  // Function to manually restore scroll position
  const restoreScroll = useCallback(() => {
    try {
      let saved = sessionStorage.getItem(`modal-scroll:${key}`);
      
      if (!saved && persistToLocalStorage) {
        saved = localStorage.getItem(`modal-scroll:${key}`);
      }
      
      if (containerRef.current && saved) {
        const position = parseInt(saved, 10);
        containerRef.current.scrollTop = position;
        setScrollPosition(position);
        return true;
      }
    } catch (error) {
      console.warn(`Failed to manually restore modal scroll position for ${key}:`, error);
    }
    return false;
  }, [key, persistToLocalStorage]);

  // Function to manually reset scroll
  const resetScroll = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollPosition(0);
      
      // Clear saved positions
      sessionStorage.removeItem(`modal-scroll:${key}`);
      if (persistToLocalStorage) {
        localStorage.removeItem(`modal-scroll:${key}`);
      }
    }
  }, [key, persistToLocalStorage]);

  // Function to scroll to specific position
  const scrollTo = useCallback((position: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = position;
      setScrollPosition(position);
    }
  }, []);

  // Function to scroll to top
  const scrollToTop = useCallback(() => {
    scrollTo(0);
  }, [scrollTo]);

  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      const position = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      scrollTo(position);
    }
  }, [scrollTo]);

  return {
    scrollPosition,
    containerRef,
    restoreScroll,
    resetScroll,
    scrollTo,
    scrollToTop,
    scrollToBottom,
    // Check if scroll position is saved
    hasSavedPosition: () => {
      try {
        return !!(sessionStorage.getItem(`modal-scroll:${key}`) || 
                 (persistToLocalStorage && localStorage.getItem(`modal-scroll:${key}`)));
      } catch {
        return false;
      }
    }
  };
}

/**
 * Hook for preserving scroll position in any scrollable container with automatic cleanup
 * @param key - Unique key for this container
 * @param containerRef - Ref to the scrollable container
 * @param options - Configuration options
 */
export function useContainerScrollPreserve(
  key: string,
  containerRef: React.RefObject<HTMLElement>,
  options: {
    persistToLocalStorage?: boolean;
    restoreDelay?: number;
    saveOnScroll?: boolean;
    autoRestore?: boolean;
  } = {}
) {
  const {
    persistToLocalStorage = true,
    restoreDelay = 150,
    saveOnScroll = true,
    autoRestore = true
  } = options;

  const [scrollPosition, setScrollPosition] = useState(0);

  // Restore scroll position on mount
  useEffect(() => {
    if (!autoRestore || !containerRef.current) return;

    const restoreScroll = () => {
      try {
        let saved = sessionStorage.getItem(`container-scroll:${key}`);
        
        if (!saved && persistToLocalStorage) {
          saved = localStorage.getItem(`container-scroll:${key}`);
        }
        
        if (containerRef.current && saved) {
          const position = parseInt(saved, 10);
          setScrollPosition(position);
          
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = position;
            }
          }, restoreDelay);
        }
      } catch (error) {
        console.warn(`Failed to restore container scroll position for ${key}:`, error);
      }
    };

    // Wait for container to be available
    const timer = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timer);
  }, [key, containerRef, persistToLocalStorage, restoreDelay, autoRestore]);

  // Save scroll position on scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current && saveOnScroll) {
      const position = containerRef.current.scrollTop;
      setScrollPosition(position);
      
      try {
        sessionStorage.setItem(`container-scroll:${key}`, String(position));
        
        if (persistToLocalStorage) {
          localStorage.setItem(`container-scroll:${key}`, String(position));
        }
      } catch (error) {
        console.warn(`Failed to save container scroll position for ${key}:`, error);
      }
    }
  }, [key, containerRef, persistToLocalStorage, saveOnScroll]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container && saveOnScroll) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, saveOnScroll]);

  // Save scroll position before page unload
  useEffect(() => {
    const save = () => {
      if (containerRef.current) {
        try {
          const position = containerRef.current.scrollTop;
          sessionStorage.setItem(`container-scroll:${key}`, String(position));
          
          if (persistToLocalStorage) {
            localStorage.setItem(`container-scroll:${key}`, String(position));
          }
        } catch (error) {
          console.warn(`Failed to save container scroll position before unload for ${key}:`, error);
        }
      }
    };

    window.addEventListener("beforeunload", save);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", save);
    
    return () => {
      save();
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, [key, containerRef, persistToLocalStorage]);

  // Function to manually restore scroll
  const restoreScroll = useCallback(() => {
    try {
      let saved = sessionStorage.getItem(`container-scroll:${key}`);
      
      if (!saved && persistToLocalStorage) {
        saved = localStorage.getItem(`container-scroll:${key}`);
      }
      
      if (containerRef.current && saved) {
        const position = parseInt(saved, 10);
        containerRef.current.scrollTop = position;
        setScrollPosition(position);
        return true;
      }
    } catch (error) {
      console.warn(`Failed to manually restore container scroll position for ${key}:`, error);
    }
    return false;
  }, [key, containerRef, persistToLocalStorage]);

  // Function to reset scroll
  const resetScroll = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollPosition(0);
      
      sessionStorage.removeItem(`container-scroll:${key}`);
      if (persistToLocalStorage) {
        localStorage.removeItem(`container-scroll:${key}`);
      }
    }
  }, [key, containerRef, persistToLocalStorage]);

  return {
    scrollPosition,
    restoreScroll,
    resetScroll,
    hasSavedPosition: () => {
      try {
        return !!(sessionStorage.getItem(`container-scroll:${key}`) || 
                 (persistToLocalStorage && localStorage.getItem(`container-scroll:${key}`)));
      } catch {
        return false;
      }
    }
  };
}


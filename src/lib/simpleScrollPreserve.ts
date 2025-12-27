import { useEffect, useRef, useCallback } from "react";

/**
 * Simple, reliable scroll position preservation for any container
 * This hook automatically saves and restores scroll position
 */
export function useSimpleScrollPreserve(key: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Save scroll position whenever it changes
  const saveScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const position = containerRef.current.scrollTop;
      try {
        // Save to both sessionStorage and localStorage for reliability
        sessionStorage.setItem(`scroll-${key}`, String(position));
        localStorage.setItem(`scroll-${key}`, String(position));
      } catch (error) {
        console.warn('Failed to save scroll position:', error);
      }
    }
  }, [key]);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (containerRef.current) {
      try {
        // Try sessionStorage first, then localStorage
        let savedPosition = sessionStorage.getItem(`scroll-${key}`);
        if (!savedPosition) {
          savedPosition = localStorage.getItem(`scroll-${key}`);
        }
        
        if (savedPosition) {
          const position = parseInt(savedPosition, 10);
          if (!isNaN(position)) {
            // Use multiple attempts to ensure it works
            containerRef.current.scrollTop = position;
            
            // Try again after a short delay to ensure content is loaded
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = position;
              }
            }, 100);
            
            // Try one more time after content is fully rendered
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = position;
              }
            }, 500);
          }
        }
      } catch (error) {
        console.warn('Failed to restore scroll position:', error);
      }
    }
  }, [key]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Save on scroll
      const handleScroll = () => {
        saveScrollPosition();
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Save on mouse wheel
      const handleWheel = () => {
        setTimeout(saveScrollPosition, 50);
      };
      
      container.addEventListener('wheel', handleWheel, { passive: true });
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [saveScrollPosition]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition();
      }
    };
    
    const handlePageHide = () => {
      saveScrollPosition();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveScrollPosition]);

  // Restore scroll position when component mounts
  useEffect(() => {
    // Wait for the next tick to ensure DOM is ready
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [restoreScrollPosition]);

  // Also restore when the ref becomes available
  useEffect(() => {
    if (containerRef.current) {
      // Wait a bit more for content to load
      const timer = setTimeout(() => {
        restoreScrollPosition();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [restoreScrollPosition]);

  // Function to manually restore scroll
  const restoreNow = useCallback(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  // Function to reset scroll
  const resetScroll = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      try {
        sessionStorage.removeItem(`scroll-${key}`);
        localStorage.removeItem(`scroll-${key}`);
      } catch (error) {
        console.warn('Failed to clear scroll position:', error);
      }
    }
  }, [key]);

  return {
    containerRef,
    restoreNow,
    resetScroll,
    // Check if scroll position is saved
    hasSavedPosition: () => {
      try {
        return !!(sessionStorage.getItem(`scroll-${key}`) || localStorage.getItem(`scroll-${key}`));
      } catch {
        return false;
      }
    }
  };
}

/**
 * Enhanced scroll preservation with better timing control
 */
export function useEnhancedScrollPreserve(key: string, options: {
  restoreDelay?: number;
  maxRestoreAttempts?: number;
} = {}) {
  const {
    restoreDelay = 100,
    maxRestoreAttempts = 5
  } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreAttempts = useRef(0);

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const position = containerRef.current.scrollTop;
      try {
        sessionStorage.setItem(`scroll-${key}`, String(position));
        localStorage.setItem(`scroll-${key}`, String(position));
      } catch (error) {
        console.warn('Failed to save scroll position:', error);
      }
    }
  }, [key]);

  // Restore scroll position with multiple attempts
  const restoreScrollPosition = useCallback(() => {
    if (containerRef.current && restoreAttempts.current < maxRestoreAttempts) {
      try {
        let savedPosition = sessionStorage.getItem(`scroll-${key}`);
        if (!savedPosition) {
          savedPosition = localStorage.getItem(`scroll-${key}`);
        }
        
        if (savedPosition) {
          const position = parseInt(savedPosition, 10);
          if (!isNaN(position)) {
            containerRef.current.scrollTop = position;
            restoreAttempts.current++;
            
            // Try again if not at the right position
            setTimeout(() => {
              if (containerRef.current && containerRef.current.scrollTop !== position) {
                containerRef.current.scrollTop = position;
              }
            }, restoreDelay);
          }
        }
      } catch (error) {
        console.warn('Failed to restore scroll position:', error);
      }
    }
  }, [key, restoreDelay, maxRestoreAttempts]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleScroll = () => {
        saveScrollPosition();
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [saveScrollPosition]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveScrollPosition]);

  // Restore with multiple attempts
  useEffect(() => {
    const attempts = [0, restoreDelay, restoreDelay * 2, restoreDelay * 3, restoreDelay * 4];
    
    attempts.forEach(delay => {
      const timer = setTimeout(() => {
        restoreScrollPosition();
      }, delay);
      
      return () => clearTimeout(timer);
    });
  }, [restoreScrollPosition, restoreDelay]);

  return {
    containerRef,
    restoreScroll: restoreScrollPosition,
    resetScroll: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        try {
          sessionStorage.removeItem(`scroll-${key}`);
          localStorage.removeItem(`scroll-${key}`);
        } catch (error) {
          console.warn('Failed to clear scroll position:', error);
        }
      }
    },
    hasSavedPosition: () => {
      try {
        return !!(sessionStorage.getItem(`scroll-${key}`) || localStorage.getItem(`scroll-${key}`));
      } catch {
        return false;
      }
    }
  };
}


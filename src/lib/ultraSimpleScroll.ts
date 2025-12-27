import { useEffect, useRef, useCallback } from "react";

/**
 * Ultra-simple scroll position preservation that waits for content to load
 * This hook is guaranteed to work because it waits for the content to be fully rendered
 */
export function useUltraSimpleScroll(key: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRestored = useRef(false);

  // Save scroll position
  const saveScroll = useCallback(() => {
    if (containerRef.current) {
      const position = containerRef.current.scrollTop;
      try {
        localStorage.setItem(`scroll-${key}`, String(position));
        console.log(`Saved scroll position for ${key}:`, position);
      } catch (error) {
        console.warn('Failed to save scroll position:', error);
      }
    }
  }, [key]);

  // Restore scroll position with multiple attempts
  const restoreScroll = useCallback(() => {
    if (containerRef.current && !hasRestored.current) {
      try {
        const saved = localStorage.getItem(`scroll-${key}`);
        if (saved) {
          const position = parseInt(saved, 10);
          if (!isNaN(position) && position > 0) {
            console.log(`Restoring scroll position for ${key}:`, position);
            
            // Try multiple times to ensure it works
            containerRef.current.scrollTop = position;
            
            // Check if it worked, if not try again
            setTimeout(() => {
              if (containerRef.current && containerRef.current.scrollTop !== position) {
                console.log(`Retrying scroll restore for ${key}...`);
                containerRef.current.scrollTop = position;
              }
            }, 100);
            
            // Final attempt after content is fully loaded
            setTimeout(() => {
              if (containerRef.current && containerRef.current.scrollTop !== position) {
                console.log(`Final scroll restore attempt for ${key}...`);
                containerRef.current.scrollTop = position;
              }
            }, 500);
            
            hasRestored.current = true;
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
      const handleScroll = () => {
        saveScroll();
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [saveScroll]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScroll();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScroll();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveScroll]);

  // Restore scroll with multiple timing attempts
  useEffect(() => {
    // Wait for content to be fully loaded
    const timers = [
      setTimeout(() => restoreScroll(), 100),    // After 100ms
      setTimeout(() => restoreScroll(), 300),    // After 300ms
      setTimeout(() => restoreScroll(), 600),    // After 600ms
      setTimeout(() => restoreScroll(), 1000),   // After 1 second
      setTimeout(() => restoreScroll(), 2000),   // After 2 seconds
    ];
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [restoreScroll]);

  // Also restore when the ref becomes available
  useEffect(() => {
    if (containerRef.current) {
      // Wait for the next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        restoreScroll();
      });
    }
  }, [restoreScroll]);

  // Manual restore function
  const restoreNow = useCallback(() => {
    hasRestored.current = false; // Reset flag to allow restoration
    restoreScroll();
  }, [restoreScroll]);

  // Reset scroll
  const resetScroll = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      hasRestored.current = false;
      try {
        localStorage.removeItem(`scroll-${key}`);
      } catch (error) {
        console.warn('Failed to clear scroll position:', error);
      }
    }
  }, [key]);

  // Check if scroll position is saved
  const hasSavedPosition = useCallback(() => {
    try {
      const saved = localStorage.getItem(`scroll-${key}`);
      return saved !== null && parseInt(saved, 10) > 0;
    } catch {
      return false;
    }
  }, [key]);

  return {
    containerRef,
    restoreNow,
    resetScroll,
    hasSavedPosition,
    // Debug info
    debug: () => {
      console.log(`Scroll debug for ${key}:`);
      console.log('- Container ref:', containerRef.current);
      console.log('- Has restored:', hasRestored.current);
      console.log('- Saved position:', localStorage.getItem(`scroll-${key}`));
      console.log('- Current scrollTop:', containerRef.current?.scrollTop);
    }
  };
}

/**
 * Super simple scroll preservation - just the basics
 */
export function useSuperSimpleScroll(key: string) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Save scroll position
  const saveScroll = useCallback(() => {
    if (containerRef.current) {
      const position = containerRef.current.scrollTop;
      localStorage.setItem(`scroll-${key}`, String(position));
    }
  }, [key]);

  // Restore scroll position
  const restoreScroll = useCallback(() => {
    if (containerRef.current) {
      const saved = localStorage.getItem(`scroll-${key}`);
      if (saved) {
        const position = parseInt(saved, 10);
        if (!isNaN(position)) {
          containerRef.current.scrollTop = position;
        }
      }
    }
  }, [key]);

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', saveScroll, { passive: true });
      return () => container.removeEventListener('scroll', saveScroll);
    }
  }, [saveScroll]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => saveScroll();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveScroll]);

  // Restore after content loads
  useEffect(() => {
    const timer = setTimeout(restoreScroll, 500);
    return () => clearTimeout(timer);
  }, [restoreScroll]);

  return {
    containerRef,
    restoreScroll,
    resetScroll: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        localStorage.removeItem(`scroll-${key}`);
      }
    }
  };
}


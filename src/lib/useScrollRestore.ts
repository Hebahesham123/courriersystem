import { useEffect, RefObject, useState, useCallback } from "react";

/**
 * Enhanced scroll restore hook that preserves scroll position across page reloads and navigation
 * @param ref - React ref to the scrollable element
 * @param key - Unique key for this section (e.g., route+tab name)
 * @param options - Additional options for scroll behavior
 */
export function useScrollRestore(
  ref: RefObject<HTMLElement>, 
  key: string, 
  options: {
    persistToLocalStorage?: boolean;
    restoreDelay?: number;
    saveOnScroll?: boolean;
  } = {}
) {
  const {
    persistToLocalStorage = false,
    restoreDelay = 100,
    saveOnScroll = true
  } = options;

  const [scrollPosition, setScrollPosition] = useState(0);

  // Restore scroll position on mount
  useEffect(() => {
    const restoreScroll = () => {
      try {
        // Try sessionStorage first (for same session)
        let saved = sessionStorage.getItem(`scroll-pos:${key}`);
        
        // If not in sessionStorage and persistToLocalStorage is true, try localStorage
        if (!saved && persistToLocalStorage) {
          saved = localStorage.getItem(`scroll-pos:${key}`);
        }
        
        if (ref.current && saved) {
          const position = parseInt(saved, 10);
          setScrollPosition(position);
          
          // Use setTimeout to ensure DOM is fully rendered
          setTimeout(() => {
            if (ref.current) {
              ref.current.scrollTop = position;
            }
          }, restoreDelay);
        }
      } catch (error) {
        console.warn(`Failed to restore scroll position for ${key}:`, error);
      }
    };

    // Restore immediately if ref is available
    if (ref.current) {
      restoreScroll();
    } else {
      // Wait for ref to be available
      const timer = setTimeout(restoreScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [key, ref, persistToLocalStorage, restoreDelay]);

  // Save scroll position on scroll
  const handleScroll = useCallback(() => {
    if (ref.current && saveOnScroll) {
      const position = ref.current.scrollTop;
      setScrollPosition(position);
      
      try {
        // Always save to sessionStorage for current session
        sessionStorage.setItem(`scroll-pos:${key}`, String(position));
        
        // Optionally save to localStorage for persistence across sessions
        if (persistToLocalStorage) {
          localStorage.setItem(`scroll-pos:${key}`, String(position));
        }
      } catch (error) {
        console.warn(`Failed to save scroll position for ${key}:`, error);
      }
    }
  }, [key, ref, persistToLocalStorage, saveOnScroll]);

  // Add scroll listener
  useEffect(() => {
    const container = ref.current;
    if (container && saveOnScroll) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, ref, saveOnScroll]);

  // Save scroll position before page unload
  useEffect(() => {
    const save = () => {
      if (ref.current) {
        try {
          const position = ref.current.scrollTop;
          sessionStorage.setItem(`scroll-pos:${key}`, String(position));
          
          if (persistToLocalStorage) {
            localStorage.setItem(`scroll-pos:${key}`, String(position));
          }
        } catch (error) {
          console.warn(`Failed to save scroll position before unload for ${key}:`, error);
        }
      }
    };

    window.addEventListener("beforeunload", save);
    window.addEventListener("pagehide", save);
    
    return () => {
      save(); // Save current position
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("pagehide", save);
    };
  }, [key, ref, persistToLocalStorage]);

  // Function to manually reset scroll
  const resetScroll = useCallback(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
      setScrollPosition(0);
      
      // Clear saved positions
      sessionStorage.removeItem(`scroll-pos:${key}`);
      if (persistToLocalStorage) {
        localStorage.removeItem(`scroll-pos:${key}`);
      }
    }
  }, [key, ref, persistToLocalStorage]);

  // Function to scroll to specific position
  const scrollTo = useCallback((position: number) => {
    if (ref.current) {
      ref.current.scrollTop = position;
      setScrollPosition(position);
    }
  }, [ref]);

  return {
    scrollPosition,
    resetScroll,
    scrollTo,
    // Legacy compatibility
    ref
  };
}

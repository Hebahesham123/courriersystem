import { useState, useEffect, useCallback } from "react";

/**
 * Hook to preserve dashboard filters and state across page reloads
 * @param key - Unique key for this dashboard section
 * @param initialState - Initial state object
 */
export function useDashboardFilters<T extends Record<string, any>>(
  key: string,
  initialState: T
) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`dashboard-filters:${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if saved state is not too old (7 days)
        if (parsed._timestamp && Date.now() - parsed._timestamp < 7 * 24 * 60 * 60 * 1000) {
          // Remove timestamp from the state
          const { _timestamp, ...rest } = parsed;
          return { ...initialState, ...rest };
        }
      }
    } catch (error) {
      console.warn(`Failed to restore dashboard filters for ${key}:`, error);
    }
    return initialState;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        ...state,
        _timestamp: Date.now(),
      };
      localStorage.setItem(`dashboard-filters:${key}`, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn(`Failed to save dashboard filters for ${key}:`, error);
    }
  }, [state, key]);

  // Update specific filters
  const updateFilter = useCallback((filterKey: keyof T, value: any) => {
    setState(prev => ({ ...prev, [filterKey]: value }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((filters: Partial<T>) => {
    setState(prev => ({ ...prev, ...filters }));
  }, []);

  // Reset all filters to initial state
  const resetFilters = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(`dashboard-filters:${key}`);
  }, [initialState, key]);

  // Reset specific filter
  const resetFilter = useCallback((filterKey: keyof T) => {
    setState(prev => ({ ...prev, [filterKey]: initialState[filterKey] }));
  }, [initialState]);

  return {
    state,
    setState,
    updateFilter,
    updateFilters,
    resetFilters,
    resetFilter,
  };
}

/**
 * Hook to preserve scroll position for dashboard sections
 * @param key - Unique key for this scrollable section
 */
export function useDashboardScroll(key: string) {
  const [scrollPosition, setScrollPosition] = useState(0);

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`dashboard-scroll:${key}`);
      if (saved) {
        const position = parseInt(saved, 10);
        setScrollPosition(position);
        
        // Restore scroll position after a short delay to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo(0, position);
        }, 100);
      }
    } catch (error) {
      console.warn(`Failed to restore scroll position for ${key}:`, error);
    }
  }, [key]);

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
      
      try {
        localStorage.setItem(`dashboard-scroll:${key}`, String(position));
      } catch (error) {
        console.warn(`Failed to save scroll position for ${key}:`, error);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);

  // Save scroll position before page unload
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(`dashboard-scroll:${key}`, String(window.scrollY));
      } catch (error) {
        console.warn(`Failed to save scroll position before unload for ${key}:`, error);
      }
    };

    window.addEventListener('beforeunload', save);
    window.addEventListener('pagehide', save);
    
    return () => {
      save();
      window.removeEventListener('beforeunload', save);
      window.removeEventListener('pagehide', save);
    };
  }, [key]);

  // Function to reset scroll
  const resetScroll = useCallback(() => {
    window.scrollTo(0, 0);
    setScrollPosition(0);
    localStorage.removeItem(`dashboard-scroll:${key}`);
  }, [key]);

  return {
    scrollPosition,
    resetScroll,
  };
}


import { useEffect, useRef, useState, useCallback } from "react";

interface DashboardState {
  scrollPosition: number;
  filters: Record<string, any>;
  selectedItems: string[];
  expandedSections: string[];
  lastVisited: number;
}

/**
 * Comprehensive hook to preserve dashboard state across page reloads and navigation
 * @param key - Unique key for this dashboard section (e.g., 'admin-summary', 'admin-orders')
 * @param initialState - Initial state object
 */
export function useDashboardState<T extends DashboardState>(
  key: string,
  initialState: T
) {
  const [state, setState] = useState<T>(() => {
    // Try to restore state from localStorage on mount
    try {
      const saved = localStorage.getItem(`dashboard-state:${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if saved state is not too old (24 hours)
        if (parsed.lastVisited && Date.now() - parsed.lastVisited < 24 * 60 * 60 * 1000) {
          return { ...initialState, ...parsed };
        }
      }
    } catch (error) {
      console.warn(`Failed to restore dashboard state for ${key}:`, error);
    }
    return initialState;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        ...state,
        lastVisited: Date.now(),
      };
      localStorage.setItem(`dashboard-state:${key}`, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn(`Failed to save dashboard state for ${key}:`, error);
    }
  }, [state, key]);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current && state.scrollPosition > 0) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = state.scrollPosition;
        }
      }, 100);
    }
  }, [state.scrollPosition]);

  // Save scroll position on scroll
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setState(prev => ({
        ...prev,
        scrollPosition: scrollContainerRef.current!.scrollTop
      }));
    }
  }, []);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Save scroll position before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (scrollContainerRef.current) {
        setState(prev => ({
          ...prev,
          scrollPosition: scrollContainerRef.current!.scrollTop
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // Update specific parts of state
  const updateState = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Update filters
  const updateFilters = useCallback((filters: Record<string, any>) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, ...filters } }));
  }, []);

  // Toggle selected items
  const toggleSelectedItem = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId]
    }));
  }, []);

  // Toggle expanded sections
  const toggleExpandedSection = useCallback((sectionId: string) => {
    setState(prev => ({
      ...prev,
      expandedSections: prev.expandedSections.includes(sectionId)
        ? prev.expandedSections.filter(id => id !== sectionId)
        : [...prev.expandedSections, sectionId]
    }));
  }, []);

  // Clear all state
  const clearState = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(`dashboard-state:${key}`);
  }, [initialState, key]);

  // Reset scroll position
  const resetScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setState(prev => ({ ...prev, scrollPosition: 0 }));
    }
  }, []);

  return {
    state,
    setState,
    updateState,
    updateFilters,
    toggleSelectedItem,
    toggleExpandedSection,
    clearState,
    resetScroll,
    scrollContainerRef,
    isExpanded: (sectionId: string) => state.expandedSections.includes(sectionId),
    isSelected: (itemId: string) => state.selectedItems.includes(itemId),
  };
}

/**
 * Hook specifically for preserving scroll position
 * @param key - Unique key for this scrollable section
 * @param containerRef - Ref to the scrollable container
 */
export function useScrollPreserve(key: string, containerRef: React.RefObject<HTMLElement>) {
  const [scrollPosition, setScrollPosition] = useState(0);

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`scroll-pos:${key}`);
      if (saved && containerRef.current) {
        const position = parseInt(saved, 10);
        setScrollPosition(position);
        
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = position;
          }
        }, 100);
      }
    } catch (error) {
      console.warn(`Failed to restore scroll position for ${key}:`, error);
    }
  }, [key, containerRef]);

  // Save scroll position on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const position = container.scrollTop;
      setScrollPosition(position);
      try {
        sessionStorage.setItem(`scroll-pos:${key}`, String(position));
      } catch (error) {
        console.warn(`Failed to save scroll position for ${key}:`, error);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [key, containerRef]);

  // Save scroll position before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (containerRef.current) {
        try {
          sessionStorage.setItem(`scroll-pos:${key}`, String(containerRef.current.scrollTop));
        } catch (error) {
          console.warn(`Failed to save scroll position before unload for ${key}:`, error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [key, containerRef]);

  return {
    scrollPosition,
    resetScroll: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
        setScrollPosition(0);
        sessionStorage.removeItem(`scroll-pos:${key}`);
      }
    }
  };
}


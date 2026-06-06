import { useEffect, useRef } from "react";

// In-memory store for tab state (scroll position, view state, etc.)
const tabStateStore = new Map();

/**
 * Preserves and restores scroll position and custom state for a tab.
 * Call this in each major page (Home, Practice, Exam, Progress, Profile).
 * 
 * Usage:
 *   const { preserveState, restoreState } = useTabState('home');
 *   const [customState, setCustomState] = useState(() => restoreState('customState', defaultValue));
 *   
 *   useEffect(() => {
 *     preserveState('customState', customState);
 *   }, [customState]);
 */
export function useTabState(tabKey) {
  const scrollContainerRef = useRef(null);

  // Restore scroll position when component mounts
  useEffect(() => {
    const saved = tabStateStore.get(tabKey);
    if (saved?.scrollY !== undefined && scrollContainerRef.current) {
      // Defer scroll restore to next tick so layout is complete
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = saved.scrollY;
        }
      });
    }
  }, [tabKey]);

  // Save scroll position when component unmounts or when user scrolls
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const current = tabStateStore.get(tabKey) || {};
      tabStateStore.set(tabKey, { ...current, scrollY: container.scrollTop });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [tabKey]);

  // Utility to preserve custom state
  const preserveState = (key, value) => {
    const current = tabStateStore.get(tabKey) || {};
    tabStateStore.set(tabKey, { ...current, [key]: value });
  };

  // Utility to restore custom state
  const restoreState = (key, defaultValue) => {
    return tabStateStore.get(tabKey)?.[key] ?? defaultValue;
  };

  // Clear state (useful for logout or reset)
  const clearState = () => {
    tabStateStore.delete(tabKey);
  };

  return { scrollContainerRef, preserveState, restoreState, clearState };
}
import { useState, useCallback, useMemo } from "react";

/**
 * Manages expanded/collapsed state for a list of group keys.
 * Defaults to all collapsed when the total number of items is large,
 * otherwise all expanded.
 */
export default function useCollapsibleGroups(groups, { autoCollapseThreshold = 20 } = {}) {
  const totalItems = useMemo(
    () => (groups || []).reduce((sum, g) => sum + (g.items?.length || 0), 0),
    [groups]
  );
  const startCollapsed = totalItems > autoCollapseThreshold;

  const [collapsed, setCollapsed] = useState(() => new Set());
  const [initialized, setInitialized] = useState(false);

  // Initialize once we know group keys
  if (!initialized && groups && groups.length > 0) {
    if (startCollapsed) {
      setCollapsed(new Set(groups.map(g => g.subject)));
    }
    setInitialized(true);
  }

  const isExpanded = useCallback((key) => !collapsed.has(key), [collapsed]);

  const toggle = useCallback((key) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => {
    setCollapsed(new Set((groups || []).map(g => g.subject)));
  }, [groups]);

  const allExpanded = collapsed.size === 0;

  return { isExpanded, toggle, expandAll, collapseAll, allExpanded };
}
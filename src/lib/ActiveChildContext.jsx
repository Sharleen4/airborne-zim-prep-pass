import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const ActiveChildContext = createContext(null);

const STORAGE_KEY = "zama_active_child_id";

export function ActiveChildProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [childProfiles, setChildProfiles] = useState([]);
  const [activeChildId, setActiveChildId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !user?.email) {
      setChildProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await base44.entities.ChildProfile.filter(
        { parent_email: user.email, is_active: true },
        "created_date",
        20
      );
      setChildProfiles(list || []);
      // If saved active child is no longer in the list, fall back to first
      const savedId = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
      const valid = list?.find(c => c.id === savedId);
      if (valid) {
        setActiveChildId(valid.id);
      } else if (list?.length) {
        setActiveChildId(list[0].id);
        try { localStorage.setItem(STORAGE_KEY, list[0].id); } catch {}
      } else {
        setActiveChildId(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
      }
    } catch (e) {
      console.warn("[ActiveChild] reload failed:", e);
    }
    setLoading(false);
  }, [isAuthenticated, user?.email]);

  useEffect(() => { reload(); }, [reload]);

  const switchChild = useCallback((id) => {
    setActiveChildId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const activeChild = childProfiles.find(c => c.id === activeChildId) || null;

  return (
    <ActiveChildContext.Provider value={{
      activeChild,
      activeChildId,
      childProfiles,
      switchChild,
      reload,
      loading,
      hasChildren: childProfiles.length > 0,
    }}>
      {children}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild() {
  const ctx = useContext(ActiveChildContext);
  if (!ctx) throw new Error("useActiveChild must be used within ActiveChildProvider");
  return ctx;
}
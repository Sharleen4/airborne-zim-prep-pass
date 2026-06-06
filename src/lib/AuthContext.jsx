import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { getViewAsRole, subscribeViewAs } from '@/lib/viewAs';

const AuthContext = createContext();

function isLocalOfflinePreview() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getLocalOfflineUser() {
  return {
    id: "local-offline-user",
    email: "offline@zamaai.local",
    full_name: "Offline Learner",
    role: "parent",
    onboarding_completed: true,
    subscription_status: "active",
    created_date: new Date().toISOString(),
    __localOfflinePreview: true,
  };
}

// Super-admin-only role override: when a real admin picks a "View As" role,
// every page sees the overridden role via useAuth(). The real role is preserved
// on user.__realRole so the View-As switcher itself stays visible.
function applyViewAs(realUser) {
  if (!realUser || realUser.role !== "admin") return realUser;
  const override = getViewAsRole();
  if (!override || override === "admin") return { ...realUser, __realRole: "admin" };
  return { ...realUser, __realRole: "admin", role: override };
}

// Persist user to localStorage so offline reloads across sessions don't lose it.
// We also remember which token the cached user belongs to so that logging in as a
// different account doesn't briefly show the previous account's view.
function saveUserToCache(user) {
  try {
    localStorage.setItem('cached_user', JSON.stringify(user));
    if (appParams.token) localStorage.setItem('cached_user_token', appParams.token);
  } catch {}
}
function loadUserFromCache() {
  try {
    const s = localStorage.getItem('cached_user');
    if (!s) return null;
    const cachedToken = localStorage.getItem('cached_user_token');
    // If we have a token now and it doesn't match the token the cache was saved
    // under, the cache belongs to a different account — ignore it.
    if (appParams.token && cachedToken && cachedToken !== appParams.token) return null;
    return JSON.parse(s);
  } catch { return null; }
}

export const AuthProvider = ({ children }) => {
  const [realUser, setRealUser] = useState(null);
  const [user, setUserState] = useState(null);
  const setUser = (u) => { setRealUser(u); setUserState(applyViewAs(u)); };

  // Re-apply role override whenever the super admin switches "View As".
  useEffect(() => subscribeViewAs(() => setUserState(applyViewAs(realUser))), [realUser]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(!!appParams.token);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();

    // Auto-recover when network comes back online
    const handleOnline = () => {
      // If we're in an error state or not authenticated, retry
      if (authError || !isAuthenticated) {
        checkAppState();
      } else {
        // Already authenticated — just silently refresh user data
        silentRefreshUser();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const checkAppState = async () => {
    // Always set loading states
    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(true);

    if (isLocalOfflinePreview() && !appParams.token) {
      const localUser = loadUserFromCache() || getLocalOfflineUser();
      setUser(localUser);
      saveUserToCache(localUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      return;
    }

    // If we have a cached user + token, allow immediate access without any API call
    const cached = loadUserFromCache();
    if (cached && appParams.token) {
      setUser(cached);
      setIsAuthenticated(true);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      // Silently try to refresh user in background (but don't block UI)
      if (navigator.onLine) {
        setTimeout(() => silentRefreshUser(), 3000);
      }
      return;
    }

    // Early offline check — don't even try API calls if offline
    if (!navigator.onLine) {
      if (appParams.token) {
        setIsAuthenticated(true);
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      return;
    }

    // Safety timeout: if everything hangs, unblock the UI (1 second max for faster perception)
    let safetyTimedOut = false;
    const safetyTimer = setTimeout(() => {
      safetyTimedOut = true;
      const cached = loadUserFromCache();
      if (cached && appParams.token) {
        setUser(cached);
        setIsAuthenticated(true);
      } else if (appParams.token) {
        // Have token but no cache — allow to proceed and try SDK fallback
        setIsAuthenticated(true);
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }, 1000);

    try {
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        clearTimeout(safetyTimer);
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        if (safetyTimedOut) return; // Already handled by timeout

        clearTimeout(safetyTimer);

        const status = appError.status || appError.response?.status;

        // Rate limit (429) or network/server errors — recover from cache if we have a token
        if (status === 429 || status >= 500 || !navigator.onLine) {
          if (appParams.token) {
            const cached = loadUserFromCache();
            if (cached) setUser(cached);
            setIsAuthenticated(true);
          }
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }

        // Offline or network error — recover from cache if we have a token
        if (appParams.token) {
          const cached = loadUserFromCache();
          if (cached) {
            setUser(cached);
          }
          setIsAuthenticated(true);
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }

        // Online errors with structured reasons
        if (status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          setAuthError({ type: reason, message: appError.message });
        } else if (status === 401) {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        } else {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      if (safetyTimedOut) return; // Already handled by timeout

      clearTimeout(safetyTimer);
      // Unexpected JS error — recover from cache or require login
      if (appParams.token) {
        const cached = loadUserFromCache();
        if (cached) { setUser(cached); setIsAuthenticated(true); }
        else { setIsAuthenticated(true); } // Allow through if token exists
      } else {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const silentRefreshUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setUser(currentUser);
        saveUserToCache(currentUser);
      }
    } catch {
      // Silently fail — cached user is already shown
    }
  };

  const checkUserAuth = async () => {
    if (!appParams.token) {
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
      return;
    }
    try {
      setIsLoadingAuth(true);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );
      const currentUser = await Promise.race([base44.auth.me(), timeoutPromise]);
      setUser(currentUser);
      saveUserToCache(currentUser); // persist for offline reloads
      setIsAuthenticated(true);
    } catch (error) {
      const status = error.status || error.response?.status;
      const cached = loadUserFromCache();
      // 429, network errors, timeouts — use cached user or allow through
      if (status === 401 || status === 403) {
        if (!cached) {
          setIsAuthenticated(false);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        } else {
          setUser(cached);
          setIsAuthenticated(true);
        }
      } else {
        // Rate limit, timeout, network error — recover from cache
        if (cached) {
          setUser(cached);
          setIsAuthenticated(true);
        } else if (appParams.token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('cached_user');
      localStorage.removeItem('cached_user_token');
      localStorage.removeItem('zama_sub_status'); // Clear subscription cache on logout
    } catch {}
    if (shouldRedirect) {
      // Always send the user to the public landing page after logout — never back
      // to the private URL they were on (otherwise pressing Back restores it from
      // the browser's bfcache and shows app content while logged out).
      const landingUrl = window.location.origin + '/';
      if (isLocalOfflinePreview()) {
        window.location.replace(landingUrl);
        return;
      }
      base44.auth.logout(landingUrl);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (isLocalOfflinePreview()) {
      window.location.replace('/home');
      return;
    }
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

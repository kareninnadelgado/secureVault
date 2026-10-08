import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
} from '../services/api.js';

const AuthContext =
  createContext(null);

const INACTIVITY_LIMIT =
  15 * 60 * 1000;

const ACTIVITY_KEY =
  'securevault_last_activity';

function normalizeUser(data) {
  return data?.user ?? data;
}

function updateActivity() {
  localStorage.setItem(
    ACTIVITY_KEY,
    String(Date.now())
  );
}

function getLastActivity() {
  const value =
    localStorage.getItem(
      ACTIVITY_KEY
    );

  if (!value) {
    return null;
  }

  const timestamp =
    Number(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const lastActivity =
        getLastActivity();

      if (
        lastActivity &&
        Date.now() - lastActivity >=
          INACTIVITY_LIMIT
      ) {
        try {
          await logoutUser();
        } catch {
          // Session may already be expired.
        }

        localStorage.removeItem(
          ACTIVITY_KEY
        );

        if (active) {
          setUser(null);
          setLoading(false);
        }

        return;
      }

      try {
        const currentUser =
          await getCurrentUser();

        if (active) {
          setUser(
            normalizeUser(currentUser)
          );

          updateActivity();
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const events = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ];

    let timer;

    function registerActivity() {
      updateActivity();

      clearTimeout(timer);

      timer = window.setTimeout(
        async () => {
          try {
            await logoutUser();
          } catch {
            // Session may already be expired.
          }

          localStorage.removeItem(
            ACTIVITY_KEY
          );

          setUser(null);

          window.location.replace(
            '/login?reason=timeout'
          );
        },
        INACTIVITY_LIMIT
      );
    }

    events.forEach((eventName) => {
      window.addEventListener(
        eventName,
        registerActivity,
        { passive: true }
      );
    });

    function checkVisibility() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        const lastActivity =
          getLastActivity();

        if (
          lastActivity &&
          Date.now() -
            lastActivity >=
            INACTIVITY_LIMIT
        ) {
          registerActivity();
        }
      }
    }

    document.addEventListener(
      'visibilitychange',
      checkVisibility
    );

    registerActivity();

    return () => {
      clearTimeout(timer);

      events.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          registerActivity
        );
      });

      document.removeEventListener(
        'visibilitychange',
        checkVisibility
      );
    };
  }, [user]);

  async function login(credentials) {
    const data =
      await loginUser(credentials);

    const loggedUser =
      normalizeUser(data);

    setUser(loggedUser);

    updateActivity();

    return loggedUser;
  }

  async function logout() {
    try {
      await logoutUser();
    } finally {
      localStorage.removeItem(
        ACTIVITY_KEY
      );

      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated:
        Boolean(user),
      login,
      logout,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}
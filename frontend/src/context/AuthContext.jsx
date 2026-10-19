import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    api("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener("fichua:session-expired", expireSession);
    return () =>
      window.removeEventListener("fichua:session-expired", expireSession);
  }, []);
  const value = useMemo(
    () => ({
      user,
      checking,
      sessionExpired,
      async login(credentials) {
        const result = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        setUser(result.user);
        setSessionExpired(false);
        return result.user;
      },
      async register(fields) {
        const result = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        setUser(result);
        setSessionExpired(false);
        return result;
      },
      async logout() {
        await api("/auth/logout", { method: "POST" });
        setUser(null);
        setSessionExpired(false);
      },
    }),
    [user, checking, sessionExpired],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

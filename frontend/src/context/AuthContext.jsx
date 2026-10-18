import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);
  const value = useMemo(
    () => ({
      user,
      checking,
      async login(credentials) {
        const result = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        setUser(result.user);
        return result.user;
      },
      async register(fields) {
        const result = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        setUser(result);
        return result;
      },
      async logout() {
        await api("/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [user, checking],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

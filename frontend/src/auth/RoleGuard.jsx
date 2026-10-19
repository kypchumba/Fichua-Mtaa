import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/UI";
import { dashboardPath } from "./roles";

// Client-side route checks improve navigation; API authorization remains authoritative.
export function RoleGuard({ children, role }) {
  const { user, checking, sessionExpired } = useAuth();
  const location = useLocation();

  if (checking) return <Spinner />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          returnTo: `${location.pathname}${location.search}`,
          from: location.state?.from,
          sessionExpired,
        }}
      />
    );
  }
  if (role && user.role !== role) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  return children;
}

import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { user, checking, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    // Leave protected routes after clearing the server-managed session.
    navigate("/", { replace: true });
  }

  return (
    <>
      <header
        className={[
          "site-header",
          user?.role === "ADMIN" ? "site-header-admin" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="header-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">FM</span>
            <span>
              Fichua <b>Mtaa</b>
              <small>Community services portal</small>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/services">Services</NavLink>
            {!checking && !user && (
              <>
                <NavLink to="/login">Sign in</NavLink>
                <NavLink className="nav-signin" to="/register">
                  Register
                </NavLink>
              </>
            )}
            {!checking && user?.role === "CITIZEN" && (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/requests/new">Submit request</NavLink>
                <NavLink to="/requests">My requests</NavLink>
                <NavLink to="/profile">Profile</NavLink>
              </>
            )}
            {!checking && user?.role === "ADMIN" && (
              <>
                <NavLink to="/admin">Administration</NavLink>
                <button className="nav-button" onClick={signOut}>
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <div className="brand footer-brand">
            <span className="brand-mark">FM</span>
            <span>
              Fichua <b>Mtaa</b>
              <small>Service starts with being heard.</small>
            </span>
          </div>
          <p>
            An independent educational demonstration. Not an official government
            service.
          </p>
          <span>© {new Date().getFullYear()} Fichua Mtaa</span>
        </div>
      </footer>
    </>
  );
}

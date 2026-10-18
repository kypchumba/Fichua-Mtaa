import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">FM</span>
            <span>
              Fichua <b>Mtaa</b>
              <small>Community services portal</small>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/requests/new">Submit request</NavLink>
            <NavLink to="/requests">My requests</NavLink>
            {user && (
              <>
                {user.role === "ADMIN" && (
                  <NavLink to="/admin">Administration</NavLink>
                )}
              </>
            )}
            {user ? (
              <button className="nav-button" onClick={() => logout()}>
                Sign out
              </button>
            ) : (
              <>
                <NavLink to="/login">Sign in</NavLink>
                <NavLink className="nav-signin" to="/register">
                  Register
                </NavLink>
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

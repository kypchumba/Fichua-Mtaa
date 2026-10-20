import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignOutControl from "./SignOutControl";
import { ScrollManager } from "./ScrollManager";

export function Layout() {
  const { user, checking } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigationRef = useRef(null);
  const isCitizen = !checking && user?.role === "CITIZEN";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (!navigationRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        navigationRef.current?.querySelector(".menu-toggle")?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <ScrollManager />
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
          <div
            className={`header-navigation${isCitizen ? " citizen-header-navigation" : ""}${menuOpen ? " menu-open" : ""}`}
            ref={navigationRef}
          >
            {isCitizen && (
              <button
                aria-controls="citizen-navigation"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                className={`menu-toggle${menuOpen ? " is-open" : ""}`}
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                <span aria-hidden="true" className="menu-icon">
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            )}
            <nav
              aria-label="Main navigation"
              className={isCitizen ? "citizen-navigation" : ""}
              id={isCitizen ? "citizen-navigation" : undefined}
            >
              <NavLink onClick={() => setMenuOpen(false)} to="/">Home</NavLink>
              <NavLink onClick={() => setMenuOpen(false)} to="/services">Services</NavLink>
              {!checking && !user && (
                <>
                  <NavLink
                    className="nav-auth-link"
                    onClick={() => setMenuOpen(false)}
                    to="/login"
                  >
                    Sign in
                  </NavLink>
                  <NavLink
                    className="nav-signin nav-auth-link"
                    onClick={() => setMenuOpen(false)}
                    to="/register"
                  >
                    Register
                  </NavLink>
                </>
              )}
              {isCitizen && (
                <>
                  <NavLink onClick={() => setMenuOpen(false)} to="/dashboard">Dashboard</NavLink>
                  <NavLink onClick={() => setMenuOpen(false)} to="/requests/new">Submit request</NavLink>
                  <NavLink onClick={() => setMenuOpen(false)} to="/requests">My requests</NavLink>
                  <NavLink onClick={() => setMenuOpen(false)} to="/profile">Profile</NavLink>
                </>
              )}
              {!checking && user?.role === "ADMIN" && (
                <NavLink onClick={() => setMenuOpen(false)} to="/admin">Administration</NavLink>
              )}
            </nav>
          </div>
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

import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map());
  const activeKey = useRef(location.key);
  const previousPath = useRef(location.pathname);

  useLayoutEffect(() => {
    function rememberPosition() {
      positions.current.set(activeKey.current, {
        x: window.scrollX,
        y: window.scrollY,
      });
    }

    // Router transitions own scroll behavior, while saved POP positions remain restorable.
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.addEventListener("scroll", rememberPosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", rememberPosition);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    if (location.hash) {
      let id = location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // Keep the literal fragment if it contains malformed percent encoding.
      }
      const target = document.getElementById(id);
      if (target) target.scrollIntoView();
      else window.scrollTo(0, 0);
    } else if (navigationType === "POP") {
      const position = positions.current.get(location.key);
      window.scrollTo(position?.x ?? 0, position?.y ?? 0);
    } else if (previousPath.current !== location.pathname) {
      window.scrollTo(0, 0);
    }

    activeKey.current = location.key;
    previousPath.current = location.pathname;
  }, [location.hash, location.key, location.pathname, navigationType]);

  return null;
}

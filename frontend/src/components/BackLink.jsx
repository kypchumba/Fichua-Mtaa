import { useLocation, useNavigate } from "react-router-dom";

const isLocalPath = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");

// Prefer an explicit in-app origin, then browser history, then a safe fallback.
export function BackLink({ fallbackTo, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  function goBack() {
    const previousRoute = location.state?.from;
    if (isLocalPath(previousRoute)) {
      navigate(previousRoute, { replace: true });
      return;
    }

    if (location.key !== "default" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace: true });
  }

  return (
    <button
      className="back-link back-button"
      onClick={goBack}
      type="button"
    >
      {children}
    </button>
  );
}

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ScrollManager } from "./ScrollManager";

function ScrollTestPages() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output>{location.pathname}</output>
      <Link to="/services">Open services</Link>
      <Link to="/services#service-categories">Jump to service categories</Link>
      {location.pathname === "/services" && (
        <button onClick={() => navigate(-1)} type="button">
          Back
        </button>
      )}
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route
          path="/services"
          element={<p id="service-categories">Services</p>}
        />
      </Routes>
    </>
  );
}

describe("ScrollManager", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 0,
      writable: true,
    });
    window.scrollTo = vi.fn((_x, y) => {
      window.scrollY = y;
    });
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("starts new routes at the top and restores scroll on browser-style back navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollManager />
        <ScrollTestPages />
      </MemoryRouter>,
    );

    window.scrollY = 540;
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("link", { name: "Open services" }));

    expect(screen.getByText("/services")).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    window.scrollY = 110;
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByText("/")).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 540);
  });

  it("preserves intentional hash navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollManager />
        <ScrollTestPages />
      </MemoryRouter>,
    );
    window.scrollTo.mockClear();

    fireEvent.click(
      screen.getByRole("link", { name: "Jump to service categories" }),
    );

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledOnce();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

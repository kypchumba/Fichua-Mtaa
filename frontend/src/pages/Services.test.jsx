import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Services from "./Services";

const authState = vi.hoisted(() => ({ user: null }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState,
}));

function RouteDetails() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
      {location.state?.returnTo || ""}
    </output>
  );
}

function renderServices(user = null) {
  authState.user = user;
  return render(
    <MemoryRouter initialEntries={["/services"]}>
      <Routes>
        <Route path="/services" element={<Services />} />
        <Route path="/login" element={<RouteDetails />} />
        <Route path="/requests/new" element={<RouteDetails />} />
        <Route path="/admin" element={<RouteDetails />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("service reporting links", () => {
  afterEach(() => {
    cleanup();
    authState.user = null;
  });

  it("takes a visitor to sign-in with the selected service preserved", () => {
    renderServices();
    fireEvent.click(screen.getByRole("link", { name: "Report Roads and drainage" }));

    expect(screen.getByText(/\/login\/requests\/new\?category=Roads%20and%20Drainage/)).toBeInTheDocument();
  });

  it("opens the citizen form with the selected service category", () => {
    renderServices({ role: "CITIZEN" });
    fireEvent.click(screen.getByRole("link", { name: "Report Water supply" }));

    expect(screen.getByText("/requests/new?category=Water%20Supply")).toBeInTheDocument();
  });

  it("sends administrators to administration instead of the citizen form", () => {
    renderServices({ role: "ADMIN" });
    fireEvent.click(screen.getByRole("link", { name: "Review Water supply requests" }));

    expect(screen.getByText("/admin")).toBeInTheDocument();
  });
});

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { CitizenDashboard } from "./CitizenDashboard";

vi.mock("../api/client", () => ({ api: vi.fn() }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { fullName: "Amina Citizen" } }),
}));

const request = {
  id: 8,
  referenceNumber: "FM-2026-ABC123",
  title: "Pothole near the market",
  category: "Roads and Transport",
  location: "Market Road",
  status: "PENDING",
  createdAt: "2026-10-20T08:00:00Z",
};

function CurrentPath() {
  return <output>{useLocation().pathname}</output>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<CitizenDashboard />} />
        <Route path="/requests" element={<CurrentPath />} />
        <Route path="/profile" element={<CurrentPath />} />
        <Route path="/requests/:id" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("citizen dashboard actions", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows clear request-list and profile buttons below Recent requests", async () => {
    api.mockResolvedValue([request]);
    renderDashboard();

    const heading = await screen.findByRole("heading", { name: "Recent requests" });
    const actions = screen.getByRole("navigation", {
      name: "Request and account links",
    });
    expect(heading.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View all requests" }),
    ).toHaveAttribute("href", "/requests");
    expect(
      screen.getByRole("link", { name: "View account details" }),
    ).toHaveAttribute("href", "/profile");
  });

  it("opens the matching report when its visible View button is activated", async () => {
    api.mockResolvedValue([request]);
    renderDashboard();
    const viewButton = await screen.findByRole("link", { name: "View" });
    fireEvent.click(viewButton);
    expect(screen.getByText("/requests/8")).toBeInTheDocument();
  });

  it("keeps both account actions present at a narrow viewport size", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 360 });
    api.mockResolvedValue([request]);
    renderDashboard();
    await screen.findByRole("link", { name: "View" });

    expect(screen.getByRole("link", { name: "View all requests" })).toBeVisible();
    expect(screen.getByRole("link", { name: "View account details" })).toBeVisible();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: originalWidth,
    });
  });
});

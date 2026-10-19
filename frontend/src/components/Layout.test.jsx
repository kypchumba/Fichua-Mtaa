import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";

const authState = vi.hoisted(() => ({
  user: null,
  checking: false,
  logout: vi.fn(async () => {
    authState.user = null;
  }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState,
}));

function renderLayout(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<h1>Official public landing page</h1>} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
          <Route path="/admin" element={<p>Administration workspace</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("role-specific navigation", () => {
  afterEach(() => {
    cleanup();
    authState.user = null;
    authState.logout.mockClear();
  });

  it("shows citizen service and account links to citizens", () => {
    authState.user = {
      id: 7,
      fullName: "Amina Citizen",
      email: "amina@example.test",
      role: "CITIZEN",
    };
    renderLayout();

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/services",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Submit request" })).toHaveAttribute(
      "href",
      "/requests/new",
    );
    expect(screen.getByRole("link", { name: "My requests" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Administration" }),
    ).not.toBeInTheDocument();
  });

  it("keeps citizen request actions out of administrator navigation", () => {
    authState.user = {
      id: 1,
      fullName: "Service Administrator",
      email: "admin@example.test",
      role: "ADMIN",
    };
    renderLayout("/admin");

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Services" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Administration" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Submit request" })).toBeNull();
    expect(screen.queryByRole("link", { name: "My requests" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Profile" })).toBeNull();
  });

  it("returns to the public landing page after signing out", async () => {
    authState.user = {
      id: 7,
      fullName: "Amina Citizen",
      email: "amina@example.test",
      role: "CITIZEN",
    };
    renderLayout("/dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Official public landing page" })).toBeInTheDocument();
    expect(authState.logout).toHaveBeenCalledOnce();
  });
});

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
          <Route path="/services" element={<p>Service categories</p>} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
          <Route path="/requests/new" element={<p>New request</p>} />
          <Route path="/requests" element={<p>My requests</p>} />
          <Route path="/requests/:id" element={<p>Request details</p>} />
          <Route path="/profile" element={<p>Citizen profile</p>} />
          <Route path="/admin" element={<p>Administration workspace</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("role-specific navigation", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

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
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Administration" }),
    ).not.toBeInTheDocument();
  });

  it("keeps homepage authentication links plain in desktop navigation", () => {
    renderLayout("/");

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(navigation).not.toHaveTextContent("Already registered? Sign in.");
    expect(navigation).not.toHaveTextContent(
      "New to Fichua Mtaa? Create an account.",
    );
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
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("opens a collapsible citizen navigation with all citizen destinations", () => {
    authState.user = {
      id: 7,
      fullName: "Amina Citizen",
      email: "amina@example.test",
      role: "CITIZEN",
    };
    renderLayout("/dashboard");

    const toggle = screen.getByRole("button", { name: "Open navigation menu" });
    expect(toggle).toHaveAttribute("aria-controls", "citizen-navigation");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    for (const name of ["Home", "Services", "Dashboard", "Submit request", "My requests", "Profile"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("highlights My requests on request details but not on the submission form", () => {
    authState.user = {
      id: 7,
      fullName: "Amina Citizen",
      email: "amina@example.test",
      role: "CITIZEN",
    };

    const { unmount } = renderLayout("/requests/42");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(screen.getByRole("link", { name: "My requests" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    unmount();

    renderLayout("/requests/new");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(screen.getByRole("link", { name: "Submit request" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "My requests" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("closes the citizen menu on Escape and route selection", () => {
    authState.user = {
      id: 7,
      fullName: "Amina Citizen",
      email: "amina@example.test",
      role: "CITIZEN",
    };
    renderLayout("/dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Profile" }));
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps inside taps and closes when the user taps outside the menu", () => {
    authState.user = {
      id: 7,
      fullName: "Amina Citizen",
      email: "amina@example.test",
      role: "CITIZEN",
    };
    renderLayout("/dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    fireEvent.pointerDown(screen.getByRole("link", { name: "Services" }));
    expect(screen.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

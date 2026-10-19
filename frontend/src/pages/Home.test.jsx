import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

const auth = vi.hoisted(() => ({ user: null }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

afterEach(() => {
  cleanup();
  auth.user = null;
});

describe("public landing page account links", () => {
  it("offers sign-in and registration at the end of the guest landing page", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const accountActions = screen.getByRole("region", { name: "Account access" });
    expect(accountActions).toHaveClass("mobile-account-actions");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("does not add guest account buttons for authenticated users", () => {
    auth.user = { role: "CITIZEN" };
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("region", { name: "Account access" })).toBeNull();
  });
});

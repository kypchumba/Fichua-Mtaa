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
  it("keeps the hero focused on centered content without decorative artwork", () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Sauti yako,\s*Jukumu letu\./,
    );
    expect(container.querySelector(".hero-art")).toBeNull();
  });

  it("keeps four briefing service cards that lead to the dedicated page", () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const cards = container.querySelectorAll(".category-tile");

    expect(cards).toHaveLength(4);
    cards.forEach((card) => expect(card).toHaveAttribute("href", "/services"));
  });

  it("offers sign-in and registration at the end of the guest landing page", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const accountActions = screen.getByRole("region", { name: "Account access" });
    expect(accountActions).toHaveClass("home-account-actions");
    expect(accountActions.querySelectorAll(".home-account-action")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(
      screen.getByText("Already registered? Sign in."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("New to Fichua Mtaa? Create an account."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sign in" }).closest(".home-account-action"),
    ).toHaveTextContent("Already registered? Sign in.");
    expect(
      screen.getByRole("link", { name: "Register" }).closest(".home-account-action"),
    ).toHaveTextContent("New to Fichua Mtaa? Create an account.");
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

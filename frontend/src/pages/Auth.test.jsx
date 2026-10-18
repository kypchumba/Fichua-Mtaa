import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthPage } from "./Auth";

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    login: authMocks.login,
    register: authMocks.register,
  }),
}));

function renderAuth(register = false) {
  return render(
    <MemoryRouter>
      <AuthPage register={register} />
    </MemoryRouter>,
  );
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("authentication forms", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    authMocks.login.mockReset();
    authMocks.register.mockReset();
  });

  it("toggles a login password without changing its value", () => {
    renderAuth();
    const password = screen.getByLabelText(/^Password/);
    fireEvent.change(password, { target: { value: "private-value" } });

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("private-value");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("toggles registration and confirmation passwords accessibly", () => {
    renderAuth(true);
    const password = screen.getByLabelText(/^Password/);
    const confirmation = screen.getByLabelText(/^Confirm password/);

    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show confirmation password" }));

    expect(confirmation).toHaveAttribute("type", "text");
    expect(password).toHaveAttribute("type", "password");
  });

  it("shows field-specific required errors without sending an empty login", () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Please enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your password.")).toBeInTheDocument();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("shows a safe generic credential error after a failed login", async () => {
    authMocks.login.mockRejectedValue(new Error("Incorrect email or password. Please try again."));
    renderAuth();
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "incorrect-value");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect email or password. Please try again.",
    );
  });

  it("shows the duplicate-email registration message", async () => {
    authMocks.register.mockRejectedValue(
      new Error("An account with this email already exists. Please log in instead."),
    );
    renderAuth(true);
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "An account with this email already exists. Please log in instead.",
      ),
    );
  });
});

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

function RequestedForm() {
  const location = useLocation();
  return (
    <p>
      Report form {location.search} from {location.state?.from}
    </p>
  );
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
    fireEvent.click(
      screen.getByRole("button", { name: "Show confirmation password" }),
    );

    expect(confirmation).toHaveAttribute("type", "text");
    expect(password).toHaveAttribute("type", "password");
  });

  it("shows which registration password requirements are met as the user types", () => {
    renderAuth(true);
    fill(/^Password/, "weak pass");
    expect(
      screen.getByText("At least one uppercase letter").closest("li"),
    ).not.toHaveClass("is-met");
    expect(
      screen.getByText("No spaces or other whitespace").closest("li"),
    ).not.toHaveClass("is-met");

    fill(/^Password/, "Abcdef1!");
    for (const label of [
      "At least 8 characters",
      "At least one uppercase letter",
      "At least one lowercase letter",
      "At least one number",
      "At least one special character",
      "No spaces or other whitespace",
    ]) {
      expect(screen.getByText(label).closest("li")).toHaveClass("is-met");
    }
  });

  it("does not submit registration when a password misses a required character type", () => {
    renderAuth(true);
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "lowercase1!");
    fill(/^Confirm password/, "lowercase1!");
    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    expect(
      screen.getByText("Password must meet all the requirements shown below."),
    ).toBeInTheDocument();
    expect(authMocks.register).not.toHaveBeenCalled();
  });

  it("shows field-specific required errors without sending an empty login", () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      screen.getByText("Please enter your email address."),
    ).toBeInTheDocument();
    expect(screen.getByText("Please enter your password.")).toBeInTheDocument();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it("shows a safe generic credential error after a failed login", async () => {
    authMocks.login.mockRejectedValue(
      new Error("Incorrect email or password. Please try again."),
    );
    renderAuth();
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "incorrect-value");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect email or password. Please try again.",
    );
  });

  it("shows a useful duplicate-email registration failure and preserves entered values", async () => {
    authMocks.register.mockRejectedValue(
      new Error(
        "An account with this email already exists. Please log in instead.",
      ),
    );
    renderAuth(true);
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    const dialog = await screen.findByRole("dialog", { name: "Registration failed" });
    expect(dialog).toHaveTextContent("This email address is already registered.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByLabelText(/^Email address/)).toHaveValue("citizen@example.com");
    expect(screen.getByLabelText(/^Password/)).toHaveValue("Community-Access-2026");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a loading modal and prevents duplicate registration submissions", async () => {
    let resolveRegistration;
    authMocks.register.mockImplementation(
      () => new Promise((resolve) => { resolveRegistration = resolve; }),
    );
    renderAuth(true);
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    expect(await screen.findByRole("dialog", { name: "Creating your account..." }))
      .toHaveTextContent("Please wait while we securely create your account.");
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);
    expect(authMocks.register).toHaveBeenCalledOnce();
    resolveRegistration({ role: "CITIZEN" });
  });

  it("shows a safe password requirement message for backend validation failures", async () => {
    const error = new Error("Server validation detail must not be exposed.");
    error.fields = { password: "invalid" };
    authMocks.register.mockRejectedValue(error);
    renderAuth(true);
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    const dialog = await screen.findByRole("dialog", { name: "Registration failed" });
    expect(dialog).toHaveTextContent("Use at least 8 characters");
    expect(dialog).not.toHaveTextContent("Server validation detail");
  });

  it.each([
    ["network failure", new Error("Network error including private details")],
    ["server failure", Object.assign(new Error("SQL constraint failed"), { status: 500 })],
  ])("shows a safe generic message after a %s", async (_label, error) => {
    authMocks.register.mockRejectedValue(error);
    renderAuth(true);
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    const dialog = await screen.findByRole("dialog", { name: "Registration failed" });
    expect(dialog).toHaveTextContent("Something went wrong. Please try again.");
    expect(dialog).not.toHaveTextContent(/SQL|private details/);
  });

  it("routes a successful citizen login to the citizen dashboard", async () => {
    authMocks.login.mockResolvedValue({ role: "CITIZEN" });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
          <Route path="/admin" element={<p>Administrator dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "citizen-password");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Citizen dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Administrator dashboard")).toBeNull();
  });

  it("routes a successful administrator login to administration", async () => {
    authMocks.login.mockResolvedValue({ role: "ADMIN" });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
          <Route path="/admin" element={<p>Administrator dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fill(/^Email address/, "admin@example.com");
    fill(/^Password/, "admin-password");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Administrator dashboard"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Citizen dashboard")).toBeNull();
  });

  it("returns a citizen to the selected service form after sign-in", async () => {
    authMocks.login.mockResolvedValue({ role: "CITIZEN" });
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: {
              returnTo: "/requests/new?category=Roads%20and%20Drainage",
              from: "/services",
            },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/requests/new" element={<RequestedForm />} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "citizen-password");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(
        "Report form ?category=Roads%20and%20Drainage from /services",
      ),
    ).toBeInTheDocument();
    expect(authMocks.login).toHaveBeenCalledOnce();
  });

  it("shows success only after server confirmation, then sends the visitor to sign-in", async () => {
    authMocks.register.mockResolvedValue({ role: "CITIZEN" });
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/register",
            state: {
              returnTo: "/requests/new?category=Water%20Supply",
              from: "/services",
            },
          },
        ]}
      >
        <Routes>
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/requests/new" element={<RequestedForm />} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("dialog", { name: "Registration successful!" }))
      .toHaveTextContent("Your account has been created. Please sign in to continue.");
    expect(authMocks.register).toHaveBeenCalledOnce();
    expect(authMocks.login).not.toHaveBeenCalled();
    await screen.findByLabelText(/^Email address/, {}, { timeout: 3000 });
    expect(screen.getByLabelText(/^Email address/)).toHaveValue("");
    expect(screen.getByLabelText(/^Password/)).toHaveValue("");
  });
});

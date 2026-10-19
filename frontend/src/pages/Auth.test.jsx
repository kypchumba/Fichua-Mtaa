import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findByText("Administrator dashboard")).toBeInTheDocument();
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
          <Route
            path="/requests/new"
            element={<RequestedForm />}
          />
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

  it("preserves the selected service when a visitor creates an account", async () => {
    authMocks.register.mockResolvedValue({ role: "CITIZEN" });
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/login",
            state: {
              returnTo: "/requests/new?category=Water%20Supply",
              from: "/services",
            },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/requests/new" element={<RequestedForm />} />
          <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Create an account" }));
    fill(/^Full name/, "Amina Citizen");
    fill(/^Email address/, "citizen@example.com");
    fill(/^Password/, "Community-Access-2026");
    fill(/^Confirm password/, "Community-Access-2026");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText("Report form ?category=Water%20Supply from /services"),
    ).toBeInTheDocument();
  });
});

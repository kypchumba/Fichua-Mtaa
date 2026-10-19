import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RoleGuard } from "./RoleGuard";

const authState = vi.hoisted(() => ({
  user: null,
  checking: false,
  sessionExpired: false,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => authState,
}));

function renderAt(path, role, user) {
  authState.user = user;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <RoleGuard role={role}>
              <p>{role} workspace</p>
            </RoleGuard>
          }
        />
        <Route path="/dashboard" element={<p>Citizen dashboard</p>} />
        <Route path="/admin" element={<p>Administrator dashboard</p>} />
        <Route path="/login" element={<p>Sign in screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("role-protected routes", () => {
  afterEach(() => {
    cleanup();
    authState.user = null;
  });

  it("redirects citizens away from administration", () => {
    renderAt("/admin/private", "ADMIN", { role: "CITIZEN" });
    expect(screen.getByText("Citizen dashboard")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN workspace")).toBeNull();
  });

  it("redirects administrators away from citizen request workflows", () => {
    renderAt("/requests/new", "CITIZEN", { role: "ADMIN" });
    expect(screen.getByText("Administrator dashboard")).toBeInTheDocument();
    expect(screen.queryByText("CITIZEN workspace")).toBeNull();
  });

  it("sends unauthenticated users to sign in", () => {
    renderAt("/requests/new", "CITIZEN", null);
    expect(screen.getByText("Sign in screen")).toBeInTheDocument();
  });
});

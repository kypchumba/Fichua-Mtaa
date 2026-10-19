import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SignOutControl from "./SignOutControl";

const auth = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

function renderControl() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route
          path="/profile"
          element={
            <>
              <SignOutControl className="button" />
              <p>Profile page</p>
            </>
          }
        />
        <Route path="/" element={<p>Public landing page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  auth.logout.mockReset();
});

describe("shared sign-out confirmation", () => {
  it("keeps the session when canceled or dismissed with Escape", () => {
    renderControl();
    const trigger = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Profile page")).toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it("ends the session and returns to the public page only after OK", async () => {
    auth.logout.mockResolvedValue(undefined);
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    await waitFor(() => expect(auth.logout).toHaveBeenCalledOnce());
    expect(await screen.findByText("Public landing page")).toBeInTheDocument();
  });

  it("keeps the user on the page and reports sign-out errors", async () => {
    auth.logout.mockRejectedValue(new Error("Session service unavailable"));
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Session service unavailable",
    );
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    expect(screen.getByText("Profile page")).toBeInTheDocument();
  });

  it("disables dialog actions while the session request is running", async () => {
    let finishSignOut;
    auth.logout.mockImplementation(
      () => new Promise((resolve) => { finishSignOut = resolve; }),
    );
    renderControl();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    finishSignOut();
    expect(await screen.findByText("Public landing page")).toBeInTheDocument();
  });
});

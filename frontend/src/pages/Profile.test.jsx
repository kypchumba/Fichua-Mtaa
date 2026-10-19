import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Profile from "./Profile";

const auth = vi.hoisted(() => ({
  user: { fullName: "Amina Citizen", email: "amina@example.test" },
  deleteAccount: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));

function Landing() {
  const location = useLocation();
  return <p>{location.state?.accountDeleted ? "Account deletion complete" : "Landing page"}</p>;
}

describe("citizen profile account deletion", () => {
  afterEach(() => {
    cleanup();
    auth.deleteAccount.mockReset();
    auth.logout.mockReset();
  });

  function renderProfile() {
    return render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Landing />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("requires an explicit final step, password, and typed DELETE", async () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Permanently delete your account?");
    fireEvent.click(screen.getByRole("button", { name: "Continue Delete" }));

    expect(auth.deleteAccount).not.toHaveBeenCalled();
    const submit = screen.getByRole("button", { name: "Permanently delete account" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Account password"), {
      target: { value: "correct-password" },
    });
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    expect(submit).toBeEnabled();
  });

  it("shows a contact button beside the delete-dialog actions", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));

    const contact = screen.getByRole("link", {
      name: "Contact the system administrator",
    });
    expect(contact).toHaveAttribute("href", "https://kypchumba.github.io/#get-in-touch");
    expect(contact).toHaveTextContent("Contact");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue Delete" })).toBeInTheDocument();
  });

  it("places citizen sign out in Profile beside Delete Account", () => {
    renderProfile();

    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Account" })).toBeInTheDocument();
  });

  it("returns to public home after a successful deletion", async () => {
    auth.deleteAccount.mockResolvedValue(null);
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue Delete" }));
    fireEvent.change(screen.getByLabelText("Account password"), {
      target: { value: "correct-password" },
    });
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete account" }));

    await waitFor(() => expect(auth.deleteAccount).toHaveBeenCalledWith({
      password: "correct-password",
      confirmation: "DELETE",
    }));
    expect(await screen.findByText("Account deletion complete")).toBeInTheDocument();
  });

  it("keeps the citizen on Profile when password re-authentication fails", async () => {
    auth.deleteAccount.mockRejectedValue(new Error("The password could not be verified."));
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue Delete" }));
    fireEvent.change(screen.getByLabelText("Account password"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The password could not be verified.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

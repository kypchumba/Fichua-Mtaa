import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import { RequestCreate } from "./RequestPages";

vi.mock("../api/client", () => ({ api: vi.fn() }));

function renderRequestForm(initialPath = "/requests/new") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/requests/new" element={<RequestCreate />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("request form category routing", () => {
  afterEach(cleanup);
  afterEach(() => vi.clearAllMocks());

  it("preselects a supported category from the service link URL", () => {
    renderRequestForm("/requests/new?category=Drainage%20and%20Flooding");

    expect(
      screen.getByRole("combobox", { name: /Service category/ }),
    ).toHaveValue("Drainage and Flooding");
    expect(
      screen.getAllByRole("option").filter((option) => option.value),
    ).toHaveLength(8);
  });

  it("ignores unsupported category query values", () => {
    renderRequestForm("/requests/new?category=Unknown");

    expect(
      screen.getByRole("combobox", { name: /Service category/ }),
    ).toHaveValue("");
  });

  it("keeps title suggestions and the focused input stable while typing", () => {
    renderRequestForm();
    const title = screen.getByRole("textbox", { name: /Request title/ });
    title.focus();
    fireEvent.change(title, { target: { value: "garbage" } });

    expect(title).toHaveFocus();
    expect(
      screen.getByRole("button", { name: /Uncollected garbage/ }),
    ).toBeVisible();
  });

  it("fills a selected suggestion without blurring the mobile title input", () => {
    renderRequestForm();
    const title = screen.getByRole("textbox", { name: /Request title/ });
    title.focus();
    fireEvent.change(title, { target: { value: "potholes" } });
    const suggestion = screen.getByRole("button", {
      name: /Potholes and damaged roads/,
    });
    fireEvent.pointerDown(suggestion);
    fireEvent.click(suggestion);

    expect(title).toHaveValue("Potholes and damaged roads");
    expect(title).toHaveFocus();
    expect(
      screen.queryByRole("group", { name: "Suggested request titles" }),
    ).not.toBeInTheDocument();
  });

  it("allows a custom title when no suggestions match", () => {
    renderRequestForm();
    const title = screen.getByRole("textbox", { name: /Request title/ });
    fireEvent.change(title, { target: { value: "A custom local concern" } });

    expect(title).toHaveValue("A custom local concern");
    expect(
      screen.queryByRole("group", { name: "Suggested request titles" }),
    ).not.toBeInTheDocument();
  });

  it("shows server field errors beside their inputs and clears only an edited error", async () => {
    api.mockRejectedValueOnce(
      Object.assign(new Error("Please correct the highlighted fields."), {
        fields: {
          title: "Request title must be between 5 and 120 characters.",
          location: "Affected location must be between 3 and 180 characters.",
        },
      }),
    );
    renderRequestForm();

    fireEvent.change(screen.getByRole("textbox", { name: /Request title/ }), {
      target: { value: "Hi" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Service category/ }), {
      target: { value: "Waste Management" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Location or area/ }), {
      target: { value: "Ny" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Describe the issue/ }), {
      target: { value: "Garbage collection has stopped in the area." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit request/ }));

    const title = screen.getByRole("textbox", { name: /Request title/ });
    const location = screen.getByRole("textbox", { name: /Location or area/ });
    expect(await screen.findByText(/Request title must be between/)).toBeVisible();
    expect(await screen.findByText(/Affected location must be between/)).toBeVisible();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(location).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveValue("Hi");
    expect(location).toHaveValue("Ny");

    fireEvent.change(title, { target: { value: "Broken streetlight" } });
    expect(title).toHaveAttribute("aria-invalid", "false");
    expect(location).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/Request title must be between/)).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please correct the highlighted fields.",
    );
    await waitFor(() => expect(api).toHaveBeenCalledOnce());
  });
});

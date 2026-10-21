import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import { RequestDetails } from "./RequestPages";

const stylesheet = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

vi.mock("../api/client", () => ({ api: vi.fn() }));

const report = {
  id: 31,
  referenceNumber: "FM-2026-ABC123",
  title: "Streetlight is out",
  description: "The streetlight near the market has been out for several days.",
  category: "Street Lighting",
  location: "Market Road",
  attachmentUrl:
    "https://res.cloudinary.com/demo/image/upload/fichua-mtaa/photo.webp",
  status: "PENDING",
  createdAt: "2026-10-18T10:00:00Z",
  updatedAt: "2026-10-18T10:00:00Z",
  resolvedAt: null,
  citizen: { fullName: "Amina Citizen", email: "amina@example.test" },
  history: [],
  internalNotes: [],
};

function renderDetails(admin = false) {
  const path = admin ? "/admin/requests/31" : "/requests/31";
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/requests/:id" element={<RequestDetails />} />
        <Route path="/admin/requests/:id" element={<RequestDetails admin />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.clearAllMocks();
});

describe("request image preview", () => {
  it.each([false, true])(
    "opens and closes the same cached image for admin=%s",
    async (admin) => {
      api.mockResolvedValue(report);
      renderDetails(admin);

      const thumbnail = await screen.findByRole("img", {
        name: "Citizen attached evidence",
      });
      expect(thumbnail).toHaveAttribute("loading", "lazy");
      fireEvent.click(
        screen.getByRole("button", {
          name: "Enlarge citizen attached evidence",
        }),
      );

      const preview = screen.getByRole("dialog", {
        name: "Report image preview",
      });
      const images = preview.querySelectorAll("img");
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute("src", thumbnail.getAttribute("src"));
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(document.body.style.overflow).toBe("");

      fireEvent.click(
        screen.getByRole("button", {
          name: "Enlarge citizen attached evidence",
        }),
      );
      expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
        "src",
        thumbnail.getAttribute("src"),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Close image preview" }),
      );
      expect(api).toHaveBeenCalledTimes(1);
    },
  );

  it("closes on backdrop click and restores focus to the thumbnail control", async () => {
    api.mockResolvedValue(report);
    renderDetails();
    await screen.findByRole("img", { name: "Citizen attached evidence" });
    const openButton = screen.getByRole("button", {
      name: "Enlarge citizen attached evidence",
    });
    openButton.focus();
    fireEvent.click(openButton);
    fireEvent.mouseDown(screen.getByRole("presentation"));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(openButton).toHaveFocus();
  });
});

describe("administrator request controls", () => {
  it("updates the displayed status from the successful API response", async () => {
    const updatedReport = {
      ...report,
      status: "IN_PROGRESS",
      updatedAt: "2026-10-19T10:00:00Z",
      history: [
        { newStatus: "IN_PROGRESS", changedAt: "2026-10-19T10:00:00Z" },
      ],
    };
    api.mockImplementation((path) =>
      path === "/admin/requests/31/status"
        ? Promise.resolve(updatedReport)
        : Promise.resolve(report),
    );
    renderDetails(true);
    await screen.findByText("Manage request");

    fireEvent.change(screen.getByLabelText("Change status"), {
      target: { value: "IN_PROGRESS" },
    });
    expect(screen.getByRole("button", { name: "Update status" })).toHaveClass(
      "request-status-button",
    );
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Request status updated successfully.");
    expect(toast.parentElement).toHaveClass("flash-toast-region");
    expect(document.querySelector(".inline-feedback")).not.toBeInTheDocument();
    expect(document.querySelector(".detail-heading .status")).toHaveTextContent(
      "IN PROGRESS",
    );
    expect(screen.getByText("IN PROGRESS", { selector: "b" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update status" })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(
      "/admin/requests/31/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS", note: "" }),
      }),
    );
  });

  it("blocks duplicate status updates and reports failures", async () => {
    let rejectStatus;
    api.mockImplementation((path) => {
      if (path === "/admin/requests/31/status") {
        return new Promise((resolve, reject) => {
          rejectStatus = reject;
        });
      }
      return Promise.resolve(report);
    });
    renderDetails(true);
    await screen.findByText("Manage request");
    fireEvent.change(screen.getByLabelText("Change status"), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    const updating = await screen.findByRole("button", { name: "Updating…" });
    fireEvent.click(updating);

    expect(
      api.mock.calls.filter(([path]) => path === "/admin/requests/31/status"),
    ).toHaveLength(1);
    rejectStatus(new Error("Status service unavailable"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not update request status. Please try again.",
    );
    expect(screen.queryByText("Request status updated successfully.")).not.toBeInTheDocument();
    expect(document.querySelector(".detail-heading .status")).toHaveTextContent(
      "PENDING",
    );
  });

  it("shows a completion message instead of status controls for resolved requests", async () => {
    api.mockResolvedValue({ ...report, status: "RESOLVED" });
    renderDetails(true);

    expect(
      await screen.findByText("This issue has been fully resolved."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Change status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update status" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Assign service")).toBeInTheDocument();
  });

  it("sends category assignments to the existing endpoint and updates the displayed category", async () => {
    const updatedReport = { ...report, category: "Public Facilities" };
    api.mockImplementation((path) =>
      path === "/admin/requests/31/category"
        ? Promise.resolve(updatedReport)
        : Promise.resolve(report),
    );
    renderDetails(true);
    await screen.findByText("Manage request");
    const categoryPicker = screen.getByLabelText("Assign service");
    expect(categoryPicker).toHaveTextContent("Public Facilities");
    fireEvent.change(categoryPicker, { target: { value: "Public Facilities" } });
    const assignButton = screen.getByRole("button", { name: "Update service" });
    expect(assignButton).toHaveClass("assign-service-button");
    fireEvent.click(assignButton);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Service category updated successfully.",
    );
    expect(document.querySelector(".detail-heading p")).toHaveTextContent(
      "Public Facilities",
    );
    expect(api).toHaveBeenCalledWith(
      "/admin/requests/31/category",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ category: "Public Facilities" }),
      }),
    );
  });

  it("shows a failure toast for an unsuccessful service assignment and re-enables the button", async () => {
    api.mockImplementation((path) =>
      path === "/admin/requests/31/category"
        ? Promise.reject(new Error("Category update rejected"))
        : Promise.resolve(report),
    );
    renderDetails(true);
    await screen.findByText("Manage request");
    fireEvent.change(screen.getByLabelText("Assign service"), {
      target: { value: "Other" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update service" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not update service category. Please try again.",
    );
    expect(screen.queryByText("Service category updated successfully.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update service" })).toBeEnabled();
    expect(document.querySelector(".detail-heading p")).toHaveTextContent(
      "Street Lighting",
    );
  });

  it("keeps service and status updates independent of optional internal notes", async () => {
    api.mockResolvedValue(report);
    renderDetails(true);
    await screen.findByText("Manage request");

    fireEvent.change(screen.getByLabelText("Assign service"), {
      target: { value: "Other" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update service" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/admin/requests/31/category",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Change status"), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "/admin/requests/31/status",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(api).not.toHaveBeenCalledWith(
      "/admin/requests/31/notes",
      expect.anything(),
    );
    expect(document.querySelector(".internal-note-form")).toContainElement(
      screen.getByRole("button", { name: "Save note" }),
    );
    expect(
      document.querySelector(".request-management-controls"),
    ).toContainElement(screen.getByRole("button", { name: "Update status" }));
  });

  it("only reports an empty-note error after Save note is explicitly clicked", async () => {
    api.mockResolvedValue(report);
    renderDetails(true);
    const save = await screen.findByRole("button", { name: "Save note" });

    expect(save).toBeEnabled();
    expect(save).toHaveClass("button");
    expect(api).toHaveBeenCalledTimes(1);
    fireEvent.click(save);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter an internal note before choosing Save note.",
    );
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("blocks repeated note submissions and restores the button after a failed save", async () => {
    let failSave;
    api.mockImplementation((path) => {
      if (path === "/admin/requests/31/notes") {
        return new Promise((resolve, reject) => {
          failSave = () => reject(new Error("Notes service unavailable"));
        });
      }
      return Promise.resolve(report);
    });
    renderDetails(true);
    const save = await screen.findByRole("button", { name: "Save note" });
    fireEvent.change(screen.getByLabelText(/Add an internal note/), {
      target: { value: "Maintenance team contacted." },
    });
    fireEvent.click(save);
    expect(
      await screen.findByRole("button", { name: "Saving note…" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Saving note…" }));
    expect(
      api.mock.calls.filter(([path]) => path === "/admin/requests/31/notes"),
    ).toHaveLength(1);

    failSave();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the internal note. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
  });

  it("styles request controls with pointer, hover and keyboard focus feedback", () => {
    expect(stylesheet).toMatch(/\.button\s*\{[^}]*cursor:\s*pointer/s);
    expect(stylesheet).toMatch(/\.status-control select\s*\{[^}]*cursor:\s*pointer/s);
    expect(stylesheet).toMatch(/\.request-status-button:hover:not\(:disabled\)/);
    expect(stylesheet).toMatch(/\.assign-service-button:hover:not\(:disabled\)/);
    expect(stylesheet).toMatch(/\.request-status-button:focus-visible/);
    expect(stylesheet).toMatch(/\.assign-service-button:focus-visible/);
  });
});

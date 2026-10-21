import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import { RequestDetails } from "./RequestPages";
import Admin from "./Admin";

vi.mock("../api/client", () => ({ api: vi.fn() }));
vi.mock("../components/SignOutControl", () => ({
  default: ({ className }) => <button className={className}>Sign out</button>,
}));

// Recharts observes container size; jsdom has no native ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const requestPage = {
  content: [
    {
      id: 1,
      referenceNumber: "FM-2026-ABC123",
      title: "Street light is out",
      category: "Street Lighting",
      location: "Central Ward",
      createdAt: "2026-10-19T06:00:00Z",
      status: "PENDING",
      citizen: { fullName: "Citizen Name", email: "citizen@example.test" },
    },
  ],
  totalElements: 1,
  totalPages: 1,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("admin dashboard data loading", () => {
  it("keeps the request list visible when analytics fails", async () => {
    api.mockImplementation((path) => {
      if (path === "/admin/analytics") {
        return Promise.reject(new Error("Analytics temporarily unavailable"));
      }
      return Promise.resolve(requestPage);
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );

    expect(await screen.findByText("FM-2026-ABC123")).toBeInTheDocument();
    expect(
      await screen.findByText("Analytics temporarily unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Street light is out")).toBeInTheDocument();
  });

  it("keeps analytics visible when the request list fails", async () => {
    api.mockImplementation((path) =>
      path === "/admin/analytics"
        ? Promise.resolve({
            total: 4,
            pending: 2,
            inProgress: 1,
            resolved: 1,
            open: 3,
            byStatus: { PENDING: 2, IN_PROGRESS: 1, RESOLVED: 1 },
            byCategory: {},
          })
        : Promise.reject(new Error("Request queue unavailable")),
    );

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Request queue unavailable")).toBeInTheDocument();
    });
    expect(screen.getByText("Total requests")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("explains when a status filter excludes a request after a status change", async () => {
    api.mockImplementation((path) => {
      if (path === "/admin/analytics") {
        return Promise.resolve({
          total: 1,
          pending: 0,
          inProgress: 0,
          resolved: 1,
          open: 0,
          byStatus: { RESOLVED: 1 },
          byCategory: {},
        });
      }
      const params = new URL(path, "http://localhost").searchParams;
      return Promise.resolve(
        params.get("status") === "PENDING"
          ? { content: [], totalElements: 0, totalPages: 0 }
          : { ...requestPage, content: [{ ...requestPage.content[0], status: "RESOLVED" }] },
      );
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );
    await screen.findByText("FM-2026-ABC123");
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), {
      target: { value: "PENDING" },
    });

    expect(
      await screen.findByText(
        "No requests match PENDING. If you just updated a request, its new status may no longer match this filter. Choose All statuses to find it.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the administrator sign-out control beside Refresh", async () => {
    api.mockImplementation((path) =>
      path === "/admin/analytics"
        ? Promise.resolve({
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0,
            open: 0,
            byStatus: {},
            byCategory: {},
          })
        : Promise.resolve({ content: [], totalElements: 0, totalPages: 0 }),
    );
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );

    const refresh = screen.getByRole("button", { name: "Refresh dashboard" });
    const signOut = screen.getByRole("button", { name: "Sign out" });
    expect(refresh.parentElement).toBe(signOut.parentElement);
    await waitFor(() => expect(screen.getAllByText("No request data yet.")).toHaveLength(2));
  });

  it("shows loading feedback during manual refresh, including when requests fail", async () => {
    api.mockImplementation((path) =>
      path === "/admin/analytics"
        ? Promise.resolve({
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0,
            open: 0,
            byStatus: {},
            byCategory: {},
          })
        : Promise.resolve({ content: [], totalElements: 0, totalPages: 0 }),
    );
    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );
    const refresh = screen.getByRole("button", { name: "Refresh dashboard" });
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));

    let finishAnalytics;
    let finishRequests;
    api.mockImplementation((path) =>
      new Promise((resolve, reject) => {
        if (path === "/admin/analytics") {
          finishAnalytics = () => resolve({
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0,
            open: 0,
            byStatus: {},
            byCategory: {},
          });
        } else {
          finishRequests = () => reject(new Error("Request list unavailable"));
        }
      }),
    );

    fireEvent.click(refresh);
    expect(refresh).toBeDisabled();
    expect(refresh).toHaveTextContent("Refreshing…");
    expect(refresh).toHaveAttribute("aria-busy", "true");
    fireEvent.click(refresh);
    expect(api).toHaveBeenCalledTimes(4);

    finishAnalytics();
    finishRequests();
    expect(await screen.findByText("Request list unavailable")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Refresh dashboard" })).toBeEnabled();
  });

  it("keeps a request visible in Manage Requests after resolving and refreshing", async () => {
    let currentStatus = "PENDING";
    const requestDetails = {
      ...requestPage.content[0],
      description: "The streetlight near the market has been out for days.",
      citizen: requestPage.content[0].citizen,
      history: [],
      internalNotes: [],
    };
    const resolvedPage = {
      ...requestPage,
      content: [{ ...requestPage.content[0], status: "RESOLVED" }],
    };

    api.mockImplementation((path, options = {}) => {
      if (path === "/admin/analytics") {
        return Promise.resolve({
          total: 1,
          pending: currentStatus === "PENDING" ? 1 : 0,
          inProgress: currentStatus === "IN_PROGRESS" ? 1 : 0,
          resolved: currentStatus === "RESOLVED" ? 1 : 0,
          open: currentStatus === "RESOLVED" ? 0 : 1,
          byStatus: { [currentStatus]: 1 },
          byCategory: { "Street Lighting": 1 },
        });
      }
      if (path.startsWith("/admin/requests?")) {
        return Promise.resolve(
          currentStatus === "RESOLVED"
            ? resolvedPage
            : {
                ...requestPage,
                content: [{ ...requestPage.content[0], status: currentStatus }],
              },
        );
      }
      if (path === "/admin/requests/1/status") {
        currentStatus = JSON.parse(options.body).status;
        return Promise.resolve({
          ...requestDetails,
          status: currentStatus,
          history: [{ newStatus: currentStatus, changedAt: "2026-10-20T10:00:00Z" }],
        });
      }
      if (path === "/admin/requests/1") {
        return Promise.resolve({ ...requestDetails, status: currentStatus });
      }
      return Promise.resolve(null);
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/admin/requests/:id"
            element={<RequestDetails admin />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("link", { name: "View" }));
    await screen.findByText("Manage request");
    fireEvent.change(screen.getByLabelText("Change status"), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    await screen.findByText("Request status updated successfully.");

    fireEvent.change(screen.getByLabelText("Change status"), {
      target: { value: "RESOLVED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm resolution" }));
    await screen.findByText("Request status updated successfully.");
    expect(
      screen.getByText("This issue has been fully resolved."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Change status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "← Back to all requests" }));
    expect(await screen.findByText("FM-2026-ABC123")).toBeInTheDocument();
    const requestRow = screen.getByText("FM-2026-ABC123").closest("tr");
    expect(requestRow).toHaveTextContent("RESOLVED");

    const requestListCallCount = api.mock.calls.filter(([path]) =>
      path.startsWith("/admin/requests?"),
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Refresh dashboard" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("/admin/analytics"));
    await waitFor(() => {
      expect(
        api.mock.calls.filter(([path]) => path.startsWith("/admin/requests?")),
      ).toHaveLength(requestListCallCount + 1);
    });
    await waitFor(() => {
      expect(screen.getByText("FM-2026-ABC123").closest("tr")).toHaveTextContent(
        "RESOLVED",
      );
    });
  });
});

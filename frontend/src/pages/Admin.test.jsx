import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import Admin from "./Admin";

vi.mock("../api/client", () => ({ api: vi.fn() }));

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
});

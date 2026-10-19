import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { BackLink } from "./BackLink";

function PreviousPage() {
  const location = useLocation();
  return <h1>Previous page {location.search}</h1>;
}

function renderBackFlow(entries, from = undefined) {
  const formEntry = {
    pathname: "/requests/new",
    search: "?category=Water%20Supply",
    state: from ? { from } : undefined,
  };

  return render(
    <MemoryRouter initialEntries={[...entries, formEntry]}>
      <Routes>
        <Route
          path="/requests/new"
          element={
            <>
              <BackLink fallbackTo="/requests">← Back</BackLink>
              <p>Report form</p>
            </>
          }
        />
        <Route path="/services" element={<PreviousPage />} />
        <Route path="/requests" element={<h1>My requests fallback</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("navigation-aware Back button", () => {
  afterEach(cleanup);

  it("returns to the exact in-app route, including its search state", () => {
    renderBackFlow([{ pathname: "/services", search: "?category=roads" }], "/services?category=roads");
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));

    expect(screen.getByRole("heading", { name: "Previous page ?category=roads" })).toBeInTheDocument();
  });

  it("uses a safe citizen page if the report form was opened directly", () => {
    renderBackFlow([]);
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));

    expect(screen.getByRole("heading", { name: "My requests fallback" })).toBeInTheDocument();
  });
});

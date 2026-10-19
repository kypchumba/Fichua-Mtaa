import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequestCreate } from "./RequestPages";

describe("request form category routing", () => {
  afterEach(cleanup);

  it("preselects a supported category from the service link URL", () => {
    render(
      <MemoryRouter
        initialEntries={["/requests/new?category=Roads%20and%20Drainage"]}
      >
        <Routes>
          <Route path="/requests/new" element={<RequestCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("combobox", { name: /Service category/ }),
    ).toHaveValue("Roads and Drainage");
  });

  it("ignores unsupported category query values", () => {
    render(
      <MemoryRouter initialEntries={["/requests/new?category=Unknown"]}>
        <Routes>
          <Route path="/requests/new" element={<RequestCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("combobox", { name: /Service category/ }),
    ).toHaveValue("");
  });
});

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { FlashToast } from "./FlashToast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("flash notifications", () => {
  it("announces success and dismisses it after two seconds", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <FlashToast
        notification={{ message: "Request status updated successfully." }}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Request status updated successfully.",
    );
    expect(document.querySelector(".flash-toast-region")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    rerender(<FlashToast notification={null} onDismiss={onDismiss} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces failures as alerts", () => {
    render(
      <FlashToast
        notification={{
          kind: "error",
          message: "Could not update service category. Please try again.",
        }}
        onDismiss={() => {}}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update service category. Please try again.",
    );
  });
});

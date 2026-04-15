// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";

// A child that throws when 'shouldThrow' prop is true
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error("test error message");
    return <div>all good</div>;
}

// vitest swallows the console.error from ErrorBoundary — suppress it in tests
beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
    it("renders children when there is no error", () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={false} />
            </ErrorBoundary>
        );
        expect(screen.getByText("all good")).toBeInTheDocument();
    });

    it("renders the fallback UI when a child throws", () => {
        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("test error message")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    });

    it("calls window.location.reload when Reload is clicked", async () => {
        const reloadMock = vi.fn();
        Object.defineProperty(window, "location", {
            configurable: true,
            value: { reload: reloadMock },
        });

        render(
            <ErrorBoundary>
                <ThrowingChild shouldThrow={true} />
            </ErrorBoundary>
        );

        await userEvent.click(screen.getByRole("button", { name: /reload/i }));
        expect(reloadMock).toHaveBeenCalledOnce();
    });
});

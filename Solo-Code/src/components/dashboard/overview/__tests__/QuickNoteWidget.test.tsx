import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const state = { content: "saved v1", isLoading: false };
const save = vi.fn<(v: string) => Promise<void>>();

vi.mock("@/store/dashboardNotes", () => ({
  useDashboardNotes: () => ({ content: state.content, isLoading: state.isLoading, save }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { QuickNoteWidget } from "../QuickNoteWidget";

const box = () => screen.getByRole("textbox") as HTMLTextAreaElement;

beforeEach(() => {
  vi.useFakeTimers();
  state.content = "saved v1";
  state.isLoading = false;
  save.mockReset();
  save.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("QuickNoteWidget autosave", () => {
  it("saves once after the debounce", async () => {
    render(<QuickNoteWidget />);
    fireEvent.change(box(), { target: { value: "hello" } });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("hello");
  });

  it("does not overwrite text typed while a save is in flight when the server copy refreshes", async () => {
    let resolveSave!: () => void;
    save.mockImplementation(() => new Promise<void>((r) => (resolveSave = r)));
    const { rerender } = render(<QuickNoteWidget />);

    fireEvent.change(box(), { target: { value: "abc" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600); // save("abc") now in flight
    });
    fireEvent.change(box(), { target: { value: "abcdef" } }); // user keeps typing

    // save finishes, query refetches and hands back the OLDER saved value
    state.content = "abc";
    await act(async () => {
      resolveSave();
      await Promise.resolve();
    });
    rerender(<QuickNoteWidget />);

    expect(box().value).toBe("abcdef");

    // and the newer text is saved next
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(save).toHaveBeenLastCalledWith("abcdef");
  });

  it("still adopts a server change (other tab) when the user has no unsaved edits", () => {
    const { rerender } = render(<QuickNoteWidget />);
    expect(box().value).toBe("saved v1");
    state.content = "from another tab";
    rerender(<QuickNoteWidget />);
    expect(box().value).toBe("from another tab");
  });

  it("flushes a pending edit when unmounted before the debounce fires", () => {
    const { unmount } = render(<QuickNoteWidget />);
    fireEvent.change(box(), { target: { value: "unsent" } });
    unmount();
    expect(save).toHaveBeenCalledWith("unsent");
  });
});

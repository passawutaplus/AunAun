import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mutateAsync = vi.fn();
vi.mock("@/hooks/useCommunityPostInteractions", () => ({
  useBlockUser: () => ({ mutateAsync }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { BlockConfirmDialog } from "../BlockConfirmDialog";

const USER = "82039b6d-cdf4-4c46-958a-d770d849382c";

beforeEach(() => {
  mutateAsync.mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("BlockConfirmDialog", () => {
  it("asks first and blocks nobody until confirmed", () => {
    render(<BlockConfirmDialog open onOpenChange={() => {}} userId={USER} name="Mali" />);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText(/Mali/)).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("cancel closes without blocking", () => {
    const onOpenChange = vi.fn();
    render(<BlockConfirmDialog open onOpenChange={onOpenChange} userId={USER} name="Mali" />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("confirm blocks the user, closes and reports back", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const onBlocked = vi.fn();
    render(<BlockConfirmDialog open onOpenChange={onOpenChange} userId={USER} onBlocked={onBlocked} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    await waitFor(() => expect(onBlocked).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith(USER);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open and shows the error when blocking fails", async () => {
    mutateAsync.mockRejectedValue(new Error("offline"));
    const onOpenChange = vi.fn();
    render(<BlockConfirmDialog open onOpenChange={onOpenChange} userId={USER} />);
    fireEvent.click(screen.getAllByRole("button")[1]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("offline"));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

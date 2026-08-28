import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InboxPhoneField } from "@/components/inbox/InboxPhoneField";

describe("InboxPhoneField", () => {
  it("opens an editor and saves a Thai mobile", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InboxPhoneField phone={null} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "ใส่เบอร์โทร" }));
    fireEvent.change(screen.getByRole("textbox", { name: "เบอร์โทรลูกค้า" }), {
      target: { value: "081-234-5678" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "บันทึกเบอร์โทร" }));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("0812345678");
    });
  });

  it("shows a validation error for a short number", () => {
    render(<InboxPhoneField phone={null} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "ใส่เบอร์โทร" }));
    fireEvent.change(screen.getByRole("textbox", { name: "เบอร์โทรลูกค้า" }), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกเบอร์โทร" }));
    expect(screen.getByText("เบอร์โทรไทยไม่ถูกต้อง")).toBeInTheDocument();
  });
});

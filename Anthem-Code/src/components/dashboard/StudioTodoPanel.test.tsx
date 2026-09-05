import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import StudioTodoPanel from "@/components/dashboard/StudioTodoPanel";
import { studioTodoStorageKey } from "@/lib/studioHomeStorage";

const USER_ID = "todo-edit-user";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    studioTodoStorageKey(USER_ID),
    JSON.stringify([
      {
        id: "todo-1",
        title: "wefasdf",
        done: false,
        createdAt: "2026-08-28T00:00:00.000Z",
        priority: "ปกติ",
      },
    ]),
  );
});

describe("StudioTodoPanel", () => {
  it("renames a todo from the edit button next to delete", () => {
    render(<StudioTodoPanel userId={USER_ID} queue={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "แก้ไขชื่อ wefasdf" }));
    const input = screen.getByRole("textbox", { name: "แก้ไขชื่อ wefasdf" });
    fireEvent.change(input, { target: { value: "โทรลูกค้า" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("โทรลูกค้า")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แก้ไขชื่อ โทรลูกค้า" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(studioTodoStorageKey(USER_ID)) ?? "[]")).toEqual([
      expect.objectContaining({ id: "todo-1", title: "โทรลูกค้า" }),
    ]);
  });
});

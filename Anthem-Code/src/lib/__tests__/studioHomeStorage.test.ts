import { describe, expect, it } from "vitest";
import { createStudioTodo, parseStudioTodos, reorderStudioTodos } from "@/lib/studioHomeStorage";
import { buildStudioPulseSeries, studioPulseHasSignal } from "@/lib/studioPulseSeries";

describe("studio home storage", () => {
  it("parses valid todos and skips junk", () => {
    const raw = JSON.stringify([
      { id: "a", title: "ส่งไฟล์", done: true, createdAt: "2026-08-27T00:00:00.000Z", priority: "ด่วน" },
      { id: "b", title: "ของเก่าไม่มี priority", done: false, createdAt: "2026-08-27T00:00:00.000Z" },
      { id: 1, title: "bad" },
      { title: "missing id" },
    ]);
    expect(parseStudioTodos(raw)).toEqual([
      {
        id: "a",
        title: "ส่งไฟล์",
        done: true,
        createdAt: "2026-08-27T00:00:00.000Z",
        priority: "ด่วน",
      },
      {
        id: "b",
        title: "ของเก่าไม่มี priority",
        done: false,
        createdAt: "2026-08-27T00:00:00.000Z",
        priority: "ปกติ",
      },
    ]);
    expect(parseStudioTodos("nope")).toEqual([]);
  });

  it("creates a trimmed pending todo", () => {
    const todo = createStudioTodo("  โทรลูกค้า  ", new Date("2026-08-27T10:00:00.000Z"));
    expect(todo.title).toBe("โทรลูกค้า");
    expect(todo.done).toBe(false);
    expect(todo.priority).toBe("ปกติ");
    expect(todo.createdAt).toBe("2026-08-27T10:00:00.000Z");
  });

  it("reorders by dragging one id onto another", () => {
    const list = [
      createStudioTodo("หนึ่ง", new Date("2026-08-27T10:00:00.000Z")),
      createStudioTodo("สอง", new Date("2026-08-27T10:00:01.000Z")),
      createStudioTodo("สาม", new Date("2026-08-27T10:00:02.000Z")),
    ].map((item, index) => ({ ...item, id: ["a", "b", "c"][index]! }));
    expect(reorderStudioTodos(list, "c", "a").map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});

describe("studio pulse series", () => {
  it("buckets views and requests by day", () => {
    const from = new Date("2026-08-25T00:00:00");
    const to = new Date("2026-08-27T23:59:59");
    const series = buildStudioPulseSeries(
      ["2026-08-26T08:00:00", "2026-08-26T18:00:00", "2026-08-27T09:00:00"],
      from,
      to,
    );
    expect(series).toHaveLength(3);
    expect(series[1]?.views).toBe(2);
    expect(series[2]?.views).toBe(1);
    expect(studioPulseHasSignal(series)).toBe(true);
  });
});

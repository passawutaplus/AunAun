import { describe, expect, it } from "vitest";
import {
  clampRectToViewport,
  normalizeDragRect,
  scaleRect,
  viewportRectToDocument,
} from "@/lib/feedbackCapture";
import {
  encodeFeedbackScreenshotRef,
  feedbackKindLabel,
  isFeedbackKind,
  parseFeedbackComments,
  parseFeedbackScreenshotRef,
} from "@/lib/feedbackTicket";

describe("feedbackTicket", () => {
  it("accepts only bug/idea/error", () => {
    expect(isFeedbackKind("bug")).toBe(true);
    expect(isFeedbackKind("idea")).toBe(true);
    expect(isFeedbackKind("error")).toBe(true);
    expect(isFeedbackKind("report")).toBe(false);
    expect(feedbackKindLabel("bug")).toBe("บั๊ก");
    expect(feedbackKindLabel(null)).toBe("คะแนน");
  });

  it("round-trips private screenshot refs", () => {
    const ref = encodeFeedbackScreenshotRef("uid/shot.webp");
    expect(parseFeedbackScreenshotRef(ref)).toEqual({
      bucket: "feedback-screenshots",
      path: "uid/shot.webp",
    });
    expect(parseFeedbackScreenshotRef("uid/../secret")).toBeNull();
  });

  it("parses comment pins and drops junk", () => {
    expect(
      parseFeedbackComments({
        comments: [
          { number: 1, nx: 0.25, ny: 0.5, text: "ดีสุดๆ" },
          { number: 2, nx: 9, ny: -1, text: "x".repeat(600) },
          { bad: true },
        ],
      }),
    ).toEqual([
      { number: 1, nx: 0.25, ny: 0.5, text: "ดีสุดๆ" },
      { number: 2, nx: 1, ny: 0, text: "x".repeat(500) },
    ]);
  });
});

describe("feedbackCapture rect math", () => {
  it("normalizes a reverse drag", () => {
    expect(normalizeDragRect({ x: 80, y: 90 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 70,
      height: 70,
    });
  });

  it("clamps to the viewport", () => {
    expect(clampRectToViewport({ x: -10, y: -10, width: 50, height: 50 }, 100, 80)).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
  });

  it("maps viewport crop onto the document", () => {
    expect(viewportRectToDocument({ x: 10, y: 20, width: 30, height: 40 }, 100, 200)).toEqual({
      x: 110,
      y: 220,
      width: 30,
      height: 40,
    });
  });

  it("scales crop to the captured bitmap", () => {
    expect(scaleRect({ x: 10, y: 20, width: 30, height: 40 }, 2, 1.5)).toEqual({
      x: 20,
      y: 30,
      width: 60,
      height: 60,
    });
  });

  it("maps a viewport selection onto a viewport-sized bitmap", () => {
    const imgW = 800;
    const imgH = 600;
    const vw = 400;
    const vh = 300;
    expect(scaleRect({ x: 40, y: 30, width: 100, height: 50 }, imgW / vw, imgH / vh)).toEqual({
      x: 80,
      y: 60,
      width: 200,
      height: 100,
    });
  });
});

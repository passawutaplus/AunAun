import confetti from "canvas-confetti";

/** Fire a celebratory confetti burst from both screen edges. */
export function celebrateFromEdges() {
  const duration = 1800;
  const end = Date.now() + duration;
  const colors = ["#3b82f6", "#22c55e", "#facc15", "#ec4899", "#a855f7"];

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 65,
      startVelocity: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      scalar: 1.05,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 65,
      startVelocity: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      scalar: 1.05,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

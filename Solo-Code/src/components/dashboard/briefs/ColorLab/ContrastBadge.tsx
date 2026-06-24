import * as React from "react";

interface Props {
  ratio: number;
  bg: "white" | "black";
}

export function ContrastBadge({ ratio, bg }: Props) {
  const tier = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-Large" : "FAIL";
  const ok = ratio >= 4.5;
  const isWhite = bg === "white";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono font-semibold backdrop-blur-sm border ${
        ok ? "border-emerald-500/40" : "border-red-500/40"
      }`}
      style={{
        backgroundColor: isWhite ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)",
        color: isWhite ? "#000" : "#fff",
      }}
      title={`Contrast ${ratio}:1 บนพื้น${isWhite ? "ขาว" : "ดำ"}`}
    >
      <span>{isWhite ? "บนขาว" : "บนดำ"}</span>
      <span>{ratio.toFixed(2)}</span>
      <span className={ok ? "text-emerald-600" : "text-red-500"}>{tier}</span>
    </div>
  );
}

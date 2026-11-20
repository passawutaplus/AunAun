import { Outlet } from "react-router-dom";
import { GrowthProvider } from "@/lib/growth/store";

/** Shared mock state for /admin/growth/* (overview ↔ campaign keep the same in-memory data). */
export default function GrowthLayout() {
  return (
    <GrowthProvider>
      <Outlet />
    </GrowthProvider>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { LineLinkScreen } from "@/components/line/LineLinkScreen";

export const Route = createFileRoute("/line-link")({
  component: LineLinkScreen,
});

import { HttpErrorPage } from "@/components/HttpErrorPage";

export function RouteError({ error }: { error: Error }) {
  const message = error?.message || undefined;
  const code = message?.includes("404") ? 404 : 500;

  return (
    <HttpErrorPage
      kind={code >= 500 ? "500" : "generic"}
      code={code}
      errorMessage={message}
      showRetry
      showSupport
    />
  );
}

import { Navigate, useSearchParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";

function continuePath(searchParams: URLSearchParams): string {
  const qs = new URLSearchParams();
  if (searchParams.get("preview") === "wallet") qs.set("preview", "wallet");
  const q = qs.toString();
  return q ? `/earnings/withdraw?${q}` : "/earnings/withdraw";
}

/** PIN is set once, then only asked when confirming a withdrawal. */
export default function WithdrawPinPage() {
  const [searchParams] = useSearchParams();
  return (
    <>
      <SeoHead title="My Studio — ถอนเงิน" path="/earnings/withdraw/pin" noindex />
      <Navigate to={continuePath(searchParams)} replace />
    </>
  );
}

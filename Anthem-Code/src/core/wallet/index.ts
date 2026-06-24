// Shared wallet surface. Both apps debit/credit the same PX balance.
export {
  useWallet,
  useTopUpHistory,
  type Wallet,
} from "@/hooks/useWallet";
export {
  useCashoutHistory,
  useRequestCashout,
  PLATFORM_FEE_RATE,
  MIN_CASHOUT_PX,
  type CashoutRequest,
} from "@/hooks/useCashout";

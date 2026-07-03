import type { Wallet } from "@/hooks/useWallet";

/** px ที่ใช้ส่งของขวัญได้ (welcome + purchased พร้อมใช้) */
export function computeGiftablePx(
  wallet: Wallet | undefined,
  purchasedAvailable?: number,
): number {
  if (!wallet) return 0;
  const welcome = wallet.welcome_px ?? 0;
  const purchased =
    purchasedAvailable ?? wallet.purchased_px ?? 0;
  return welcome + purchased;
}

/** ยอดรวมในกระเป๋า (แสดงใน UI) */
export function computeWalletTotalPx(wallet: Wallet | undefined): number {
  if (!wallet) return 0;
  return (
    (wallet.welcome_px ?? 0) +
    (wallet.purchased_px ?? 0) +
    (wallet.balance_px ?? 0)
  );
}

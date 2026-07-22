import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests, usePayoutProfile } from "@/hooks/useKyc";
import {
  evaluateHireSellerReadiness,
  type HireSellerReadiness,
} from "@/lib/hireSellerReadiness";
import type { BillingProfileFields } from "@/lib/billingProfile";

function emailConfirmedFromUser(user: { email_confirmed_at?: string | null; confirmed_at?: string | null } | null | undefined): boolean {
  if (!user) return false;
  return !!(user.email_confirmed_at || user.confirmed_at);
}

export function useHireSellerReadiness(userId?: string): HireSellerReadiness & {
  isLoading: boolean;
} {
  const { user } = useAuth();
  const uid = userId ?? user?.id;
  const { data: profile, isLoading: profileLoading } = useProfile(uid);
  const {
    data: payout,
    isLoading: payoutLoading,
    isError: payoutError,
  } = usePayoutProfile();
  const { data: kycRequests = [], isLoading: kycLoading } = useMyKycRequests();

  const result = useMemo(() => {
    const approvedKyc = kycRequests.find((r) => r.status === "approved");
    const pendingKyc = kycRequests.some((r) => r.status === "pending");
    const bankFromPayout =
      !payoutError && payout
        ? {
            bank_name: payout.bank_name,
            account_number: payout.account_number,
            account_name: payout.account_name,
            verified_at: payout.verified_at,
          }
        : null;
    const bankFromKyc = approvedKyc
      ? {
          bank_name: approvedKyc.bank_name,
          account_number: approvedKyc.account_number,
          account_name: approvedKyc.account_name,
          verified_at: approvedKyc.reviewed_at,
        }
      : null;

    const billing: BillingProfileFields | null = profile
      ? {
          billing_type: (profile as { billing_type?: string | null }).billing_type,
          legal_name: (profile as { legal_name?: string | null }).legal_name,
          company_name: (profile as { company_name?: string | null }).company_name,
          tax_id: (profile as { tax_id?: string | null }).tax_id,
          billing_address:
            (profile as { billing_address?: string | null }).billing_address ||
            (profile as { address?: string | null }).address,
          branch: (profile as { branch?: string | null }).branch,
          contact_person: (profile as { contact_person?: string | null }).contact_person,
          contact_role: (profile as { contact_role?: string | null }).contact_role,
          vat_registered: (profile as { vat_registered?: boolean | null }).vat_registered,
          display_name: profile.display_name,
          email: (profile as { email?: string | null }).email ?? user?.email,
          phone: (profile as { phone?: string | null }).phone,
        }
      : null;

    const bankFromProfile =
      profile &&
      ((profile as { bank_name?: string | null }).bank_name ||
        (profile as { bank_account_number?: string | null }).bank_account_number)
        ? {
            bank_name: (profile as { bank_name?: string | null }).bank_name,
            account_number: (profile as { bank_account_number?: string | null }).bank_account_number,
            account_name: (profile as { bank_account_name?: string | null }).bank_account_name,
            verified_at: (profile as { verified_at?: string | null }).verified_at,
          }
        : null;

    return evaluateHireSellerReadiness({
      emailConfirmed: emailConfirmedFromUser(user),
      billing,
      isVerified: !!(profile as { is_verified?: boolean } | null)?.is_verified,
      bank:
        bankFromPayout && (bankFromPayout.bank_name || bankFromPayout.account_number)
          ? bankFromPayout
          : bankFromKyc && (bankFromKyc.bank_name || bankFromKyc.account_number)
            ? bankFromKyc
            : bankFromProfile,
      kycPending: pendingKyc,
    });
  }, [user, profile, payout, payoutError, kycRequests]);

  return {
    ...result,
    isLoading: !!uid && (profileLoading || (!payoutError && payoutLoading) || kycLoading),
  };
}

# Referral And Affiliate

## Reward Rules

| Participant | Event | Reward | Wallet bucket |
|---|---|---:|---|
| New member | Registers through a valid referral and confirms email | 20 px | Welcome, not withdrawable |
| New member | Publishes the first project or Community post | 100 px | Welcome, not withdrawable |
| Referrer | Referred member publishes the first project or Community post | 50 px | Earned, withdrawable |

Cashout uses the existing minimum of 1,000 earned px and existing KYC/Stripe Connect requirements.

## Attribution

- Affiliate links use `/?ref=CODE`.
- The browser stores the code through email confirmation and Google OAuth.
- The authenticated client calls `register_referral`; the database validates account age,
  email confirmation, code ownership, self-referral, and duplicate claims.
- Registration is accepted only during the first seven days of the account.

## Anti-Abuse

- One referral per referred account.
- The referrer cannot refer their own account.
- Auth email must be confirmed.
- Referrer payment requires a real published project or Community post.
- Database advisory locks and unique ledger constraints prevent concurrent duplicate rewards.
- Rewards are written only by `SECURITY DEFINER` functions and triggers.
- Referral records and reward ledgers are retained for audit.

For a large campaign, add device/IP risk scoring, disposable-email screening, campaign
budgets, and an admin review queue before increasing reward values.

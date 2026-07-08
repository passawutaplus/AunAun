/** Canonical deploy URLs for A+ Vault Vercel projects. */
export const VAULT_DEMO_SITE_URL = "https://aplus-vault-demo.vercel.app";
export const VAULT_PROD_SITE_URL = "https://aplus-vault.vercel.app";
export const VAULT_DEMO_VERCEL_PROJECT = "aplus-vault-demo";
export const VAULT_PROD_VERCEL_PROJECT = "aplus-vault";

export function resolveVaultSiteUrl() {
  return (
    process.env.VAULT_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    (process.env.VAULT_DEMO_MODE === "true" ? VAULT_DEMO_SITE_URL : VAULT_PROD_SITE_URL)
  ).replace(/\/$/, "");
}

# Run from C:\Users\Admin\Documents\Codex\2026-07-05\x
# Requires local git credentials with access to passawutaplus/aplus_vault.

git init
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/passawutaplus/aplus_vault.git
git add README.md .gitignore package.json build.mjs vercel.json outputs/a-plus-vault
git commit -m "Build A+ Vault MVP"
git push -u origin main

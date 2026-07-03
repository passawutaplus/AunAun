# Push To GitHub

The June 23 production hardening is committed and split into safe branches:

- AunAun monorepo: `main` at `3f85fe3`
- Anthem standalone: `codex/production-hardening-20260623-anthem` at `452e921`
- Solo standalone: `codex/production-hardening-20260623-solo` at `fa99056`

Run this from the repository root on a machine that can reach GitHub:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/push-codex-review-branches.ps1
```

The script pushes new remote branches named `codex-production-hardening-20260623`. It does not overwrite any existing `main` branch.

After pushing, open pull requests:

- `passawutaplus/AunAun`: `codex-production-hardening-20260623` into the repository's current default branch.
- `passawutaplus/Anthem-Code`: `codex-production-hardening-20260623` into the current default branch.
- `passawutaplus/Solo-Code`: `codex-production-hardening-20260623` into the current default branch.

Resolve any history conflict in a temporary branch. Do not force-push over an existing production branch.

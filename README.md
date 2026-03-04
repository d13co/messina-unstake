# Messina Unstake

Unstake mALGO back to ALGO. Needed after [Messina.one](https://messina.one) abandoned their platform with WalletConnect disabled.

## What it does

Simulates and submits a withdrawal group transaction that sends mALGO (asset `1185173782`) to the Messina bridge app (`2713771029`) and receives ALGO in return. Withdrawal history is persisted in localStorage.

**User recommendation: try a small amount unstake first.**

## Wallets

Pera, Defly, Lute, Exodus

## Dev

```sh
pnpm install
pnpm dev
```

## Deploy

```sh
pnpm deploy
```

Deploys to Cloudflare Pages via Wrangler. First run will prompt you to create/link the Pages project.

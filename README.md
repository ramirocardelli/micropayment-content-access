# Micropayment Content Access

A proof of concept for **pay-per-article content** on the BSV blockchain. Readers browse article previews and unlock the full text by paying a few hundred satoshis (fractions of a cent) **directly to the author's wallet**. There is no platform account, no card, no subscription and no intermediary holding the money.

Built during my internship at the BSV Association as part of a set of proof-of-concept apps on the BSV SDK.

> **Status:** proof of concept. Payments to authors work end to end on a local LARS environment. Payment internalization on the author's side and on-chain verification on the backend are still pending; see [Current status](#current-status).

## The problem

Paywalls today force an all-or-nothing choice: a monthly subscription to read one article, or nothing at all. Card fees make charging cents per article impossible.

Micropayments on BSV make it practical to charge **per article**, with the payment going **straight to the author**, and the user's wallet doubling as their identity: no sign-up, no password.

## How it works

1. **Connect the wallet:** the app connects to the BSV Desktop wallet (`WalletClient` from `@bsv/sdk`) and uses its identity key as the user's identity. The session is restored on later visits.
2. **Browse:** the home page lists articles with title, author, subject, word count, price in sats and a preview. The full text never leaves the backend until the purchase is confirmed.
3. **Pay the author:**
   - The app derives a **fresh payment key for the author with BRC-29** (identity-based key derivation between buyer and author) and builds a P2PKH output to it.
   - `wallet.createAction()` builds, signs and broadcasts the transaction. The user approves it in the wallet.
   - The BRC-29 derivation data travels in the output's `customInstructions`, so the author can later claim the payment.
4. **Record the purchase:** the frontend sends the txid to the backend, which checks the amount against the article price and stores the purchase in MongoDB.
5. **Read:** the full article is served by a backend endpoint protected with **BRC-104 mutual authentication** (`@bsv/auth-express-middleware`). The request is signed by the user's wallet, and content is returned only if that identity has a purchase for the article.

```
Reader's wallet ──createAction()──► BSV tx: P2PKH output to the author (BRC-29 derived key)
       │
       ├── txid ──► Backend: POST /articles/:id/verify-purchase ──► MongoDB (purchases)
       │
       └── signed request (BRC-104) ──► Backend: GET /articles/:id/content
                                          └─ identity verified + purchase found ─► full text
```

## Design choices

| Choice | Why |
| --- | --- |
| **Pay the author directly**, not the platform | No custody of funds and nothing to settle later: the author is paid the moment the reader is. |
| **BRC-29 derived payment keys** | Each payment goes to a key derived between buyer and author, not a reused public address. This improves privacy and lets the author's wallet recognize and claim the payment. |
| **Wallet identity instead of accounts** | No passwords, no user table. The identity key is the account. |
| **BRC-104 authentication for content** | The backend doesn't trust a wallet address sent by the client: the request itself is signed by the wallet. |
| **Previews public, full text only after purchase** | The article list is cheap and open. The valuable part is gated. |

## Current status

What works:

- Wallet connection and session restore with BSV Desktop
- Article listing and previews, seeded with sample articles (`npm run seed`)
- BRC-29 payments to authors, built and broadcast through the wallet
- Purchase records and the price check on the backend
- A BRC-104 protected content endpoint

What's pending (the next steps I left off on):

- **Payment internalization:** the payment reaches the author's derived key, but the author's wallet doesn't yet call `internalizeAction()` to claim it. For now, the payment metadata is kept in the buyer's `localStorage`. The goal is to deliver it to the author (for example through a Message Box) so their wallet picks it up automatically.
- **Unique derivation per payment:** the BRC-29 derivation prefix and suffix are currently constants. They should be random per payment.
- **On-chain verification:** `verify-purchase` trusts the txid and amount the client sends. It should verify the transaction, the output amount and the destination via SPV before recording the purchase.
- **Use the BRC-104 path by default:** when the wallet doesn't expose `authFetch`, the frontend falls back to a trust-based `POST` that sends the wallet identity in the body. The next step is to use the SDK's `AuthFetch` client so every content request is signed. The fallback endpoint should then be removed.
- **Overlay service:** `deployment-info.json` still references a lookup service that was removed. There is no overlay indexing of purchases yet.
- **No tests yet.**

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router, `@bsv/sdk`
- **Backend:** Node.js, Express, TypeScript, MongoDB with Mongoose, `@bsv/auth-express-middleware`
- **Blockchain:** BSV, BRC-29 payments, BRC-104 authentication, LARS for local development

| Path | What it does |
| --- | --- |
| `frontend/src/utils/payments.ts` | BRC-29 key derivation and the payment transaction |
| `frontend/src/utils/authFetch.ts` | Authenticated content requests (BRC-104, with fallback) |
| `frontend/src/utils/wallet.ts` | Wallet connection helpers |
| `frontend/src/pages/HomePage.tsx` | Article grid, purchase flow |
| `frontend/src/pages/ArticleDetailPage.tsx` | Full article view |
| `backend/src/routes/protected.ts` | Articles, purchases and protected content endpoints |
| `backend/src/models/` | `Article` and `Purchase` (Mongoose) |
| `backend/src/seedData.ts`, `clearPurchases.ts` | Dev scripts: seed articles, reset purchases |

## Running it locally

Requirements: Node.js 18+, Docker Desktop (running), the [BSV Desktop wallet](https://desktop.bsvb.tech/) and LARS (`npm install -g @bsv/lars`).

**1. Start LARS** (local BSV overlay services, wallet infrastructure and MongoDB):

```bash
lars
```

Select **"Start LARS (local only)"**, then **"Continue without funding"**. Keep it running.

**2. Start the backend** (`http://localhost:3001`):

```bash
cd backend
npm install
npm run seed    # optional: sample articles
npm run dev
```

**3. Start the frontend** (`http://localhost:5173`):

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

Open the app with BSV Desktop running, connect the wallet, and unlock an article.

## API

Base URL: `http://localhost:3001/api/protected`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/articles` | List articles (previews only) |
| `GET` | `/articles/:id` | Article preview |
| `POST` | `/articles/:id/verify-purchase` | Record a purchase (`txid`, `walletAddress`, `satoshisPaid`) |
| `GET` | `/articles/purchases/:walletAddress` | A user's purchases |
| `GET` | `/articles/:id/content` | Full content: **requires BRC-104 authentication** |
| `POST` | `/articles/:id/content` | Trust-based fallback (to be removed) |
| `GET` | `/articles/:id/info` | How to access the protected endpoint |

## Resources

- [BSV SDK documentation](https://docs.bsvblockchain.org/)
- [BRC standards](https://brc.dev/)

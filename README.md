# Micropayment Content Access

A full-stack application demonstrating Bitcoin SV (BSV) micropayments for content unlocking. Users can browse articles and unlock premium content by making small BSV payments directly to content authors.

## Features

- 🔒 **Content Paywall**: Lock premium content behind micropayments
- 💰 **Direct Payments**: Pay content authors directly using BSV
- 🔑 **Wallet Integration**: Connect with BSV Desktop Wallet
- 📝 **Article Management**: Browse and purchase articles
- 🔄 **Session Persistence**: Restore wallet connections across sessions

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Docker Desktop** (running)
- **BSV Wallet**

## Project Structure

```
micropayment-content-access-main/
├── backend/          # Express.js API server
├── frontend/         # React + Vite frontend
├── local-data/       # Docker data volumes
└── README.md
```

## Getting Started

### 1. Start LARS (Overlay Services)

LARS (Local Automated Runtime System) provides the BSV Overlay Services infrastructure needed for wallet interactions and blockchain operations.

1. **Open Docker Desktop** and ensure it's running

2. **Open a terminal** and run:
   ```bash
   lars
   ```

3. **Select "Start LARS (local only)"** from the menu

4. **Choose "Continue without funding"** (for development/testing)

Keep LARS running in this terminal.

### 2. Start the Backend Server

The backend is a separate Express.js API that handles article management and purchase verification.

Open a **new terminal** window:

```bash
cd backend
npm install
npm run seed    # Optional: seed the database with sample articles
npm run dev
```

The backend API will start on `http://localhost:3001`

### 3. Open the Application

Navigate to the URL shown in your terminal (typically `http://localhost:5173`)

## Using the Application

### First Time Setup

1. **Connect Your Wallet**
   - Click the "Connect Wallet" button
   - Approve the connection in your BSV wallet

2. **Browse Articles**
   - View available articles in the grid
   - See preview content and pricing

3. **Unlock Content**
   - Click on a locked article
   - Click "Unlock for X sats" to purchase
   - Approve the payment in your wallet
   - Access the full content immediately

### Wallet Connection

The app will attempt to restore your wallet session automatically on subsequent visits. You'll see:
- ✅ Connected status with your public key
- 💰 Article purchase history
- 🔓 Previously unlocked content

## API Endpoints

### Backend API (`http://localhost:3001`)

#### Articles
- `GET /api/protected/articles` - List all articles (preview only)
- `GET /api/protected/articles/:id` - Get article preview
- `GET /api/protected/articles/:id/content` - Get full article content (requires BRC-104 auth)
- `POST /api/protected/articles/:id/content` - Fallback content access (trust-based)
- `GET /api/protected/articles/:id/info` - Get BRC-104 access information

#### Purchases
- `GET /api/protected/articles/purchases/:walletAddress` - Get user's purchase history
- `POST /api/protected/articles/:id/verify-purchase` - Record and verify a purchase

#### Admin (requires `x-admin-token` header)
- `GET /api/admin/data` - Export all MongoDB data (set `ADMIN_TOKEN` in backend `.env`)

### LARS Overlay Services (`http://localhost:3321`)

LARS provides the BSV SDK and wallet integration services used by the frontend. These endpoints are called automatically by the `@bsv/sdk` in your browser.

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **@bsv/sdk** - BSV blockchain integration
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM

## Architecture

```
┌─────────────┐      ┌──────────────┐       ┌──────────────┐
│   Browser   │─────▶│   Frontend   │─────▶│   Backend    │
│             │      │ (React:5173) │       │(Express:3001)│
└─────────────┘      └──────────────┘       └──────────────┘
       │                     │                      │
       │                     │                      │
       ▼                     ▼                      ▼
┌─────────────┐      ┌──────────────┐       ┌─────────────┐
│     LARS    │      │   @bsv/sdk   │       │   MongoDB   │
│ (3321/3301) │      │              │       │   (27017)   │
│  Overlay    │      │              │       │             │
│  Services   │      │              │       │             │
└─────────────┘      └──────────────┘       └─────────────┘
```

### Service Responsibilities

- **LARS (Overlay Services)**: BSV wallet integration, blockchain operations, identity management
- **Backend (Express)**: Article management, purchase verification, content delivery
- **Frontend (React)**: User interface, wallet connection, content display
- **MongoDB**: Article and purchase data storage (managed by LARS)

## Support

For issues or questions, please check:
- [BSV SDK Documentation](https://docs.bsvblockchain.org/)
- [LARS Documentation](https://projectbabbage.com/)

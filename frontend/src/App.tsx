import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { WalletClient, PublicKey } from "@bsv/sdk";
import HomePage from "./pages/HomePage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import Header from "./components/Header";

const WALLET_SESSION_KEY = 'bsv_wallet_session';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface WalletSession {
  walletAddress: string;
  timestamp: number;
}

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [wallet, setWallet] = useState<WalletClient | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Restore wallet session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const sessionData = localStorage.getItem(WALLET_SESSION_KEY);
        if (!sessionData) {
          setIsRestoringSession(false);
          return;
        }

        const session: WalletSession = JSON.parse(sessionData);
        const now = Date.now();

        // Check if session has expired
        if (now - session.timestamp > SESSION_DURATION) {
          localStorage.removeItem(WALLET_SESSION_KEY);
          setIsRestoringSession(false);
          return;
        }

        // Restore wallet connection
        const walletClient = new WalletClient();
        const authenticated = await walletClient.isAuthenticated();

        if (authenticated) {
          const result = await walletClient.getPublicKey({ identityKey: true });
          const publicKey = result.publicKey;

          // Convert public key to Bitcoin address
          const address = PublicKey.fromString(publicKey).toAddress();
          console.log('Public Key:', publicKey);
          console.log('Bitcoin Address:', address);

          // Verify the stored address matches
          if (publicKey === session.walletAddress) {
            setWallet(walletClient);
            setWalletAddress(address); // Use Bitcoin address instead of public key
            setIsWalletConnected(true);
          } else {
            localStorage.removeItem(WALLET_SESSION_KEY);
          }
        } else {
          localStorage.removeItem(WALLET_SESSION_KEY);
        }
      } catch (err) {
        console.error('Failed to restore wallet session:', err);
        localStorage.removeItem(WALLET_SESSION_KEY);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    try {
      const walletClient = new WalletClient();
      const authenticated = await walletClient.isAuthenticated();

      if (authenticated) {
        // Get the wallet's identity public key
        const result = await walletClient.getPublicKey({ identityKey: true });
        const publicKey = result.publicKey;

        // Convert public key to Bitcoin address
        const address = PublicKey.fromString(publicKey).toAddress();
        console.log('Public Key:', publicKey);
        console.log('Bitcoin Address:', address);

        setWallet(walletClient);
        setWalletAddress(address); // Use Bitcoin address instead of public key
        setIsWalletConnected(true);

        // Save session to localStorage
        const session: WalletSession = {
          walletAddress: publicKey, // Store public key for session verification
          timestamp: Date.now()
        };
        localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
      } else {
        throw new Error(
          "Wallet is not authenticated. Please authenticate in BSV Desktop first."
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      console.error("Failed to connect to BSV Desktop wallet:", err, errorMessage);
      alert("Please download and open BSV Desktop wallet to continue. Visit https://bitcoinassociation.net/bsv-desktop/ to download.");
      setIsWalletConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWallet(null);
    setWalletAddress("");
    setIsWalletConnected(false);
    localStorage.removeItem(WALLET_SESSION_KEY);
  };

  return (
    <Router>
      <div className="app">
        <Header
          isRestoringSession={isRestoringSession}
          isWalletConnected={isWalletConnected}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          isLoading={isLoading}
        />
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                isWalletConnected={isWalletConnected}
                wallet={wallet}
                walletAddress={walletAddress}
                onConnectWallet={handleConnectWallet}
                isRestoringSession={isRestoringSession}
                isLoading={isLoading}
              />
            }
          />
          <Route
            path="/articles/:id"
            element={
              <ArticleDetailPage
                wallet={wallet}
                isWalletConnected={isWalletConnected}
                walletAddress={walletAddress}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

  import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import { WalletClient, PublicKey, Hash } from "@bsv/sdk";
import HomePage from "./pages/HomePage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import Header from "./components/Header";

const WALLET_SESSION_KEY = 'bsv_wallet_session';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

interface WalletSession {
  counterparty: string;
  timestamp: number;
}

// Helper function to convert public key to Bitcoin address
function publicKeyToAddress(publicKeyHex: string): string {
  try {
    const pubKey = PublicKey.fromString(publicKeyHex);
    const pubKeyHash = Hash.hash160(pubKey.toDER());
    
    // Add version byte (0x00 for mainnet) and compute checksum
    const versionByte = new Uint8Array([0x00]);
    const payload = new Uint8Array(versionByte.length + pubKeyHash.length);
    payload.set(versionByte);
    payload.set(pubKeyHash, versionByte.length);
    
    // Double SHA256 for checksum
    const hash1 = Hash.sha256(Array.from(payload));
    const hash2 = Hash.sha256(Array.from(hash1));
    const checksum = hash2.slice(0, 4);
    
    // Concatenate payload and checksum
    const addressBytes = new Uint8Array(payload.length + checksum.length);
    addressBytes.set(payload);
    addressBytes.set(checksum, payload.length);
    
    // Base58 encode
    return base58Encode(addressBytes);
  } catch (error) {
    console.error('Failed to convert public key to address:', error);
    return publicKeyHex; // Fallback to public key
  }
}

// Base58 encoding (Bitcoin alphabet)
function base58Encode(bytes: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  // Count leading zeros
  let zeros = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    zeros++;
  }
  
  // Convert bytes to big integer
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte);
  }
  
  // Convert to base58
  let encoded = '';
  while (num > 0) {
    const remainder = Number(num % BigInt(58));
    encoded = ALPHABET[remainder] + encoded;
    num = num / BigInt(58);
  }
  
  // Add leading '1's for leading zeros
  return '1'.repeat(zeros) + encoded;
}

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [wallet, setWallet] = useState<WalletClient | null>(null);
  const [counterparty, setCounterparty] = useState<string>("");
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

          console.log('Public Key:', publicKey);

          // Verify the stored address matches
          if (publicKey === session.counterparty) {
            setWallet(walletClient);
            setCounterparty(publicKey);
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
        console.log('Public Key:', publicKey);

        setWallet(walletClient);
        setCounterparty(publicKey);
        setIsWalletConnected(true);

        // Save session to localStorage
        const session: WalletSession = {
          counterparty: publicKey, // Store public key for session verification
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
    setCounterparty("");
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
                counterparty={counterparty}
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
                counterparty={counterparty}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

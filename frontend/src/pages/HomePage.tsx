import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Article } from "../types/article";
import ArticleModal from "../components/ArticleModal";
import { WalletClient, P2PKH } from "@bsv/sdk";
import ArticleCard from "../components/ArticleCard";
import ConnectPrompt from "../components/ConnectPrompt";

interface HomePageProps {
  isWalletConnected: boolean;
  wallet: WalletClient | null;
  counterparty: string;
  onConnectWallet: () => Promise<void>;
  isRestoringSession: boolean;
  isLoading: boolean;
}

function HomePage({ 
  isWalletConnected, 
  wallet, 
  counterparty, 
  onConnectWallet, 
  isRestoringSession,
  isLoading 
}: HomePageProps) {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load articles from backend API on mount
  useEffect(() => {
    let mounted = true;

    const fetchArticles = async () => {
      try {
        const url = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/api/protected/articles`
          : "http://localhost:3001/api/protected/articles";
        console.log("Fetching articles from:", url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch articles: ${res.status}`);
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setArticles(data);
        }
      } catch (err) {
        console.warn("Could not load articles from backend, using mock data.", err);
        setArticles([]);
      }
    };

    fetchArticles();

    return () => {
      mounted = false;
    };
  }, []);

  // Load user purchases when wallet connects
  useEffect(() => {
    if (!isWalletConnected || !counterparty) return;

    const fetchPurchases = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const purchasesRes = await fetch(
          `${apiUrl}/api/protected/articles/purchases/${counterparty}`
        );
        if (purchasesRes.ok) {
          const purchases = await purchasesRes.json();
          console.log("User purchases:", purchases);

          // Mark articles as purchased based on user's purchase history
          setArticles((prevArticles) =>
            prevArticles.map((article) => {
              const purchase = purchases.find(
                (p: { articleId: string; txid: string }) => p.articleId === article.id
              );
              if (purchase) {
                return { ...article, isPurchased: true, txid: purchase.txid };
              }
              return article;
            })
          );
        }
      } catch (err) {
        console.warn("Could not fetch user purchases:", err);
      }
    };

    fetchPurchases();
  }, [isWalletConnected, counterparty]);

  const handleUnlockArticle = async (articleId: string) => {
    if (!wallet) {
      setError("Please connect your wallet first");
      return;
    }

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      setError("Article not found");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      console.log(`Unlocking article ${articleId} for ${article.price} satoshis...`);

      // Helper function to convert string to hex (browser-safe)
      const stringToHex = (str: string): string => {
        let hex = "";
        for (let i = 0; i < str.length; i++) {
          hex += str.charCodeAt(i).toString(16).padStart(2, "0");
        }
        return hex;
      };

      // Create OP_RETURN data with article metadata for tracking
      const protocol = stringToHex("article-unlock");
      const articleIdHex = stringToHex(articleId);
      const titleHex = stringToHex(article.title);
      const priceHex = stringToHex(article.price.toString());

      // Build OP_RETURN script (OP_FALSE OP_RETURN <data>)
      const opReturnScript = `006a04${protocol}02${articleIdHex}${titleHex.length
        .toString(16)
        .padStart(2, "0")}${titleHex}${priceHex.length
        .toString(16)
        .padStart(2, "0")}${priceHex}`;

      // Create P2PKH locking script for writer's address
      const paymentScript = new P2PKH().lock(article.authorIdentityKey);

      console.log(`Sending payment to writer at: ${article.authorPaymentAddress}`);

      // Create and broadcast transaction with two outputs:
      // 1. Payment to writer's address (P2PKH)
      // 2. Metadata in OP_RETURN (optional, for tracking)
      const result = await wallet.createAction({
        description: `Unlock article: ${article.title}`,
        outputs: [
          {
            lockingScript: paymentScript.toHex(),
            satoshis: article.price,
            outputDescription: `Article payment to ${article.author}`,
          },
          {
            lockingScript: opReturnScript,
            satoshis: 0, // OP_RETURN outputs have zero value
            outputDescription: `Article unlock metadata for "${article.title}"`,
          },
        ],
      });

      const txid = result.txid;

      if (!txid) {
        throw new Error("Transaction was created but no txid was returned");
      }

      // Update article as purchased
      setArticles(
        articles.map((a) =>
          a.id === articleId ? { ...a, isPurchased: true, txid: txid } : a
        )
      );

      // Send transaction to backend for verification and storage
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const verifyResponse = await fetch(`${apiUrl}/api/protected/articles/${articleId}/verify-purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txid: txid,
          counterparty,
          satoshisPaid: article.price, // Send the amount that was paid
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Purchase verification failed');
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment failed";
      setError(errorMessage);
      console.error("Payment error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArticleClick = (article: Article) => {
    // If purchased, navigate to detail page
    if (article.isPurchased) {
      navigate(`/articles/${article.id}`);
    } else {
      // Otherwise show modal with unlock option
      setSelectedArticle(article);
    }
  };

  const handleCloseModal = () => {
    setSelectedArticle(null);
  };

  return (
    <>
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="main-content">
        {isRestoringSession ? (
          <div className="connect-prompt">
            <div className="prompt-card">
              <h2>Restoring Session...</h2>
              <p>Please wait while we restore your wallet connection.</p>
            </div>
          </div>
        ) : !isWalletConnected ? (
          <ConnectPrompt onConnectWallet={onConnectWallet} isLoading={isLoading} />
        ) : (
          <div className="articles-grid">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                handleArticleClick={handleArticleClick}
                handleUnlockArticle={handleUnlockArticle}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}
      </main>

      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={handleCloseModal}
          onUnlock={handleUnlockArticle}
        />
      )}
    </>
  );
}

export default HomePage;

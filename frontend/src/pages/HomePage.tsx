import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Article } from "../types/article";
import ArticleModal from "../components/ArticleModal";
import type { WalletClient } from "@bsv/sdk";
import ArticleCard from "../components/ArticleCard";
import ConnectPrompt from "../components/ConnectPrompt";
import { createContentPayment } from "../utils/payments";

interface HomePageProps {
  isWalletConnected: boolean;
  wallet: WalletClient | null;
  walletAddress: string;
  onConnectWallet: () => Promise<void>;
  isRestoringSession: boolean;
  isLoading: boolean;
}

function HomePage({ 
  isWalletConnected, 
  wallet, 
  walletAddress, 
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
    if (!isWalletConnected || !walletAddress) return;

    const fetchPurchases = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const purchasesRes = await fetch(
          `${apiUrl}/api/protected/articles/purchases/${walletAddress}`
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
  }, [isWalletConnected, walletAddress]);

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
      console.log(`Article data:`, { 
        id: article.id, 
        title: article.title, 
        authorAddress: article.authorAddress,
        authorIdentityKey: article.authorIdentityKey 
      });

      console.log(`Sending direct payment to: ${article.authorAddress}`);

      // Create direct payment to author's address
      const result = await createContentPayment(
        wallet,
        article.authorAddress,
        article.authorIdentityKey,
        article.price,
        articleId,
        article.title
      );

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
          walletAddress: walletAddress,
          satoshisPaid: article.price,
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
  console.log(articles)
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

import express, { Request, Response } from 'express';
import { createAuthMiddleware } from '@bsv/auth-express-middleware';
import { WalletClient } from '@bsv/sdk';
import Article from '../models/Article';
import Purchase from '../models/Purchase';
import { makeWallet } from '../wallet';

const router = express.Router();

// Create a wallet client instance for the auth middleware
const wallet = makeWallet(process.env.PRIVATE_KEY!);

// BRC-104 Authentication Middleware
// This verifies the user's identity using their wallet signature (BRC-77/78)
// The user must use authFetch from their BSV wallet to prove ownership of their identity key
const authMiddleware = createAuthMiddleware({ wallet });

// GET /api/protected/articles - Get all articles (public - no auth required)
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });

    // Return articles without full content (only preview)
    const articlesWithoutContent = articles.map(article => ({
      id: article.id,
      title: article.title,
      author: article.author,
      subject: article.subject,
      wordCount: article.wordCount,
      price: article.price,
      preview: article.preview,
      authorIdentityKey: article.authorIdentityKey,
      isPurchased: false, // Will be determined on frontend based on wallet
    }));
    
    res.json(articlesWithoutContent);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/protected/articles/:id - Get single article preview (public - no auth required)
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const article = await Article.findOne({ id });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Return article without full content (user must purchase first)
    res.json({
      id: article.id,
      title: article.title,
      author: article.author,
      subject: article.subject,
      wordCount: article.wordCount,
      price: article.price,
      preview: article.preview,
      authorIdentityKey: article.authorIdentityKey,
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// POST /api/protected/articles/:id/verify-purchase - Record purchase (no auth required for recording)
router.post('/articles/:id/verify-purchase', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txid, walletAddress, satoshisPaid } = req.body;
    
    if (!txid || !walletAddress) {
      return res.status(400).json({ error: 'Missing txid or walletAddress' });
    }
    
    // Find the article
    const article = await Article.findOne({ id });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Verify the amount paid matches or exceeds the article price
    if (!satoshisPaid || satoshisPaid < article.price) {
      return res.status(402).json({ 
        error: 'Payment amount insufficient',
        required: article.price,
        paid: satoshisPaid || 0
      });
    }
    
    // Check if purchase already exists
    let purchase = await Purchase.findOne({ txid });
    
    if (!purchase) {
      // Create new purchase record
      // TODO: In production, verify the transaction on-chain before creating purchase
      purchase = await Purchase.create({
        articleId: id,
        walletAddress,
        txid,
        satoshisPaid: satoshisPaid,
        verified: true, // For POC, auto-verify. In production: verify on-chain!
      });
      
      console.log(`✅ Purchase recorded: ${txid} for article ${id}`);
    } else {
      // Verify existing purchase has correct amount
      if (purchase.satoshisPaid < article.price) {
        return res.status(402).json({ 
          error: 'Existing purchase has insufficient payment',
          required: article.price,
          paid: purchase.satoshisPaid
        });
      }
    }
    
    // Return success WITHOUT full content (user must use /content endpoint)
    res.json({
      success: true,
      txid: purchase.txid,
      message: 'Purchase recorded successfully'
    });
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

// GET /api/protected/articles/purchases/:counterparty - Get user's purchases (public for convenience)
router.get('/articles/purchases/:counterparty', async (req: Request, res: Response) => {
  try {
    const { counterparty } = req.params;
    
    console.log(`📋 Fetching purchases for wallet: ${counterparty}`);
    
    const purchases = await Purchase.find({ counterparty }).sort({ purchasedAt: -1 });
    
    console.log(`✅ Found ${purchases.length} purchases for ${counterparty}`);
    
    // DEBUG: Show all purchases if none found
    if (purchases.length === 0) {
      const allPurchases = await Purchase.find().limit(10);
      console.log(`🔍 DEBUG: First 10 purchases in database:`, 
        allPurchases.map(p => ({ 
          articleId: p.articleId, 
          counterparty: p.counterparty,
          txid: p.txid 
        }))
      );
    }
    
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// GET /api/protected/articles/:id/content - BRC-104 Protected: Get full article content
// This endpoint REQUIRES BRC-77/78 authentication via authFetch
// Users must prove their identity with a cryptographic signature
router.get(
  '/articles/:id/content',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // The authMiddleware has verified the user's identity via signature
      // The authenticated identity key is available in req.authrite
      const userIdentityKey = (req as any).authrite?.identityKey;

      if (!userIdentityKey) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please use authFetch from your BSV wallet to access this endpoint'
        });
      }

      console.log(`🔐 Authenticated request for article ${id} from ${userIdentityKey}`);

      // Find the article
      const article = await Article.findOne({ id });
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }

      // Check if user has purchased this article
      // Note: We check against the identity key used in authFetch
      const purchase = await Purchase.findOne({
        articleId: id,
        counterparty: userIdentityKey,
        verified: true,
      });

      if (!purchase) {
        return res.status(403).json({
          error: 'Access denied. You must purchase this article first.',
          articleId: id,
          price: article.price,
          message: 'Make a purchase using the regular payment flow, then use authFetch to access the content',
        });
      }

      console.log(`✅ Access granted to article ${id} for user ${userIdentityKey}`);

      // User is authenticated and has purchased the article - return full content
      res.json({
        id: article.id,
        title: article.title,
        author: article.author,
        subject: article.subject,
        wordCount: article.wordCount,
        price: article.price,
        fullContent: article.fullContent,
        txid: purchase.txid,
        isPurchased: true,
      });
    } catch (error) {
      console.error('Error fetching authenticated article:', error);
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  }
);

// POST /api/protected/articles/:id/content - FALLBACK for wallets without BRC-104
// This is a temporary endpoint for older wallets that don't support authFetch yet
// SECURITY NOTE: This trusts the client-provided walletAddress (less secure than BRC-104)
router.post('/articles/:id/content', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.body;
    
    console.log(`⚠️ FALLBACK: Trust-based request for article ${id} from ${walletAddress}`);
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    // Find the article
    const article = await Article.findOne({ id });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Verify that the user has purchased this article
    const purchase = await Purchase.findOne({
      articleId: id,
      counterparty: walletAddress,
      verified: true
    });
    
    if (!purchase) {
      return res.status(403).json({ 
        error: 'Access denied. You must purchase this article first.',
        articleId: id
      });
    }
    
    console.log(`✅ FALLBACK: Access granted to article ${id}`);
    
    // User has purchased the article, return full content
    res.json({
      id: article.id,
      title: article.title,
      author: article.author,
      subject: article.subject,
      wordCount: article.wordCount,
      price: article.price,
      preview: article.preview,
      fullContent: article.fullContent,
      txid: purchase.txid,
      isPurchased: true,
    });
  } catch (error) {
    console.error('Error fetching article content:', error);
    res.status(500).json({ error: 'Failed to fetch article content' });
  }
});

// GET /api/protected/articles/:id/info - Get information about BRC-104 protected access
router.get('/articles/:id/info', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const article = await Article.findOne({ id });
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      articleId: id,
      title: article.title,
      author: article.author,
      price: article.price,
      authorIdentityKey: article.authorIdentityKey,
      brc104: {
        enabled: true,
        endpoint: `/api/protected/articles/${id}/content`,
        method: 'GET',
        authentication: 'BRC-77/78 (authFetch)',
      },
      usage: {
        description: 'BRC-104 protected endpoint for authenticated content access',
        steps: [
          '1. Purchase the article using the regular payment flow',
          '2. Use authFetch from your BSV wallet to prove your identity',
          '3. Access the full content if you have purchased it',
        ],
        example: {
          javascript: `
// Using authFetch from BSV Desktop wallet
const response = await window.bsv.authFetch('/api/protected/articles/${id}/content', {
  method: 'GET'
});
const article = await response.json();
console.log(article.fullContent);
          `.trim(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching info:', error);
    res.status(500).json({ error: 'Failed to fetch info' });
  }
});

export default router;

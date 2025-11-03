import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Article } from '../types/article';
import { authFetch } from '../utils/authFetch';
import type { WalletWithAuthFetch } from '../utils/authFetch';
import '../App.css';

interface ArticleDetailPageProps {
  wallet: WalletWithAuthFetch | null;
  counterparty: string;
  isWalletConnected: boolean;
}

function ArticleDetailPage({ wallet, counterparty, isWalletConnected }: ArticleDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) {
        setError('Article ID not found');
        setLoading(false);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        
        // Check if user is connected first
        if (!isWalletConnected || !counterparty || !wallet) {
          navigate('/');
          return;
        }

        // Fetch full article content using BRC-104 authenticated request
        const url = `${apiUrl}/api/protected/articles/${id}/content`;
        console.log('🔐 Fetching article with authFetch:', url);
        
        const articleRes = await authFetch(wallet, url, {
          method: 'GET',
        }, counterparty); // Pass counterparty for fallback

        if (!articleRes.ok) {
          if (articleRes.status === 403) {
            console.log('Access denied: Article not purchased');
            navigate('/');
            return;
          }
          throw new Error('Article not found');
        }

        const articleData = await articleRes.json();
        setArticle(articleData);
      } catch (err) {
        console.error('Error fetching article:', err);
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, wallet, counterparty, isWalletConnected, navigate]);

  if (loading) {
    return (
      <div className="app">
        <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="app">
        <div className="main-content" style={{ textAlign: 'center', padding: '4rem' }}>
          <p>Error: {error || 'Article not found'}</p>
          <button className="primary-btn" onClick={() => navigate('/')}>
            Back to Articles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="main-content">
        <button className="secondary-btn" onClick={() => navigate('/')}>
          ← Back to Articles
        </button>
        <article className="article-detail-page">
          <h1 className="article-detail-title">{article.title}</h1>
          
          <div className="article-meta" style={{ marginBottom: '2rem' }}>
            <span>By {article.author}</span>
            <span>•</span>
            <span>{article.subject}</span>
            <span>•</span>
            <span>{article.wordCount} words</span>
            {article.txid && (
              <>
                <span>•</span>
                  <a
                    href={`https://whatsonchain.com/tx/${article.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                    title={article.txid}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View TX on WhatsOnChain
                  </a>
              </>
            )}
          </div>

          <div className="article-full-content">
            {
              (() => {
                const markdownToHtml = (md: string) => {
                  if (!md) return '';
                  const codeBlocks: string[] = [];
                  // Extract fenced code blocks
                  md = md.replace(/```([\s\S]*?)```/g, (_m, p1) => {
                    codeBlocks.push(p1);
                    return `@@CODEBLOCK${codeBlocks.length - 1}@@`;
                  });
                  const escapeHtml = (s: string) => s
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                  // Escape remaining text
                  md = escapeHtml(md);
                  // Inline code
                  md = md.replace(/`([^`]+)`/g, (_m, p1) => `<code>${p1}</code>`);
                  // Headings
                  md = md
                    .replace(/^######\s*(.*)$/gm, '<h6>$1</h6>')
                    .replace(/^#####\s*(.*)$/gm, '<h5>$1</h5>')
                    .replace(/^####\s*(.*)$/gm, '<h4>$1</h4>')
                    .replace(/^###\s*(.*)$/gm, '<h3>$1</h3>')
                    .replace(/^##\s*(.*)$/gm, '<h2>$1</h2>')
                    .replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');
                  // Unordered lists (blocks of lines starting with "- ")
                  md = md.replace(/(?:^|\n)(- .+(?:\n- .+)*)/g, (_m, block) => {
                    const items = block.split(/\n/).map((l: string) => l.replace(/^- +/, '').trim());
                    return `\n<ul>${items.map((i: string) => `<li>${i}</li>`).join('')}</ul>\n`;
                  });
                  // Paragraphs (split on two or more newlines)
                  const parts = md.split(/\n{2,}/g).map(p => p.trim()).filter(Boolean).map(p => {
                    // If already a block element, keep it
                    if (/^<\/?(h\d|ul|pre|blockquote)/.test(p) || /^<h\d/.test(p)) return p;
                    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
                  });
                  let html = parts.join('\n');
                  // Restore fenced code blocks (already escaped)
                  html = html.replace(/@@CODEBLOCK(\d+)@@/g, (_m, idx) => {
                    const code = escapeHtml(codeBlocks[Number(idx)] || '');
                    return `<pre><code>${code}</code></pre>`;
                  });
                  return html;
                };

                const html = markdownToHtml(article.fullContent || '');
                return <div dangerouslySetInnerHTML={{ __html: html }} />;
              })()
            }
          </div>
        </article>
      </main>
    </div>
  );
}

export default ArticleDetailPage;

import dotenv from 'dotenv';
import connectDB from './config/database';
import Article from './models/Article';

// Load environment variables
dotenv.config();

const articles = [
  {
    id: '1',
    title: 'Understanding Bitcoin Micropayments',
    author: 'Satoshi Writer',
    authorIdentityKey: '02ec9b58db65002d0971c3abe2eef3403d23602d8de2af51445d84e1b64c11a646',
    subject: 'Blockchain Technology',
    wordCount: 850,
    price: 100,
    preview: 'Micropayments have been a long-standing promise of the internet. In this article, we explore how Bitcoin SV makes true micropayments possible for the first time...',
    fullContent: `Micropayments have been a long-standing promise of the internet. For decades, content creators, developers, and service providers have dreamed of a system where users could pay tiny amounts—fractions of a cent—for digital goods and services.

## The Problem with Traditional Payment Systems

Traditional payment systems like credit cards and PayPal charge fees that make small transactions economically unviable. A $0.01 payment might incur a $0.30 fee plus 2.9%, making the transaction cost more than the payment itself.

## Enter Bitcoin SV

Bitcoin SV (BSV) solves this problem through its unique combination of features:

1. **Ultra-low transaction fees**: Fees on BSV average less than $0.0001 per transaction
2. **Instant settlement**: Transactions are broadcast instantly and confirmed in seconds
3. **Unbounded scalability**: The network can handle millions of transactions per second
4. **Stable protocol**: BSV maintains the original Bitcoin protocol, ensuring reliability

## Real-World Applications

Micropayments enable entirely new business models:
- Pay-per-article journalism without subscriptions
- Micro-licensing for software features
- Real-time payment for API calls
- Content monetization without ads

## The Future

As BSV continues to scale, micropayments will become the default payment method for digital content, finally fulfilling the original promise of the internet as a global, frictionless marketplace for information and services.`,
  },
  {
    id: '2',
    title: 'The Future of Content Monetization',
    author: 'Jane Blockchain',
    authorIdentityKey: '02ec9b58db65002d0971c3abe2eef3403d23602d8de2af51445d84e1b64c11a646',
    subject: 'Digital Economy',
    wordCount: 1200,
    price: 150,
    preview: 'Traditional content monetization models are broken. Subscriptions are too expensive, and ads are intrusive. Discover how micropayments can revolutionize...',
    fullContent: `The digital content industry is at a crossroads. Traditional monetization models are failing both creators and consumers, leading to a crisis of sustainability in journalism, entertainment, and education.

## The Subscription Fatigue Problem

Modern consumers are drowning in subscriptions. Between streaming services, news outlets, software tools, and premium content platforms, the average person spends over $200/month on recurring payments—most of which go unused.

## The Ad-Supported Alternative

The alternative—ad-supported content—has its own problems:
- Privacy invasion through tracking
- Degraded user experience
- Race to the bottom for clickbait
- Creators earn pennies per thousand views

## Micropayments: The Third Way

Micropayments offer a middle path that benefits both creators and consumers:

### For Consumers
- Pay only for what you actually consume
- No recurring subscription commitments  
- Complete privacy (no tracking needed)
- Direct relationship with creators

### For Creators
- Higher revenue per engaged reader
- Direct monetization without intermediaries
- Freedom from algorithmic platforms
- Sustainable income from loyal audiences

## How It Works

With Bitcoin SV micropayments:
1. Reader sees an article preview
2. One click pays a few satoshis (fractions of a cent)
3. Content instantly unlocks
4. Creator receives payment immediately

## The Business Model Revolution

Micropayments enable entirely new approaches:
- **Premium journalism** without paywalls
- **Educational content** accessible to all
- **Independent creators** free from platform dependency
- **Quality over quantity** - reward depth, not clicks

## Challenges and Solutions

### Transaction Costs
BSV's sub-penny fees make micropayments economically viable for the first time.

### User Experience  
Modern wallet integrations make payments as easy as a single click—no forms, no accounts.

### Payment Discovery
Content platforms can aggregate micropayments, allowing users to "load up" credit that automatically pays as they browse.

## The Path Forward

As more publishers adopt micropayment models, we'll see a renaissance in quality content creation. The economic incentives finally align with creating truly valuable content rather than optimizing for engagement metrics.

The future of content is not subscription or advertising—it's micropayments.`,
  },
  {
    id: '3',
    title: 'BRC-100: A New Standard for Payments',
    author: 'Tech Innovator',
    authorIdentityKey: '02ec9b58db65002d0971c3abe2eef3403d23602d8de2af51445d84e1b64c11a646',
    subject: 'Web3 Protocols',
    wordCount: 950,
    price: 120,
    preview: 'BRC-100 introduces a standardized way for applications to interact with BSV wallets. This protocol enables seamless payment flows...',
    fullContent: `The Bitcoin Request for Comments (BRC) process has produced many important standards for the BSV ecosystem. BRC-100 stands out as particularly significant: it standardizes how applications request payments from user wallets.

## The Problem BRC-100 Solves

Before BRC-100, every wallet had its own proprietary API for payment requests. Applications had to:
- Support multiple wallet integrations
- Handle different authentication flows
- Manage various payment request formats
- Deal with inconsistent error handling

This fragmentation held back ecosystem growth.

## How BRC-100 Works

BRC-100 defines a simple, consistent interface:

\`\`\`typescript
interface PaymentRequest {
  satoshis: number;
  outputs?: Output[];
  data?: string[];
}

interface PaymentResponse {
  txid: string;
  rawtx: string;
}
\`\`\`

Any compliant wallet exposes this interface through a global \`bsv\` object:

\`\`\`typescript
const result = await window.bsv.send({
  satoshis: 100,
  data: ['article-unlock', 'article-123']
});
\`\`\`

## Key Features

### 1. Simplicity
The API is minimal but powerful, covering 99% of payment use cases.

### 2. Flexibility  
Supports both simple payments and complex multi-output transactions.

### 3. Privacy
No account creation or personal information required.

### 4. Security
Users approve every transaction in their wallet UI.

## Real-World Benefits

### For Developers
- Single integration works with all BRC-100 wallets
- No backend infrastructure needed for payments
- Reduced complexity and maintenance

### For Users
- Freedom to choose their preferred wallet
- Consistent experience across applications
- No vendor lock-in

### For the Ecosystem
- Lower barriers to entry for new applications
- Network effects from standardization
- Increased adoption and usage

## Beyond Payments

While BRC-100 focuses on payments, it establishes patterns for other standards:
- BRC-101: Identity and authentication
- BRC-102: Data storage and retrieval
- BRC-103: Overlay service discovery

Together, these standards create a cohesive developer experience for building on BSV.

## Adoption and Future

Major BSV wallets have implemented BRC-100:
- HandCash
- Money Button  
- Yours Wallet
- BSV Desktop

As adoption grows, we'll see an explosion of micropayment-enabled applications, from content platforms to API marketplaces to real-time data services.

BRC-100 isn't just a technical standard—it's the foundation for the micropayment economy.`,
  },
  {
    id: '4',
    title: 'Instant Settlements: Why It Matters',
    author: 'Crypto Analyst',
    authorIdentityKey: '02ec9b58db65002d0971c3abe2eef3403d23602d8de2af51445d84e1b64c11a646',
    subject: 'Financial Technology',
    wordCount: 780,
    price: 80,
    preview: 'In traditional payment systems, settlements can take days. Learn why instant settlement is crucial for micropayments and how BSV achieves this...',
    fullContent: `The concept of "instant settlement" might sound like a technical detail, but it's actually fundamental to the viability of micropayments and many other blockchain use cases.

## Traditional Settlement Times

In conventional financial systems:
- Credit cards: 2-3 business days
- Bank transfers: 1-5 business days  
- International wire transfers: 3-5 business days
- PayPal: 1-3 business days

During this settlement period, funds are in limbo—neither fully in your account nor fully gone.

## Why This Matters for Micropayments

Imagine buying a $0.01 article and waiting 3 days for the transaction to settle. The experience would be:
- Absurd for the user
- Risky for the merchant (chargebacks)
- Expensive to manage (reconciliation)

Micropayments require instant settlement to work.

## How BSV Achieves Instant Settlement

### 1. Zero-Confirmation Transactions
BSV transactions are broadcast to the network instantly. The recipient sees the transaction immediately.

### 2. First-Seen Rule
BSV nodes follow a simple rule: the first version of a transaction they see is the valid one. This makes double-spending extremely difficult.

### 3. Massive Throughput
BSV can handle unlimited transaction volume, preventing network congestion that delays confirmations.

### 4. Stable Protocol
The BSV protocol doesn't change, giving businesses confidence to build on it.

## Real-World Impact

### For E-Commerce
- Instant digital goods delivery
- No chargeback fraud
- Lower operational costs

### For Content Creators
- Immediate monetization
- No payment processor delays
- Direct creator-consumer relationship

### For Developers
- Simplified payment flows
- No escrow complexity
- Better user experience

## The Competitive Advantage

Other blockchains struggle with settlement:
- Bitcoin BTC: 10+ minutes, often longer
- Ethereum: 12+ seconds to minutes
- Traditional crypto: Various but all slower than BSV

BSV's instant settlement isn't just faster—it enables entirely new business models that aren't possible elsewhere.

## Looking Forward

As BSV continues to scale, instant settlement will become the expected norm for all digital transactions. The days of waiting for payments to clear will seem as archaic as dial-up internet.

Instant settlement isn't a luxury—it's a requirement for the digital economy.`,
  },
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Clear existing articles
    await Article.deleteMany({});
    console.log('🗑️  Cleared existing articles');
    
    // Insert new articles
    const inserted = await Article.insertMany(articles);
    console.log(`✅ Successfully seeded ${inserted.length} articles`);
    
    // List inserted articles
    console.log('\n📚 Articles in database:');
    inserted.forEach(article => {
      console.log(`  - ${article.title} (${article.price} sats)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

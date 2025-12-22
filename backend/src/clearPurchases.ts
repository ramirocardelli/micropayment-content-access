import dotenv from 'dotenv';
import connectDB from './config/database';
import Purchase from './models/Purchase';

// Load environment variables
dotenv.config();

const clearPurchases = async () => {
  try {
    console.log('🧹 Clearing all purchases from database...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Delete all purchases
    const result = await Purchase.deleteMany({});
    console.log(`✅ Successfully deleted ${result.deletedCount} purchases`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing purchases:', error);
    process.exit(1);
  }
};

clearPurchases();

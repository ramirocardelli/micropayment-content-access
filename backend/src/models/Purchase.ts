import mongoose, { Schema, Document } from 'mongoose';
import { WalletProtocol } from '@bsv/sdk';
import { brc29ProtocolID } from '@bsv/wallet-toolbox';

export const protocolID: WalletProtocol = brc29ProtocolID

export interface IPurchase extends Document {
  articleId: string;
  counterparty: string,
  keyID: string,
  txid: string;
  satoshisPaid: number;
  purchasedAt: Date;
  verified: boolean;
}

const PurchaseSchema: Schema = new Schema(
  {
    articleId: {
      type: String,
      required: true,
      ref: 'Article',
    },
    counterparty: {
      type: String,
      required: true,
    },
    keyID: {
      type: String,
      required: true,
    },
    txid: {
      type: String,
      required: true,
      trim: true,
    },
    satoshisPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup
PurchaseSchema.index({ articleId: 1, counterparty: 1 });
PurchaseSchema.index({ txid: 1 }, { unique: true });

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);

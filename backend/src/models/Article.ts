import mongoose, { Schema, Document } from 'mongoose';

export interface IArticle extends Document {
  id: string;
  title: string;
  author: string;
  authorIdentityKey: string;
  subject: string;
  wordCount: number;
  price: number; // in satoshis
  preview: string;
  fullContent: string;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema: Schema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    authorIdentityKey: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    wordCount: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    preview: {
      type: String,
      required: true,
    },
    fullContent: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IArticle>('Article', ArticleSchema);

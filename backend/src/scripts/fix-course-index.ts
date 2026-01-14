/**
 * Migration script to fix the Course text index
 * Run this once to drop and recreate the index with default_language: 'none'
 * 
 * Usage: npx tsx src/scripts/fix-course-index.ts
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '../../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function fixCourseTextIndex(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const { Course } = await import('../models/Course.js');
    const collection = Course.collection;
    
    // Get all indexes
    const indexes = await collection.indexes();
    const textIndexName = 'title_text_description_text_tags_text';
    
    // Check if the text index exists
    const textIndex = indexes.find(idx => idx.name === textIndexName);
    
    if (textIndex) {
      console.log('Found existing text index:', textIndex);
      
      // Check if it has the correct default_language setting
      const hasCorrectLanguage = textIndex.default_language === 'none';
      
      if (!hasCorrectLanguage) {
        console.log('🔄 Dropping old text index...');
        try {
          await collection.dropIndex(textIndexName);
          console.log('✅ Dropped old text index');
        } catch (dropError: any) {
          if (dropError.code !== 27) { // 27 = IndexNotFound
            throw dropError;
          }
          console.log('ℹ️  Index already dropped');
        }
        
        console.log('🔄 Creating new text index with default_language: none...');
        await collection.createIndex(
          { title: 'text', description: 'text', tags: 'text' },
          { default_language: 'none', name: textIndexName }
        );
        console.log('✅ Recreated text index with default_language: none');
      } else {
        console.log('✅ Course text index is already correctly configured');
      }
    } else {
      console.log('ℹ️  Course text index does not exist, creating it...');
      await collection.createIndex(
        { title: 'text', description: 'text', tags: 'text' },
        { default_language: 'none', name: textIndexName }
      );
      console.log('✅ Created text index with default_language: none');
    }
    
    console.log('✅ Migration completed successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing Course text index:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixCourseTextIndex();

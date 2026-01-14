import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Fix Course text index to prevent language override issues
    await fixCourseTextIndex();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${errorMessage}`);
    process.exit(1);
  }
};

/**
 * Fix the Course text index to use 'none' as default_language
 * This prevents MongoDB from using the document's language field as a language override
 */
async function fixCourseTextIndex(): Promise<void> {
  try {
    const { Course } = await import('../models/Course.js');
    const collection = Course.collection;
    
    // Get all indexes
    const indexes = await collection.indexes();
    const textIndexName = 'title_text_description_text_tags_text';
    
    // Check if the text index exists
    const textIndex = indexes.find(idx => idx.name === textIndexName);
    
    if (textIndex) {
      // Check if it has the correct default_language setting
      const hasCorrectLanguage = textIndex.default_language === 'none';
      
      if (!hasCorrectLanguage) {
        console.log('🔄 Fixing Course text index (dropping and recreating with default_language: none)...');
        try {
          // Drop the old index
          await collection.dropIndex(textIndexName);
          console.log('✅ Dropped old text index');
        } catch (dropError: any) {
          // Index might not exist or already dropped, continue anyway
          if (dropError.code !== 27) { // 27 = IndexNotFound
            console.warn('⚠️  Could not drop index:', dropError.message);
          }
        }
        
        // Recreate the index with correct settings (Mongoose will do this automatically)
        // But we can also do it explicitly
        await collection.createIndex(
          { title: 'text', description: 'text', tags: 'text' },
          { default_language: 'none', name: textIndexName }
        );
        console.log('✅ Recreated text index with default_language: none');
      } else {
        console.log('✅ Course text index is already correctly configured');
      }
    } else {
      console.log('ℹ️  Course text index does not exist yet, will be created on first use');
    }
  } catch (error) {
    // Don't fail startup if index fix fails, just log it
    console.warn('⚠️  Could not fix Course text index:', error instanceof Error ? error.message : 'Unknown error');
    console.warn('   You may need to manually drop and recreate the index');
  }
}

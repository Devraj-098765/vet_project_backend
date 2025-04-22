import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Veterinarian', required: true },
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

// Validate author reference before saving
blogSchema.pre('save', async function (next) {
  try {
    const veterinarian = await mongoose.model('Veterinarian').findById(this.author);
    if (!veterinarian || !veterinarian.name) {
      throw new Error('Invalid or missing author');
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model('Blog', blogSchema);

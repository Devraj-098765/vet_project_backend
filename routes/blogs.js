import express from 'express';
import Blog from "../models/blog.js";
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all published blogs (public access)
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    // Filter out blogs with null author or missing name
    const validBlogs = blogs.filter(blog => blog.author && blog.author.name);
    res.json(validBlogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get veterinarian's own blogs
router.get('/my-blogs', auth, async (req, res) => {
  try {
    console.log('Handling /my-blogs request for user ID:', req.user._id);
    
    if (!req.user || !req.user._id) {
      console.error('User information missing from request:', req.user);
      return res.status(400).json({ error: 'User information is missing' });
    }
    
    const blogs = await Blog.find({ author: req.user._id })
      .sort({ createdAt: -1 });
    
    console.log('Found blogs for user:', blogs.length);
    
    // Optionally, add .populate('author', 'name') if author.name is needed in VetBlogPage
    res.json(blogs);
  } catch (error) {
    console.error('Error in /my-blogs route:', error.message);
    console.error('Full error object:', error);
    res.status(500).json({ error: 'Failed to fetch your blogs' });
  }
});

// Get a single blog by ID (public access)
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name');
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Create blog (veterinarian only)
router.post('/', auth, async (req, res) => {
  try {
    const blog = new Blog({
      ...req.body,
      author: req.user._id
    });
    await blog.save();
    // Populate author for the response
    const populatedBlog = await Blog.findById(blog._id).populate('author', 'name');
    res.status(201).json(populatedBlog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update blog (author only)
router.put('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    if (blog.author.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate('author', 'name');
    res.json(updatedBlog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete blog (author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    if (blog.author.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

export default router;

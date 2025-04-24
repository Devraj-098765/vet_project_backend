import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
  try {
    console.log('Auth middleware called for route:', req.originalUrl);
    
    const token = req.header('x-auth-token');
    console.log('Received token in auth middleware:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      console.log('No token provided, returning 401');
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
      console.log('JWT_PRIVATE_KEY exists:', !!process.env.JWT_PRIVATE_KEY);
      const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
      console.log('Token verified successfully, decoded user ID:', decoded._id);
      req.user = decoded; // { _id, name, email }
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      console.error('Error details:', err);
      return res.status(401).json({ msg: 'Token is not valid' });
    }
  } catch (error) {
    console.error('Unexpected error in auth middleware:', error);
    return res.status(500).json({ msg: 'Server error in authentication' });
  }
}
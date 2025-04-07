import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
  const token = req.header('x-auth-token');
  console.log('Received token in auth middleware:', token);
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    console.log('Decoded token:', decoded);
    req.user = decoded; // { _id, name, email }
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
}
// import jsonwebtoken from "jsonwebtoken";
// import config from "config";

// const auth = (req, res, next) => {
//   const token = req.header("x-auth-token");
//   if (!token) return res.status(401).send("Access denied. No token provided");

//   try {
//     const decoded = jsonwebtoken.verify(token, process.env.JWT_PRIVATE_KEY);
//     req.user = decoded
//     next();
//   } catch (error) {
//     res.status(400).send("Invalid Token");
//   }
// };

// export default auth;
import jwt from 'jsonwebtoken';

export default function auth(req, res, next) {
  const token = req.header('x-auth-token');
  console.log(token)
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
}
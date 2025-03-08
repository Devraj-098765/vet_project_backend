import jsonwebtoken from "jsonwebtoken";
import config from "config";

const auth = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied. No token provided");

  try {
    const decoded = jsonwebtoken.verify(token, config.get(process.env.JWT_PRIVATE_KEY));
    req.user = decoded
    next();
  } catch (error) {
    res.status(400).send("Invalid Token");
  }
};

export default auth;
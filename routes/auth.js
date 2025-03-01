import express from "express";
import { User } from "../models/user.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import { z } from "zod";

const authRouter = express.Router();

authRouter.post("/", async (req, res) => {
  const { error } = validate(req.body);

  if (error) return res.status(400).json({ errors: error.errors });

  let user = await User.findOne({ email: req.body.email });
  if (!user)
    return res.status(400).json({ message: "Invalid email or password" });

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid email or password" });

  const token = user.generateAuthToken();
  

  res.header("x-auth-token", token).send(token);
});

const validate = (user) => {
  const schema = z.object({
    email: z.string().email({ message: "Invalid email format"}).min(5, { message: "email is required" }).max(255),
    password: z.string().min(5, { message: "Password is required" }).max(255),
  });

  return schema.safeParse(user);
};

export default authRouter;

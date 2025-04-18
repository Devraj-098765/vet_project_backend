import express from "express";
import { User } from "../models/user.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import { z } from "zod";

const authRouter = express.Router();

authRouter.post("/", async (req, res) => {
  try {
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).json({ errors: error.errors });
    }

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = user.generateAuthToken();
    console.log("Generated Token:", token);

    res.header('x-auth-token', token).send(_.pick(user, ["_id", "email"]));
  } catch (error) {
    console.error("Error in authentication:", error.stack);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
});

const validate = (user) => {
  const schema = z.object({
    email: z.string().email({ message: "Invalid email format" }).min(5, { message: "Email is required" }).max(255),
    password: z.string().min(5, { message: "Password is required" }).max(255),
  });

  return schema.safeParse(user);
};

export default authRouter;
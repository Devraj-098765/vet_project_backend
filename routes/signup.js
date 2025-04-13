import express from "express";
import { User, validateUser } from "../models/user.js";
import _ from "lodash";
import { z } from "zod";
import bcrypt from "bcrypt";

const signupRouter = express.Router();

signupRouter.post("/", async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).json({ errors: error.errors });

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send("User already registered");

  user = new User(_.pick(req.body, ["name", "email", "password"]));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  const token = user.generateAuthToken();
  console.log("Generated Token:", token);

  if (token.includes("\n")) {
    console.error("Token contains newline characters!");
  }

  res.header('x-auth-token', token).send(_.pick(user, ["_id", "name", "email"]));
});

export default signupRouter;
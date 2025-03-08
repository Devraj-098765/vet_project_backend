import express from "express";
import { Admin } from "../models/admin.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import { z } from "zod";
import c from "config";

const adminAuthRouter = express.Router();

adminAuthRouter.post("/", async (req, res) => { 
    const { error } = validate(req.body);

    if (error) return res.status(400).json({ errors: error.errors });

    const { email, password } = req.body;

    // check if admin exists
    let admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid email or password" });

    // validats the password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid email or password" });

    // generate token && send it at the header
    const token = admin.generateAuthToken();
    console.log("Generated Token:", token); // Debugging
    res.header("x-auth-token", token).send(token);
});

const validate = (admin) => {
  const schema = z.object({
    email: z.string().email({ message: "Invalid email format"}).min(5, { message: "email is required" }).max(255),
    password: z.string().min(5, { message: "Password is required" }).max(255),
  });

  return schema.safeParse(admin);
};

export default adminAuthRouter;
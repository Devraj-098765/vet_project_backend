import express from "express";
import { Admin } from "../models/admin.js";
import { Veterinarian } from "../models/Veterinarian.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import { z } from "zod";

const adminAuthRouter = express.Router();

adminAuthRouter.post("/", async (req, res) => { 
    const { error } = validate(req.body);

    if (error) return res.status(400).json({ errors: error.errors });

    const { email, password, role } = req.body;

    let user;
    if (role === "admin") {
      user = await Admin.findOne({ email });
    } else if (role === "veterinarian") {
      user = await Veterinarian.findOne({ email: req.body.email }); 
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    console.log(user);
    if (!user) return res.status(400).json({ message: "Invalid email or password" });


    // validats the password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: "Invalid email or password" });

    // generate token && send it at the header
    const token = user.generateAuthToken();
    res.header('x-auth-token', token).send(_.pick(user, ["_id", "email", "role"]));
});

const validate = (data) => {
  const schema = z.object({
    email: z.string().email({ message: "Invalid email format"}).min(5, { message: "email is required" }).max(255),
    password: z.string().min(5, { message: "Password is required" }).max(255),
  });

  return schema.safeParse(data);
};

export default adminAuthRouter;
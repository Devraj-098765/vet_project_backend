import mongoose from "mongoose";
import { z } from "zod";
import jsonwebtoken from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jsonwebtoken.sign({ _id: this._id }, process.env.JWT_PRIVATE_KEY);
  return token;
};

const User = mongoose.model("User", userSchema);

const validateUser = (user) => {
  const schema = z.object({
    name: z.string().min(1, { message: "name is required" }).max(50),
    email: z.string().email().min(5, { message: "email is required" }).max(255),
    password: z.string().min(5, { message: "password is required" }).max(255),
  });

  return schema.safeParse(user);
};

export { User, validateUser };
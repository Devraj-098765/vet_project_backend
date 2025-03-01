import mongoose from "mongoose";
import { z } from "zod";
import jsonwebtoken from "jsonwebtoken";

const adminSchema = new mongoose.Schema({
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
    role: {
        type: String,
        enum: ["admin", "restricted"],
        required: true,
    }
})

adminSchema.methods.generateAuthToken = function () {
  const token = jsonwebtoken.sign({ _id: this._id, role: this.role }, process.env.JWT_PRIVATE_KEY, {
    expiresIn: "1h",
  });
  return token;
};

const Admin = mongoose.model("Admin", adminSchema);

const validateAdmin = (admin) => {
  const schema = z.object({
    email: z.string().email().min(5, { message: "email is required" }).max(255),
    password: z.string().min(5, { message: "password is required" }).max(255),
  });

  return schema.safeParse(admin);
};

export { Admin, validateAdmin };
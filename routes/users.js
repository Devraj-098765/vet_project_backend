import express from "express";
import { User, validateUser } from "../models/user.js";
import _ from "lodash";
import bcrypt from "bcrypt";
import  auth  from "../middleware/auth.js"

const userRouter = express.Router();

userRouter.get("/", auth, async (req, res) => {
  try {
    const users = await User.find().select("name email");
    console.log(users);
    res.send(users);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }  
});

userRouter.put("/:id", auth, async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).json({ errors: error.errors });

  let updateData = {
    name: req.body.name,
    email: req.body.email,
  }

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(req.body.password, salt);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true })

  if (!user)
    return res.status(404).send("The user with the given Id was not found")

  res.send(user)
})

export default userRouter;



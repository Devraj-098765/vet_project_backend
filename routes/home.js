import express from "express";

const routerHome = express.Router();

routerHome.get("/", (req, res) => {
  res.send("Express + Typescript server");
});

export default routerHome;

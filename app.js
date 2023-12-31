// modules
const express = require("express");
const menu = require("./route/menu");
const plan = require("./route/plan");

// environment variables
require("dotenv").config();
const port = process.env.PORT;

// app
const app = express();
app.set("view engine", "ejs");
app.use("/static", express.static("static"));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// routers
app.use("/menu", menu.router);
app.use("/plan", plan);

app.get("/", (req, res) => {
  res.redirect("/menu");
})

app.listen(port, () => {
  console.log(`meal-list server started successfully on port ${port}.`);
});
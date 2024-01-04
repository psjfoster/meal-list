// modules
const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3");

router.get("/", async (req, res) => {
  try {
    const rows = await getRows();
    res.render("../template/menu", { rows });
  } catch (err) {
    res.write(err.message);
    res.end();
  }
});

router.post("/", (req, res) => {
  let mealName = req.body.meal;
  mealName = mealName.replaceAll(/[^a-zA-Z0-9 ]/g, "").toLowerCase().trim();
  let index = mealName.search(/[a-z]/);
  mealName = (mealName.substring(0, index) + mealName[index].toUpperCase() + mealName.substring(index + 1));

  const db = new sqlite3.Database("meal.db");
  db.run("INSERT INTO meals (name) VALUES (?)",
    mealName, (err) => {
      if (err) {
        console.log((err.message));
      }
    });
  res.redirect("/menu");
});

router.post("/delete", async (req, res) => {
  await deleteRows(req);
  res.redirect("/menu");
});

function deleteRows(req) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("meal.db");

    const stmt = db.prepare("DELETE FROM meals WHERE id = ?");
    for (let key in req.body) {
      stmt.run(key);
    }
    stmt.finalize(() => {
      resolve();
    });
  });
}

function getRows() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("meal.db");
    db.serialize(() => {
      db.run("CREATE TABLE IF NOT EXISTS meals (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, times_cooked INTEGER DEFAULT 0, last_cooked TEXT)")
        .all("SELECT * FROM meals ORDER BY name ASC",
      (err, rows) => {
        if (err || rows == undefined) {
          reject("Sorry there was an error.");
        } else {
          resolve(rows);
        }
      });
    });
  });
}

module.exports = { router, getRows };

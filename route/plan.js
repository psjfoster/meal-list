// modules
const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3");

const menu = require("./menu");

router.get("/", async (req, res) => {
  await getPlan(res);
});

router.post("/", async (req, res) => {
  await savePlan(req.body);
  getPlan(res, true);
});

router.post("/commit", async (req, res) => {
  await commitToMenu();
  res.redirect("/plan");
});

router.post("/generate", async (req, res) => {
  await commitToMenu();
  const db = new sqlite3.Database("meal.db");
  
  const start = getStartDate(req.body["start-new"]);
  const noOfDays = req.body["plan-days"];
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  // serialize forces these rows to execute consecutively!!!
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS plan")
      .run("CREATE TABLE plan (date TEXT NOT NULL, fDate TEXT NOT NULL, meal TEXT, cooked INTEGER DEFAULT 0, note TEXT)");

    const stmt = db.prepare("INSERT INTO plan (date, fDate) VALUES (?, ?)");
    for (let d = 0; d < noOfDays; d++) {
      const date = new Date(start + (d * 86400000));
      const dString = date.toISOString().substring(0, 10);
      const fDate = weekday[date.getDay()] + 
                      " " +
                      date.getDate() + 
                      getNth(date.getDate());
      stmt.run([dString, fDate]);
    }
    stmt.finalize(() => {
      res.redirect("/plan");
    });
  });
});

router.post("/new", (req, res) => {
  res.render("../template/plan-new");
});

function commitToMenu() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("meal.db");
    
    // serialize forces these rows to execute consecutively!!!
    db.serialize(() => {
      db.run("INSERT INTO meals (name) SELECT DISTINCT meal FROM plan WHERE meal IS NOT NULL AND cooked = 1 EXCEPT SELECT name FROM meals")
        .all("SELECT meal, COUNT(*) AS times_cooked, MAX(date) AS last_cooked FROM plan WHERE meal IS NOT NULL AND cooked = 1 GROUP BY meal",
          (err, rows) => {
            const stmt = db.prepare("UPDATE meals SET times_cooked = times_cooked + ?, last_cooked = ? WHERE name = ?");
              for (meal in rows) {
                stmt.run([rows[meal].times_cooked, rows[meal].last_cooked, rows[meal].meal]);
              }
            stmt.finalize(() => {
              resolve();
            });
      });
    });
  });
}

function getDates() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("meal.db");
    db.all("SELECT * FROM plan ORDER BY date ASC",
      (err, dates) => {
        if (err || dates == undefined) {
          reject("Sorry there was an error.");
        } else {
          resolve(dates);
        }
      });
  });
}

function getNth(date) {
  switch (date % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

async function getPlan(res, saved) {
  try {
    const plan = await getDates();
    const rows = await menu.getRows();
    res.render("../template/plan", { plan, rows, saved });
  } catch (err) {
    res.write("Sorry, there was an error.");
    res.end();
  }
}

function getStartDate(date) {
  if (date != "") {
    return Date.parse(date);
  } else {
    return Date.now();
  }
}

function isCooked(d) {
  if (d == "cooked") {
    return 1;
  }
  return 0;
}

function savePlan(plan) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("meal.db");
    
    const stmt = db.prepare("UPDATE plan SET meal = ?, cooked = ?, note = ? WHERE date = ?");
    for (let d = 0; d < plan.date.length; d++) {
      if (plan.meal[d]) {
        stmt.run([plan.meal[d], isCooked(plan["d" + d]), plan.note[d], plan.date[d]]);
      } else {
        stmt.run([null, 0, plan.note[d], plan.date[d]]);
      }
    }
    stmt.finalize(() => {
      resolve();
    });
  });
}

module.exports = router;
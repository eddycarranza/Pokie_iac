const express     = require("express");
const pool        = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /api/expenses — solo admin
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM expenses ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses — solo admin
router.post("/", requireAuth, async (req, res) => {
  const { description, amount, category } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (description, amount, category)
       VALUES ($1,$2,$3) RETURNING *`,
      [description, amount, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id — solo admin
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

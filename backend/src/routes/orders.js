const express     = require("express");
const pool        = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /api/orders — solo admin
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — público (clientes crean pedidos)
router.post("/", async (req, res) => {
  const { customer_name, customer_email, total, items } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO orders (customer_name, customer_email, total, items)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [customer_name, customer_email, total, JSON.stringify(items)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id — solo admin (cambiar status)
router.patch("/:id", requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id — solo admin
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM orders WHERE id=$1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

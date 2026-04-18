const express    = require("express");
const pool       = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /api/products — público (la tienda lo necesita)
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products — solo admin
router.post("/", requireAuth, async (req, res) => {
  const { name, description, price, stock, image_url, category } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, price, stock, image_url, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, price, stock, image_url, category]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/products/:id — solo admin
router.patch("/:id", requireAuth, async (req, res) => {
  const { name, description, price, stock, image_url, category } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3,
       stock=$4, image_url=$5, category=$6
       WHERE id=$7 RETURNING *`,
      [name, description, price, stock, image_url, category, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id — solo admin
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

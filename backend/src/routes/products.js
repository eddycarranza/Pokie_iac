// ============================================================
// Rutas de productos — solo enrutamiento, sin lógica.
// La lógica vive en productController → productService.
// ============================================================

const express     = require("express");
const requireAuth = require("../middleware/auth");
const { getAll, create, update, remove } = require("../controllers/productController");

const router = express.Router();

router.get   ("/",    getAll);
router.post  ("/",    requireAuth, create);
router.patch ("/:id", requireAuth, update);
router.delete("/:id", requireAuth, remove);

module.exports = router;

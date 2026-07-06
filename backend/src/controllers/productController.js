// ============================================================
// ProductController — recibe el request HTTP, llama al
// servicio y devuelve la respuesta. Sin lógica de negocio.
// ============================================================

const ProductService = require("../services/productService");
const pool           = require("../db");

const service = new ProductService(pool);

const getAll = async (req, res) => {
  try {
    const products = await service.getAll();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const product = await service.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const product = await service.update(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await service.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { getAll, create, update, remove };

// ============================================================
// ProductService — lógica de negocio de productos
// Recibe el pool por inyección de dependencias para facilitar
// el testing con mocks sin necesitar una BD real corriendo.
// ============================================================

class ProductService {
  constructor(pool) {
    this.pool = pool;
  }

  // ── Validaciones privadas ──────────────────────────────────
  _validate(data) {
    const { name, category, price } = data;
    if (!name || !String(name).trim()) {
      throw new Error("El nombre es obligatorio");
    }
    if (!category || !String(category).trim()) {
      throw new Error("La categoría es obligatoria");
    }
    if (price === undefined || price === null || price === "") {
      throw new Error("El precio es obligatorio");
    }
    if (parseFloat(price) <= 0) {
      throw new Error("El precio debe ser mayor a 0");
    }
  }

  // ── Normalizar fila de BD a tipos JS ──────────────────────
  _normalize(p) {
    return {
      ...p,
      cat:        p.category,
      price:      p.price      != null ? parseFloat(p.price)      : 0,
      sale_price: p.sale_price != null ? parseFloat(p.sale_price) : null,
      stock:      p.stock      != null ? parseInt(p.stock, 10)    : 0,
    };
  }

  // ── Obtener todos los productos ───────────────────────────
  async getAll() {
    const { rows } = await this.pool.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    return rows.map(p => this._normalize(p));
  }

  // ── Crear producto ────────────────────────────────────────
  async create(data) {
    this._validate(data);
    const { name, description, price, stock, image_url, category } = data;
    const { rows } = await this.pool.query(
      `INSERT INTO products (name, description, price, stock, image_url, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        String(name).trim(),
        description || "",
        parseFloat(price),
        parseInt(stock, 10) || 0,
        image_url || null,
        String(category).trim(),
      ]
    );
    return this._normalize(rows[0]);
  }

  // ── Actualizar producto ───────────────────────────────────
  async update(id, data) {
    if (!id) throw new Error("El ID es obligatorio");
    if (data.price !== undefined && parseFloat(data.price) <= 0) {
      throw new Error("El precio debe ser mayor a 0");
    }
    const { name, description, price, stock, image_url, category } = data;
    const { rows } = await this.pool.query(
      `UPDATE products
       SET name=$1, description=$2, price=$3, stock=$4, image_url=$5, category=$6
       WHERE id=$7 RETURNING *`,
      [name, description, price, stock, image_url, category, id]
    );
    if (rows.length === 0) throw new Error("Producto no encontrado");
    return this._normalize(rows[0]);
  }

  // ── Eliminar producto ─────────────────────────────────────
  async remove(id) {
    if (!id) throw new Error("El ID es obligatorio");
    await this.pool.query("DELETE FROM products WHERE id=$1", [id]);
  }
}

module.exports = ProductService;

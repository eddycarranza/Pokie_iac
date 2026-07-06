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
    if (Number.parseFloat(price) <= 0) {
      throw new Error("El precio debe ser mayor a 0");
    }
  }

  // ── Normalizar fila de BD a tipos JS ──────────────────────
  _normalize(p) {
    return {
      ...p,
      cat:        p.category,
      price:      p.price      == null ? 0    : Number.parseFloat(p.price),
      sale_price: p.sale_price == null ? null : Number.parseFloat(p.sale_price),
      stock:      p.stock      == null ? 0    : Number.parseInt(p.stock, 10),
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
        Number.parseFloat(price),
        Number.parseInt(stock, 10) || 0,
        image_url || null,
        String(category).trim(),
      ]
    );
    return this._normalize(rows[0]);
  }

  // ── Transformar/validar un campo del PATCH parcial ────────
  // Devuelve el valor listo para persistir. Lanza error si el
  // campo no cumple las reglas de negocio.
  _transformUpdateField(key, value) {
    switch (key) {
      case "name":
        if (!String(value).trim()) throw new Error("El nombre es obligatorio");
        return String(value).trim();
      case "category":
        if (!String(value).trim()) throw new Error("La categoría es obligatoria");
        return String(value).trim();
      case "price":
        if (Number.parseFloat(value) <= 0) throw new Error("El precio debe ser mayor a 0");
        return Number.parseFloat(value);
      case "stock":
        return Number.parseInt(value, 10) || 0;
      default:
        return value;
    }
  }

  // ── Actualizar producto (PATCH parcial) ───────────────────
  // Solo se actualizan los campos presentes en `data`. Así un
  // PATCH parcial no sobrescribe con NULL los campos ausentes.
  async update(id, data) {
    if (!id) throw new Error("El ID es obligatorio");

    const allowed = ["name", "description", "price", "stock", "image_url", "category"];
    const fields  = [];
    const values  = [];

    for (const key of allowed) {
      if (data[key] === undefined) continue;
      const value = this._transformUpdateField(key, data[key]);
      fields.push(`${key}=$${fields.length + 1}`);
      values.push(value);
    }

    if (fields.length === 0) throw new Error("No hay campos para actualizar");

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id=$${values.length} RETURNING *`,
      values
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

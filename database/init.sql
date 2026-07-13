-- ============================================================
-- POKIE CAT — Base de datos PostgreSQL
-- Este archivo se ejecuta automáticamente cuando Docker
-- levanta el contenedor de PostgreSQL por primera vez
-- ============================================================

-- Extensión para generar UUIDs (igual que Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: admin_users
-- Guarda los usuarios administradores del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email     VARCHAR(100) UNIQUE NOT NULL,
  password  VARCHAR(255) NOT NULL,          -- se guardará con bcrypt (hash)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: products
-- Catálogo de productos de la tienda
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  stock       INTEGER DEFAULT 0,
  image_url   TEXT,
  category    VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: orders
-- Pedidos realizados por clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(100),
  total        NUMERIC(10, 2) NOT NULL,
  status       VARCHAR(50) DEFAULT 'pendiente',  -- pendiente, completado, cancelado
  items        JSONB,                             -- lista de productos del pedido
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: expenses
-- Egresos / gastos del negocio
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description VARCHAR(255) NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL,
  category    VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================

-- Admin por defecto: admin@pookiecat.pe / admin123
-- La contraseña está hasheada con bcrypt (nunca texto plano)
INSERT INTO admin_users (email, password) VALUES (
  'admin@pookiecat.pe',
  '$2b$10$zGwVJWO.jsAs63SI/S7BmOwOWoiSSzqFo0uGxgdFQU5Grs49yjS8O'  -- "admin123"
) ON CONFLICT (email) DO NOTHING;

-- Productos de ejemplo
INSERT INTO products (name, description, price, stock, category) VALUES
  ('Polo Gatuno',       'Polo oversize con estampado de gato kawaii',  45.00, 20, 'Tops'),
  ('Top Pokie',         'Top cropped con bordado de Pokie Cat',         39.00, 15, 'Tops'),
  ('Jean Kawaii',       'Jean con parche bordado de gatito',            65.00, 10, 'Partes de abajo'),
  ('Falda Pokie',       'Falda plisada con estampado kawaii',           55.00, 12, 'Partes de abajo'),
  ('Bolso Gatuno',      'Bolso mini con forma de gato',                 35.00, 25, 'Accesorios'),
  ('Gorra Pokie',       'Gorra bordada con logo de Pookiecat',          28.00, 30, 'Accesorios'),
  ('Zapatilla Kawaii',  'Zapatillas con diseño exclusivo de gatitos',   89.00,  8, 'Zapatos'),
  ('Sandalia Pokie',    'Sandalia con hebilla en forma de gato',        75.00, 10, 'Zapatos')
ON CONFLICT DO NOTHING;

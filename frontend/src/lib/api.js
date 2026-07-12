// ============================================================
// api.js — Reemplaza supabase.js
// Todas las llamadas van ahora a nuestro backend Express
// ============================================================

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

const getHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Valida que el id recibido sea un identificador "seguro" antes de usarlo
// para construir una URL. Evita que datos no confiables (tainted data)
// terminen formando parte de la ruta de la petición.
const sanitizeId = (id) => {
  const safeId = String(id);
  if (!/^[a-zA-Z0-9_-]+$/.test(safeId)) {
    throw new Error("Identificador inválido");
  }
  return encodeURIComponent(safeId);
};

// Función genérica para manejar respuestas
const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.reload();
    return null;
  }
  if (res.status === 204) return null;
  return res.json();
};

// ── Auth ─────────────────────────────────────────────────────
export const loginAdmin = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Acceso denegado");
  return data; // { access_token, email }
};

// ── Productos ─────────────────────────────────────────────────
export const getProducts = async () => {
  const res = await fetch(`${API_URL}/products`);
  return handleResponse(res);
};

export const createProduct = async (product) => {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(product),
  });
  return handleResponse(res);
};

export const updateProduct = async (id, product) => {
  const res = await fetch(`${API_URL}/products/${sanitizeId(id)}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(product),
  });
  return handleResponse(res);
};

export const deleteProduct = async (id) => {
  const res = await fetch(`${API_URL}/products/${sanitizeId(id)}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// ── Pedidos ───────────────────────────────────────────────────
export const getOrders = async () => {
  const res = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
  return handleResponse(res);
};

export const createOrder = async (order) => {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  return handleResponse(res);
};

export const updateOrder = async (id, data) => {
  const res = await fetch(`${API_URL}/orders/${sanitizeId(id)}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deleteOrder = async (id) => {
  const res = await fetch(`${API_URL}/orders/${sanitizeId(id)}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// ── Pagos (Culqi) ─────────────────────────────────────────────
export const createCharge = async (chargeData) => {
  const res = await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chargeData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al procesar el pago");
  return data;
};

// ── Egresos ───────────────────────────────────────────────────
export const getExpenses = async () => {
  const res = await fetch(`${API_URL}/expenses`, { headers: getHeaders() });
  return handleResponse(res);
};

export const createExpense = async (expense) => {
  const res = await fetch(`${API_URL}/expenses`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(expense),
  });
  return handleResponse(res);
};

export const deleteExpense = async (id) => {
  const res = await fetch(`${API_URL}/expenses/${sanitizeId(id)}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// ============================================================
// useApi.js — Reemplaza useSupabase.js
// Usa la nueva API REST en lugar de Supabase directamente
// ============================================================
import { useState, useEffect } from "react";
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getOrders,   createOrder,   updateOrder,   deleteOrder,
  getExpenses, createExpense, deleteExpense,
} from "../lib/api";

// ── Productos ─────────────────────────────────────────────────
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const data = await getProducts();
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const addProduct = async (data) => {
    await createProduct(data);
    fetchProducts();
  };

  const editProduct = async (id, data) => {
    await updateProduct(id, data);
    fetchProducts();
  };

  const removeProduct = async (id) => {
    await deleteProduct(id);
    fetchProducts();
  };

  return { products, loading, addProduct, editProduct, removeProduct };
}

// ── Pedidos ───────────────────────────────────────────────────
export function useOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const data = await getOrders();
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const addOrder = async (data) => {
    await createOrder(data);
    fetchOrders();
  };

  const editOrder = async (id, data) => {
    await updateOrder(id, data);
    fetchOrders();
  };

  const removeOrder = async (id) => {
    await deleteOrder(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return { orders, loading, addOrder, editOrder, removeOrder };
}

// ── Egresos ───────────────────────────────────────────────────
export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchExpenses = async () => {
    setLoading(true);
    const data = await getExpenses();
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const addExpense = async (data) => {
    await createExpense(data);
    fetchExpenses();
  };

  const removeExpense = async (id) => {
    await deleteExpense(id);
    fetchExpenses();
  };

  return { expenses, loading, addExpense, removeExpense };
}

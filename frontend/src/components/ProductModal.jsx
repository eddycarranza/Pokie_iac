// src/components/ProductModal.jsx
import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";

const COLOR_MAP = [
  { name: "Pale Pink", hex: "hsl(337, 27%, 83%)" },
  { name: "White", hex: "#f0f0f0" },
  { name: "Black", hex: "rgb(34, 34, 34)" },
  { name: "Azul denim", hex: "#7eb0d4" },
  { name: "Light Brown", hex: "rgba(65, 47, 37, 0.86)" },
];

export default function ProductModal({ product, onClose }) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [mainImgIdx, setMainImgIdx] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  if (!product) return null;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const baseSizes = Array.isArray(product.sizes) ? product.sizes : (typeof product.sizes === "string" ? product.sizes.split(",") : []);
  const baseColors = Array.isArray(product.colors) ? product.colors : (typeof product.colors === "string" ? product.colors.split(",") : []);
  const availableSizes = hasVariants ? [...new Set(product.variants.map(v => v.size))] : baseSizes;
  const availableColors = hasVariants ? [...new Set(product.variants.map(v => v.color))] : baseColors;

  let currentStock = 0;
  if (hasVariants) {
    if (selectedSize && selectedColor) {
      const variant = product.variants.find(v => v.size === selectedSize && v.color === selectedColor);
      currentStock = variant ? parseInt(variant.stock, 10) : 0;
    } else {
      currentStock = product.variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
    }
  } else {
    currentStock = parseInt(product.stock, 10) || 0;
  }

  const isOutOfStock = isNaN(currentStock) || currentStock <= 0;
  const salePrice = product.salePrice || product.sale_price;
  const normalPrice = product.price || 0;
  const effPrice = salePrice || normalPrice;

  let images = [];
  if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    images = product.image_urls;
  } else if (product.image_url) {
    images = [product.image_url];
  } else if (product.imageUrl) {
    images = [product.imageUrl];
  }

  const handleAdd = () => {
    if (availableSizes.length > 0 && !selectedSize) return alert("Por favor, selecciona una talla.");
    if (availableColors.length > 0 && !selectedColor) return alert("Por favor, selecciona un color.");
    addToCart(product, qty, selectedSize, selectedColor, isOutOfStock);
    onClose();
  };

  const generateWspLink = () => {
    const phoneNumber = "51927112114";
    let message = `Hola! Quisiera consultar disponibilidad de: *${product.name}*`;
    if (selectedSize) message += `\n- Talla: ${selectedSize}`;
    if (selectedColor) message += `\n- Color: ${selectedColor}`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        overflowY: "auto",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "1100px",
          minHeight: "100vh",
          background: "white",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Top bar / breadcrumb */}
        <div className="product-modal-breadcrumb" style={{
          padding: "0.9rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky", top: 0, background: "white", zIndex: 10,
        }}>
          <div style={{ fontSize: "0.82rem", color: "#888", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={onClose}>Inicio</span>
            <span>/</span>
            <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={onClose}>{product.cat || "Catálogo"}</span>
            <span>/</span>
            <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{product.name}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "1px solid #e5e5e5", fontSize: "1.1rem",
              cursor: "pointer", color: "#888", borderRadius: "50%",
              width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#1a1a1a"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#888"; }}
          >&#x2715;</button>
        </div>

        {/* Main content: 2 columns */}
        <div className="product-modal-inner" style={{ display: "flex", flexWrap: "wrap", flex: 1 }}>

          {/* LEFT: Image Gallery */}
          <div className="product-modal-left" style={{ flex: "1 1 320px", maxWidth: "420px", padding: "1rem 2rem 2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{
              width: "100%", aspectRatio: "2/3", borderRadius: "8px",
              overflow: "hidden", background: "#f5f5f5", position: "relative",
            }}>
              {images.length > 0 ? (
                <img src={images[mainImgIdx]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
                  {product.emoji || "👗"}
                </div>
              )}
              {/* Flechas estilo imagen 3 — minimalistas con fondo semitransparente */}
              {images.length > 1 && (
                <>
                  <button onClick={() => setMainImgIdx(i => (i - 1 + images.length) % images.length)} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>&#x2039;</button>
                  <button onClick={() => setMainImgIdx(i => (i + 1) % images.length)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.7)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>&#x203a;</button>
                </>
              )}
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                {product.badge === "preventa" && <span style={{ background: "#ffc107", color: "#856404", padding: "5px 10px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>PREVENTA</span>}
                {salePrice && !isOutOfStock && product.badge !== "preventa" && <span style={{ background: "#1a1a1a", color: "white", padding: "5px 10px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>OFERTA</span>}
              </div>
            </div>

            {/* Dots FUERA de la imagen, debajo */}
            {images.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingTop: 4 }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setMainImgIdx(i)} style={{ width: i === mainImgIdx ? 20 : 8, height: 8, borderRadius: 999, border: "none", cursor: "pointer", padding: 0, background: i === mainImgIdx ? "#1a1a1a" : "#d5d5d5", transition: "all .3s" }} />
                ))}
              </div>
            )}

            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setMainImgIdx(i)} style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: mainImgIdx === i ? "2px solid #1a1a1a" : "1px solid #e5e5e5", opacity: mainImgIdx === i ? 1 : 0.65, transition: "all .2s" }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Descripción debajo de las fotos */}
            {product.description && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", lineHeight: 1.9, color: "#333", fontFamily: "var(--font)", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}>
                {product.description}
              </div>
            )}
          </div>

          {/* RIGHT: Product Info */}
          <div className="product-modal-right" style={{ flex: "1 1 360px", padding: "1rem 2rem 2rem", display: "flex", flexDirection: "column", gap: "1.4rem" }}>

            {/* Category + Name + Price */}
            <div>
              <div style={{ fontSize: "0.75rem", color: "#aaa", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6, fontFamily: "var(--font)" }}>
                {product.cat}
              </div>
              <h1 style={{ fontFamily: "var(--font)", fontSize: "1.8rem", fontWeight: 700, margin: "0 0 1rem 0", lineHeight: 1.1, color: "#1a1a1a" }}>
                {product.name}
              </h1>
              <div style={{ fontSize: "1.7rem", fontWeight: 700, color: "#1a1a1a" }}>
                {salePrice ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ color: "#e00" }}>S/ {Number(salePrice).toFixed(2)}</span>
                    <span style={{ textDecoration: "line-through", color: "#aaa", fontSize: "1rem", fontWeight: 400 }}>S/ {Number(normalPrice).toFixed(2)}</span>
                  </div>
                ) : (
                  <span>S/ {Number(effPrice).toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Sizes */}
            {availableSizes.length > 0 && (
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 8, color: "#1a1a1a", fontFamily: "var(--font)" }}>Talla</div>
                <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #d5d5d5", fontSize: "0.95rem", fontFamily: "var(--font)", background: "white", cursor: "pointer", outline: "none" }}>
                  <option value="">Seleccionar talla</option>
                  {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Colors */}
            {availableColors.length > 0 && (
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 8, color: "#1a1a1a", fontFamily: "var(--font)" }}>
                  Color: {selectedColor ? <span style={{ fontWeight: 400, color: "#555" }}>{selectedColor}</span> : <span style={{ fontWeight: 400, color: "#aaa" }}>(Selecciona)</span>}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {availableColors.map(c => {
                    const colorObj = COLOR_MAP.find(opt => opt.name === c) || { hex: c.startsWith("#") || c.startsWith("rgb") || c.startsWith("hsl") ? c : "#ccc" };
                    return <div key={c} onClick={() => setSelectedColor(c)} title={c} style={{ width: 36, height: 36, borderRadius: "50%", background: colorObj.hex, border: selectedColor === c ? "3px solid #1a1a1a" : "2px solid #e5e5e5", cursor: "pointer", boxShadow: selectedColor === c ? "0 0 0 2px white inset" : "none", transition: "all .2s" }} />;
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 8, color: "#1a1a1a", fontFamily: "var(--font)" }}>Cantidad</div>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #d5d5d5", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 40, height: 42, border: "none", background: "#f5f5f5", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background="#ebebeb"} onMouseLeave={e => e.currentTarget.style.background="#f5f5f5"}>&#x2212;</button>
                <input type="number" value={qty} min={1} max={isOutOfStock ? 99 : currentStock} onChange={e => setQty(Math.min(isOutOfStock ? 99 : currentStock, Math.max(1, parseInt(e.target.value) || 1)))} style={{ width: 52, height: 42, border: "none", textAlign: "center", fontSize: "1rem", fontFamily: "var(--font)", outline: "none" }} />
                <button onClick={() => setQty(q => isOutOfStock ? q + 1 : Math.min(currentStock, q + 1))} disabled={!isOutOfStock && qty >= currentStock} style={{ width: 40, height: 42, border: "none", background: (!isOutOfStock && qty >= currentStock) ? "#f0f0f0" : "#f5f5f5", cursor: (!isOutOfStock && qty >= currentStock) ? "not-allowed" : "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", opacity: (!isOutOfStock && qty >= currentStock) ? 0.4 : 1 }} onMouseEnter={e => { if(isOutOfStock || qty < currentStock) e.currentTarget.style.background="#ebebeb"; }} onMouseLeave={e => { e.currentTarget.style.background = (!isOutOfStock && qty >= currentStock) ? "#f0f0f0" : "#f5f5f5"; }}>&#x2b;</button>
              </div>
            </div>

            {/* Stock */}
            <div style={{ fontSize: "0.85rem", color: isOutOfStock ? "#c77800" : "#2a7a2a", display: "flex", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", display: "inline-block" }}></span>
                {isOutOfStock ? "A pedido" : "En stock"}
              </span>
              {!isOutOfStock && <span style={{ color: "#aaa" }}>{currentStock} unidades disponibles</span>}
            </div>


            {/* Button */}
            <button onClick={handleAdd} style={{ padding: "15px", borderRadius: 10, fontSize: "0.9rem", width: "100%", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, background: "#1a1a1a", color: "white", border: "none", cursor: "pointer", fontFamily: "var(--font)", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.background="#333"} onMouseLeave={e => e.currentTarget.style.background="#1a1a1a"}>
              AGREGAR AL CARRITO
            </button>

            {/* Nota de demora / MENSAJE PERSONALIZADO */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f9f9f9", border: "1px solid #eee", borderRadius: 10, padding: "12px 14px" }}>
              <span style={{ fontSize: "0.85rem", color: "#888", flexShrink: 0, marginTop: 1 }}>ⓘ</span>
              <span style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.65, fontFamily: "var(--font)" }}>
                {product.shipping_message || "todos los productos tienen de 7 a 21 días (aprox) de demora a partir de la compra, ya que cada producto está confeccionado con amor y dedicación desde cero (◕‿◕)"}
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
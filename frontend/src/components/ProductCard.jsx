// src/components/ProductCard.jsx
import React, { useState } from "react";

export default function ProductCard({ product, onClick, variant = "grid" }) {
  const [hovered, setHovered] = useState(false);

  const salePrice = product.salePrice || product.sale_price;
  const normalPrice = product.price || 0;
  const effPrice = salePrice || normalPrice;

  let image = "";
  if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    image = product.image_urls[0];
  } else if (product.image_url) {
    image = product.image_url;
  } else if (product.imageUrl) {
    image = product.imageUrl;
  }

  if (variant === "newIn") {
    return (
      <div
        className="product-card-wrap"
        onClick={() => onClick(product)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: "280px", flexShrink: 0 }}
      >
        <div className="product-img-wrap" style={{ width: "100%", aspectRatio: "2/3", background: "var(--pink-light)" }}>
          {image ? (
            <img src={image} alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", transform: hovered ? "scale(1.06)" : "scale(1)", transition: "transform 0.42s ease" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
              {product.emoji || "👗"}
            </div>
          )}
          {product.badge === "preventa" && (
            <span className="badge-status badge-preventa" style={{ position: "absolute", top: 10, left: 10, fontSize: "0.68rem" }}>PREVENTA</span>
          )}
          {salePrice && product.badge !== "preventa" && (
            <span className="badge-status badge-sale" style={{ position: "absolute", top: 10, right: 10, fontSize: "0.68rem" }}>OFERTA</span>
          )}
          <div className="product-card-overlay">Ver producto</div>
        </div>
        <div style={{ padding: "0.9rem 1rem", textAlign: "center" }}>
          <h3 className="serif" style={{ fontSize: "0.95rem", margin: "0 0 4px 0", lineHeight: 1.3 }}>{product.name}</h3>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {salePrice ? (
              <>
                <span style={{ textDecoration: "line-through", color: "var(--gray)", fontSize: "0.8rem", marginRight: 6 }}>S/ {Number(normalPrice).toFixed(2)}</span>
                <span style={{ color: "var(--danger)" }}>S/ {Number(salePrice).toFixed(2)}</span>
              </>
            ) : `S/ ${Number(effPrice).toFixed(2)}`}
          </div>
        </div>
      </div>
    );
  }

  // Default grid variant
  return (
    <div
      className="product-card-wrap"
      onClick={() => onClick(product)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: 0 }}
    >
      <div className="product-img-wrap" style={{ width: "100%", aspectRatio: "2/3", background: "var(--pink-light)" }}>
        {image ? (
          <img src={image} alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", transform: hovered ? "scale(1.06)" : "scale(1)", transition: "transform 0.42s ease" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
            {product.emoji || "👗"}
          </div>
        )}
        {product.badge === "preventa" && (
          <span className="badge-status badge-preventa" style={{ position: "absolute", top: 10, left: 10, fontSize: "0.68rem" }}>PREVENTA</span>
        )}
        {salePrice && product.badge !== "preventa" && (
          <span className="badge-status badge-sale" style={{ position: "absolute", top: 10, right: 10, fontSize: "0.68rem" }}>OFERTA</span>
        )}
        <div className="product-card-overlay">Ver producto</div>
      </div>

      <div style={{ padding: "0.85rem 0.9rem 1rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: "0.68rem", color: "var(--gray)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.09em" }}>{product.cat}</div>
        <h3 className="serif" style={{ fontSize: "0.95rem", margin: "0 0 6px 0", lineHeight: 1.25 }}>{product.name}</h3>
        <div style={{ marginTop: "auto", fontWeight: 700, fontSize: "0.9rem" }}>
          {salePrice ? (
            <>
              <span style={{ textDecoration: "line-through", color: "var(--gray)", fontSize: "0.8rem", fontWeight: 400, marginRight: 6 }}>S/ {Number(normalPrice).toFixed(2)}</span>
              <span style={{ color: "var(--danger)" }}>S/ {Number(salePrice).toFixed(2)}</span>
            </>
          ) : `S/ ${Number(effPrice).toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}

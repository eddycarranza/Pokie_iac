// src/components/ProductCard.jsx
import React from "react";

export default function ProductCard({ product, onClick, variant = "grid" }) {
  const stock = parseInt(product.stock, 10);
  const isOutOfStock = isNaN(stock) || stock <= 0;
  
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

  // "newIn" variant: tall rectangular card like reference image 1
  if (variant === "newIn") {
    return (
      <div
        onClick={() => onClick(product)}
        style={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
          transition: "transform 0.25s, box-shadow 0.25s",
          flexShrink: 0,
          width: "280px",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ width: "100%", aspectRatio: "2/3", background: "var(--pink-light)", position: "relative", overflow: "hidden" }}>
          {image ? (
            <img src={image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
              {product.emoji || "👗"}
            </div>
          )}
          {product.badge === "preventa" && (
            <div style={{ position: "absolute", top: 10, left: 10 }}>
              <span className="badge-status badge-preventa" style={{ padding: "4px 8px", fontSize: "0.7rem", fontWeight: "bold" }}>PREVENTA</span>
            </div>
          )}
          {salePrice && !isOutOfStock && product.badge !== "preventa" && (
            <div style={{ position: "absolute", top: 10, right: 10 }}>
              <span className="badge-status badge-sale" style={{ padding: "4px 8px", fontSize: "0.7rem", fontWeight: "bold" }}>OFERTA</span>
            </div>
          )}
        </div>
        <div style={{ padding: "0.9rem 1rem", textAlign: "center" }}>
          <h3 className="serif" style={{ fontSize: "0.95rem", margin: "0 0 4px 0", lineHeight: 1.3 }}>{product.name}</h3>
          <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 2 }}>
            {salePrice ? (
              <>
                <span style={{ textDecoration: "line-through", color: "var(--gray)", fontSize: "0.8rem", marginRight: "6px" }}>S/ {Number(normalPrice).toFixed(2)}</span>
                <span style={{ color: "var(--danger)" }}>S/ {Number(salePrice).toFixed(2)}</span>
              </>
            ) : `S/ ${Number(effPrice).toFixed(2)}`}
          </div>
        </div>
      </div>
    );
  }

  // Default "grid" variant: 4:6 portrait (2:3 ratio = 1200x1800px)
  return (
    <div
      className="card"
      onClick={() => onClick(product)}
      style={{
        cursor: "pointer", padding: 0, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ width: "100%", aspectRatio: "2/3", background: "var(--pink-light)", position: "relative", overflow: "hidden" }}>
        {image ? (
          <img src={image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
            {product.emoji || "👗"}
          </div>
        )}
        {product.badge === "preventa" && (
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            <span className="badge-status badge-preventa" style={{ padding: "4px 8px", fontSize: "0.7rem", fontWeight: "bold" }}>PREVENTA</span>
          </div>
        )}
        {salePrice && !isOutOfStock && product.badge !== "preventa" && (
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <span className="badge-status badge-sale" style={{ padding: "4px 8px", fontSize: "0.7rem", fontWeight: "bold" }}>OFERTA</span>
          </div>
        )}
      </div>
      <div style={{ padding: "0.9rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: "0.7rem", color: "var(--gray)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "1px" }}>{product.cat}</div>
        <h3 className="serif" style={{ fontSize: "1rem", margin: "0 0 6px 0", lineHeight: 1.2 }}>{product.name}</h3>
        <div style={{ marginTop: "auto", fontWeight: 600, fontSize: "0.92rem" }}>
          {salePrice ? (
            <>
              <span style={{ textDecoration: "line-through", color: "var(--gray)", fontSize: "0.82rem", marginRight: "6px" }}>S/ {Number(normalPrice).toFixed(2)}</span>
              <span style={{ color: "var(--danger)" }}>S/ {Number(salePrice).toFixed(2)}</span>
            </>
          ) : `S/ ${Number(effPrice).toFixed(2)}`}
        </div>
      </div>
    </div>
  );
}

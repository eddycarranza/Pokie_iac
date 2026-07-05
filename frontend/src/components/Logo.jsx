export default function Logo({ size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f5e6ea",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fontSize: Math.round(size * 0.55),
      flexShrink: 0,
    }}>
      🐱
    </div>
  );
}
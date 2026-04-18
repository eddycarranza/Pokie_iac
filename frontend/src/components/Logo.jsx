export default function Logo({ size = 30 }) {
  const linkSupabase = `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/products/pokie.jpg`;

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", 
      overflow: "hidden", display: "flex", alignItems: "center",
      justifyContent: "center", background: "white", 
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)", 
    }}>
      <img src={linkSupabase} alt="Pookiecat" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}
// ============================================================
// POKIE CAT — Arranque del backend como servidor (Docker / local)
// La definición de la app vive en app.js para poder reutilizarla en Lambda.
// ============================================================
const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});

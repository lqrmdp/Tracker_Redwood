/* ============================================================
   utils.js — utilidades puras
   Depende de (al cargar): MODULES, CODE_TO_ESTADO
   Depende de (tras el login): CLIENTS, SEED (se leen de window.RW
   dentro de buildSeedDoc, que arma la matriz inicial base).
   El almacenamiento ya no es localStorage: ahora es Supabase (db.js).
   Publica en window.RW: keyOf, buildSeedDoc, fmtDateTime, fmtDate, csvEscape
   ============================================================ */
(function () {
  const { MODULES, CODE_TO_ESTADO } = window.RW;

  const keyOf = (cliente, modulo) => `${cliente}||${modulo}`;

  /* Matriz inicial "base" a partir de la semilla. Las ediciones del equipo
     (que vienen de la base de datos) se superponen encima de esta base. */
  function buildSeedDoc() {
    const CLIENTS = window.RW.CLIENTS || [];
    const SEED = window.RW.SEED || [];
    const cells = {};
    MODULES.forEach((mod, mi) => {
      CLIENTS.forEach((cl, ci) => {
        cells[keyOf(cl.c, mod.m)] = {
          estado: CODE_TO_ESTADO[SEED[mi][ci]],
          sub: "sin_contactar",
          fecha: "",
          ticket: "",
          comentario: "",
          updatedBy: "",
          updatedAt: "",
        };
      });
    });
    return { seeded: true, cells };
  }

  function fmtDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDate(s) {
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  function csvEscape(v) {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  window.RW = Object.assign(window.RW || {}, { keyOf, buildSeedDoc, fmtDateTime, fmtDate, csvEscape });
})();

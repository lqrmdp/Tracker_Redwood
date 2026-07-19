/* ============================================================
   utils.js — utilidades puras y almacenamiento persistente
   Depende de (al cargar): MODULES, CODE_TO_ESTADO, STORAGE_KEY
   Depende de (en tiempo de ejecución, tras el login): CLIENTS, SEED
   — se leen de window.RW dentro de buildSeedDoc porque solo existen
   una vez descifrados los datos.
   Publica en window.RW: keyOf, buildSeedDoc, fmtDateTime, fmtDate,
   csvEscape, storage
   ============================================================ */
(function () {
  const { MODULES, CODE_TO_ESTADO, STORAGE_KEY } = window.RW;

  const keyOf = (cliente, modulo) => `${cliente}||${modulo}`;

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

  /* ---------- Almacenamiento persistente (localStorage) ---------- */
  const storage = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    save(doc) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(doc)); return true; }
      catch (e) { return false; }
    },
  };

  window.RW = Object.assign(window.RW || {}, { keyOf, buildSeedDoc, fmtDateTime, fmtDate, csvEscape, storage });
})();

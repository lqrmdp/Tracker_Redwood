/* ============================================================
   data.js — definiciones de dominio NO sensibles
   Los módulos (nombres de producto Oracle) y los catálogos de
   estados/embudo son públicos. Los datos sensibles (CLIENTS, PMS,
   SEED) NO están aquí: viajan cifrados en config.js y se cargan en
   window.RW tras el login (ver app.js / config.js).
   Publica en window.RW: MODULES, CODE_TO_ESTADO, ESTADOS,
   ESTADO_ORDER, SUBS, SUB_ORDER
   ============================================================ */
(function () {
  /* ---------- Catálogo de módulos ---------- */
  const MODULES = [
    { g: "Procurement", m: "Procurement Contracts" },
    { g: "Procurement", m: "Purchasing" },
    { g: "Procurement", m: "Self Service Procurement" },
    { g: "Procurement", m: "Sourcing" },
    { g: "Procurement", m: "Supplier Model" },
    { g: "Procurement", m: "Supplier Qualification" },
    { g: "Procurement", m: "Supplier Portal" },
    { g: "SCM", m: "Cost Management" },
    { g: "SCM", m: "Inventory Management" },
    { g: "SCM", m: "Landed Cost Management" },
    { g: "SCM", m: "Maintenance" },
    { g: "SCM", m: "Manufacturing" },
    { g: "SCM", m: "Order Management" },
  ];

  const CODE_TO_ESTADO = { N: "NA", P: "POTENCIAL", C: "CURSO", R: "ACTIVO", "-": "SIN" };

  /* ---------- Estados ---------- */
  const ESTADOS = {
    ACTIVO:    { label: "Redwood Activo", desc: "El módulo ya se encuentra migrado a Redwood",       bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", border: "border-emerald-300" },
    CURSO:     { label: "En Curso",       desc: "Configuración en proceso",                          bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500",    border: "border-blue-300" },
    POTENCIAL: { label: "Potencial",      desc: "Cliente disponible para implementación",            bg: "bg-amber-100",   text: "text-amber-800",   dot: "bg-amber-500",   border: "border-amber-300" },
    NA:        { label: "No aplica",      desc: "Módulo no implementado",                            bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400",    border: "border-gray-200" },
    SIN:       { label: "Sin capturar",   desc: "Información pendiente de llenado",                  bg: "bg-white",       text: "text-gray-300",    dot: "bg-gray-200",    border: "border-gray-300" },
  };
  const ESTADO_ORDER = ["ACTIVO", "CURSO", "POTENCIAL", "NA", "SIN"];

  /* ---------- Embudo comercial ---------- */
  const SUBS = {
    sin_contactar: { label: "Sin contactar",              chip: "bg-gray-100 text-gray-600",     bar: "#9CA3AF", step: 1 },
    contactado:    { label: "Ya se habló con el cliente", chip: "bg-sky-100 text-sky-700",       bar: "#38BDF8", step: 2 },
    propuesta:     { label: "Propuesta enviada",          chip: "bg-violet-100 text-violet-700", bar: "#8B5CF6", step: 3 },
    fecha:         { label: "Con fecha tentativa",        chip: "bg-emerald-100 text-emerald-700", bar: "#10B981", step: 4 },
    descartado:    { label: "No interesado / Descartado", chip: "bg-rose-100 text-rose-700",     bar: "#F43F5E", step: 5 },
  };
  const SUB_ORDER = ["sin_contactar", "contactado", "propuesta", "fecha", "descartado"];

  window.RW = Object.assign(window.RW || {}, {
    MODULES, CODE_TO_ESTADO, ESTADOS, ESTADO_ORDER, SUBS, SUB_ORDER,
  });
})();

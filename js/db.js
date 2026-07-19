/* ============================================================
   db.js — capa de datos compartida (Supabase)
   Login, lectura/escritura de la matriz y actualización EN VIVO.
   Usa la librería global `supabase` (cargada por CDN en index.html).
   Depende de window.RW: SUPABASE_URL, SUPABASE_KEY, TEAM_EMAIL
   Publica en window.RW: sb, getSession, signIn, signOut,
   loadDefinitions, loadCells, upsertCell, deleteAllCells, subscribeCells
   ============================================================ */
(function () {
  const { SUPABASE_URL, SUPABASE_KEY, TEAM_EMAIL } = window.RW;

  if (!window.supabase || !window.supabase.createClient) {
    throw new Error("No se cargó la librería de Supabase (revisa tu conexión).");
  }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- Sesión / acceso ---------- */
  async function getSession() {
    const { data } = await sb.auth.getSession();
    return data ? data.session : null;
  }
  async function signIn(password) {
    const { error } = await sb.auth.signInWithPassword({ email: TEAM_EMAIL, password });
    if (error) throw error;
  }
  async function signOut() { await sb.auth.signOut(); }

  /* ---------- Definiciones (clientes/PMs + matriz inicial) ---------- */
  async function loadDefinitions() {
    const { data, error } = await sb.from("definitions").select("data").eq("id", 1).single();
    if (error) throw error;
    return data.data; // { CLIENTS, SEED }
  }

  /* ---------- Celdas (seguimiento en vivo) ---------- */
  function rowToCell(r) {
    return {
      estado: r.estado, sub: r.sub || "sin_contactar",
      fecha: r.fecha || "", ticket: r.ticket || "", comentario: r.comentario || "",
      updatedBy: r.updated_by || "", updatedAt: r.updated_at || "",
    };
  }

  async function loadCells() {
    const { data, error } = await sb.from("cells").select("*");
    if (error) throw error;
    const map = {};
    (data || []).forEach((r) => { map[r.cell_key] = rowToCell(r); });
    return map;
  }

  async function upsertCell(cellKey, cell) {
    const row = {
      cell_key: cellKey,
      estado: cell.estado,
      sub: cell.sub,
      fecha: cell.fecha || null,
      ticket: cell.ticket || null,
      comentario: cell.comentario || null,
      updated_by: cell.updatedBy || null,
      updated_at: cell.updatedAt || new Date().toISOString(),
    };
    const { error } = await sb.from("cells").upsert(row, { onConflict: "cell_key" });
    if (error) throw error;
  }

  async function deleteAllCells() {
    const { error } = await sb.from("cells").delete().neq("cell_key", "");
    if (error) throw error;
  }

  /* ---------- Tiempo real: avisa cuando alguien cambia una celda ---------- */
  function subscribeCells(onChange) {
    const ch = sb.channel("cells-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cells" }, onChange)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }

  window.RW = Object.assign(window.RW || {}, {
    sb, getSession, signIn, signOut,
    loadDefinitions, loadCells, upsertCell, deleteAllCells, subscribeCells, rowToCell,
  });
})();

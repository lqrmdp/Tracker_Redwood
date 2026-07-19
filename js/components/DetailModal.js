/* ============================================================
   DetailModal.js — modal de edición de una celda (estado,
   seguimiento comercial, ticket y comentario).
   Depende de: React (hooks), Icon, I, ESTADOS, ESTADO_ORDER,
   SUBS, SUB_ORDER, PMS, BRAND, fmtDateTime
   Publica en window.RW: DetailModal
   ============================================================ */
(function () {
  const { useState } = React;
  const { Icon, I, ESTADOS, ESTADO_ORDER, SUBS, SUB_ORDER, BRAND, fmtDateTime } = window.RW;

  function DetailModal({ selected, cell, currentPM, setCurrentPM, onClose, onSave }) {
    const PMS = window.RW.PMS || []; // disponible tras el login
    const [estado, setEstado] = useState(cell?.estado || "SIN");
    const [sub, setSub] = useState(cell?.sub || "sin_contactar");
    const [fecha, setFecha] = useState(cell?.fecha || "");
    const [ticket, setTicket] = useState(cell?.ticket || "");
    const [comentario, setComentario] = useState(cell?.comentario || "");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSave() {
      setError("");
      if (!currentPM) { setError("Selecciona tu nombre de PM para registrar el cambio."); return; }
      if (estado === "CURSO" && !ticket.trim()) { setError("Los casos «En Curso» requieren el ticket de la mesa de ayuda."); return; }
      if (estado === "POTENCIAL" && sub === "fecha" && !fecha) { setError("Indica la fecha tentativa de inicio."); return; }
      setSaving(true);
      await onSave({
        estado, sub, fecha, ticket: ticket.trim(), comentario: comentario.trim(),
        updatedBy: currentPM, updatedAt: new Date().toISOString(),
      });
      setSaving(false);
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">{selected.grupo} · PM responsable: {selected.pm}</p>
              <h3 className="text-lg font-bold text-gray-800 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                {selected.cliente}
              </h3>
              <p className="text-sm text-gray-500">{selected.modulo}</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-1">
              <Icon path={I.X} className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado del módulo</label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ESTADO_ORDER.map((e) => (
                  <button key={e} onClick={() => setEstado(e)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all text-left
                      ${estado === e ? ESTADOS[e].bg + " " + ESTADOS[e].text + " ring-2 ring-offset-1 ring-gray-400 " + ESTADOS[e].border
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                    <span className="flex items-center gap-1.5">
                      <span className={"w-2 h-2 rounded-full " + ESTADOS[e].dot} />
                      {ESTADOS[e].label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">{ESTADOS[estado].desc}</p>
            </div>

            {estado === "POTENCIAL" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-amber-800 flex items-center gap-1.5">
                  <Icon path={I.Target} className="w-3.5 h-3.5" /> Seguimiento comercial
                </label>
                <select value={sub} onChange={(e) => setSub(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400">
                  {SUB_ORDER.map((s) => <option key={s} value={s}>{SUBS[s].step}. {SUBS[s].label}</option>)}
                </select>
                {sub === "fecha" && (
                  <div>
                    <label className="text-xs text-amber-800 flex items-center gap-1 mb-1">
                      <Icon path={I.Cal} className="w-3.5 h-3.5" /> Fecha tentativa de inicio
                    </label>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                )}
              </div>
            )}

            {estado === "CURSO" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-blue-800 flex items-center gap-1.5 mb-1.5">
                  <Icon path={I.Ticket} className="w-3.5 h-3.5" /> Ticket de mesa de ayuda
                </label>
                <input type="text" value={ticket} onChange={(e) => setTicket(e.target.value)}
                  placeholder="Ej. 45872 o el identificador de tu mesa de ayuda"
                  className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <Icon path={I.Msg} className="w-3.5 h-3.5" /> Comentario
              </label>
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
                placeholder="Particularidades del caso, acuerdos con el cliente, contexto…"
                className="mt-1.5 w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>

            {cell?.updatedBy && (
              <p className="text-xs text-gray-400">
                Última actualización: <span className="font-medium text-gray-500">{cell.updatedBy}</span> · {fmtDateTime(cell.updatedAt)}
              </p>
            )}

            {!currentPM && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Icon path={I.User} className="w-4 h-4 text-gray-400 shrink-0" />
                <select value={currentPM} onChange={(e) => setCurrentPM(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none">
                  <option value="">Selecciona tu nombre para guardar…</option>
                  {PMS.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
                </select>
              </div>
            )}

            {error && (
              <p className="flex items-start gap-1.5 text-sm text-rose-600">
                <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ background: BRAND.mid }}>
              {saving ? <Icon path={I.Reload} className="w-4 h-4 animate-spin" /> : <Icon path={I.Check} className="w-4 h-4" />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.RW = Object.assign(window.RW || {}, { DetailModal });
})();

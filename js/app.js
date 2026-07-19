/* ============================================================
   app.js — componente raíz TrackerRedwood y arranque de React.
   Orquesta pestañas (Matriz / Potenciales / Dashboard), filtros,
   estado, modo prueba, guardado y exportación CSV.
   Debe cargarse DESPUÉS de config, data, utils, icons y componentes.
   Depende de window.RW: BRAND, MODULES, CLIENTS, PMS, ESTADOS,
   ESTADO_ORDER, SUBS, SUB_ORDER, keyOf, buildSeedDoc, fmtDateTime,
   fmtDate, csvEscape, storage, Icon, I, LockScreen, FilterSelect,
   DetailModal
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const {
    BRAND, MODULES, ESTADOS, ESTADO_ORDER, SUBS, SUB_ORDER,
    keyOf, buildSeedDoc, fmtDateTime, fmtDate, csvEscape,
    Icon, I, LockScreen, FilterSelect, DetailModal,
    getSession, loadDefinitions, loadCells, upsertCell, subscribeCells,
  } = window.RW;
  // CLIENTS, PMS y SEED no se destructuran aquí: solo existen tras el login.
  // Se leen de window.RW dentro de TrackerApp (los pone la puerta de acceso).

  /* Pantalla de carga reutilizable */
  function Splash({ label }) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.soft }}>
        <div className="text-center">
          <Icon path={I.Reload} className="w-8 h-8 mx-auto animate-spin" style={{ color: BRAND.mid }} />
          <p className="mt-3 text-sm text-gray-600">{label}</p>
        </div>
      </div>
    );
  }

  /* ---------- Puerta de acceso: login + carga de definiciones ----------
     Si ya hay sesión iniciada (login recordado), entra directo. Si no,
     muestra LockScreen. Tras iniciar sesión, carga las definiciones
     (clientes/PMs + matriz inicial) desde la base, las publica en window.RW
     y monta TrackerApp, que a partir de ahí siempre tiene los datos. */
  function TrackerRedwood() {
    const [phase, setPhase] = useState("checking"); // checking | locked | loading | ready

    const enter = useCallback(async () => {
      setPhase("loading");
      try {
        const def = await loadDefinitions();
        window.RW.CLIENTS = def.CLIENTS;
        window.RW.SEED = def.SEED;
        window.RW.PMS = [...new Set(def.CLIENTS.map((x) => x.pm))].sort();
        setPhase("ready");
      } catch (e) {
        setPhase("locked");
      }
    }, []);

    useEffect(() => {
      getSession()
        .then((s) => { if (s) enter(); else setPhase("locked"); })
        .catch(() => setPhase("locked"));
    }, [enter]);

    if (phase === "checking") return <Splash label="Conectando…" />;
    if (phase === "loading") return <Splash label="Cargando datos del equipo…" />;
    if (phase === "locked") return <LockScreen onUnlock={enter} />;
    return <TrackerApp />;
  }

  /* ============================================================ */
  function TrackerApp() {
    const CLIENTS = window.RW.CLIENTS;
    const PMS = window.RW.PMS;
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saveError, setSaveError] = useState("");
    const [tab, setTab] = useState("matriz");
    const [currentPM, setCurrentPM] = useState("");
    const [selected, setSelected] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const testModeRef = useRef(false); // evita que el "tiempo real" pise el modo prueba

    // Filtros
    const [fPM, setFPM] = useState("");
    const [fCliente, setFCliente] = useState("");
    const [fGrupo, setFGrupo] = useState("");
    const [fEstado, setFEstado] = useState("");
    const [pPM, setPPM] = useState("");
    const [pSub, setPSub] = useState("");

    /* ---------- Carga desde la base ---------- */
    const loadDoc = useCallback(async (silent) => {
      if (!silent) setLoading(true); else setSyncing(true);
      try {
        const cellsMap = await loadCells();              // ediciones del equipo
        const base = buildSeedDoc().cells;               // matriz inicial
        setDoc({ cells: { ...base, ...cellsMap } });     // ediciones encima de la base
      } catch (e) {
        setSaveError("No se pudieron cargar los datos. Revisa tu conexión.");
      }
      setLoading(false); setSyncing(false);
    }, []);

    // Carga inicial + "tiempo real": si alguien del equipo cambia algo, recargamos.
    useEffect(() => {
      loadDoc(false);
      const unsub = subscribeCells(() => { if (!testModeRef.current) loadDoc(true); });
      return unsub;
    }, [loadDoc]);

    /* ---------- Modo prueba (local, no toca la base) ---------- */
    function enterTestMode() {
      testModeRef.current = true;
      setTestMode(true); setSaveError(""); setSelected(null); setDoc(buildSeedDoc());
    }
    function exitTestMode() {
      testModeRef.current = false;
      setTestMode(false); setSaveError(""); setSelected(null); loadDoc(true);
    }

    /* ---------- Guardado ---------- */
    async function saveCell(cellKey, cell) {
      setSaveError("");
      // 1) Actualización inmediata en pantalla (optimista)
      setDoc((prev) => {
        const base = prev || buildSeedDoc();
        return { ...base, cells: { ...base.cells, [cellKey]: cell } };
      });
      if (testMode) return; // en modo prueba no se toca la base compartida
      // 2) Guardar en la base (los demás lo verán en vivo)
      try {
        await upsertCell(cellKey, cell);
      } catch (e) {
        setSaveError("No se pudo guardar en la base. Revisa tu conexión e inténtalo otra vez.");
      }
    }

    /* ---------- Derivados ---------- */
    const cells = doc ? doc.cells : {};
    const visibleClients = useMemo(() =>
      CLIENTS.filter((cl) => (!fPM || cl.pm === fPM) && (!fCliente || cl.c === fCliente)), [fPM, fCliente]);
    const visibleModules = useMemo(() =>
      MODULES.filter((mod) => !fGrupo || mod.g === fGrupo), [fGrupo]);
    const counts = useMemo(() => {
      const acc = { ACTIVO: 0, CURSO: 0, POTENCIAL: 0, NA: 0, SIN: 0 };
      Object.values(cells).forEach((c) => { if (acc[c.estado] !== undefined) acc[c.estado]++; });
      return acc;
    }, [cells]);
    const potenciales = useMemo(() => {
      const list = [];
      MODULES.forEach((mod) => CLIENTS.forEach((cl) => {
        const c = cells[keyOf(cl.c, mod.m)];
        if (c && c.estado === "POTENCIAL") list.push({ ...c, cliente: cl.c, pm: cl.pm, modulo: mod.m, grupo: mod.g });
      }));
      return list;
    }, [cells]);
    const funnel = useMemo(() => {
      const f = { sin_contactar: 0, contactado: 0, propuesta: 0, fecha: 0, descartado: 0 };
      potenciales.forEach((p) => { f[p.sub] = (f[p.sub] || 0) + 1; });
      return f;
    }, [potenciales]);
    const proximas = useMemo(() =>
      potenciales.filter((p) => p.sub === "fecha" && p.fecha)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8),
      [potenciales]);
    const porPM = useMemo(() => PMS.map((pm) => {
      const mine = potenciales.filter((p) => p.pm === pm);
      const bySub = {};
      SUB_ORDER.forEach((s) => { bySub[s] = mine.filter((p) => p.sub === s).length; });
      return { pm, total: mine.length, bySub };
    }), [potenciales]);

    /* ---------- Exportar CSV ---------- */
    function exportCSV() {
      const header = ["Grupo", "Módulo", "Cliente", "PM", "Estado", "Sub-estatus (Potencial)", "Fecha tentativa", "Ticket mesa de ayuda", "Comentario", "Actualizado por", "Última actualización"];
      const rows = [header.join(",")];
      MODULES.forEach((mod) => CLIENTS.forEach((cl) => {
        const c = cells[keyOf(cl.c, mod.m)] || {};
        rows.push([
          mod.g, mod.m, cl.c, cl.pm,
          ESTADOS[c.estado]?.label || "",
          c.estado === "POTENCIAL" ? SUBS[c.sub]?.label || "" : "",
          c.estado === "POTENCIAL" ? c.fecha || "" : "",
          c.estado === "CURSO" ? c.ticket || "" : "",
          c.comentario || "", c.updatedBy || "", c.updatedAt ? fmtDateTime(c.updatedAt) : "",
        ].map(csvEscape).join(","));
      }));
      const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = testMode ? "ESTATUS_REDWOOD_prueba.csv" : "ESTATUS_REDWOOD_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    }

    /* ---------- Render ---------- */
    if (loading) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.soft }}>
        <div className="text-center">
          <Icon path={I.Reload} className="w-8 h-8 mx-auto animate-spin" style={{ color: BRAND.mid }} />
          <p className="mt-3 text-sm text-gray-600">Cargando estatus Redwood…</p>
        </div>
      </div>
    );

    const TABS = [
      { id: "matriz",       label: "Matriz",       icon: I.Grid },
      { id: "potenciales",  label: "Potenciales",  icon: I.Target, badge: potenciales.filter((p) => p.sub !== "descartado").length },
      { id: "dashboard",    label: "Dashboard",    icon: I.Bar },
    ];

    return (
      <div className="min-h-screen" style={{ background: BRAND.soft }}>

        {/* Encabezado */}
        <header className="text-white" style={{ background: BRAND.gradient }}>
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="img/logo.png" alt="witbor"
                  className="h-9 w-auto bg-white rounded-lg px-2.5 py-1.5 shadow-sm shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">Oracle Fusion Cloud</p>
                  <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    Tracker de Migración Redwood
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                  <Icon path={I.User} className="w-4 h-4 opacity-80" />
                  <select value={currentPM} onChange={(e) => setCurrentPM(e.target.value)}
                    className="bg-transparent text-sm text-white outline-none cursor-pointer" aria-label="Selecciona tu nombre de PM">
                    <option value="" className="text-gray-800">¿Quién eres?</option>
                    {PMS.map((pm) => <option key={pm} value={pm} className="text-gray-800">{pm}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => (testMode ? exitTestMode() : enterTestMode())}
                  title={testMode ? "Salir del modo prueba y volver a los datos reales" : "Practicar con datos ficticios sin afectar la información real"}
                  className={"flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold tracking-wider " +
                    (testMode ? "bg-white" : "bg-white/15 hover:bg-white/25 text-white")}
                  style={testMode ? { color: "#7C3AED" } : {}}>
                  <Icon path={I.Flask} className="w-4 h-4" />
                  <span className="hidden sm:inline">{testMode ? "SALIR TEST" : "TEST"}</span>
                </button>
                <button onClick={() => (testMode ? enterTestMode() : loadDoc(true))}
                  title={testMode ? "Reiniciar datos ficticios" : "Actualizar datos"}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                  <Icon path={I.Reload} className={"w-4 h-4 " + (syncing ? "animate-spin" : "")} />
                  <span className="hidden sm:inline">{testMode ? "Reiniciar TEST" : "Actualizar"}</span>
                </button>
                <button onClick={exportCSV} title="Exportar respaldo CSV"
                  className="flex items-center gap-1.5 bg-white text-sm font-medium rounded-lg px-3 py-2"
                  style={{ color: BRAND.deep }}>
                  <Icon path={I.Down} className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
              </div>
            </div>

            <nav className="mt-4 flex gap-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors " +
                      (active ? "bg-white" : "bg-white/10 text-white hover:bg-white/20")}
                    style={active ? { color: BRAND.deep } : {}}>
                    <Icon path={t.icon} className="w-4 h-4" />
                    {t.label}
                    {t.badge !== undefined && (
                      <span className={"text-xs rounded-full px-1.5 py-0.5 " + (active ? "bg-amber-100 text-amber-800" : "bg-white/20")}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Avisos */}
        <div className="max-w-7xl mx-auto px-4">
          {testMode && (
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-3 text-white rounded-xl px-5 py-4 shadow-lg"
              style={{
                background: "linear-gradient(90deg, #6D28D9 0%, #9333EA 50%, #6D28D9 100%)",
                border: "3px solid #F0ABFC",
                boxShadow: "0 8px 24px rgba(147, 51, 234, 0.35)",
                animation: "testPulse 2s ease-in-out infinite",
              }}
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center rounded-full bg-white/25 p-2 shrink-0"
                  style={{ animation: "testFlaskWiggle 1.4s ease-in-out infinite" }}
                >
                  <Icon path={I.Flask} className="w-6 h-6" />
                </span>
                <span className="flex flex-col">
                  <span className="text-lg font-extrabold tracking-widest uppercase leading-tight">
                    ⚠ MODO TEST ACTIVO ⚠
                  </span>
                  <span className="text-sm text-violet-100 leading-tight">
                    Estás viendo datos ficticios. Nada de lo que hagas aquí se guarda ni afecta la información real del equipo.
                  </span>
                </span>
              </span>
              <button
                onClick={exitTestMode}
                className="bg-white text-violet-700 font-bold text-sm uppercase tracking-wider rounded-lg px-4 py-2 hover:bg-violet-50 shadow whitespace-nowrap"
              >
                Salir del TEST
              </button>
            </div>
          )}
          {saveError && (
            <div className="mt-3 flex items-start justify-between gap-2 bg-rose-50 border border-rose-300 text-rose-800 text-sm rounded-lg px-3 py-2">
              <span className="flex items-start gap-2"><Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" />{saveError}</span>
              <button onClick={() => setSaveError("")} aria-label="Cerrar aviso"><Icon path={I.X} className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        <main className="max-w-7xl mx-auto px-4 py-5">

          {/* MATRIZ */}
          {tab === "matriz" && (
            <section>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 mr-1">
                  <Icon path={I.Filter} className="w-3.5 h-3.5" /> Filtros
                </span>
                <FilterSelect value={fPM} onChange={setFPM} placeholder="Todos los PMs" options={PMS} />
                <FilterSelect value={fCliente} onChange={setFCliente} placeholder="Todos los clientes"
                  options={CLIENTS.filter((c) => !fPM || c.pm === fPM).map((c) => c.c)} />
                <FilterSelect value={fGrupo} onChange={setFGrupo} placeholder="Todos los grupos" options={["Procurement", "SCM"]} />
                <FilterSelect value={fEstado} onChange={setFEstado} placeholder="Todos los estados"
                  options={ESTADO_ORDER} labels={(v) => ESTADOS[v].label} />
                {(fPM || fCliente || fGrupo || fEstado) && (
                  <button onClick={() => { setFPM(""); setFCliente(""); setFGrupo(""); setFEstado(""); }}
                    className="text-xs text-gray-500 underline hover:text-gray-700">Limpiar</button>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-600">
                {ESTADO_ORDER.map((e) => (
                  <span key={e} className="flex items-center gap-1.5">
                    <span className={"w-2.5 h-2.5 rounded-full " + ESTADOS[e].dot} />
                    {ESTADOS[e].label}
                  </span>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto" style={{ maxHeight: "70vh" }}>
                <table className="border-collapse text-sm min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-xs uppercase tracking-wide text-gray-500 min-w-48">
                        Módulo / Cliente
                      </th>
                      {visibleClients.map((cl) => (
                        <th key={cl.c} className="sticky top-0 z-20 bg-white border-b border-gray-200 px-2 py-2 text-center align-bottom min-w-28">
                          <div className="text-xs font-semibold text-gray-800 leading-tight">{cl.c}</div>
                          <div className="text-[10px] text-gray-400 font-normal">{cl.pm}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["Procurement", "SCM"].map((grupo) => {
                      const mods = visibleModules.filter((m) => m.g === grupo);
                      if (!mods.length) return null;
                      return (
                        <React.Fragment key={grupo}>
                          <tr>
                            <td colSpan={visibleClients.length + 1}
                              className="sticky left-0 z-10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white"
                              style={{ background: BRAND.mid }}>
                              {grupo}
                            </td>
                          </tr>
                          {mods.map((mod) => (
                            <tr key={mod.m} className="hover:bg-gray-50">
                              <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 px-3 py-1.5 font-medium text-gray-700 whitespace-nowrap">
                                {mod.m}
                              </td>
                              {visibleClients.map((cl) => {
                                const k = keyOf(cl.c, mod.m);
                                const cell = cells[k];
                                const est = cell ? ESTADOS[cell.estado] : ESTADOS.SIN;
                                const dim = fEstado && cell?.estado !== fEstado;
                                const hasExtra = cell && (cell.comentario || (cell.estado === "CURSO" && cell.ticket) || (cell.estado === "POTENCIAL" && cell.sub !== "sin_contactar"));
                                return (
                                  <td key={k} className="border-b border-gray-100 p-1 text-center">
                                    <button
                                      onClick={() => setSelected({ cliente: cl.c, pm: cl.pm, modulo: mod.m, grupo: mod.g })}
                                      className={`w-full rounded-md border px-1.5 py-1.5 text-[11px] font-medium transition-all
                                        ${est.bg} ${est.text} ${est.border} ${dim ? "opacity-20" : "hover:ring-2 hover:ring-offset-1"}
                                        ${cell?.estado === "SIN" ? "border-dashed-cell" : ""}`}
                                      title={`${cl.c} · ${mod.m} — ${est.label}`}>
                                      {cell?.estado === "SIN" ? "—" : est.label}
                                      {hasExtra && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: BRAND.mid }} />}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Haz clic en cualquier celda para editar su estado, seguimiento comercial, ticket y comentario. El punto <span className="inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: BRAND.mid }} /> indica que la celda tiene seguimiento o comentario.
              </p>
            </section>
          )}

          {/* POTENCIALES */}
          {tab === "potenciales" && (
            <section>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 mr-1">
                  <Icon path={I.Filter} className="w-3.5 h-3.5" /> Filtros
                </span>
                <FilterSelect value={pPM} onChange={setPPM} placeholder="Todos los PMs" options={PMS} />
                <FilterSelect value={pSub} onChange={setPSub} placeholder="Todo el embudo"
                  options={SUB_ORDER} labels={(v) => SUBS[v].label} />
                {(pPM || pSub) && (
                  <button onClick={() => { setPPM(""); setPSub(""); }}
                    className="text-xs text-gray-500 underline hover:text-gray-700">Limpiar</button>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Módulo</th>
                      <th className="px-4 py-2.5">PM</th>
                      <th className="px-4 py-2.5">Seguimiento</th>
                      <th className="px-4 py-2.5">Fecha tentativa</th>
                      <th className="px-4 py-2.5">Comentario</th>
                      <th className="px-4 py-2.5">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {potenciales
                      .filter((p) => (!pPM || p.pm === pPM) && (!pSub || p.sub === pSub))
                      .sort((a, b) => SUBS[a.sub].step - SUBS[b.sub].step || a.pm.localeCompare(b.pm) || a.cliente.localeCompare(b.cliente))
                      .map((p) => (
                        <tr key={keyOf(p.cliente, p.modulo)}
                          onClick={() => setSelected({ cliente: p.cliente, pm: p.pm, modulo: p.modulo, grupo: p.grupo })}
                          className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{p.cliente}</td>
                          <td className="px-4 py-2.5 text-gray-600">{p.modulo}</td>
                          <td className="px-4 py-2.5 text-gray-600">{p.pm}</td>
                          <td className="px-4 py-2.5">
                            <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium " + SUBS[p.sub].chip}>
                              {SUBS[p.sub].label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{p.sub === "fecha" ? fmtDate(p.fecha) : "—"}</td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-56 truncate">{p.comentario || "—"}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                            {p.updatedBy ? `${p.updatedBy} · ${fmtDateTime(p.updatedAt)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    {potenciales.filter((p) => (!pPM || p.pm === pPM) && (!pSub || p.sub === pSub)).length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No hay módulos potenciales con estos filtros. Ajusta los filtros o marca celdas como «Potencial» en la matriz.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-400">Haz clic en un renglón para actualizar su seguimiento.</p>
            </section>
          )}

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <section className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ESTADO_ORDER.map((e) => (
                  <div key={e} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={"w-2.5 h-2.5 rounded-full " + ESTADOS[e].dot} />
                      {ESTADOS[e].label}
                    </div>
                    <div className="mt-1 text-3xl font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>
                      {counts[e]}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">Embudo comercial de potenciales</h2>
                  <p className="text-xs text-gray-400 mb-4">{potenciales.length} módulos potenciales en total</p>
                  <div className="space-y-2.5">
                    {SUB_ORDER.map((s) => {
                      const n = funnel[s];
                      const max = Math.max(1, ...SUB_ORDER.map((x) => funnel[x]));
                      return (
                        <div key={s}>
                          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                            <span>{SUBS[s].label}</span><span className="font-semibold">{n}</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${(n / max) * 100}%`, background: SUBS[s].bar, minWidth: n ? 8 : 0 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">Próximas acciones</h2>
                  <p className="text-xs text-gray-400 mb-4">Potenciales con fecha tentativa de inicio</p>
                  {proximas.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">
                      Aún no hay potenciales con fecha tentativa. Regístralas desde la matriz o el tab Potenciales.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {proximas.map((p) => (
                        <li key={keyOf(p.cliente, p.modulo)} className="py-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.cliente} <span className="text-gray-400 font-normal">· {p.modulo}</span></p>
                            <p className="text-xs text-gray-400">{p.pm}</p>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-1 whitespace-nowrap">
                            <Icon path={I.Cal} className="w-3 h-3" /> {fmtDate(p.fecha)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Potenciales por PM</h2>
                <div className="space-y-3">
                  {porPM.map(({ pm, total, bySub }) => {
                    const max = Math.max(1, ...porPM.map((x) => x.total));
                    return (
                      <div key={pm} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 text-sm text-gray-700 truncate">{pm}</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                          {SUB_ORDER.map((s) => bySub[s] > 0 && (
                            <div key={s} title={`${SUBS[s].label}: ${bySub[s]}`}
                              style={{ width: `${(bySub[s] / max) * 100}%`, background: SUBS[s].bar }} />
                          ))}
                        </div>
                        <span className="w-8 text-right text-sm font-semibold text-gray-700">{total}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                  {SUB_ORDER.map((s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SUBS[s].bar }} />{SUBS[s].label}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className="max-w-7xl mx-auto px-4 pb-6 text-xs text-gray-400">
          <span>Datos compartidos en vivo con el equipo. Comparte el enlace y la contraseña solo con el equipo.</span>
        </footer>

        {selected && (
          <DetailModal
            selected={selected}
            cell={cells[keyOf(selected.cliente, selected.modulo)]}
            currentPM={currentPM}
            setCurrentPM={setCurrentPM}
            onClose={() => setSelected(null)}
            onSave={async (cell) => { await saveCell(keyOf(selected.cliente, selected.modulo), cell); setSelected(null); }}
          />
        )}
      </div>
    );
  }

  /* ---------- Arranque de React ---------- */
  try {
    ReactDOM.createRoot(document.getElementById("root")).render(<TrackerRedwood />);
    window.__booted = true;
    clearTimeout(window.__bootTimeout);
    var __l = document.getElementById("boot-loader"); if (__l) __l.style.display = "none";
  } catch (e) {
    window.__bootFail((e && e.message) ? e.message : "Error inesperado al renderizar la aplicación.");
    throw e;
  }
})();

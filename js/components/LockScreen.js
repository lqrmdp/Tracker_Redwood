/* ============================================================
   LockScreen.js — pantalla de acceso (contraseña de equipo)
   La contraseña se valida INICIANDO SESIÓN en la base de datos
   (Supabase). Si el login tiene éxito, se avisa con onUnlock() y la
   app carga los datos compartidos.
   Depende de: React (hooks), Icon, I, BRAND, signIn
   Publica en window.RW: LockScreen
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const { Icon, I, BRAND, signIn } = window.RW;

  function LockScreen({ onUnlock }) {
    const [pwd, setPwd] = useState("");
    const [error, setError] = useState("");
    const [checking, setChecking] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
      if (cooldown <= 0) return;
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }, [cooldown]);

    async function tryUnlock() {
      if (checking || cooldown > 0) return;
      if (!pwd) { setError("Escribe la contraseña de acceso."); return; }
      setChecking(true); setError("");
      try {
        await signIn(pwd);
        onUnlock(); return;
      } catch (e) {
        const msg = (e && e.message) || "";
        if (/invalid login|credentials|password/i.test(msg)) {
          const n = attempts + 1;
          setAttempts(n); setPwd(""); setError("Contraseña incorrecta.");
          if (n % 5 === 0) setCooldown(30);
        } else {
          setError("No se pudo conectar con el servidor. Revisa tu internet e inténtalo de nuevo.");
        }
      }
      setChecking(false);
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(150deg, ${BRAND.deep}, ${BRAND.mid})` }}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7 text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ background: BRAND.soft }}>
            <Icon path={I.Lock} className="w-5 h-5" style={{ color: BRAND.mid }} />
          </div>
          <p className="mt-4 text-xs uppercase tracking-widest text-gray-400">Oracle Fusion Cloud</p>
          <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: "Georgia, serif" }}>
            Tracker de Migración Redwood
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Acceso restringido al equipo de PMs. Ingresa la contraseña compartida para continuar.
          </p>
          <input type="password" value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
            placeholder="Contraseña de acceso" autoFocus disabled={cooldown > 0}
            className="mt-5 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-gray-50" />
          {error && cooldown === 0 && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-rose-600">
              <Icon path={I.Warn} className="w-4 h-4" /> {error}
            </p>
          )}
          {cooldown > 0 && (
            <p className="mt-2 text-sm text-amber-700">
              Demasiados intentos. Espera {cooldown} s para volver a intentar.
            </p>
          )}
          <button onClick={tryUnlock} disabled={checking || cooldown > 0}
            className="mt-4 w-full flex items-center justify-center gap-2 text-white text-sm font-semibold rounded-lg px-4 py-2.5 disabled:opacity-60"
            style={{ background: BRAND.mid }}>
            {checking ? <Icon path={I.Reload} className="w-4 h-4 animate-spin" /> : <Icon path={I.Lock} className="w-4 h-4" />}
            Entrar
          </button>
          <p className="mt-4 text-xs text-gray-400">¿No tienes la contraseña? Solicítala al responsable del tracker.</p>
        </div>
      </div>
    );
  }

  window.RW = Object.assign(window.RW || {}, { LockScreen });
})();

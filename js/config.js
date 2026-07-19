/* ============================================================
   config.js — configuración global y conexión a la base de datos
   Los datos ya NO se cifran en el navegador: viven en Supabase y
   están protegidos por el login del equipo + las reglas (RLS).
   SUPABASE_URL y SUPABASE_KEY son PÚBLICOS por diseño (van en la
   app); la seguridad la dan el login y las reglas de la base.
   Publica en window.RW: BRAND, SUPABASE_URL, SUPABASE_KEY, TEAM_EMAIL
   ============================================================ */
(function () {
  /* ---------- Paleta Redwood ---------- */
  const BRAND = { deep: "#6B2E20", mid: "#8C3B28", soft: "#F6EFEA" };

  /* ---------- Conexión a Supabase ----------
     Para cambiar de proyecto: reemplaza estos tres valores.
     La clave 'anon/publishable' es pública (no es secreta). */
  const SUPABASE_URL = "https://ejrvomwthxxvpropazpw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_9gKSLblQxJwR-ZuFxr-zdg_i50Mt40n";

  /* Correo fijo de la "cuenta de equipo". El usuario solo teclea la
     contraseña; por detrás iniciamos sesión con este correo. No es secreto. */
  const TEAM_EMAIL = "equipo@redwood.app";

  window.RW = Object.assign(window.RW || {}, { BRAND, SUPABASE_URL, SUPABASE_KEY, TEAM_EMAIL });
})();

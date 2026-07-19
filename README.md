# Tracker de Migración Redwood — Oracle Fusion Cloud

Aplicación de una sola página (SPA) para seguir el estatus de migración a
**Redwood** por cliente y módulo, su embudo comercial de potenciales y un
dashboard resumen. Los datos son **compartidos por todo el equipo en vivo**
(cambios en segundos, sin recargar), gracias a una base de datos **Supabase**.

Sin framework de build ni paso de compilación: React y JSX se cargan por CDN y
**Babel Standalone** transpila el JSX en el navegador. La base de datos se usa
vía la librería **@supabase/supabase-js** (también por CDN).

---

## Cómo probar en local

Necesita un servidor HTTP (no funciona con `file://`). En Windows, sin instalar
nada, usa el lanzador incluido:

- Doble clic (o clic derecho → *Ejecutar como administrador*) en **`INICIAR-SERVIDOR`**.
  Elige un puerto libre automáticamente y abre el navegador.

Alternativas: `python -m http.server 8000`, `npx serve .`, o la extensión
*Live Server* de VS Code. Luego abre `http://localhost:<puerto>`.

---

## Qué contiene cada carpeta

```
Refactorizado/
├── index.html              Markup + orden de carga de CSS/JS. Sin estilos ni lógica inline.
├── README.md               Este archivo.
├── INICIAR-SERVIDOR.cmd    Lanzador del servidor local (Windows). NO se publica.
├── servidor-local.ps1      Servidor local en PowerShell (lo usa el .cmd). NO se publica.
├── encriptar.html          OBSOLETO (era del modelo cifrado anterior). NO se publica.
├── css/
│   ├── base.css            Reset, variables :root (paleta, radios, tipografía). Se carga primero.
│   ├── boot.css            Pantalla de carga y de error de arranque.
│   └── animations.css      Keyframes del banner "MODO TEST".
└── js/
    ├── console-filter.js   Silencia el aviso de Tailwind CDN. Antes del CDN (sin defer).
    ├── boot.js             Manejo de fallos de arranque.
    ├── config.js           Conexión a Supabase (URL, clave pública, correo de equipo) y paleta BRAND.
    ├── db.js               Capa de datos: login, lectura/escritura y actualización EN VIVO (Supabase).
    ├── data.js             Catálogos NO sensibles: módulos, estados y embudo.
    ├── utils.js            Utilidades puras (fechas, CSV, keyOf, matriz base).
    ├── icons.js            Componente Icon y catálogo de íconos SVG inline.
    ├── app.js              Puerta de acceso + app TrackerApp + arranque de React. Se carga al final.
    └── components/
        ├── FilterSelect.js  <select> reutilizable de los filtros.
        ├── LockScreen.js    Pantalla de acceso (inicia sesión en Supabase).
        └── DetailModal.js   Modal de edición de una celda.
```

> **No publiques** `encriptar.html`, `INICIAR-SERVIDOR.cmd` ni `servidor-local.ps1`.
> Para publicar se usa una copia limpia (carpeta `publicar-github`).

---

## Cómo funciona (arquitectura)

- **Login:** el equipo teclea una contraseña; por detrás se inicia sesión en
  Supabase con un correo fijo (`TEAM_EMAIL` en `config.js`). La sesión se recuerda.
- **Datos:** las definiciones (clientes/PMs + matriz inicial) y las celdas
  editadas viven en Supabase. La lista de clientes **no** está en el código
  público: solo se ve tras iniciar sesión.
- **En vivo:** `db.js` se suscribe a los cambios de la tabla `cells`; cuando
  alguien edita, los demás recargan al instante.
- **Seguridad:** `SUPABASE_URL` y la clave `anon/publishable` son **públicas por
  diseño**. Lo que protege los datos es el **login** + las reglas **RLS** de la
  base (solo usuarios autenticados) y tener **desactivados los registros públicos**.

Cada archivo comparte código mediante el espacio de nombres global `window.RW`
(lee sus dependencias arriba con `const {…} = window.RW;` y publica al final con
`Object.assign(window.RW, {…})`), porque Babel ejecuta cada script en su ámbito.

---

## Mantenimiento

- **Cambiar la contraseña del equipo:** en Supabase → *Authentication → Users →*
  el usuario de equipo → *Reset password* (o crea otro usuario). No se toca el código.
- **Cambiar la lista de clientes / matriz inicial:** actualiza la fila de la
  tabla `definitions` (Supabase → *SQL Editor* o *Table Editor*).
- **Cambiar de proyecto Supabase:** reemplaza `SUPABASE_URL`, `SUPABASE_KEY` y
  `TEAM_EMAIL` en `js/config.js`.
- **Plan gratuito:** si el proyecto Supabase pasa ~1 semana sin uso, puede
  "pausarse"; se reactiva desde el panel de Supabase.

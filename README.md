# Tracker de Migración Redwood — Oracle Fusion Cloud

Aplicación de una sola página (SPA) para seguir el estatus de migración a
**Redwood** por cliente y módulo, su embudo comercial de potenciales y un
dashboard resumen. Los datos se guardan en el **localStorage** del navegador.

Es la versión reorganizada del artefacto original de un solo archivo
(`tracker_redwood.html`): **mismo diseño y comportamiento**, ahora repartido en
archivos mantenibles. No hay framework de build ni paso de compilación: React y
JSX se cargan por CDN y **Babel Standalone transpila el JSX en el navegador**.

---

## Cómo arrancar un servidor local

Se necesita un servidor HTTP (no funciona abriendo `index.html` como `file://`,
porque Babel descarga los módulos por red y `crypto.subtle` exige un contexto
seguro como `localhost`). Elige **una** opción y ábrela en el navegador:

```bash
# Opción A — Python 3
python -m http.server 8000

# Opción B — Node (npx, sin instalar nada global)
npx serve .

# Opción C — extensión "Live Server" de VS Code: clic derecho en index.html → "Open with Live Server"
```

Luego visita: <http://localhost:8000>

> Al publicar (Netlify Drop, Vercel, GitHub Pages, etc.) sube la carpeta completa
> tal cual; las rutas son relativas.

---

## Qué contiene cada carpeta

```
Refactorizado/
├── index.html              Markup semántico + orden de carga de CSS/JS. Sin estilos ni lógica inline.
├── README.md               Este archivo.
├── encriptar.html          Herramienta LOCAL para generar el bloque cifrado. NO se publica (ver abajo).
├── css/
│   ├── base.css            Reset, variables :root (paleta, radios, tipografía) y base del documento. Se carga primero.
│   ├── boot.css            Pantalla de carga y de error de arranque (antes de que React monte).
│   └── animations.css      Keyframes del banner "MODO TEST".
└── js/
    ├── console-filter.js   Silencia el aviso de Tailwind CDN. Se carga antes del CDN (sin defer).
    ├── boot.js             Manejo de fallos de arranque (evita la pantalla en blanco).
    ├── config.js           Datos CIFRADOS (ENCRYPTED_DATA), descifrado (PBKDF2+AES-GCM), clave de storage y paleta BRAND.
    ├── data.js             Catálogos NO sensibles: módulos, estados y embudo. (Clientes/PMs/matriz van cifrados.)
    ├── utils.js            Utilidades puras (fechas, CSV, keyOf, semilla) y capa de localStorage.
    ├── icons.js            Componente Icon y catálogo de íconos SVG inline.
    ├── app.js              Puerta de acceso (descifra) + app TrackerApp + arranque de React. Se carga al final.
    └── components/
        ├── FilterSelect.js  <select> reutilizable de los filtros.
        ├── LockScreen.js    Pantalla de acceso: valida la contraseña descifrando los datos.
        └── DetailModal.js   Modal de edición de una celda (estado, seguimiento, ticket, comentario).
```

---

## Nota técnica: cómo comparten código los módulos

Babel Standalone ejecuta cada `<script type="text/babel">` en su propio ámbito,
así que los módulos **no comparten variables** automáticamente. Para conectarlos
sin introducir un bundler, cada archivo:

1. lee sus dependencias al inicio con `const { ... } = window.RW;`
2. publica lo que expone al final con `Object.assign(window.RW, { ... })`

`RW` es simplemente el espacio de nombres compartido de la app. La lógica interna
de cada función y componente es idéntica a la del artefacto original; sólo se
añadió esa capa mínima de enlace entre archivos.

---

## Seguridad: datos cifrados (no legibles en "Ver código fuente")

Los datos sensibles —**clientes, PMs y matriz semilla**— **no viajan en texto
plano**. Van cifrados con **AES-GCM**, usando una clave derivada de la
contraseña del equipo con **PBKDF2** (310 000 iteraciones). En el código público
(`js/config.js`, campo `ENCRYPTED_DATA`) solo se ve un bloque ilegible. Sin la
contraseña, ese contenido es inservible.

- La contraseña **nunca** está en el código. Se escribe al entrar; con ella se
  deriva la clave y se **descifran los datos en memoria**. Si es incorrecta, el
  descifrado falla (AES-GCM lo detecta) → "Contraseña incorrecta".
- El repositorio incluye de fábrica un bloque de **datos de demostración
  ficticios**, cifrados con la contraseña **`demo1234`**. Así puedes probar la
  app publicada sin exponer nada real. **Reemplázalo por tus datos reales** antes
  de usarlo en serio (ver abajo).

### Generar/actualizar el bloque cifrado con tus datos reales

1. Abre **`encriptar.html`** con un servidor local (igual que la app).
2. Escribe la **contraseña del equipo** (elige una fuerte: 12+ caracteres).
3. Revisa/edita los datos (ya vienen precargados los reales) y pulsa **Cifrar**.
4. Copia el bloque generado y **reemplaza** en `js/config.js` la línea
   `const ENCRYPTED_DATA = { ... };`.

> ⚠️ **`encriptar.html` es SOLO local.** Contiene los datos en texto plano, así
> que **no la subas** a ningún hosting: cópiala fuera de la carpeta que publicas
> o bórrala tras generar el bloque. Lo único que se publica es `config.js` con el
> texto cifrado.

### Límites honestos

- El bloque cifrado es público → alguien podría intentar **fuerza bruta offline**.
  Por eso importa una **contraseña fuerte** (el PBKDF2 con 310 000 iteraciones
  hace cada intento lento). Si la contraseña se filtra, los datos quedan expuestos.
- Un usuario ya autorizado (dentro de la app) puede ver los datos en devtools:
  eso es esperado. La protección es contra "alguien con solo el enlace".
- Requiere **contexto seguro** (`https` o `localhost`) porque usa `crypto.subtle`.
  GitHub Pages / Netlify / Vercel sirven por HTTPS, así que funciona.

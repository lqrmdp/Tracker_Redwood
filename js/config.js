/* ============================================================
   config.js — configuración global y descifrado de datos
   Los datos sensibles (clientes/PMs y matriz) NO viajan en texto
   plano: van cifrados en ENCRYPTED_DATA y solo se descifran en
   memoria cuando el usuario escribe la contraseña correcta.
   La contraseña NUNCA está en el código.
   Publica en window.RW: STORAGE_KEY, BRAND, decryptData
   ============================================================ */
(function () {
  const STORAGE_KEY = "redwood_tracker_v1";

  /* ---------- Paleta Redwood ---------- */
  const BRAND = { deep: "#6B2E20", mid: "#8C3B28", soft: "#F6EFEA" };

  /* ---------- Datos cifrados (clientes/PMs + matriz semilla) ----------
     Generado con encriptar.html usando la contraseña del equipo. Sin esa
     contraseña este contenido es ilegible. Para cambiar datos o contraseña,
     regenera este bloque con encriptar.html. */
  const ENCRYPTED_DATA = {
  "v": 1,
  "iter": 310000,
  "salt": "Mxw0Y9IKcdBR/qNWQ08Jmw==",
  "iv": "ttBw3PX/NpdjyhXe",
  "ct": "3aCrO9S9VTgO1CKSrVrYNukW7toC8IyrLFdtZqo3PR57nbOdG1ksdRrfNEc2I+dJsk7lkhLdua87HDcBlWTgsds7xJC3+JhsC6fJ8+CFWxFkyZtE6h/NBRK7waFYe9BG6wPezOVcNIbTxhc2RI2K+9XMGui1kDFTdRbJWbBx4oag4z2Nt+MmhElFjay72PPT9310+/oDI7drOaRvGJkCLWN4R9SLGJbGaKT6irnqMfxTnOumlU24OLeP2JQ34w9PTb0xWQts1oIH8YFwVc3iHT/472qhLT//WAxhQ6+dI8CVeWPDNrPEiyiyr4/8heKRLiaDmVkcvpu7SLkH5VO8cOIubK0AzPC3TBSVB0fuSdg8wcNrgnZ+v6yumPJpuvuTd3AwF+Qjq22JhZDsOZyOLMvIP0yuBZBiHfw/stIg5fAT2+Qn00jKXOZRMwFVPZ0m96qE0PSVCX7GxJSyHnY1Zaz0zjM1QGlFNH+/f4zdZoxh20J6cNIg/X9/q/cr10wiifzjZ6jQfizWf6T7n46UTNANa9w+JjLS60XVQmlZaWVxsi8COEWDg7Pk20EfGniWoPsOLFIwsHz1NgvYJeWW0QyfXElEuSxo1TGKchHFkD7gSGfAPHzZlkAVO7cDMHOkP7WH4vwVakq3iqJEJT1IzKaQnJT17qHrpl+a3S/A22sEDW35oWZEe7fr9z0Q5GIhzuVx0jBYO0fIJKCsHnGryiYKn7hz6lkmZSzh2GNWS59H7t2vn59VNkFVj5LTN1x17ZqkbuhOx1S1c1Kh2ksTNPE49tLPHSdjeK4bDsFO0Zc3DlN8qpoVMcLjhEYL4/2TabvpbZxmrkqIj2R7C/7k15Y73J+UJ/mf6MUMcLsymx0wmPstGVkj3wARKhzmPlELR+SKnhTUOd/HCjQUTlw1zpYRNu08JkGGq51+zC2Qs2CbONLAtk0l9uUyCNDuNRchn31xNrMLdWuFYF2n5Gp4bdwEVMVG50eQGdZFpechIZdI83BplHVvw3h/VP5Wvq3wILIxHNq1vZ9ykq1cqR+3ovYrKHVf6QSqF1L8kLop7adF9QCzoIi31dg3suuJb19lHeilLEE4/Nn2+J1dgl4jBGk2DqyLYvBYnM0+vVoRiQzjFQ4wRnzCxt05pIxt6ogYDPki/7z+1Jf78dw+TUc9RRjCv4km23lNVxn2usuRmnvNeVKI64gdS3VSgNNI9VuLxYdHyTNieHppSSE7a4U7/D+6G0I2kUwvMCwmSaXgA7GBclXNWzAYYyIJte4zb49YnDGue3kXnFL63woE7QRGuwzmKISELvdqCmjSJXYKKfaMofdubUv2BfaLHubtER70qTBVH/3xH+Wb3GJfrQtVVB/oAUcTLJRtyWVxU3FnGzwkwH2EJqElcYjNxfPJABy+T3L3jzM7aVrT52CKcy6n868xniyMXBGYdmbyrMi9PZLuGDIu+r9fXhz75XsFS9XV664cSmPElqmKm1wElnAc6EmgVWym8OZsAa2V8NM1VWQbXmXQVPkuKGg7k9wYArOClWmYFWIEx6eciMEtuJArwN3m4U+j1LAcuwA/SfGLxrj9PAwM90SfLYkQQv5TvwIBEaeZNZMjP8Ccc6h1BTUwl5Cb6uBzmDIZTpnYVzKlgbWuuBAgf1/MB3JgpGkLWAOPScgXZQobCZ5EXDPY3k3wWXAQXlcLOd9G"
};

  /* ---------- Cifrado (Web Crypto: PBKDF2 + AES-GCM) ---------- */
  function _b64d(str) { return Uint8Array.from(atob(str), (c) => c.charCodeAt(0)); }

  async function _deriveKey(password, salt, iterations) {
    const base = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  async function decryptData(password) {
    if (!ENCRYPTED_DATA) throw new Error("No hay datos cifrados configurados.");
    const salt = _b64d(ENCRYPTED_DATA.salt);
    const iv = _b64d(ENCRYPTED_DATA.iv);
    const ct = _b64d(ENCRYPTED_DATA.ct);
    const key = await _deriveKey(password, salt, ENCRYPTED_DATA.iter || 310000);
    const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(ptBuf));
  }

  window.RW = Object.assign(window.RW || {}, { STORAGE_KEY, BRAND, decryptData });
})();

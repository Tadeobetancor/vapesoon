# Vapesoon.arg

Landing page de e-commerce para Vapesoon, un emprendimiento de venta de vapes en Hurlingham, Zona Oeste (Buenos Aires).

Sitio de una sola página, sin backend ni build: el HTML, CSS y JS están en `index.html` y las imágenes en la carpeta `img/` (WebP, ya achicadas al tamaño en que se muestran). Se puede abrir directamente en el navegador o publicarlo en cualquier hosting estático (Netlify, Vercel, GitHub Pages, etc.).

## Estructura
- `index.html` — sitio completo (catálogo, carrito, reseñas, WhatsApp, etc.)
- `img/` — logo, mascota, favicon, fotos de productos (`img/productos/`) y de clientes (`img/clientes/`). Para agregar un producto nuevo: guardar la foto como `.webp` en `img/productos/` y sumarla a `window.__PRODUCT_PHOTOS__` en `index.html`. **No volver a pegar imágenes en base64 dentro del HTML**: era lo que hacía que la página pesara 7 MB y anduviera lenta.
- `og-image.png` — imagen de vista previa para cuando se comparte el link (WhatsApp, redes, etc.). Tiene que subirse junto a `index.html`, en la misma carpeta.

## Deploy
Pensado para deploy estático directo, sin pasos de build.


### [funcional] Pase de compras de 15 niveles (reemplaza "20% OFF en la 5ta compra") — index.html
- Técnico: nueva config `PASS_LEVELS=15` y `PASS_REWARDS={3:5,6:8,9:10,12:12,15:20}`; `renderLoyalty()` dibuja los 15 niveles en una tira deslizable centrada en el nivel actual (hechos con tilde, bloqueados con candado, premios dorados), barra de avance y mensaje del próximo premio. Al pasar el nivel 15 arranca la temporada siguiente. El mensaje de WhatsApp (`clientOrderLine`) suma "compra N° X (nivel Y del pase): le toca Z% OFF".
- En simple: el cliente ve todos los premios desde el primer día y siempre sabe cuánto le falta ("Te faltan 2 compras para 8% OFF"). Para cambiar premios se editan 2 líneas.
- Pasos: antes ver el premio = 1 barra con un solo premio a 5 compras → ahora 0 clics para ver los 5 premios y el próximo.

### [funcional] Perfil: pase arriba y "Mis datos" desplegable — index.html
- Técnico: vista `#acctMeView` reordenada: foto+nombre en fila, pase (`.pass`) como bloque principal, y teléfono/dirección dentro de `<details id="acctData">` cerrado por defecto. Botones de cerrar sesión / borrar cuenta intactos.
- En simple: al abrir "Mi cuenta" lo primero que se ve es el pase y el premio que viene; los datos están a un toque.
- Pasos: antes el pase quedaba debajo de la foto y el nombre (hay que bajar) → ahora visible sin scroll.

### [funcional] Botón "Ingresar a mi cuenta" más liviano (vidrio) — index.html
- Técnico: `.acct-strip` pasa de gradiente azul sólido a fondo casi transparente con borde fino claro; flecha y avatar también en vidrio; borde giratorio más tenue; foco visible.
- En simple: ya no se confunde con los botones azules de compra; se ve como una opción secundaria.
- Pasos: sin cambios (1 → 1).

### [estética] Perfil como "tarjeta de jugador" — index.html
- Técnico: `.acct-me-head` con avatar más grande (74px), aro conic-gradient azul→dorado que gira (`::before` + máscara radial, usa `--spin`), luz radial detrás y saludo en Bungee con degradé (2 líneas máx., tamaño con `clamp` para nombres largos). Entrada suave `pxRise`. Tokens del perfil/pase en `.acct-card` (`--px-*`: colores, alturas, tiempos).
- En simple: al entrar a tu perfil lo primero que ves es tu foto con un aro brillante y tu nombre bien grande, como en un juego.

### [estética] Pase de compras estilo "pase de batalla" — index.html
- Técnico: con 8 niveles la tira deja de deslizarse: grilla de 4 columnas × 2 filas (`grid-auto-flow:column`); arriba la compra común (chip chico), abajo la compra con premio (tile alto dorado) unidas por un tramo que se enciende al completarse. El % OFF va grande en Bungee con degradé dorado (markup `<b>10%</b>OFF` en el template de `renderLoyalty`, sin tocar la lógica). Premio final (`:last-child`): trofeo, aro de fuego que gira, chip "FINAL". "Próxima" respira (`pxBreathe` / `pxBreatheGold`), destello que cruza los premios (`pxShine`) y el cupón del próximo premio (`pxSweep`). Barra de XP segmentada en `--px-levels` casilleros con chispa en la punta. `html.lite` y `prefers-reduced-motion` apagan todo lo que se repite. Textos fijos "15" y "deslizá" adaptados.
- En simple: ves los 8 niveles y los 4 descuentos juntos de un vistazo, sin deslizar; lo que ya compraste queda encendido en azul, lo que viene brilla en dorado y el 25% final es un trofeo con fuego.
- Ojo: la grilla asume premio cada 2 compras; si se cambia ese patrón hay que revisar el diseño.

### [estética] Botón "Ingresar a mi cuenta" como cápsula de vidrio — index.html
- Técnico: `.acct-strip` pasa a píldora (`border-radius:999px`) con vidrio escarchado claro (degradé blanco 17%→6%, `backdrop-filter` blur+saturate), borde superior más luminoso, avatar redondo, flecha sin caja. Se reemplaza el borde giratorio (el mismo de las tarjetas en oferta) por un destello que cruza cada 7 s (`stripSheen`). Lite: sin blur ni destello. Tokens `--strip-*` en el propio bloque.
- En simple: deja de parecer una caja/botón como los de abajo; es una cápsula clarita y transparente, como un pase de acceso flotando.

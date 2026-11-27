
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

### [funcional] Cambiar la dirección de envío desde "Mis datos" — index.html
- Técnico: `renderDataRows()` muestra teléfono + dirección con botón "Cambiar" (o "Agregar" si no hay). Edita en el lugar (localidad + calle) y "Guardar" actualiza el perfil local (el checkout ya lo lee con `prefillDeliveryFromProfile`) y manda la acción `cambio` que ya existía en `scripts/registro-clientes.gs` (planilla). Sin dirección: "Sin dirección guardada. Se guarda sola cuando hagas tu primer envío." Al abrir "Mis datos" o el editor, el card se desplaza lo justo para ver "Borrar mi cuenta" (`keepActionsVisible`).
- En simple: un cliente que ya compró puede corregir a dónde le llevamos el pedido sin esperar al próximo envío.
- Pasos: antes imposible (sin edición) → ahora 4 toques (Mis datos, Cambiar, escribir, Guardar).

### [funcional] El botón de cuenta vende el premio (texto armado desde PASS_REWARDS) — index.html
- Técnico: `perkParts()` arma "Cada 2 compras ganás hasta 25% OFF" leyendo PASS_REWARDS (si los premios no son parejos: "Sumá compras y ganás hasta X% OFF"). Se usa en el subtítulo animado del botón y en una línea `.acct-perk` en las vistas de ingresar y crear cuenta.
- En simple: antes decía algo vago; ahora dice el premio concreto y cambia solo si se cambian los premios.
- Pasos: sin cambios (lectura de un vistazo).

### [funcional] Sin sesión se abre primero "Crear cuenta" — index.html
- Técnico: `userBtn` abre `registro`, salvo que `hadAccountBefore()` (marquita `vapesoon_hubo_cuenta` en localStorage, puesta en `saveClientProfile`, o cuentas en `vapesoon_cuentas`) sea verdadero: ahí abre `ingreso`. Se agregó "¿Ya tenés cuenta? Ingresar" (`#acctToLogin`) en el registro y el título del botón es "Creá tu cuenta" para nuevos, "Ingresar a mi cuenta" para quienes ya tuvieron una.
- En simple: el cliente nuevo ve directo el formulario de crear cuenta; el que ya tuvo una ve ingresar.
- Pasos: cliente nuevo antes 3 (abrir, tocar "Crear cuenta", llenar) → 2 (abrir, llenar).

### [estética] Pase: el camino se lee en orden (1 → 8) — index.html
- Técnico: la grilla pasa de "columnas" (1/3/5/7 arriba, premios abajo) a dos renglones en orden de lectura (1-2-3-4 / 5-6-7-8) con `grid-template-columns: repeat(2, común angosta, premio ancho)` (tokens `--px-step-fr` / `--px-reward-fr`). Entre nivel y nivel, flechita de camino (`::before` con `clip-path`) que se enciende en azul al completar el anterior; el renglón 1 "sale" por la derecha y el 2 "entra" por la izquierda. Candados de premio: insignia dorada de 20px con borde oscuro; candados comunes en celeste. Sin scroll horizontal a 360px.
- En simple: ahora el pase se lee como un texto, de izquierda a derecha y de arriba a abajo, con flechitas que marcan el camino; los premios dorados siguen siendo los más grandes y los candados se ven bien.
- Nota: la línea de estado ya decía "Te faltan N compras para X% OFF" cuando falta más de 1 compra; no hizo falta tocar el texto.

### [estética] Botón "Ingresar a mi cuenta": credencial de vidrio oscuro — index.html
- Técnico: `.acct-strip` vuelve a esquinas chicas (`--strip-radius:12px`, pedido del dueño), vidrio ahumado oscuro y muy transparente (`rgba(2,10,26,.42→.18)` + blur), borde fino, línea de luz celeste a la izquierda (`::before`, `--strip-accent`) y destello tenue. Lite: sin blur. Reemplaza la cápsula clarita de la ronda 1.
- En simple: el botón ahora es más cuadrado, más oscuro y se ve el fondo a través; la rayita de luz a la izquierda lo hace distinto de los botones azules de abajo.

### [funcional] Cartel de crear cuenta / ingresar con una sola línea de texto — index.html
- Técnico: se sacó el párrafo `.acct-perk` y los textos "Entrá con tu WhatsApp, sin contraseña" / "Promos y envíos que se completan solos"; la línea animada bajo el título (`.tw[data-perk]`) ahora muestra solo el premio, armado desde PASS_REWARDS.
- En simple: el cartel tiene el título y una sola frase que vende ("Cada 2 compras ganás hasta 25% OFF"), sin repetir cosas.
- Pasos: sin cambios (menos lectura: 2 frases → 1).

### [estética] Cartel de cuenta: entrada suave y el primer campo "te llama" — index.html
- Técnico: `.acct-card` entra con un rebote mínimo (sube 12px desde `scale(.975)`, curva `cubic-bezier(.3,1.22,.5,1)` en .42s) en vez de `--ease-spring`, que se pasaba de más. El primer campo (`#acctName` en crear cuenta, `#acctLoginPhoneBox` en ingresar) late 2 veces con el borde encendido (`acctFieldCall`, arranca a .4s, solo mientras `.acct-overlay.open`) y queda quieto. `html.lite` y `prefers-reduced-motion`: sin rebote ni latido, solo el brillo del borde una vez (`acctFieldGlow`). Tokens `--acct-pop-*` / `--acct-call-*` en `.acct-card`.
- En simple: el cartel aparece con un saltito apenas perceptible y la cajita del nombre (o del WhatsApp al ingresar) se ilumina un segundo para que sepas dónde escribir.

# Ajedrez con rival de red neuronal (Stockfish 18 · NNUE)

Ajedrez jugable en el navegador con un rival de inteligencia artificial de primer nivel.
El "cerebro" del rival es **Stockfish 18** —el motor de ajedrez de código abierto más
fuerte del mundo, el mismo que usa Chess.com— con evaluación por **red neuronal NNUE**,
compilado a **WebAssembly** y corriendo entero dentro de tu navegador. Sin servidores,
sin claves de API, sin coste y funciona sin conexión.

## Qué incluye

- Ajedrez completo y correcto (reglas vía `chess.js`): mover, capturar, enroque,
  coronación, captura al paso, jaque, jaque mate y tablas.
- **Rival IA** con dificultad ajustable (de ~1320 a fuerza máxima "imparable").
- Resaltado de movimientos legales al seleccionar una pieza.
- **Aviso de piezas en peligro**, con alerta especial cuando tu reina está amenazada.
- **Barras de jugador** arriba y abajo del tablero con avatar, nombre y rating,
  las piezas capturadas (agrupadas y apiladas) y la ventaja de material (+N).
- **Animación de carga** con la silueta del caballo mientras se carga el motor.
- **Multilenguaje (i18n)**: 14 idiomas (incluidos árabe y persa, con soporte RTL),
  con selector en la navbar y detección automática del idioma del navegador. El motor
  vive en `i18n.js` y los textos de cada idioma en `lang/<código>.json`.
- **Animación de las fichas**: cada pieza se desliza suavemente al moverse (capa de
  piezas con `transform` + transición); las capturas se funden; enroque y coronación animados.
- **Identidad de marca VEXCHESS**: paleta Obsidian/Slate/Ivory/Tactical Red, wordmark
  VEX+CHESS con la marca del caballo y el tagline "THINK AHEAD.", y tipografías
  Oxanium (wordmark) e Inter (interfaz) servidas en local (offline).
- **Modo entrenador**: sugiere tu mejor jugada con una flecha y una explicación,
  usando una 2ª instancia de Stockfish a máxima fuerza (no afecta a la dificultad del rival).
- **Guía del ajedrez**: botón "?" con conceptos básicos (qué es el Elo, objetivo,
  jaque/mate/tablas, jugadas especiales, valor de las piezas, consejos) y una tarjeta
  por pieza (movimiento, historia y curiosidades, objetivos y jugadas).
- Elegir bando (blancas/negras), girar tablero, deshacer, indicador de "pensando" y
  una lectura de la evaluación de la posición.

## Convención de estilo (importante)

Todo el CSS es **100% responsive y sin `px`**: se usan solo unidades relativas
(`rem`, `em`, `%`, `vh`, `vw`, `clamp`). El tamaño base es fluido (ver la regla
`html { font-size: clamp(...) }` en `style.css`), así que toda la interfaz escala
sola con el tamaño de la ventana. Cualquier cambio futuro debe mantener esta norma.

## Sistema de diseño (`ui.css`)

Todas las páginas cargan `ui.css` justo después de `style.css`. Ahí viven los
**tokens** (radios `--r-sm/md/lg/xl/full`, superficies `--surface-1/2`,
hairlines, sombras, semánticos `--ok/--warn/--info/--bad` con sus tintes,
tipografías y la zona táctil `--tap`) y los **componentes comunes**: botones
(`.btn` + `primary/tinted/quiet/danger`), tarjetas (`.vx-card`), cabecera de
página (`.vx-page-head` + `.eyebrow` global), segmented control (`.vx-seg`),
chips de estado (`.vx-chip`), filas de lista (`.vx-row`), KPIs (`.vx-kpi`),
estados vacíos (`.vx-empty`) e inputs (`.vx-input`).

Reglas que mantienen la coherencia (no romperlas al añadir UI):

- **Una sola acción prominente (roja) por vista** — la CTA que importa.
  Secundarias en tinte (`tinted`), terciarias en `quiet`, destructivas en
  `danger` (ghost). Las acciones de fila nunca van en rojo sólido.
- **La selección no se pinta de rojo**: un elemento elegido (pestaña, fila,
  ritmo de juego) se ELEVA (fondo claro translúcido + hairline fuerte +
  sombra). El rojo queda para marca y "derrota"; verde = victoria/online;
  ámbar = aviso/preview; cian = foco, información y AXIOM.
- **Foco visible cian uniforme** (`--focus-ring`) en todo el sitio.
- Radios y superficies SIEMPRE desde tokens; nada de grises planos sin borde.
- **Regla de alineación equidistante**: todo componente dentro de un
  contenedor debe medir LO MISMO respecto a los bordes que le tocan según
  su alineación — centrado: mismo aire arriba/abajo y a ambos lados;
  alineado al inicio: mismo arranque horizontal que sus hermanos (el
  avatar de una ficha arranca donde arranca el texto de las opciones).
  Los descuadres de 2–4px se notan: se mide (getBoundingClientRect), no
  se estima a ojo.
- Oxanium solo para display y cifras (`--font-display`); Inter para el resto.

Al tocar `ui.css` hay que subir su `?v=` en TODOS los HTML.

### Movimiento (`motion.css` + `motion.js`)

La capa de animación, con recetas adaptadas de
[transitions.dev](https://transitions.dev/): tokens (`--ease-out`,
`--ease-spring`, duraciones, `--stagger`), keyframes del sistema (`vx-rise`,
`vx-pop`, `vx-modal-in`, `vx-shake` con overshoot decreciente, `vx-check-in`,
`vx-toast-in`), cross-fade entre páginas con la View Transitions API (se
ignora sin soporte) y el "thumb" deslizante de los segmented (lo inyecta
`motion.js` como mejora progresiva: sin JS queda el estilo estático).

Reglas: animar solo transform/opacity/filter; entradas con `backwards`;
stagger de 45ms con tope en el 8º elemento; springs solo en piezas pequeñas
(badges, chips) — nunca en bloques grandes; `prefers-reduced-motion` apaga
TODO (animaciones, thumb y view transitions). El chip de cuenta de la navbar
tiene su propia animación y queda fuera de esta capa.

## Portada (`index.html` + `home.css` + `home.js`)

La portada presenta VEXCHESS como **plataforma**, no como una demo de motor: se
juega online o contra la máquina, se aprende en la Academia con AXIOM, se
entrena con puzzles y se coleccionan los Vexborn. El motor de ajedrez es *una*
de las formas de jugar, no el titular.

Secciones, en orden: hero · bento de modos · Academia (AXIOM) · Vexborn ·
en camino · CTA final · footer. Todos los textos salen de `home.*` en
`lang/*.json`; el arte sale de `assets/vexborn/card/` y `assets/axiom/poses/`.

Dos reglas al tocarla:

- **Las cifras del hero (23 lecciones, 16 Vexborn, 14 idiomas) son reales.**
  Salen de `LESSONS` en `academy-lessons.js`, de `VEXBORN` en `vexborn.js` y de
  `LANGS` en `i18n.js`. Si cambian esas listas, hay que actualizarlas aquí.
- **La sección "En camino" es solo lo que aún NO existe.** Cuando algo se
  termina, sube al bento de modos con su enlace; no se queda como
  "próximamente". Es justo el error que tenía la portada anterior: anunciaba
  cuentas, lecciones y comunidad como futuras cuando ya estaban hechas.

`home.js` se encarga del tablero decorativo del hero, de la aparición de los
bloques `[data-reveal]` al entrar en pantalla (con `IntersectionObserver`, y
todo visible de golpe si el usuario pide menos movimiento) y del año del footer.

## Navbar compartida (`navbar.js` + `navbar.css`)

Todas las páginas montan la misma barra desde un único componente. Basta con
colocar el contenedor y cargar el script **antes** de `auth.js` (que necesita
que exista el hueco `.vx-account`):

    <link rel="stylesheet" href="navbar.css?v=6">
    ...
    <header id="vx-nav" data-variant="site"></header>          <!-- por defecto -->
    <header id="vx-nav" data-variant="site" data-home></header> <!-- portada -->
    <script type="module" src="navbar.js?v=5"></script>

Dos variantes:

- **`site`** — barra pegajosa con marca, enlaces, CTA "Jugar", acceso a Ajustes
  (engranaje) y chip de cuenta. Es la de todas las páginas de contenido. El
  selector de idioma y el tema del tablero viven en su propia página,
  **`ajustes.html`** (`ajustes.css` + `ajustes.js`), no en la barra.
- **`battle`** — la antigua barra flotante de partida. Ya no la usa ninguna
  página: `play.html` y `game.html` montan la variante `site` con `data-intro`
  (conserva la animación de entrada del logo). Ambas variantes admiten botones
  propios vía `<template data-slot="actions">…</template>` — en `site` se
  colocan junto al chip de cuenta (ej.: la ayuda del juego).

Los enlaces son **los mismos en todas las vistas**: se editan en un solo sitio,
la constante `SITE_LINKS` de `navbar.js` (y su texto en `nav.<clave>` de cada
`lang/*.json`). El enlace de la página actual se marca solo, con `aria-current`.

### Comportamiento en móvil

Por debajo de **74em** (medido: es donde la barra dejaría de caber con la sesión
iniciada) los enlaces, la CTA y el acceso a Ajustes se pliegan en un panel
desplegable. El punto de corte está en `MOBILE_MQ` (`navbar.js`) y debe
coincidir con el `@media` de `navbar.css`. El panel:

- se abre con la hamburguesa y se cierra con **Escape**, tocando el **velo**,
  tocando fuera, al navegar o al volver a escritorio;
- **bloquea el scroll del fondo** mientras está abierto (`html.vxnav-locked`);
- tiene **scroll propio** si no cabe (apaisado), sin arrastrar la página;
- respeta los **márgenes seguros** de pantallas con muesca — por eso todos los
  `<meta name="viewport">` llevan `viewport-fit=cover`;
- marca la página actual con una barrita de acento (espejada en RTL).

**Regla del safe-area** (aprendida a base de iPhone real): `env(safe-area-inset-*)`
se escribe **directo en cada regla**, nunca guardado en una custom property —
WebKit falla resolviendo `env()` dentro de una `var()` usada en `calc()` y el
inset sale 0. Además, Safari en iOS 26 reporta un inset superior corto (~44px
donde el despeje real ronda 59px), así que al inset se le suma un **colchón que
solo existe con muesca**: `min(env(safe-area-inset-top) * 99, 1.9rem)`. Y todo
**en capas**: primero la declaración simple (solo `env()`), debajo la del
colchón; si un motor no entiende la segunda, descarta esa línea y sobrevive la
primera — nunca se queda a 0.

La barra se **compacta al bajar** (clase `.is-scrolled`) para ganar alto útil y
refuerza el velo de fondo para que los enlaces sigan legibles.

Ojo con las zonas táctiles: el tamaño base del documento es fluido
(`html { font-size: clamp(…) }`), así que en móviles pequeños 1rem encoge. Por
eso los objetivos táctiles usan la variable `--nav-tap`, que sube en el tramo
estrecho para no bajar nunca de ~44px reales.

**Caché del JS — versión única de build.** Todo el JS comparte UNA versión:
cada HTML lleva un `<script type="importmap">` que mapea cada módulo a
`./modulo.js?v=BUILD`, y los `<script src>` y `modulepreload` usan el mismo
`?v=BUILD`. Los imports en los .js van SIN query (`from './auth.js'`): el
mapa pone la versión. Al tocar cualquier JS, publicar es un solo comando:

    sed -i 's/?v=100/?v=101/g' *.html

(sustituyendo por el build actual y el siguiente). Nada de tocar importadores
en cadena. El CSS sigue con `?v=` por fichero en los HTML (no tiene cascada:
solo lo referencia el HTML). Ojo: no volver a poner `?v=` en un import de un
.js — crearía DOS instancias del módulo (nos pasó con `auth.js` y con
`vexborn.js`, importados con dos versiones distintas a la vez).

## Cómo ejecutarlo en local

El proyecto necesita servirse por HTTP (el motor se carga en un *Web Worker* y el
navegador no permite cargar Workers/WASM desde `file://`). Cualquiera de estas opciones
vale; ejecútala dentro de la carpeta del proyecto:

    # Opción A — Node (recomendada)
    npx serve .

    # Opción B — Python
    python3 -m http.server 8000

Luego abre la dirección que te indique (p. ej. `http://localhost:8000`).

## Cómo desplegarlo en Cloudflare Pages

Es un sitio 100% estático, así que el despliegue es directo:

    npm install -g wrangler        # una sola vez
    wrangler pages deploy .        # desde la carpeta del proyecto

(O súbelo por la interfaz de Cloudflare Pages arrastrando la carpeta, o conéctalo a un
repositorio de GitHub. No necesita build ni configuración especial.)

## Estructura del proyecto

    index.html    Portada
    play.html / game.html          Partida contra la IA (navbar variante "battle")
    academia.html / puzzles.html   Academia y puzzles
    directo.html / partidas.html   Partidas en directo e historial propio
    comunidad.html / perfil.html   Comunidad y perfil
    online.html / connect.html     Juego en línea
    vexborn.html / insignias.html  Progresión e insignias
    ajustes.html  Ajustes (idioma de la interfaz y tema del tablero)
    admin.html    Panel de administración (pestañas Usuarios y Analíticas)
    admin-stats.js  Analíticas del panel: gráficas SVG propias (área, columnas,
                  sparklines, barra apilada, listas con barras) y mapa-mundi
                  de puntos. Datos reales de /api/admin/analytics (D1).
    world-map.js  Silueta del mundo en puntos + centroides por país (ISO2).
                  GENERADO en build (scripts de scratchpad), no editar a mano.
    style.css     Estilos base y compartidos (modales, navbar "battle", partida…)
    ui.css        SISTEMA DE DISEÑO compartido (ver más abajo): tokens y componentes
    home.css / home.js             Portada (ver más abajo)
    academia.css, comunidad.css, … Estilos por página
    navbar.css / navbar.js         Navbar compartida (ver más abajo)
    account-chip.js                Chip de cuenta desplegable de la navbar
    auth.js       Sesión, cuenta y datos del usuario
    app.js        Lógica de partida: tablero, interacción y comunicación con el motor
    i18n.js       Motor de traducción (t(), selector de idioma, RTL)
    lang/*.json   Textos de cada idioma. Para añadir uno: copia `lang/en.json`,
                  tradúcelo y añade su código y endónimo a LANGS en `i18n.js`
    chess.js      Librería de reglas (movimientos legales, jaque, etc.)
    worker/       Worker de Cloudflare (API) y `schema.sql` la base de datos D1
    engine/
      stockfish-18-lite-single.js    Cargador del motor (Web Worker)
      stockfish-18-lite-single.wasm  Motor + red neuronal NNUE (~7 MB)
    assets/pieces/
      staunty.svg                    Sprite SVG de las fichas (set "Staunty")
    assets/
      vexchess-mark.svg              Marca (caballo) del logo
      vexchess-icon.png              Favicon / icono de app
    assets/fonts/
      fonts.css + *.woff2            Tipografías de marca (Oxanium, Inter), offline

## Cómo se comunica con el motor (para extender)

El motor habla el protocolo **UCI** por mensajes de texto a través del Worker:

    engine.postMessage('uci')                         // inicio
    engine.postMessage('setoption name UCI_Elo value 1800')
    engine.postMessage('position fen ' + game.fen())  // posición actual
    engine.postMessage('go movetime 600')             // ¡piensa!
    // -> responde:  bestmove e7e5 ponder g1f3

Todo esto está en `app.js`, en la sección "MOTOR". A partir de aquí puedes extender:
mostrar la mejor línea del motor como "pista", una barra de evaluación en vivo,
análisis post-partida, guardar partidas en formato PGN, tableros online, etc.

## Créditos y licencia

- Motor: [Stockfish](https://stockfishchess.org/) (GPLv3), build WASM de
  [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js) patrocinado por Chess.com.
- Reglas: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause).
- Fichas: set "Staunty" de lila/Lichess vía
  [cm-chessboard](https://github.com/shaack/cm-chessboard), licencia
  **CC BY-NC-SA 4.0** (uso no comercial). Para un proyecto personal o de
  portfolio va bien; si algún día le das un uso comercial, cambia el set de
  fichas por uno con licencia adecuada.

Como el proyecto incluye Stockfish (GPLv3), si lo publicas debes respetar esa licencia.

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
- **Multilenguaje (i18n)**: español e inglés, con selector y detección automática del
  idioma del navegador. Todos los textos viven en `i18n.js`.
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

    index.html    Estructura de la página y panel lateral
    style.css     Estilos
    app.js        Toda la lógica: tablero, interacción y comunicación con el motor
    i18n.js       TODOS los textos de la interfaz (es / en). Para añadir un idioma,
                  copia el bloque "en", tradúcelo y añade su <option> en index.html
    chess.js      Librería de reglas (movimientos legales, jaque, etc.)
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

# VEXCHESS · Ideas y roadmap interno

Lista viva de ideas y mejoras futuras (no confundir con la sección "Roadmap" pública del home).

## Convención viva (aplica a TODO lo nuevo)
- **Alineación equidistante**: cualquier componente dentro de un contenedor debe medir lo mismo respecto a los bordes que le tocan según su alineación (centrado = mismo aire por ambos lados; al inicio = mismo arranque que sus hermanos). Medir, no estimar. Detalle completo en `README.md` → Sistema de diseño.

## Ideas guardadas (futuro)

### Moderación de nombres de usuario con IA
Sustituir/complementar la lista básica de palabras por un sistema serio de moderación:
- **Capa 1 — lista local** (ya implementada): filtro instantáneo y gratis para lo obvio.
- **Capa 2 — librería**: `obscenity` (detecta leet/ofuscación: `fvck`, `sh1t`) + listas multiidioma (LDNOOBW / `naughty-words`, ~28 idiomas). JS puro, va en el Worker.
- **Capa 3 — modelo IA (Cloudflare Workers AI)**: juez final para casos dudosos y cualquier idioma; entiende intención. Con fallback si la IA no responde.
- Complementar siempre con moderación humana (reportar / renombrar / banear).

### Sistema de reputación de usuarios
Que los usuarios ganen **reputación** con el tiempo. Posibles fuentes (por decidir):
- Feedback de rivales tras las partidas (deportividad, etc.).
- Participación en grupos / foros / comunidad.
- Contribuciones (reportar bugs, ayudar a novatos, etc.).
- Relación con el sistema de insignias (algunas insignias podrían dar reputación).

## En marcha / hecho
- ✅ **Dock de partida anclado y móvil de verdad**: en móvil es una hoja fija al borde inferior (dos filas: color+nivel / acciones en iconos con salto de fila forzado por un rompefilas), con safe-area, en vez del panel flotante que envolvía hasta tapar media pantalla. El botón de ayuda sale de la navbar y entra al dock como interrogación DESNUDA (sin caja ni borde). En escritorio el dock se centra con left/right+margin auto (con left:50% el shrink-to-fit capaba el ancho a media pantalla). La infobar, el popover de jugadas y el compañero Vexborn flotan por encima de la hoja; y la vista online usa el mismo material de hoja inferior para tablas/rendirse.
- ✅ **Esqueletos de carga en todas las pantallas** (`skeleton.js` + `.vx-sk` en `ui.css`): fuera los spinners en cargas de página — cada pantalla enseña su silueta real (cajas con barrido de luz sutil, estático con reduced-motion, `role="status"` para lectores). Aplicado a perfil, lobby online, partida online, admin, Academia, comunidad, Vexborn e insignias. Los spinners pequeños de widgets (buscar rival, cargar más) se quedan.
- ✅ **Aviso de partida guardada rehecho**: ficha con la POSICIÓN REAL en un mini-tablero (desde el lado del jugador, con el tema de tablero del usuario), chips de jugadas/color/nivel/hace-cuánto (Intl.RelativeTimeFormat), y jerarquía correcta de botones (Retomar primario, Empezar de cero destructivo silencioso). De paso sus textos, que estaban SIN traducir, entran en los 14 idiomas.
- ✅ **Intro de marca sin desbordes en móvil**: en pantallas estrechas el tamaño del logo lo manda el ancho (vw), no la altura del viewport — antes caballo+wordmark se salían por los lados. Overflow bloqueado en el contenedor y bloque colocado tras las reglas base (a igual especificidad gana el último).
- ✅ **Carrusel de modos de juego en el lobby online**: raíl con scroll-snap y arte Vexborn (Contra la IA, partida online —ancla suave al emparejamiento—, retar a un amigo, puzzles, Academia), paralaje sutil del arte al desplazar (solo transform, respeta reduced-motion), flechas solo con puntero fino y bordes fundidos con máscara; sin contadores ni "desliza" (reglas scrollcraft). Y **fuera "Stockfish" de todos los textos de cara al usuario** ("IA" a secas): la única mención que queda es el crédito de licencia del footer (GPLv3, atribución debida).
- ✅ **Un solo camino para "Jugar"**: todos los botones genéricos de jugar (navbar, hero y CTA final de la portada, footer, Mis partidas, En directo) llevan a `online.html`, y allí una tarjeta "Contra la IA" (visible también sin sesión: el bot no pide cuenta) lleva a `play.html`. Los únicos accesos directos a `play.html` que quedan son los etiquetados explícitamente "contra la IA" (tarjeta del bento y secundario de la CTA final) — prometer máquina y aterrizar en el lobby sería peor.
- ✅ **Analíticas en el panel de administración** (pestaña nueva junto a Usuarios): KPIs con sparklines y delta semanal, gráfica de actividad diaria (altas / partidas IA / online, rangos 30-90-180 días, tooltip con crosshair, teclado y vista de tabla gemela), resultados contra la IA (barra apilada de estado con el gris SIEMPRE entre verde y rojo: bajo deuteranopia son casi idénticos), partidas por nivel, distribución de Elo, **mapa-mundi de puntos** con marcadores luminosos por país + top de países, ritmos online, navegadores reales (user-agent de las sesiones propias, sin trackers) y top de jugadores. Todo son datos REALES de D1 vía `/api/admin/analytics` (solo staff); paleta validada con el validador de dataviz contra la superficie oscura (un solo hue de datos #3E8EE8). El mapa (`world-map.js`) se genera en build desde GeoJSON: nada se descarga en runtime.
- ✅ **Una sola navbar en todo el sitio**: `play.html` y `game.html` dejan la barra flotante "battle" y montan la navbar común (variante `site` con `data-intro` para conservar la intro del logo). El botón de ayuda del juego viaja al slot de acciones junto al chip; el selector de idioma legacy (es/en) y el popover de tema del tablero de la partida desaparecen — ambos viven en Ajustes. Los huecos de compensación del escenario y de la partida online se recalculan al alto real de la barra.
- ✅ **Aire superior propio de la navbar** (`--nav-air-t`): cuando el navegador lleva su barra arriba (Safari horizontal, Android, escritorio) `env(safe-area-inset-top)` es 0 legítimamente y la barra nacía pegada al borde; ahora en móvil/tablet lleva 0.65rem de aire base además del safe-area.
- ✅ **Página de Ajustes (`ajustes.html`)**: idioma de la interfaz y tema del tablero en una lista agrupada al estilo de un sistema operativo. El selector de idioma sale de la navbar (en escritorio lo sustituye un engranaje discreto; en el panel móvil, una fila de Ajustes), que queda más limpia. Textos en los 14 idiomas.
- ✅ **Safe-area superior blindado (iOS 26)**: `env()` directo en cada regla (nunca dentro de una custom property: WebKit lo resuelve a 0), colchón condicional `min(env*99, 1.9rem)` que solo existe con muesca, y todo declarado en capas para que un motor que no entienda el colchón conserve al menos el inset simple.
- ✅ Cuentas (registro/login), perfiles, persistencia en la nube (D1), Elo y estadísticas.
- ✅ Sistema de **insignias** (estilo Discord): colección inicial de 8, mostrar en el perfil con detalle, fijar hasta 3 y destacar 1 junto al nombre.
- ✅ **Sistema de diseño compartido (`ui.css`)**: tokens (radios, superficies, semánticos, foco cian), jerarquía de botones en 4 niveles, segmented control único, filas/KPIs/chips/estados vacíos comunes, y todas las páginas armonizadas. Arreglada además la "bandeja" que asomaba bajo el chip de cuenta.
- ✅ **Portada rehecha**: narrativa de plataforma (online, Academia con AXIOM, puzzles, partidas, comunidad, Vexborn), bento de modos, arte real de Vexborn y AXIOM, y una sección "En camino" que ya solo lista lo que falta de verdad: ranking, clubes y torneos, y nuevas expansiones.
- ✅ **Navbar móvil pulida**: hamburguesa a la izquierda de la marca (solo líneas, morph a X teñido de marca), bloque de cuenta a la derecha, y arreglado el bug por el que la barra sticky desaparecía al abrir el menú con scroll hecho (el bloqueo por overflow rompía el sticky; ahora se bloquean los gestos, no el documento).
- ✅ **Navbar compartida y responsive**: panel móvil con velo, bloqueo de scroll, cierre con Escape/toque fuera, zonas táctiles de ~44px, iconos y marca de página actual, barra compacta al bajar y soporte RTL. Documentada en `README.md`.

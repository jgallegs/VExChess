# VEXCHESS · Ideas y roadmap interno

Lista viva de ideas y mejoras futuras (no confundir con la sección "Roadmap" pública del home).

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
- ✅ Cuentas (registro/login), perfiles, persistencia en la nube (D1), Elo y estadísticas.
- ✅ Sistema de **insignias** (estilo Discord): colección inicial de 8, mostrar en el perfil con detalle, fijar hasta 3 y destacar 1 junto al nombre.

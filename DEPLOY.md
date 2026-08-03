# Desplegar VEXCHESS en Cloudflare Pages

VEXCHESS es un sitio **100 % estático** (HTML/CSS/JS + WebAssembly). No hay
backend, ni build, ni Workers. Se despliega tal cual en Cloudflare Pages.

## Resumen

| Ajuste | Valor |
|---|---|
| Framework preset | **None** |
| Build command | *(vacío)* |
| Build output directory | **`/`** |
| Root directory | `/` |

Stockfish usa la build **single-thread**, así que **no** hacen falta cabeceras
COOP/COEP. El archivo `_headers` ya incluye lo necesario (tipo de contenido y
caché del motor y las fuentes).

---

## 1) Subir el repo a GitHub

Si el proyecto **aún no está en GitHub**, desde la carpeta del repo:

```bash
git init
git add .
git commit -m "VEXCHESS: plataforma de ajedrez con IA"
git branch -M main
# crea el repo vacío en github.com (o con: gh repo create vexchess --public --source=. --push)
git remote add origin https://github.com/TU_USUARIO/vexchess.git
git push -u origin main
```

(Alternativa sin terminal: **GitHub Desktop** → *Add Local Repository* → *Publish*.)

## 2) Conectar con Cloudflare Pages

1. Entra en **dash.cloudflare.com** → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
2. Autoriza GitHub y elige el repo `vexchess`.
3. En la configuración de build:
   - **Framework preset:** `None`
   - **Build command:** *(déjalo vacío)*
   - **Build output directory:** `/`
4. **Save and Deploy**.

En ~1 minuto tendrás la web en **`vexchess.pages.dev`**.

## 3) Actualizaciones automáticas

A partir de ahora, **cada `git push` a `main` publica solo** la nueva versión.
No hay que hacer nada más.

## 4) Dominio propio (opcional, cuando quieras)

En el proyecto de Pages → **Custom domains** → **Set up a domain** → escribe tu
dominio o subdominio (p. ej. `vexchess.com` o `ajedrez.tudominio.com`). Si el
dominio ya está en Cloudflare, los registros DNS se crean solos.

Un mismo proyecto puede tener **varios dominios** apuntando a él (por ejemplo
`vexchess.pages.dev` + tu dominio + un enlace desde el portfolio).

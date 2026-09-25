# 075arquitectura

Aplicación integral en Next.js para el portafolio público y el panel privado de 075arquitectura. Usa PostgreSQL y almacenamiento local persistente para las imágenes; no depende de un backend separado ni de un proveedor de medios externo.

## Requisitos

- Node.js `24.11.0` y npm `11.6.1`.
- Docker con Compose para PostgreSQL local.
- En producción: Docker sobre Ubuntu, un reverse proxy y un volumen persistente para imágenes.

Instala siempre las dependencias en el sistema donde se ejecutará la aplicación; no copies `node_modules` entre Windows y Linux.

```bash
npm ci
```

## Configuración local

El archivo `..\.env` es el respaldo manual y `.\.env` es la copia activa. Ambos están fuera de Git. Para restaurar el activo en PowerShell:

```powershell
Copy-Item -LiteralPath '..\.env' -Destination '.\.env'
```

Durante desarrollo usa `UPLOADS_ROOT="./uploads"`. El directorio es privado por defecto: el navegador solo accede a variantes WebP autorizadas mediante `/media/...`; el original nunca tiene una URL pública.

```bash
docker compose up -d postgres postgres-test
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

La aplicación queda en `http://localhost:3000`. PostgreSQL de desarrollo escucha en `127.0.0.1:5432` y la base aislada de pruebas en `127.0.0.1:5433`.

## Imágenes

Se aceptan JPEG, PNG y WebP de hasta 20 MB y cualquier resolución positiva. Un proyecto admite 30 imágenes y el navegador transfiere hasta tres en paralelo; Sharp procesa una a la vez para proteger CPU y memoria.

Por cada carga se conserva el original exacto de forma privada y se generan, sin ampliación, hasta cinco archivos públicos WebP:

| Archivo        | Ancho máximo | Uso                     |
| -------------- | -----------: | ----------------------- |
| `mobile.webp`  |       480 px | Celular                 |
| `tablet.webp`  |       768 px | Tablet                  |
| `laptop.webp`  |      1280 px | Portátil                |
| `desktop.webp` |      1920 px | Escritorio              |
| `wide.webp`    |      2560 px | Pantalla grande y visor |

Una imagen menor de 480 px genera únicamente `mobile.webp` a su resolución original. El procesamiento corrige orientación, elimina EXIF/GPS y conserva transparencia. Las fotografías usan WebP calidad 88; planos y PNG usan WebP near-lossless.

Las rutas guardadas en PostgreSQL son relativas y opacas. `uploads/` está ignorado por Git y contiene `projects/`, `site/hero`, `.tmp` y `.trash`. El original no se acepta como variante de `/media`; solo `mobile`, `tablet`, `laptop`, `desktop` y `wide` pueden entregarse. Las cancelaciones se marcan y reconcilian en servidor para retirar una imagen aunque el navegador ya haya terminado de transferirla. La herramienta **Limpiar cargas incompletas** retira temporales, marcadores y papelera interna de más de 24 horas.

Antes de aplicar la migración que elimina las columnas antiguas puede generarse un inventario local, ignorado por Git:

```bash
npm run media:legacy-report
```

El reporte no descarga ni elimina recursos remotos. Las imágenes reales anteriores deben volver a cargarse manualmente.

## Base de datos y administradora

- `npm run db:generate`: genera el cliente Prisma.
- `npm run db:migrate`: crea y aplica migraciones durante desarrollo.
- `npm run db:migrate:deploy`: aplica migraciones versionadas.
- `npm run db:status`: comprueba su estado.
- `npm run db:seed`: carga contenido ficticio idempotente, sin administradora.
- `npm run db:test:reset`: reconstruye solo la base local terminada en `_test` del puerto `5433`.

Para crear la única administradora define `ADMIN_EMAIL` y `ADMIN_PASSWORD` y ejecuta `npm run db:bootstrap-admin`. La contraseña debe tener entre 15 y 128 caracteres; el comando nunca imprime la contraseña ni el hash.

## Despliegue en Ubuntu

`next.config.ts` genera una salida standalone. `compose.production.yaml` monta:

```text
/srv/075arquitectura/uploads:/data/uploads
```

La aplicación corre como usuario no privilegiado y usa `UPLOADS_ROOT=/data/uploads`. Crea el directorio del host con propietario y permisos compatibles antes de iniciar el contenedor. El puerto `3000` se publica solo en loopback para que el reverse proxy sea el único punto de entrada.

Copia `.env.production.example` como `.env.production`, reemplaza todos los valores de ejemplo y no versiones el archivo resultante. `DATABASE_URL` usa el hostname interno `postgres`; las variables `POSTGRES_*` inicializan únicamente el contenedor de base.

El proxy debe permitir algo más de 20 MB por solicitud, dar tiempo al procesamiento y sobrescribir `X-Real-IP`/`X-Forwarded-For`. Los respaldos deben incluir en el mismo ciclo PostgreSQL y `/srv/075arquitectura/uploads`. No se usa Vercel.

## Seguridad y comportamiento público

- `/admin` requiere una sesión cifrada de ocho horas y revalida la cuenta en PostgreSQL.
- Todas las lecturas y mutaciones privadas se autorizan en servidor.
- Borradores y papelera solo entregan medios a una administradora autenticada.
- Proyectos publicados y hero usan URLs inmutables con caché prolongada apta para Cloudflare.
- No existe API pública de negocio, registro público ni recuperación automática de contraseña.
- `.env`, `uploads/` y secretos reales nunca se versionan.

## Calidad

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:integration
npm run db:status
npm run build
```

`npm run check` ejecuta formato, lint, tipos, pruebas de integración y build. El seed usa exclusivamente recursos conceptuales incluidos en `public/images`; no realiza cargas externas.

`npm audit --omit=dev` conserva cuatro avisos altos transitivos de la herramienta Prisma (`deepmerge-ts` y `mysql2`). La corrección automática propone degradar Prisma a la versión 6, por lo que no se ejecuta `npm audit fix --force`; Sharp ya está fijado en `0.35.4`, que corrige los avisos de libvips/libheif detectados durante esta migración.

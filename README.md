# 075arquitectura

Aplicación integral en Next.js para el portafolio público y la administración privada de 075arquitectura. Incluye la base de persistencia, autenticación de propietaria y shell editorial de `/admin`. El CRUD de contenido y las galerías se implementarán en los Sprints 6 y 7.

## Requisitos

- Node.js `24.11.0` (ver `.nvmrc`).
- npm `11.6.1`.
- Docker con Compose para PostgreSQL local.

Las versiones de Next.js, Prisma y demás paquetes están bloqueadas en `package-lock.json`. Instala siempre con:

```bash
npm ci
```

## Configuración local

1. Copia `.env.example` como `.env`.
2. Conserva las URLs locales incluidas o cambia únicamente las credenciales de desarrollo. Define un `AUTH_SECRET` local aleatorio y deja `NEXTAUTH_URL=http://localhost:3000`.
3. Inicia PostgreSQL:

```bash
docker compose up -d postgres postgres-test
```

4. Prepara la base de desarrollo:

```bash
npm run db:migrate:deploy
npm run db:seed
```

5. Inicia Next.js:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`. PostgreSQL de desarrollo escucha solo en `127.0.0.1:5432`; la instancia de pruebas, solo en `127.0.0.1:5433`.

## Flujo reproducible

Con los dos servicios de PostgreSQL saludables y el archivo `.env` creado:

```bash
npm ci
npm run db:migrate:deploy
npm run db:seed
npm run check
npm run db:status
```

`npm run check` comprueba formato, lint, tipos, integración contra una base de pruebas reiniciada y el build de producción. El reset de pruebas se niega a operar salvo que la URL use `localhost` o `127.0.0.1`, el puerto `5433` y un nombre terminado en `_test`.

## Base de datos

- `npm run db:generate`: regenera el cliente Prisma en `generated/prisma`.
- `npm run db:migrate`: crea/aplica migraciones durante desarrollo.
- `npm run db:migrate:deploy`: aplica migraciones ya versionadas.
- `npm run db:status`: muestra el estado de migraciones.
- `npm run db:seed`: carga fixtures ficticios e idempotentes, sin administradora.
- `npm run db:test:reset`: reconstruye y puebla exclusivamente la base de pruebas.
- `npm run test:integration`: reconstruye la base de pruebas y ejecuta Vitest en serie.

No se usa `prisma db push` como sustituto de las migraciones. Los metadatos de imágenes del seed son falsos, usan `example.invalid` y no realizan cargas a Cloudinary.

## Creación privada de la administradora

Define temporalmente `ADMIN_EMAIL` y `ADMIN_PASSWORD` en el entorno y ejecuta:

```bash
npm run db:bootstrap-admin
```

La contraseña debe tener entre 15 y 128 caracteres. El comando normaliza el correo, genera un hash Argon2id y rechaza sobrescribir la cuenta o crear una segunda administradora. Nunca imprime la contraseña ni el hash.

## Panel administrativo

- Acceso: `/admin/acceso`.
- Sesión cifrada con duración absoluta de ocho horas.
- El panel revalida en PostgreSQL que la cuenta siga activa y que la contraseña no haya cambiado.
- El dashboard usa métricas reales; proyectos, categorías, perfil y papelera muestran estados de próximos sprints.
- No existe registro público, recuperación automática ni API pública de negocio.

El inicio y cierre de sesión usan NextAuth.js y protección CSRF. Los intentos fallidos se limitan en PostgreSQL mediante claves HMAC que no contienen el correo ni la IP legibles.

## Seguridad

- `.env` y todos los secretos reales están ignorados por Git.
- Las credenciales de `compose.yaml` son exclusivamente locales y no son aptas para producción.
- No reutilices contraseñas de producción en desarrollo o pruebas.
- No apuntes `TEST_DATABASE_URL` a una base remota: el mecanismo de seguridad también lo rechazará.
- El cliente Prisma compartido es exclusivo del servidor; no debe importarse desde componentes cliente.
- En producción, el reverse proxy debe sobrescribir `X-Real-IP`/`X-Forwarded-For`, mantener privado el puerto de Next.js y servir HTTPS.

## Calidad

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:integration
npm run build
```

El formato puede corregirse con `npm run format`. La landing pública del scaffold se conserva intencionalmente hasta el sprint de sistema visual.

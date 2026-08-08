# Presión App

Aplicación web bilingüe (español e inglés) para registrar, consultar y compartir mediciones de presión arterial. Diseñada para el uso personal o familiar: las lecturas se cargan manualmente y el sistema las clasifica según los rangos estándar.

## Funcionalidades

- Registro de cuentas en tres pasos: datos, contraseña y pregunta de seguridad.
- Inicio de sesión con email y contraseña (NextAuth, sesiones JWT).
- Recuperación de contraseña mediante pregunta de seguridad.
- Registro manual de mediciones: sistólica, diastólica, pulso, brazo, posición y notas.
- Clasificación automática de cada lectura (normal, elevada, hipertensión grado 1/2, crisis hipertensiva).
- Dashboard con última medición, promedios semanales, espectro de clasificación y tendencias de los últimos 7 días.
- Historial con filtros, búsqueda, ordenamiento, tablas y gráficos.
- Exportación de reportes a PDF y Excel, con estadísticas y distribución por clasificación.
- Envío de reportes por email (para compartirlos con un médico).
- Recordatorios de medición por navegador y por correo (horarios configurables).
- Configuración de perfil, contraseña, tema claro/oscuro, idioma y zona horaria.
- Panel de administración: métricas globales y gestión de usuarios (roles `user` y `admin`).
- Interfaz bilingüe (`es` / `en`) con detección automática de idioma.

## Stack tecnológico

- [Next.js 16](https://nextjs.org) (App Router) con React 19 y TypeScript.
- [Tailwind CSS](https://tailwindcss.com) v4 + componentes [shadcn/ui](https://ui.shadcn.com).
- [NextAuth](https://next-auth.js.org) v5 beta con proveedor de credenciales.
- [Drizzle ORM](https://orm.drizzle.team) + [Turso](https://turso.tech) (libSQL).
- [Zod](https://zod.dev) para validación.
- [Recharts](https://recharts.org) para gráficos.
- [jsPDF](https://github.com/parallax/jsPDF) / [SheetJS](https://sheetjs.com) para exportaciones.
- [Nodemailer](https://nodemailer.com) para correo SMTP.
- [TanStack Table](https://tanstack.com/table) para tablas.
- [next-themes](https://github.com/pacocoursey/next-themes) para temas y [Sonner](https://sonner.emilkowal.ski) para notificaciones.

## Requisitos

- Node.js (sin versión declarada en `package.json`; se recomienda una versión LTS reciente).
- Una base de datos Turso (plan gratuito alcanza para uso personal) o un endpoint/libSQL compatible.

## Instalación

```bash
npm install
```

Luego copia el archivo de ejemplo y completa los valores:

```bash
cp .env.local.example .env.local   # macOS / Linux
# o en Windows (PowerShell):
Copy-Item .env.local.example .env.local
```

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | Sí | URL de la base de datos Turso (formato `libsql://...`). |
| `TURSO_AUTH_TOKEN` | Sí | Token de autenticación de Turso. |
| `NEXTAUTH_SECRET` | Sí | Secreto para firmar sesiones y tokens. Genera uno con `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Solo producción | URL pública de la aplicación. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | No | Configuración SMTP (p. ej. Gmail con contraseña de aplicación) para recordatorios y envío de reportes por correo. |
| `REMINDER_FROM` | Solo con SMTP | Remitente usada en recordatorios y reportes. |
| `CRON_SECRET` | Sí (para el cron) | Secreto requerido por `/api/cron/reminders`. |
| `ADMIN_PASSWORD` | Solo producción | Contraseña del admin del seed cuando `NODE_ENV=production`. |

> `REMINDER_TO` aparece en `.env.local.example` pero el código actual no lo utiliza: los recordatorios se envían al correo del propio usuario.

## Configuración de la base de datos

El proyecto usa Drizzle con Turso. La app y `drizzle-kit` leen `.env.local`; el script de seed usa `.env.local` en desarrollo y `.env.production` en producción:

```bash
# Generar una migración tras cambiar el esquema
npm run db:generate

# Aplicar migraciones pendientes
npm run db:migrate

# (Alternativa) Sincronizar el esquema directamente contra la base
npm run db:push

# Abrir el explorador visual de datos
npm run db:studio
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La app redirige a `/es` o `/en` según el idioma detectado en el navegador.

Datos de ejemplo (solo desarrollo):

```bash
npm run db:seed
```

Crea dos cuentas y mediciones de prueba:

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | `admin@example.com` | `admin1234` |
| Paciente de prueba | `test@example.com` | `test1234` |

En producción el seed exige la variable `ADMIN_PASSWORD` y no inserta el usuario de prueba. **Nunca uses estas credenciales en un entorno real.**

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compila la aplicación de producción. |
| `npm run start` | Sirve la build de producción. |
| `npm run lint` | Lint de ESLint. |
| `npm run test` | Prueba del clasificador de presión. |
| `npm run db:generate` | Genera migraciones de Drizzle. |
| `npm run db:migrate` | Aplica migraciones. |
| `npm run db:push` | Sincroniza el esquema directamente. |
| `npm run db:seed` | Inserta datos iniciales. |
| `npm run db:studio` | Abre Drizzle Studio. |

## Rutas principales

Todas las rutas de la app llevan prefijo de idioma (`/es` o `/en`).

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/login` | Público | Inicio de sesión. |
| `/signup` | Público | Registro de cuenta. |
| `/recuperar` | Público | Recuperación de contraseña. |
| `/dashboard` | Usuario | Panel con resumen, tendencias y última lectura. |
| `/registrar` | Usuario | Nueva medición. |
| `/historial` | Usuario | Historial con filtros, tabla y gráficos. |
| `/exportar` | Usuario | Exportación a PDF/Excel y envío por correo. |
| `/configuracion` | Usuario | Perfil, seguridad, proveedores de temas y recordatorios. |
| `/panel` | Admin | Métricas globales de todas las mediciones. |
| `/usuarios` | Admin | Administración de usuarios y de roles. |

## Clasificación de presión arterial

Las lecturas se clasifican según los rangos estándar:

| Categoría | Sistólica | Diastólica |
| --- | --- | --- |
| Normal | < 120 | < 80 |
| Elevada | 120 – 129 | < 80 |
| Hipertensión grado 1 | 130 – 139 | 80 – 89 |
| Hipertensión grado 2 | ≥ 140 | ≥ 90 |
| Crisis hipertensiva | > 180 | > 120 |

La lógica está en `src/lib/bp-classifier.ts` y los rangos en `src/lib/bp-ranges.ts`.

## Pruebas

Las pruebas cubren el clasificador de presión:

```bash
npm run test
```

## Notas médicas

- Las lecturas se capturan manualmente; no hay integración con dispositivos médicos.
- La clasificación es informativa y sigue criterios generales, pero **no sustituye la valoración de un profesional de la salud**. Ante lectura > 180/120, busca atención médica inmediata.
- El envío de recordatorios por correo depende de un cron externo que invoque `/api/cron/reminders` con el header `Authorization: Bearer <CRON_SECRET>`; la app no programa tareas en segundo plano por sí sola.
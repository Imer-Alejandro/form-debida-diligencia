# Formulario de Debida Diligencia — Sanchez Business Corp

Plataforma de registro de proveedores con formulario de debida diligencia (bilingüe ES/EN), panel de administración con evaluación interna, y subida de documentos a una biblioteca de Microsoft SharePoint. Construida con Next.js 16 (App Router + Turbopack), Supabase y Tailwind CSS.

## Requisitos

- Node.js 22+ / 24+
- Proyecto Supabase (base de datos + autenticación de administradores)
- (Opcional) Registro de aplicación en Microsoft Entra para subidas a SharePoint

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Configurar variables de entorno: copiar `.env.example` a `.env.local` y completar.

3. Crear tablas y el usuario admin en Supabase (una sola vez):

   - **Opción A (recomendada):** añadir `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` a `.env.local` y ejecutar:

     ```bash
     npm run setup:db
     ```

   - **Opción B (manual):** pegar `supabase/schema.sql` en el SQL Editor de Supabase → Run, y crear el usuario en **Authentication → Users → Add user**.

4. Levantar en modo desarrollo:

   ```bash
   npm run dev
   ```

   El panel de administración está en `http://localhost:3000/admin`.

## Estructura del proyecto

- `src/app/` — páginas (App Router)
  - `/` — landing pública
  - `/i/[token]` — wizard del proveedor (accedido con el enlace de la invitación)
  - `/admin` — panel: dashboard, proveedores, invitaciones, usuarios, configuración
  - `/api/admin/*` — mutaciones del panel (evaluación, tags, invitaciones, usuarios, cambio de datos)
  - `/api/upload/*` y `/api/onedrive/*` — subida de documentos y conexión con SharePoint
- `src/components/wizard/` — formulario del proveedor (11 secciones, documentos, revisión y firma)
- `src/components/admin/` — panel (sidebar, dashboard, listas, detalle, invitaciones)
- `src/lib/i18n/` — diccionarios ES/EN y proveedor de contexto (idioma por cookie `sb_lang`)
- `src/lib/onedrive.ts`, `src/lib/supabase/` — integración con SharePoint y Supabase
- `supabase/schema.sql` — DDL, RLS y funciones SQL

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publishable de Supabase |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (para enlaces de invitación y OAuth) |
| `ONEDRIVE_CONFIG_SECRET` | Secreto AES para cifrar el refresh token (32 bytes hex) |
| `ONEDRIVE_CLIENT_ID` | Client ID del app registration (solo subidas) |
| `ONEDRIVE_TENANT_ID` | Tenant ID de Microsoft Entra (obligatorio con tipo \"Solo mi organización\") |
| `ONEDRIVE_CLIENT_SECRET` | Secreto de cliente del app registration (flujo confidencial) |
| `SHAREPOINT_SITE_URL` | URL del sitio de SharePoint donde se guardan los documentos, p. ej. `https://empresa.sharepoint.com/sites/Repositorio` |

Generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Flujo de trabajo

1. El administrador crea una **invitación** (desde `/admin/invitations`) y comparte el enlace **o el QR**.
2. El proveedor abre `/i/[token]`, completa el formulario en dos idiomas, adjunta los documentos (se suben directo a la biblioteca de SharePoint) y los firma.
3. Puede guardar un borrador y retomarlo; al **enviar**, el registro queda en revisión.
4. El administrador evalúa el registro (secciones 12–13 del detalle), añade tags y toma una decisión. Si se solicitan cambios, el sistema regenera el enlace de invitación y el proveedor puede reenviar.

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — ESLint
- `npm start` — sirve el build (después de `npm run build`)

## Despliegue (Vercel)

- Conectar el repositorio en Vercel (framework: Next.js, build: `npm run build`).
- Añadir las variables de entorno del panel de Vercel.
- Configurar `NEXT_PUBLIC_APP_URL` con la URL de producción.
- En el app registration de Entra, añadir ésta como Redirect URI de `/api/onedrive/callback`.
- Ejecutar `supabase/schema.sql` contra la base de datos de producción si es distinta.
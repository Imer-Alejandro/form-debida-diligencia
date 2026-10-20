# Formulario de Debida Diligencia — Sánchez Business & Corp.

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

3. Crear tablas, controles de acceso y el usuario admin en Supabase:

   - **Opción A (recomendada):** añadir `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` a `.env.local` y ejecutar:

     ```bash
     npm run setup:db
     ```

   - **Opción B (manual):** ejecutar `supabase/schema.sql` y después `supabase/security-sla.sql` en el SQL Editor; crear el usuario en **Authentication → Users → Add user**, configurar `DATABASE_URL` y `ADMIN_EMAIL`, y ejecutar `npm run migrate:security-sla` para asignar el primer rol ADMIN. Este comando no cambia contraseñas ni elimina usuarios.

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
- `supabase/security-sla.sql` — roles, políticas RLS, revisiones departamentales y SLA

## Roles y seguimiento SLA

El acceso se asigna desde `/admin/users`: Administrador, Gerencia, Compras,
Revisor departamental (con departamento) o Lectura. Un usuario sin rol no puede
entrar al panel. Los revisores solo pueden consultar registros con una revisión
asignada a su departamento.

En `/admin/reviews`, el Administrador configura departamentos, correos de
notificación/escalamiento y feriados de Santo Domingo. La solicitud notifica al
correo responsable configurado para el área y enlaza directamente al expediente
departamental; el acceso requiere iniciar sesión y respeta el departamento y la
asignación del revisor. La vista contiene los datos del formulario, la evaluación
interna y los documentos con acceso autenticado. Finanzas, Legal y
Tecnología se activan por los disparadores de riesgo existentes; Compras puede
agregar otras áreas en la evaluación explicando el motivo. Las solicitudes se
envían en paralelo. El reloj de tres días hábiles inicia cuando se confirma la
recepción del expediente completo, se pausa al pedir información y se reanuda
al confirmar su recepción. El cron diario `/api/cron/alerts` notifica a Compras
y escala los SLA vencidos; defina `CRON_SECRET`, SMTP y las direcciones de
Compras. La aprobación final queda bloqueada por revisiones requeridas sin
respuesta; solo ADMIN o Gerencia pueden registrar una excepción con motivo.

Para bases existentes, ejecute `npm run migrate:security-sla` con
`DATABASE_URL` y `ADMIN_EMAIL` configurados en `.env.local`. El script preserva
los usuarios y asigna ADMIN únicamente a la cuenta indicada.

## Variables de entorno

Completa `.env.example` en `.env.local` para desarrollo. No copies secretos reales
en archivos versionados ni publiques la plantilla con credenciales.

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publishable de Supabase |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (para enlaces de invitación y OAuth) |
| `ONEDRIVE_CONFIG_SECRET` | Secreto AES para cifrar el refresh token (32 bytes hex) |
| `ONEDRIVE_CLIENT_ID` | Client ID del app registration (solo subidas; opcional) |
| `ONEDRIVE_TENANT_ID` | Tenant ID de Microsoft Entra (obligatorio con tipo "Solo mi organización") |
| `ONEDRIVE_CLIENT_SECRET` | Secreto de cliente del app registration (flujo confidencial; opcional) |
| `SHAREPOINT_SITE_URL` | URL del sitio de SharePoint donde se guardan los documentos |
| `SMTP_HOST`, `SMTP_PORT` | Servidor y puerto SMTP para notificaciones por correo |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Cuenta SMTP y remitente de correo |
| `PURCHASING_EMAILS` | Correos de Compras que reciben alertas (separados por coma) |
| `CRON_SECRET` | Secreto para autorizar la ejecución programada de alertas |
| `ALERTS_EXPIRY_DAYS` | Días de antelación para alertar vencimientos (por defecto `30,15,5`) |
| `ALERTS_FORM_MIN_AGE_DAYS` | Días antes del primer recordatorio de formulario incompleto |
| `ALERTS_AUTO_RENEW` | Si se reabre automáticamente el registro para edición |
| `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo para `npm run setup:db` |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional; acceso de servidor para crear el administrador y gestionar usuarios. Nunca exponer al navegador |
| `ADM_BASE_URL` | Base URL de la API de ADM (opcional; por defecto `https://api.admcloud.net/api`) |
| `ADM_COMPANY`, `ADM_ROLE`, `ADM_APPID` | Contexto requerido por ADM en cada solicitud |
| `ADM_USERNAME`, `ADM_PASSWORD` | Autenticación Basic de ADM; use esta opción o `ADM_TOKEN` |
| `ADM_TOKEN` | Token de ADM enviado como parámetro de consulta; alternativa a usuario/contraseña |

Generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Flujo de trabajo

1. El administrador crea una **invitación** (desde `/admin/invitations`) y comparte el enlace **o el QR**; puede copiarlo o reenviar el correo desde el listado.
2. El proveedor abre `/i/[token]`, completa el formulario en dos idiomas, consulta el checklist de documentos aplicables, adjunta los documentos (se suben directo a la biblioteca de SharePoint) y los firma.
3. Puede guardar un borrador y retomarlo; al **enviar**, el registro queda en revisión.
4. El proveedor puede consultar el estado y el próximo paso esperado. El administrador gestiona los registros desde las filas de trabajo **Por revisar**, **Esperando al proveedor** y **Sin actividad · 7+ días**.
5. El administrador evalúa el registro (secciones 12–13 del detalle), añade tags, consulta el historial por área de las validaciones especializadas y toma una decisión. Si se solicitan cambios, debe especificar las correcciones; estas aparecen al proveedor junto con el nuevo enlace de invitación para actualizar y reenviar el formulario.

Al guardar una decisión final, la integración opcional con ADM busca el proveedor por
RNC/`FiscalID`: crea o actualiza en decisiones aprobadas y lo marca inactivo si es
rechazado. Para actualizar, consulta primero `/api/Vendors/{ID}` y preserva los campos,
contactos y direcciones existentes que el portal no administra. El formulario envía
los campos con correspondencia directa; datos bancarios, fiscales y de debida
diligencia que no tienen campo equivalente se agregan a `Notes`. No se inventan IDs
para catálogos de ADM (por ejemplo, banco, moneda, país o condiciones de pago); los
lookups específicos deben validarse con ADM antes de asignar esos campos.

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
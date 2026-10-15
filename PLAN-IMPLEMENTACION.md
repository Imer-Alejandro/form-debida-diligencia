# Plan de implementación y contexto — Portal de Proveedores

> **Sánchez Business & Corp. · Formulario de Debida Diligencia**
> Documento de contexto técnico y hoja de ruta. Última actualización: 2026-10-15.

---

## 1. Resumen del proyecto

Plataforma de **registro de proveedores con debida diligencia** (bilingüe ES/EN) y
**panel de administración** con evaluación interna, gestión de riesgo, validaciones
especializadas y seguimiento de incidencias. Los documentos se suben a una
biblioteca de **Microsoft SharePoint/OneDrive**; las notificaciones salen por
**correo SMTP** corporativo 

| Área | Detalle |
| --- | --- |
| Framework | **Next.js 16.3.5** (App Router + Turbopack) |
| UI | React **19.2.8**, Tailwind CSS **v4** |
| Backend / Auth | **Supabase** (Postgres + Auth + RLS + RPC) |
| Correo | `nodemailer` (SMTP Microsoft 365) |
| QR | `qrcode` |
| Datos auxiliares | `country-state-city` (provincias/estados), `i18n-iso-countries` |
| Tests | `vitest` 3.2.7 |
| Despliegue | **Vercel** (cron `/api/cron/alerts` a las 13:00 UTC) |

> **Nota Next.js 16:** este proyecto usa APIs que difieren de versiones anteriores.
> El antiguo *middleware* ahora es **`src/proxy.ts`** (`export async function proxy`).
> **Antes de escribir código lee `node_modules/next/dist/docs/`** (regla declarada en `AGENTS.md`).

---

## 2. Entorno de trabajo (Windows / PowerShell)

El shell bloquea `npm.ps1` / `npx.ps1`. Usar rutas explícitas:

```powershell
# Dependencias / scripts
& "C:\Program Files\nodejs\npm.cmd" run dev
& "C:\Program Files\nodejs\npm.cmd" run build
& "C:\Program Files\nodejs\npm.cmd" run lint
& "C:\Program Files\nodejs\npm.cmd" run test
& "C:\Program Files\nodejs\npm.cmd" run setup:db

# Type-check directo
node node_modules/typescript/bin/tsc --noEmit
```

- No usar `&&` (PowerShell 5.1 no lo soporta) ni utilidades tipo `head`/`tail`/`wc`.
- Salida limpia de `tsc` = correcto.

### Comandos `package.json`

| Script | Acción |
| --- | --- |
| `dev` | Servidor de desarrollo |
| `build` | Build de producción |
| `start` | Sirve el build |
| `lint` | ESLint (debe quedar en **0 errores**) |
| `test` | `vitest run` — **64/64 pruebas** |
| `setup:db` | Crea tablas + usuario admin en Supabase |

---

## 3. Estructura del proyecto

```text
src/
├─ proxy.ts                      # "Proxy" Next 16 (ex-middleware): refresca sesión Supabase
├─ app/
│  ├─ page.tsx                   # Landing pública
│  ├─ registro/page.tsx          # Entrada al wizard
│  ├─ i/[token]/page.tsx         # Wizard del proveedor (por invitación)
│  ├─ interno/[token]/page.tsx   # Formulario para área solicitante (sin login)
│  ├─ admin/
│  │  ├─ login/page.tsx
│  │  └─ (panel)/                # dashboard, suppliers, suppliers/[id], suppliers/[id]/docs,
│  │                             # invitations, users, alerts, settings
│  └─ api/
│     ├─ admin/{evaluation,tags,invitations,users,request-changes,
│     │          internal-links,incidents,alerts/run,doc/[registrationId]/[docId]}
│     ├─ cron/alerts
│     ├─ internal/{context,submit}
│     ├─ onedrive/{auth-url,callback,status}
│     ├─ portal/status
│     ├─ registration/{draft,submit}
│     └─ upload/{session,finalize,list,[id]}
├─ components/
│  ├─ ui.tsx                     # Button, Badge, Field, Input, Select, Textarea, Logo, Modal
│  ├─ LangToggle.tsx
│  ├─ admin/                     # AdminShell, Dashboard, SuppliersFilters, SupplierDetail,
│  │                             # DocViewer, RiskMatrix, InternalReportsPanel, tones.ts,
│  │                             # InvitationList, NewInvitation, RunAlertsButton, UsersManager
│  ├─ wizard/                    # SupplierWizard, WizardShell, sections.tsx, DocumentsStep,
│  │                             # ReviewStep, SignaturePad
│  ├─ internal/InternalReportForm.tsx
│  └─ portal/                    # PortalHeader/Footer/Hero, ProcessSteps, RequirementsModal, …
└─ lib/
   ├─ types.ts                   # Modelo de datos + catálogo de documentos + helper
   ├─ risk.ts                    # Motor de riesgo + triggers
   ├─ process.ts                 # Validaciones especializadas, tokens, incidencias, servicio
   ├─ alerts.ts                  # Motor de alertas
   ├─ mail.ts                    # Envío SMTP
   ├─ onedrive.ts                # Integración Graph/SharePoint
   ├─ subdivisions.ts            # Provincias/estados lazy (country-state-city)
   ├─ upload-client.ts           # Subida con progreso (sesión → chunks → finalize)
   ├─ upload-policy.ts, countries.ts, crypto.ts, ids.ts, utils.ts
   └─ i18n/{es,en,index,server}.ts(x)   # Diccionarios + provider (cookie sb_lang)

supabase/schema.sql              # DDL, RLS y funciones RPC (984 líneas)
scripts/setup-db.mjs             # Ejecuta el schema + crea admin
vercel.json                      # Cron de alertas
```

---

## 4. Modelo de datos

### 4.1 Formulario del proveedor (`supplier_registrations.data`, secciones 1–11)

Definido en `src/lib/types.ts` (`SupplierData` / `emptyData()`):

1. **Identificación / Empresa** — tipo de proveedor, razón social, nombre comercial, RNC,
   registro mercantil, vencimiento, código exportador, fecha constitución, **nacionalidad (ISO)**
   + **provincia/estado**, dirección, teléfono/correo, web, actividad económica, bienes/servicios,
   ¿contratista?
2. **Contactos** — `ContactRow[]` (`role`, `name`, **`position`**, `phone`, `email`).
3. **Legal** — representante legal, accionistas, PEP, relación con SBC, empresas vinculadas.
4. **Fiscal** — comprobantes (NCF/e-CF/N/A), condición tributaria, TSS, retenciones, régimen especial.
5. **Bancario** — banco, titular, cédula/RNC, tipo cuenta, moneda, número, SWIFT, condiciones de pago,
   días crédito, % anticipo, **¿ofrece crédito?**, compañías del grupo.
6. **Experiencia** — años, cobertura, capacidad de suministro, tiempo de entrega, garantía, marcas.
7. **Referencias** — `ReferenceRow[]`.
8. **Cumplimiento** — 6 preguntas (`si`/`no` + explicación).
9. **Documentos** — `DocumentIntent[]` (`ref`, `checked`, `note`).
10. **Autorizaciones** — `string[]`.
11. **Firma** — firmante, cargo, consentimiento, fecha, `signatureDataUrl`.

> `nationality` es **código ISO** (RD = `"DO"`); la etiqueta visible es **"País"/"Country"**.
> El rol del contacto se guarda como clave y se traduce con `d.s2.roles`.

### 4.2 Evaluación interna (`supplier_registrations.evaluation`, secciones 12–13)

Definido en `src/lib/types.ts` (`Evaluation` / `emptyEvaluation()`):

- **Sección 12:** empresa/área solicitante, categoría de compra, monto anual estimado, tipo de revisión
  (`INICIAL|ACTUALIZACION|EVENTO|CAMBIO_BANCARIO`), `riskCategories` (por categoría), `redFlag`,
  `computedRisk`, **`specialized`** (finance/legal/technology) y 10 **verificaciones**
  (`rnc, mercantil, dgii, tss, bank, shareholder, pep, references, permits, conflicts`).
- **Sección 13:** decisión, condiciones, límites de compra, próxima actualización, firmas de revisión.

### 4.3 Tablas y funciones (Supabase)

**Tablas:** `app_config`, `invitations`, `supplier_registrations`, `registration_documents`,
`activity_log`, `supplier_alerts`, `supplier_evaluations`, `internal_access_tokens`,
`service_evaluations`, `supplier_incidents`.

**Funciones RPC relevantes:**
`rotate_config`, `get_registration_for_token`, `supplier_can_edit_registration`,
`save_registration_draft`, `should_auto_reject`, `submit_registration`,
`attach_registration_document`, `get_documents_for_token`, `set_updated_at`,
`get_alert_candidates`, `save_supplier_evaluation`, `get_internal_access_for_token`,
`submit_internal_response`, `get_portal_status`.

**RLS:** lectura/escritura por token de invitación para proveedores; lectura/escritura
solo para administradores en el resto. `app_config` es pública de lectura.

---

## 5. Reglas de negocio (contrato funcional)

### 5.1 Motor de riesgo (`src/lib/risk.ts`)

- **12 categorías** (`RISK_CATEGORIES`): `financial, legal, reputational, operational, quality,
  commercial, safety, technology, supplyChain, environmental*, conflictOfInterest, sbcHistory*`
  (\* = opcionales: pueden quedar sin clasificar).
- Escala: **Bajo = 1 / Medio = 2 / Alto = 3** (0 = sin clasificar).
- **Cálculo:** promedio de categorías aplicables con umbrales **< 1.5 = BAJO, < 2.5 = MEDIO,
  ≥ 2.5 = ALTO**, y **"regla de máximo"**: el resultado nunca es menor que la peor categoría.
- **Bandera roja** (`redFlag`) fuerza **ALTO**.
- Sin categorías evaluadas → `PENDIENTE`.

### 5.2 Triggers de validación especializada (`evaluateTriggers`)

| Área | Se dispara cuando… |
| --- | --- |
| **Finanzas** | Monto anual **≥ RD$1,000,000** **o** categoría financiera = Alto (3) |
| **Legal** | `redFlag` **o** categoría legal = Alto (3) **o** conflicto de interés ≥ Medio (2) |
| **Tecnología** | Categoría tecnología ≥ Medio (2) |

- `requiresEscalation` = ALTO o cualquier trigger activo.
- **Compras gestiona TODO el proceso**: los demás departamentos no influyen ni reciben correo.
  Un trigger deja el área especializada en `PENDIENTE`; Compras debe cerrarla
  (`APROBADA` / `CON_OBSERVACIONES`). Ver `specializedForTriggers` / `isSpecializationComplete`
  (`src/lib/process.ts`).

### 5.3 Rechazo automático

- `AUTO_REJECT_QUESTION_IDS = [1, 2, 3, 4, 6]` (fraude/corrupción, sanciones/inhabilitación,
  terminación por incumplimiento, litigios/insolvencia, beneficios indebidos).
- Si alguna se responde **"si"** → `should_auto_reject()` en `submit_registration` marca el registro
  como **`RECHAZADO`** con `risk_level = 'ALTO'`, **sin revisión manual**, y lo registra en `activity_log`.

### 5.4 Documentos (`DocumentRequirement` + `documentApplies`)

Obligatorios **A–K** (excepto **H**), opcionales **H, L, N, P**; **M** solo contratistas;
**O** para extranjeros cuando aplique. `documentApplies` decide por tipo de proveedor,
nacionalidad (≠ `DO` = extranjero) y condición de contratista. El wizard valida los
obligatorios aplicables antes de enviar (`validateStep(8)`).

### 5.5 Incidencias (`src/lib/process.ts`)

**Estados:** `ABIERTA, EN_SEGUIMIENTO, CORRECCION_SOLICITADA, RESUELTA, CERRADA`.

**Transiciones permitidas:**

```text
ABIERTA               → EN_SEGUIMIENTO, RESUELTA, CERRADA
EN_SEGUIMIENTO        → CORRECCION_SOLICITADA, RESUELTA, CERRADA
CORRECCION_SOLICITADA → EN_SEGUIMIENTO, RESUELTA, CERRADA
RESUELTA              → EN_SEGUIMIENTO, CERRADA
CERRADA               → (terminal)
```

**Acciones:** `NINGUNO, CORREGIR, SUSPENDER, DESHOMOLOGAR`. **Severidades:** `BAJA, MEDIA, ALTA`.

### 5.6 Tokens internos (área solicitante, sin login)

- Tipos: `FIRST_PURCHASE` (primera compra / evaluación de servicio) e `INCIDENT`.
- Estados: `PENDIENTE, USADO, EXPIRADO`. Se accede por `/interno/[token]`.
- APIs: `POST /api/admin/internal-links`, `GET /api/internal/context`, `POST /api/internal/submit`.

### 5.7 Alertas y recordatorios (`src/lib/alerts.ts`)

- **Canal primario: correo** (WhatsApp diferido).
- **Kinds:** `REGISTRY_EXPIRING`, `EXPORTER_CODE_EXPIRING`, `FORM_INCOMPLETE`.
- **Audiencias:** `SUPPLIER`, `PURCHASING`. `dedupe_key` único evita duplicados.
- Recordatorio a los 3 días + repetición semanal. Cron `/api/cron/alerts` (Bearer `CRON_SECRET`).
- Variables: `PURCHASING_EMAILS`, `CRON_SECRET`, `ALERTS_EXPIRY_DAYS=30,15,5`,
  `ALERTS_FORM_MIN_AGE_DAYS=3`, `ALERTS_AUTO_RENEW=true`.

### 5.8 Marca (branding)

- Canónico: **"Sánchez Business & Corp."** en logos, i18n, correos, layout, footers y README.
- **Excepción intencional:** `src/lib/onedrive.ts:8` conserva
  `"Due Diligence - Sanchez Business Corp"` (nombre de la carpeta raíz en SharePoint)
  para **no dejar huérfanos** los archivos ya subidos. Cambiarlo requiere decisión explícita.

---

## 6. Estado actual (qué ya está hecho)

- ✅ **Wizard (secciones 1–11)** bilingüe, validaciones, borrador y firma.
- ✅ **Subida inmediata de documentos con progreso** (`upload-client.ts`, `DocumentsStep.tsx`),
  sesión → chunks XHR con `onProgress` → `finalize`; botón *Reintentar* por archivo.
- ✅ **País → Provincia/Estado dependiente** (`subdivisions.ts`, `country-state-city`).
- ✅ **Contactos con Nombre + Cargo** (`position`).
- ✅ **Rechazo automático** (SQL + RPC) y `setup:db`.
- ✅ **Alertas/recordatorios** (tablas, motor, cron, botón admin, `vercel.json`).
- ✅ **Riesgo + validaciones especializadas** (`risk.ts`, `RiskMatrix.tsx`, `POST /api/admin/evaluation`,
  RPC `save_supplier_evaluation`).
- ✅ **Tokens internos + formulario de incidencias/servicio** (APIs, página `/interno/[token]`,
  `InternalReportsPanel`).
- ✅ **Vista 360° del detalle del proveedor** (`SupplierDetail.tsx`): tarjetas resumen por sección
  + **Modal** por sección (`SectionCards`, `SectionBody`), con `RiskMatrix` e `InternalReportsPanel`
  integrados. `Modal` añadido a `ui.tsx` (overlay, backdrop-blur, ESC, `role="dialog"`).
- ✅ **Vista 360° con acordeones:** los bloques pesados del detalle (documentos, datos de solicitud,
  riesgo, validaciones especializadas, verificación y decisión) son plegables (`Accordion`,
  `<details>` en documentos); `section13` abierto por defecto.
- ✅ **Integración ADM:** `src/lib/adm.ts` (upsert/PUT/POST por RNC, desactivación), rutas
  `POST /api/admin/adm/vendor` y sincronización automática en `POST /api/admin/evaluation`
  según decisión (APROBADO/APROBADO_CONDICIONES crea/actualiza; RECHAZADO solo desactiva si existe).
- ✅ **Verificación:** `tsc` limpio · `lint` 0 errores · **71/71 tests** · `build` OK.

---

## 7. Trabajo pendiente (desglosado)

### 7.1 🔴 Seguridad / credenciales (prioridad alta)

- [ ] **Rotar credenciales expuestas.** `.env.example`/`.env.local` contienen valores reales
  (SMTP pass, `ONEDRIVE_CLIENT_SECRET`, `ONEDRIVE_CONFIG_SECRET`, claves Supabase). `.env*` está
  en `.gitignore` (no está en git), pero **hay que rotar** lo que se compartió en el chat:
  - Contraseña del App Registration de Entra (client secret).
  - Contraseña de la cuenta SMTP.
  - Contraseña de **ADM (ERP)** — ver §7.4.
- [ ] Definir `CRON_SECRET` y `PURCHASING_EMAILS` en el entorno real.
- [ ] Revisar que ninguna clave real quede en un `.md`, `.example` o commit futuro.
- ✅ Se reemplazó `.env.example` por una plantilla sin credenciales reales y se permitió versionar
  únicamente ese archivo de ejemplo. La rotación de credenciales reales sigue pendiente.

### 7.2 🟠 Base de datos / despliegue

- [ ] Re-ejecutar `npm run setup:db` para aplicar `supplier_evaluations`,
  `save_supplier_evaluation`, `internal_access_tokens`, `service_evaluations`,
  `supplier_incidents` y RPCs de la sección 9 (si aún no se aplicó).
- [ ] Cargar variables en Vercel (`NEXT_PUBLIC_APP_URL` de producción, `CRON_SECRET`, etc.).
- [ ] Comprobar el cron de Vercel (`/api/cron/alerts`, 13:00 UTC).

### 7.3 🟠 Documentación / endurecimiento

- [ ] Decidir renombrado de la carpeta OneDrive (§5.8).
- ✅ Corregidos los imports/props sin usar y conectada la acción de requisitos en
  `PortalLookupHero.tsx`; ESLint queda sin advertencias.

### 7.4 🟠 Integración ADM (ERP)

- [ ] **Rotar la contraseña de ADM** (se expuso en el chat; no commitear).
- [x] Config: `ADM_BASE_URL` (default `https://api.admcloud.net/api`), `ADM_COMPANY`, `ADM_ROLE`,
  `ADM_APPID`, `ADM_USERNAME`/`ADM_PASSWORD` (Basic) o `ADM_TOKEN` (query param).
- [x] **Sincronización al guardar precalificación:** `APROBADO`/`APROBADO_CONDICIONES` → `upsert`
  (POST/PUT) a `/api/Vendors`; `RECHAZADO` → marca inactivo si existe, **no crea** el proveedor
  (`src/lib/adm.ts`, `POST /api/admin/evaluation` dispara sync).
- [ ] Definir valores de lookup en ADM (Moneda, Tipo cuenta, Banco, Categoría, País, etc.)
  antes del primer alta, y desplegar las variables ADM en Vercel.

### 7.5 🟡 Alertas — canal WhatsApp (diferido)

- [ ] Elegir proveedor de WhatsApp (WhatsApp Business Cloud API u otro) y diseño del canal.
- [ ] Extender el motor de alertas para una audiencia/canal `WHATSAPP` sin romper el `dedupe_key`.

### 7.6 🟡 Mejoras de UX / producto (backlog)

- ✅ Mejorada la accesibilidad del `Modal` con foco inicial, ciclo de foco, retorno de foco,
  Escape y asociación accesible con su título.
- [ ] Paginación/filtros avanzados en la lista de proveedores si el volumen crece.
- ✅ Traducidos el texto de guardado de etiquetas y la etiqueta accesible de limpiar búsqueda en
  `SupplierDetail` / `PortalLookupHero`.
- ✅ Añadido al detalle del proveedor el **histórico de validaciones especializadas por área**,
  usando snapshots existentes de `supplier_evaluations` (estado anterior/nuevo, responsable,
  fecha y notas). No requiere nueva migración; muestra aviso si la tabla no está disponible.

---

## 8. Convenciones de código

- **Idioma:** todo texto visible pasa por i18n (`src/lib/i18n/es.ts`, `en.ts`); nueva clave en
  **ambos** diccionarios. No formatear automáticamente la entrada del usuario (mayúsculas/espaciado
  solo en etiquetas y textos).
- **Estilos:** tokens de `globals.css` (`navy`, `ink`, `bone`, `success/warning/danger`, etc.);
  componentes de `src/components/ui.tsx`; tonos por estado en `src/components/admin/tones.ts`.
- **Sin comentarios** en el código salvo petición explícita.
- **Lógica testeable** en `src/lib/*` con pruebas `*.test.ts` (vitest, entorno node,
  alias `@ → src`). La UI no se testea con vitest todavía.
- **No commitear** salvo petición explícita.

---

## 9. Checklist de verificación (antes de dar por cerrado un cambio)

```powershell
node node_modules/typescript/bin/tsc --noEmit
& "C:\Program Files\nodejs\npm.cmd" run lint     # 0 errores
& "C:\Program Files\nodejs\npm.cmd" run test     # 64/64
& "C:\Program Files\nodejs\npm.cmd" run build
```

---

## 10. Bloqueos y decisiones abiertas

| # | Tema | Decisión / acción necesaria |
| --- | --- | --- |
| 1 | Credenciales ADM/SMTP/Entra expuestas | **Rotar** y confirmar que no se commitean |
| 2 | `setup:db` pendiente de re-ejecutar | Aplicar migraciones de sección 9 |
| 3 | `PURCHASING_EMAILS` / `CRON_SECRET` | Definir en Vercel |
| 4 | Carpeta raíz OneDrive | ¿Renombrar o conservar el nombre actual? |
| 5 | Proveedor WhatsApp | Elegir y diseñar integración |
| 6 | Contrato real de desactivación en ADM | Validar contra el ERP el `PUT /api/Vendors` (`Inactive=true`) ya implementado |

# 🏗 ARCHITECTURE — Sistema de Petición de Documentación

> **Documento de Arquitectura Técnica**
>
> Versión: 1.0 · Fecha: 2026-02-19 · Estado: Diseño

---

## 📑 Índice

- [Visión general de la arquitectura](#1-visión-general-de-la-arquitectura)
- [Diagrama de arquitectura de alto nivel](#2-diagrama-de-arquitectura-de-alto-nivel)
- [Componentes del sistema](#3-componentes-del-sistema)
- [Modelo de datos](#4-modelo-de-datos)
- [API — Endpoints principales](#5-api--endpoints-principales)
- [Flujos de Power Automate — Diseño detallado](#6-flujos-de-power-automate--diseño-detallado)
- [Autenticación y autorización](#7-autenticación-y-autorización)
- [Almacenamiento y archivado](#8-almacenamiento-y-archivado)
- [Comunicación entre componentes](#9-comunicación-entre-componentes)
- [Estados y máquinas de estado](#10-estados-y-máquinas-de-estado)
- [Decisiones de arquitectura (ADR)](#11-decisiones-de-arquitectura-adr)
- [Alternativas evaluadas](#12-alternativas-evaluadas)
- [Requisitos no funcionales](#13-requisitos-no-funcionales)
- [Plan de despliegue](#14-plan-de-despliegue)
- [Observabilidad y monitoreo](#15-observabilidad-y-monitoreo)
- [Riesgos y mitigación](#16-riesgos-y-mitigación)

---

## 1. Visión general de la arquitectura

### Principio fundamental

> **Power Automate actúa como "proxy autorizado"** hacia el ecosistema Microsoft 365, eliminando la necesidad de permisos de IT global (Azure AD App Registration, Graph API, etc.).

### Estilo arquitectónico

El sistema sigue una arquitectura de **tres capas con intermediario de automización**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            USUARIOS                                             │
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────────┐    ┌───────────────────────┐  │
│  │   Emisor          │    │   Destinatario        │    │   Admin / Auditor    │  │
│  │   (Responsable    │    │   (Manager / Socio)   │    │   (Supervisor)       │  │
│  │    del control)   │    │                        │    │                      │  │
│  └────────┬─────────┘    └──────────┬─────────────┘    └──────────┬──────────┘  │
│           │  Login app               │ Enlace tokenizado          │ Login app   │
└───────────┼──────────────────────────┼────────────────────────────┼──────────────┘
            │                          │                            │
            ▼                          ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE PRESENTACIÓN                                    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        Frontend (SPA)                                       │ │
│  │  • Panel de campañas y requests                                             │ │
│  │  • Formularios de creación y configuración                                  │ │
│  │  • Portal de subida para destinatarios                                     │ │
│  │  • Dashboard con KPIs y reportes                                            │ │
│  └────────────────────────────────┬────────────────────────────────────────────┘ │
└───────────────────────────────────┼─────────────────────────────────────────────┘
                                    │ REST API (HTTPS)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAPA DE NEGOCIO                                         │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     Backend (API Server)                                     │ │
│  │                                                                             │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │ │
│  │  │  Campaign     │ │  Request     │ │  Evidence    │ │  Auth & Token    │   │ │
│  │  │  Service      │ │  Service     │ │  Service     │ │  Service         │   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘   │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │ │
│  │  │  Reminder     │ │  Audit Log   │ │  Report      │ │  Notification    │   │ │
│  │  │  Engine       │ │  Service     │ │  Generator   │ │  Dispatcher      │   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘   │ │
│  └────────────┬────────────────────────────────┬──────────────────────────────┘ │
└───────────────┼────────────────────────────────┼────────────────────────────────┘
                │ SQL                             │ HTTP Webhooks
                ▼                                 ▼
┌──────────────────────────┐    ┌─────────────────────────────────────────────────┐
│   CAPA DE DATOS           │    │         CAPA DE INTEGRACIÓN                     │
│                           │    │                                                 │
│  ┌─────────────────────┐ │    │  ┌─────────────────────────────────────────────┐ │
│  │    PostgreSQL        │ │    │  │           Power Automate                    │ │
│  │                      │ │    │  │                                             │ │
│  │  • Campaigns         │ │    │  │  Flow 1: Send Initial Requests    (HTTP)   │ │
│  │  • Requests          │ │    │  │  Flow 2: Send OTP                 (HTTP)   │ │
│  │  • Evidence Items    │ │    │  │  Flow 3: Reminders & Escalation   (Sched)  │ │
│  │  • Submissions       │ │    │  │  Flow 4: Archive & Close          (HTTP)   │ │
│  │  • Audit Logs        │ │    │  │                                             │ │
│  │  • Users / Tokens    │ │    │  └──────────────────┬──────────────────────────┘ │
│  └─────────────────────┘ │    │                      │ Outlook / SharePoint       │
97: └──────────────────────────┘    │                      ▼ connectors                │
                                │  ┌─────────────────────────────────────────────┐ │
                                │  │         Microsoft 365                        │ │
                                │  │                                             │ │
                                │  │  • Outlook (envío de correos)               │ │
                                │  │  • SharePoint (almacenamiento documental)    │ │
                                │  │  • OneDrive (backup opcional)               │ │
                                │  └─────────────────────────────────────────────┘ │
                                └─────────────────────────────────────────────────┘
```

---

## 2. Diagrama de arquitectura de alto nivel

### Flujo de datos principal

```
                        ┌────────────────────────────┐
                        │    EMISOR (Responsable)     │
                        │    Crea campaña y requests  │
                        └─────────────┬──────────────┘
                                      │
                               ┌──────▼──────┐
                               │   BACKEND    │
                               │  API Server  │
                               └──┬───────┬──┘
                                  │       │
                    ┌─────────────▼─┐   ┌─▼─────────────────┐
                    │  PostgreSQL   │   │  Power Automate    │
                    │  (Datos)      │   │  (Correos/Archivos)│
                    └───────────────┘   └────┬──────────┬───┘
                                             │          │
                                   ┌─────────▼──┐  ┌───▼────────────┐
                                   │  Outlook    │  │  SharePoint    │
                                   │  (Correos)  │  │  (Evidencias)  │
                                   └──────┬──────┘  └────────────────┘
                                          │
                              ┌───────────▼──────────────┐
                              │  DESTINATARIO (Manager)   │
                              │  Recibe correo → accede   │
                              │  por enlace tokenizado    │
                              │  → sube documentación     │
                              └──────────────────────────┘
```

---

## 3. Componentes del sistema

### 3.1 Frontend (SPA)

**Responsabilidad:** Interfaz de usuario para emisores, destinatarios y supervisores.

| Módulo | Descripción | Usuarios |
|---|---|---|
| **CampaignManager** | Creación, edición y visualización de campañas | Emisor |
| **RequestBuilder** | Asignación de destinatarios y evidencias (Modo A/B) | Emisor |
| **RequestPreview** | Revisión y ajuste antes del envío | Emisor |
| **SubmitPortal** | Portal de subida de documentación (acceso tokenizado) | Destinatario |
| **ReviewPanel** | Validación/rechazo de evidencias recibidas | Emisor |
| **Dashboard** | KPIs, estadísticas, timeline y exportación | Emisor, Supervisor |
| **AuditViewer** | Consulta del registro inmutable de eventos | Supervisor, Auditor |

**Tecnologías recomendadas:**

```
React 18+ / Next.js 14+
├── UI Library: shadcn/ui o Ant Design (componentes profesionales)
├── State Management: Zustand o React Query
├── Routing: React Router / Next.js App Router
├── Forms: React Hook Form + Zod validation
├── Charts: Recharts o Nivo (dashboard KPIs)
├── Tables: TanStack Table (listas de campaigns/requests)
├── File Upload: react-dropzone
└── i18n: react-intl / next-intl (multi-idioma futuro)
```

### 3.2 Backend (API Server)

**Responsabilidad:** Lógica de negocio, gestión de estados, tokens, y orquestación de flujos.

| Servicio | Responsabilidad |
|---|---|
| **CampaignService** | CRUD de campañas, cambio de estados, políticas |
| **RequestService** | Generación, envío, subsanación y cierre de requests |
| **EvidenceService** | Gestión del ciclo de vida de cada evidencia |
| **SubmissionService** | Registro de envíos parciales y completos |
| **TokenService** | Generación, firma y validación de tokens JWT/HMAC |
| **OTPService** | Generación, envío y verificación de códigos OTP |
| **ReminderEngine** | Cálculo de recordatorios pendientes y niveles de escalado |
| **NotificationDispatcher** | Comunicación con Power Automate vía HTTP webhooks |
| **AuditLogService** | Registro inmutable de todos los eventos del sistema |
| **ReportGenerator** | Generación de informes de auditoría (PDF/Excel) |

**Tecnologías recomendadas:**

```
Node.js 20 LTS + Express / NestJS
├── ORM: Prisma o TypeORM
├── Validación: Zod / class-validator
├── Auth Tokens: jsonwebtoken (JWT) + crypto (HMAC)
├── HTTP Client: axios (llamadas a Power Automate)
├── PDF Generation: PDFKit / Puppeteer
├── Rate Limiting: express-rate-limit
├── Logging: Winston / Pino
├── Testing: Jest + Supertest
└── API Docs: Swagger / OpenAPI 3.0
```

### 3.3 Base de datos (PostgreSQL)

**Responsabilidad:** Almacenamiento persistente de todos los datos del sistema.

**Elección de PostgreSQL:**
- Soporte nativo de JSONB para datos flexibles (instrucciones, metadatos)
- Transacciones ACID para integridad del registro de auditoría
- Escalabilidad horizontal con read replicas
- Soporte de funciones de ventana para cálculo de KPIs
- Extensiones como `pgcrypto` para tokens

### 3.4 Power Automate (Capa de integración)

**Responsabilidad:** Puente autorizado entre la aplicación y Microsoft 365.

**¿Por qué Power Automate?**
- ✅ No requiere registro de aplicación en Azure AD
- ✅ Utiliza las credenciales del usuario que crea el flujo
- ✅ HTTP trigger permite recibir llamadas API sin más configuración
- ✅ Conectores nativos de Outlook y SharePoint
- ✅ Ejecución programada para recordatorios diarios
- ⚠️ Limitación: el correo se envía desde la cuenta del creador del flujo (o una shared mailbox)

### 3.5 SharePoint (Almacenamiento documental)

**Responsabilidad:** Almacenamiento estructurado y persistente de evidencias y reportes.

---

## 4. Modelo de datos

### 4.1 Diagrama Entidad-Relación

```
┌──────────────────────┐     ┌──────────────────────────┐
│      CAMPAIGN         │     │         USER              │
├──────────────────────┤     ├──────────────────────────┤
│ PK campaign_id (UUID)│     │ PK user_id (UUID)         │
│    name               │     │    email                  │
│    control_code        │     │    display_name           │
│    description         │     │    role (enum)            │
│ FK owner_user_id       │◄────│    department             │
│ FK backup_user_id      │     │    created_at             │
│    start_date          │     └──────────────────────────┘
│    end_date            │
│    reminder_policy     │     ┌──────────────────────────┐
│    escalation_policy   │     │     EVIDENCE_TEMPLATE     │
│    email_template      │     ├──────────────────────────┤
│    status (enum)       │     │ PK template_id (UUID)     │
│    created_at          │     │    name                   │
│    updated_at          │     │    category               │
├──────────────────────┤     │    type (enum)             │
│ 1:N → REQUEST         │     │    default_instructions   │
└──────────────────────┘     │    is_global               │
         │                    └──────────────────────────┘
         │ 1:N
         ▼
┌──────────────────────────┐
│        REQUEST            │
├──────────────────────────┤
│ PK request_id (UUID)      │
│ FK campaign_id             │
│    recipient_email         │
│    recipient_name          │
│    cc_emails (JSONB)       │
│    delegate_email          │
│    deadline                │
│    status (enum)           │
│    token_hash              │
│    token_expires_at        │
│    reminder_count          │
│    last_reminder_at        │
│    escalation_level        │
│    created_at              │
│    updated_at              │
│    closed_at               │
├──────────────────────────┤
│ 1:N → EVIDENCE_ITEM       │
│ 1:N → SUBMISSION           │
└──────────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────────┐     ┌──────────────────────────┐
│     EVIDENCE_ITEM         │     │       SUBMISSION         │
├──────────────────────────┤     ├──────────────────────────┤
│ PK evidence_id (UUID)     │     │ PK submission_id (UUID)  │
│ FK request_id              │     │ FK request_id             │
│ FK template_id (nullable)  │     │    submitted_by_email     │
│    name                    │     │    submitted_at           │
│    type (enum)             │     │    ip_address             │
│    is_mandatory            │     │    user_agent             │
│    instructions (TEXT)     │     │    notes                  │
│    status (enum)           │     └──────────────────────────┘
│    rejection_reason        │              │
│    validated_by            │              │ 1:N
│    validated_at            │              ▼
│    file_sp_path            │     ┌──────────────────────────┐
│    file_sp_url             │     │     SUBMISSION_FILE      │
│    file_size_bytes         │     ├──────────────────────────┤
│    file_mime_type          │     │ PK file_id (UUID)         │
│    created_at              │     │ FK submission_id           │
│    updated_at              │     │ FK evidence_id             │
└──────────────────────────┘     │    original_filename       │
                                  │    stored_filename          │
                                  │    mime_type                │
┌──────────────────────────┐     │    size_bytes               │
│       AUDIT_LOG           │     │    sp_path                  │
├──────────────────────────┤     │    sp_url                   │
│ PK log_id (UUID)          │     │    uploaded_at              │
│    entity_type (enum)     │     └──────────────────────────┘
│    entity_id (UUID)       │
│    action (enum)          │
│    actor_email            │
│    actor_ip               │
│    timestamp              │
│    details (JSONB)        │
│    campaign_id (denorm.)  │
└──────────────────────────┘
```

### 4.2 Enumeraciones (Enums)

#### Campaign Status
```
DRAFT → ACTIVE → COMPLETED → ARCHIVED
```

#### Request Status
```
DRAFT → SENT → IN_PROGRESS → PARTIAL → SUBMITTED → REVIEW
  → READY_TO_CLOSE → CLOSED
  → OVERDUE (automático según deadline)
```

#### Evidence Status
```
PENDING → SUBMITTED → VALIDATED → REJECTED
  (REJECTED puede volver a PENDING vía subsanación)
```

#### Audit Actions
```
CAMPAIGN_CREATED, CAMPAIGN_UPDATED, CAMPAIGN_ACTIVATED, CAMPAIGN_COMPLETED
REQUEST_CREATED, REQUEST_SENT, REQUEST_REMINDER_SENT, REQUEST_ESCALATED
REQUEST_CLOSED
EVIDENCE_SUBMITTED, EVIDENCE_VALIDATED, EVIDENCE_REJECTED
SUBMISSION_CREATED
TOKEN_GENERATED, TOKEN_VALIDATED, TOKEN_EXPIRED
OTP_SENT, OTP_VALIDATED, OTP_FAILED
FILE_UPLOADED, FILE_ARCHIVED_SP
```

### 4.3 Índices recomendados

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_request_campaign ON request(campaign_id);
CREATE INDEX idx_request_status ON request(status);
CREATE INDEX idx_request_deadline ON request(deadline);
CREATE INDEX idx_request_recipient ON request(recipient_email);
CREATE INDEX idx_evidence_request ON evidence_item(request_id);
CREATE INDEX idx_evidence_status ON evidence_item(status);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_campaign ON audit_log(campaign_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- Recordatorios pendientes
CREATE INDEX idx_request_reminder ON request(status, deadline, reminder_count)
  WHERE status IN ('SENT', 'IN_PROGRESS', 'PARTIAL', 'OVERDUE');
```

---

## 5. API — Endpoints principales

### 5.1 Campaigns

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/campaigns` | Crear nueva campaña |
| `GET` | `/api/campaigns` | Listar campañas (filtros, paginación) |
| `GET` | `/api/campaigns/:id` | Detalle de una campaña |
| `PUT` | `/api/campaigns/:id` | Actualizar campaña (solo en DRAFT) |
| `POST` | `/api/campaigns/:id/activate` | Activar campaña |
| `GET` | `/api/campaigns/:id/dashboard` | KPIs y estadísticas de la campaña |
| `GET` | `/api/campaigns/:id/report` | Descargar informe completo |

### 5.2 Requests

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/campaigns/:id/requests` | Crear requests (bulk) |
| `GET` | `/api/campaigns/:id/requests` | Listar requests de una campaña |
| `GET` | `/api/requests/:id` | Detalle de un request |
| `PUT` | `/api/requests/:id` | Actualizar request (solo en DRAFT) |
| `POST` | `/api/requests/:id/send` | Enviar solicitud (trigger Power Automate) |
| `POST` | `/api/requests/:id/close` | Cerrar solicitud |
| `GET` | `/api/requests/pending-reminders` | Requests que necesitan recordatorio |
| `POST` | `/api/requests/:id/reminder-sent` | Registrar recordatorio enviado |

### 5.3 Evidence Items

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/requests/:id/evidences` | Listar evidencias de un request |
| `POST` | `/api/evidences/:id/validate` | Validar una evidencia |
| `POST` | `/api/evidences/:id/reject` | Rechazar una evidencia (motivo requerido) |

### 5.4 Portal de destinatarios (acceso tokenizado)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/submit/:token` | Acceder al portal de subida |
| `POST` | `/api/submit/:token/verify-otp` | Verificar OTP |
| `POST` | `/api/submit/:token/upload` | Subir archivos / texto |
| `GET` | `/api/submit/:token/status` | Ver estado actual de evidencias |

### 5.5 Auth & Admin

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Login (email + password o OTP) |
| `POST` | `/api/auth/refresh` | Renovar token de sesión |
| `GET` | `/api/audit-logs` | Consultar registro de auditoría |
| `GET` | `/api/users` | Listar usuarios del sistema |

---

## 6. Flujos de Power Automate — Diseño detallado

### 6.1 Flow 1 — Envío de solicitudes iniciales

```
┌─────────────────────────────────────────────────┐
│  Trigger: HTTP Request (POST)                    │
│  URL: https://prod-xx...logic.azure.com/...     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Input Schema:                                   │
│  {                                               │
│    "to": "manager@firma.com",                    │
│    "cc": "delegado@firma.com",                   │
│    "subject": "[HR-FCTRL-1] Solicitud REQ-001", │
│    "body_html": "<html>...",                    │
│    "importance": "High",                         │
│    "request_id": "REQ-001",                      │
│    "control_code": "HR-FCTRL-1"                  │
│  }                                               │
│                                                  │
│  Actions:                                        │
│  1. Parse JSON                                   │
│  2. Send an email (V2) — Outlook connector       │
│     • From: controlinterno@firma.com             │
│       (shared mailbox o cuenta del creador)      │
│     • To: @{triggerBody()?['to']}               │
│     • CC: @{triggerBody()?['cc']}               │
│     • Subject: @{triggerBody()?['subject']}     │
│     • Body: @{triggerBody()?['body_html']}      │
│     • Importance: @{triggerBody()?['importance']}│
│  3. Response (200 OK)                            │
│     { "status": "sent", "messageId": "..." }    │
│                                                  │
│  Error Handling:                                 │
│  • Scope try/catch                               │
│  • On failure: Response 500 con error detail     │
│  • Retry policy: 3 intentos, exponential backoff │
└─────────────────────────────────────────────────┘
```

### 6.2 Flow 2 — Envío de OTP (opcional)

```
┌─────────────────────────────────────────────────┐
│  Trigger: HTTP Request (POST)                    │
├─────────────────────────────────────────────────┤
│  Input: { "email": "...", "otp_code": "482917" }│
│                                                  │
│  Actions:                                        │
│  1. Send email con plantilla OTP                 │
│     Subject: Código de verificación              │
│     Body: Su código es: {{otp_code}}             │
│           Válido durante 10 minutos.             │
│  2. Response 200 OK                              │
└─────────────────────────────────────────────────┘
```

### 6.3 Flow 3 — Recordatorios y escalado

```
┌─────────────────────────────────────────────────┐
│  Trigger: Recurrence (daily, 08:00 CET)          │
├─────────────────────────────────────────────────┤
│                                                  │
│  Actions:                                        │
│  1. HTTP GET → Backend API                       │
│     /api/requests/pending-reminders              │
│     Returns: array of requests needing reminder  │
│                                                  │
│  2. Apply to each (request):                     │
│     a. Switch on escalation_level:               │
│        ┌───────────────────────────────────────┐ │
│        │ Level 1: To = recipient only           │ │
│        │ Level 2: To = recipient, CC = delegate │ │
│        │ Level 3: To = recipient, CC = socio    │ │
│        └───────────────────────────────────────┘ │
│     b. Send Email (V2) — reminder template       │
│     c. HTTP POST → Backend API                   │
│        /api/requests/{id}/reminder-sent          │
│        Body: { "level": X, "sent_at": "..." }   │
│                                                  │
│  Frequency: Every day at 08:00 CET               │
│  Concurrency: 1 (sequential execution)           │
└─────────────────────────────────────────────────┘
```

### 6.4 Flow 4 — Archivado de evidencias

```
┌─────────────────────────────────────────────────┐
│  Trigger: HTTP Request (POST)                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  Input Schema:                                   │
│  {                                               │
│    "file_content_base64": "...",                  │
│    "file_name": "Balance_2025.xlsx",             │
│    "folder_path": "/HR-FCTRL-1/CAMP-001/...",   │
│    "metadata": {                                 │
│      "request_id": "REQ-001",                    │
│      "evidence_id": "EV-003",                    │
│      "uploaded_by": "jgarcia@firma.com",         │
│      "uploaded_at": "2026-02-19T14:30:00Z"       │
│    }                                             │
│  }                                               │
│                                                  │
│  Actions:                                        │
│  1. Create folder (if not exists) — SharePoint   │
│     Site: tuempresa.sharepoint.com/sites/...     │
│     Path: /Evidencias/{{folder_path}}            │
│                                                  │
│  2. Create file — SharePoint connector           │
│     Folder: /Evidencias/{{folder_path}}          │
│     File Name: {{file_name}}                     │
│     Content: base64ToBinary(file_content_base64) │
│                                                  │
│  3. Update file properties — SharePoint          │
│     Set metadata columns if configured           │
│                                                  │
│  4. Response 200 OK                              │
│     {                                            │
│       "status": "archived",                      │
│       "sp_path": "/Evidencias/...",              │
│       "sp_url": "https://...",                   │
│       "sp_item_id": "..."                        │
│     }                                            │
└─────────────────────────────────────────────────┘
```

---

## 7. Autenticación y autorización

### 7.1 Modelo de autenticación dual

El sistema maneja **dos tipos de acceso** con mecanismos diferentes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTENTICACIÓN DUAL                            │
├──────────────────────────────┬──────────────────────────────────┤
│         EMISOR (interno)     │      DESTINATARIO (enlace)       │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│  Email + Password            │  Token firmado en URL             │
│  (o magic link por email)    │  + OTP por correo (opcional)      │
│                              │                                  │
│  Session: JWT (httpOnly      │  Session: token de sesión         │
│  cookie, 8h expiry)         │  temporal (30 min)               │
│                              │                                  │
│  Acceso: todas las           │  Acceso: solo SU request         │
│  campañas propias +          │  específico (lectura + subida)   │
│  admin si corresponde       │                                  │
│                              │                                  │
│  RBAC: Owner, Admin,         │  Permisos: Upload, View          │
│  Viewer                      │  (sin edición de config)         │
│                              │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

### 7.2 Generación de tokens para destinatarios

```javascript
// Pseudocódigo — Generación de token firmado
function generateRequestToken(requestId, recipientEmail) {
  const payload = {
    sub: requestId,
    email: recipientEmail,
    iat: Date.now(),
    exp: Date.now() + (TOKEN_EXPIRY_DAYS * 86400000),
    jti: crypto.randomUUID()  // Identificador único del token
  };
  
  return jwt.sign(payload, APP_SECRET_KEY, { algorithm: 'HS256' });
}

// URL de acceso para el destinatario
const accessUrl = `${APP_BASE_URL}/submit/${token}`;
```

### 7.3 Flujo OTP (opcional pero recomendado)

```
Destinatario            Backend              Power Automate        Outlook
     │                     │                      │                  │
     │  GET /submit/:token │                      │                  │
     │────────────────────>│                      │                  │
     │                     │ valida token          │                  │
     │                     │ genera OTP (6 dígitos)│                  │
     │                     │                      │                  │
     │  "Ingrese OTP"      │ POST /send-otp       │                  │
     │<────────────────────│─────────────────────>│ Send Email       │
     │                     │                      │─────────────────>│
     │                     │                      │                  │ → inbox
     │  POST /verify-otp   │                      │                  │
     │────────────────────>│                      │                  │
     │                     │ verifica OTP          │                  │
     │  ✅ Acceso concedido │                      │                  │
     │<────────────────────│                      │                  │
```

### 7.4 Roles y permisos (RBAC)

| Rol | Crear campañas | Ver campañas | Enviar requests | Validar evidencias | Admin |
|---|---|---|---|---|---|
| **Owner** | ✅ | Propias | ✅ | ✅ | ❌ |
| **Admin** | ✅ | Todas | ✅ | ✅ | ✅ |
| **Viewer** | ❌ | Asignadas | ❌ | ❌ | ❌ |
| **Destinatario** | ❌ | Solo su request | ❌ | ❌ | ❌ |

---

## 8. Almacenamiento y archivado

### 8.1 Estrategia de almacenamiento dual

```
┌──────────────────────────────────────────────────────────────────┐
│                    ALMACENAMIENTO DUAL                            │
├──────────────────────────────┬───────────────────────────────────┤
│    TEMPORAL (Backend)         │    PERMANENTE (SharePoint)        │
├──────────────────────────────┼───────────────────────────────────┤
│                              │                                   │
│  • Archivos subidos se       │  • Al validar evidencia, se       │
│    almacenan en disco/blob   │    archiva en SharePoint vía      │
│    temporal del servidor     │    Power Automate Flow 4          │
│                              │                                   │
│  • Máximo 90 días en temp    │  • Retención según política       │
│                              │    corporativa (7 años+)          │
│  • Se borran tras archivo    │                                   │
│    exitoso en SharePoint     │  • Estructura estandarizada       │
│                              │    por control/campaña/request    │
│  • Backup: Azure Blob        │                                   │
│    Storage (opcional)        │  • Acceso auditable y versionado  │
│                              │                                   │
└──────────────────────────────┴───────────────────────────────────┘
```

### 8.2 Estructura de carpetas en SharePoint

```
📁 Site: /sites/EvidenciasControl
└── 📚 Library: Evidencias
    ├── 📁 HR-FCTRL-1/                              ← Control code
    │   ├── 📁 CAMP-2026-001_Revisión_Anual/        ← Campaign
    │   │   ├── 📁 REQ-001_jgarcia/                 ← Request
    │   │   │   ├── 📄 EV001_Balance_Anual_2025.xlsx
    │   │   │   ├── 📄 EV002_Acta_Reunión_Dic.pdf
    │   │   │   ├── 📄 EV003_Acceso_SAP_screenshot.png
    │   │   │   └── 📄 _metadata.json
    │   │   ├── 📁 REQ-002_mlopez/
    │   │   │   └── ...
    │   │   ├── 📄 Campaign_Report_CAMP-2026-001.pdf
    │   │   └── 📄 Campaign_Summary.xlsx
    │   └── 📁 CAMP-2026-002_Control_Trimestral/
    │       └── ...
    ├── 📁 FIN-CTRL-3/
    │   └── ...
    └── 📁 _TEMPLATES/                              ← Plantillas email
        ├── 📄 initial_request.html
        ├── 📄 reminder_l1.html
        ├── 📄 reminder_l2.html
        ├── 📄 reminder_l3.html
        └── 📄 close_notification.html
```

### 8.3 Metadatos de archivo (_metadata.json)

```json
{
  "request_id": "REQ-001",
  "campaign_id": "CAMP-2026-001",
  "control_code": "HR-FCTRL-1",
  "recipient": "jgarcia@firma.com",
  "evidences": [
    {
      "evidence_id": "EV001",
      "name": "Balance Anual 2025",
      "file": "EV001_Balance_Anual_2025.xlsx",
      "status": "VALIDATED",
      "submitted_at": "2026-02-15T10:30:00Z",
      "validated_at": "2026-02-16T09:00:00Z",
      "validated_by": "asmith@firma.com"
    }
  ],
  "timeline": {
    "sent_at": "2026-02-10T08:00:00Z",
    "first_submission_at": "2026-02-12T14:22:00Z",
    "completed_at": "2026-02-15T10:30:00Z",
    "closed_at": "2026-02-16T09:15:00Z"
  },
  "reminders_sent": 1
}
```

---

## 9. Comunicación entre componentes

### 9.1 Protocolo de comunicación

```
Frontend ←──── HTTPS/REST (JSON) ────→ Backend
Backend  ←──── HTTPS/Webhook (JSON) ──→ Power Automate
Power Automate ←── Outlook Connector ──→ Mailbox
Power Automate ←── SharePoint Connector → SharePoint
```

### 9.2 Payload de ejemplo — Backend → Power Automate (Flow 1)

```json
{
  "to": "jgarcia@firma.com",
  "cc": "delegado@firma.com",
  "subject": "[HR-FCTRL-1] Solicitud de documentación REQ-001",
  "body_html": "<html><body>...<a href='https://app.firma.com/submit/eyJhbGci...'>Acceder a la solicitud</a>...</body></html>",
  "importance": "High",
  "request_id": "REQ-001",
  "control_code": "HR-FCTRL-1"
}
```

### 9.3 Callback — Power Automate → Backend (Flow 3 reminder)

```json
POST /api/requests/REQ-001/reminder-sent
{
  "level": 2,
  "sent_at": "2026-02-19T08:00:00Z",
  "sent_to": "jgarcia@firma.com",
  "cc": "delegado@firma.com"
}
```

---

## 10. Estados y máquinas de estado

### 10.1 Máquina de estados — Campaign

```
                    ┌──────────┐
         create ──> │  DRAFT   │
                    └────┬─────┘
                         │ activate
                         ▼
                    ┌──────────┐
                    │  ACTIVE  │
                    └────┬─────┘
                         │ all requests closed
                         ▼
                    ┌──────────────┐
                    │  COMPLETED   │
                    └────┬─────────┘
                         │ archive (manual)
                         ▼
                    ┌──────────┐
                    │ ARCHIVED │
                    └──────────┘
```

### 10.2 Máquina de estados — Request

```
               ┌──────────┐
    create ──> │  DRAFT   │
               └────┬─────┘
                    │ send
                    ▼
               ┌──────────┐      ┌───────────┐
               │   SENT   │─────>│  OVERDUE  │ (si deadline < now)
               └────┬─────┘      └───────────┘
                    │ first upload
                    ▼
               ┌──────────────┐
               │ IN_PROGRESS  │ ←──────────────────────────────┐
               └────┬─────────┘                                 │
                    │ partial upload                             │
                    ▼                                            │
               ┌──────────┐                                     │
               │ PARTIAL  │                                     │
               └────┬─────┘                                     │
                    │ all items submitted                        │
                    ▼                                            │
               ┌──────────────┐                                 │
               │  SUBMITTED   │                                 │
               └────┬─────────┘                                 │
                    │ under review                              │
                    ▼                                            │
               ┌──────────┐      reject    ┌──────────────┐    │
               │  REVIEW  │───────────────>│ SUBSANACIÓN  │────┘
               └────┬─────┘                └──────────────┘
                    │ all mandatory validated
                    ▼
               ┌──────────────────┐
               │ READY_TO_CLOSE   │
               └────┬─────────────┘
                    │ confirm close
                    ▼
               ┌──────────┐
               │  CLOSED  │
               └──────────┘
```

### 10.3 Máquina de estados — Evidence Item

```
               ┌──────────┐
    create ──> │ PENDING  │ <────────────┐
               └────┬─────┘              │
                    │ upload              │ subsanación
                    ▼                     │
               ┌──────────────┐          │
               │  SUBMITTED   │          │
               └────┬─────────┘          │
                    │                    │
              ┌─────┴──────┐             │
              ▼            ▼             │
        ┌───────────┐ ┌──────────┐      │
        │ VALIDATED │ │ REJECTED │──────┘
        └───────────┘ └──────────┘
```

---

## 11. Decisiones de arquitectura (ADR)

### ADR-001: Power Automate como capa de integración con Microsoft 365

**Contexto:** La organización no dispone de permisos de Azure AD para registrar aplicaciones ni acceder a Graph API.

**Decisión:** Utilizar Power Automate como intermediario autorizado para enviar correos vía Outlook y archivar archivos en SharePoint.

**Consecuencias:**
- ✅ No requiere permisos de IT global
- ✅ Utiliza credenciales del usuario creador del flujo
- ✅ HTTP trigger permite integración sencilla
- ⚠️ Los correos se envían desde la cuenta del creador (o shared mailbox)
- ⚠️ Dependencia de la disponibilidad de Power Automate
- ⚠️ Límites de ejecución según la licencia (5.000-10.000+/día)

---

### ADR-002: Token firmado + OTP en lugar de SSO

**Contexto:** Sin SSO disponible, se necesita un mecanismo de autenticación para destinatarios externos al sistema.

**Decisión:** Generar tokens JWT/HMAC firmados incluidos en las URLs de acceso, con OTP opcional como segundo factor.

**Consecuencias:**
- ✅ No requiere que el destinatario tenga cuenta en la app
- ✅ Enlace directo desde el correo
- ✅ OTP añade capa de seguridad sin fricción excesiva
- ⚠️ El token puede ser reenviado (mitigado con OTP)
- ⚠️ Requiere gestión de expiración y renovación

---

### ADR-003: PostgreSQL como base de datos principal

**Contexto:** Se necesita almacenamiento relacional con soporte de datos flexibles (JSONB) y auditoría robusta.

**Decisión:** Usar PostgreSQL como base de datos única del sistema.

**Consecuencias:**
- ✅ ACID compliance para integridad del audit log
- ✅ JSONB para políticas y metadatos flexibles
- ✅ Amplio ecosistema de herramientas y hosting
- ⚠️ Requiere mantenimiento de servidor de DB

---

### ADR-004: Almacenamiento dual (servidor temporal + SharePoint permanente)

**Contexto:** Los archivos subidos deben estar disponibles inmediatamente para revisión pero archivados en SharePoint a largo plazo.

**Decisión:** Los archivos se guardan temporalmente en el servidor y se archivan en SharePoint tras validación, vía Power Automate.

**Consecuencias:**
- ✅ Acceso rápido durante el proceso de revisión
- ✅ Archivado estandarizado en SharePoint para cumplimiento
- ⚠️ Requiere sincronización y limpieza periódica del almacenamiento temporal

---

### ADR-005: Diseño campaign-first

**Contexto:** Los controles internos suelen agrupar múltiples solicitudes bajo un mismo ejercicio de control.

**Decisión:** Toda solicitud se agrupa dentro de una campaña. No existen requests huérfanos.

**Consecuencias:**
- ✅ Visión global por proyecto de control
- ✅ Reporting y KPIs a nivel de campaña
- ✅ Consistencia en fechas, políticas y comunicaciones
- ⚠️ Requiere crear una campaña incluso para solicitudes puntuales

---

## 12. Alternativas evaluadas

### 12.1 Alternativa — 100% Power Apps + SharePoint Lists

| Aspecto | Evaluación |
|---|---|
| Viabilidad | ✅ Alta (todo en ecosistema Microsoft) |
| UX / Personalización | ⚠️ Limitada (Power Apps tiene restricciones de diseño) |
| Rendimiento | ⚠️ SharePoint Lists tiene límites de 5.000+ items |
| Escalabilidad | ❌ Difícil para volúmenes altos |
| Complejidad de lógica | ⚠️ Flujos complejos difíciles de mantener en Power Automate |
| **Veredicto** | Viable para MVP/PoC, no recomendado para producción |

### 12.2 Alternativa — Microsoft Forms + Power Automate

| Aspecto | Evaluación |
|---|---|
| Viabilidad | ✅ Rápido de implementar |
| Personalización | ❌ Muy limitada |
| Tracking individual | ❌ Forms no soporta solicitudes individuales de forma nativa |
| Validación | ❌ No hay flujo de validación/rechazo |
| **Veredicto** | Insuficiente para los requisitos |

### 12.3 Alternativa — Azure Functions + Graph API (con app registration)

| Aspecto | Evaluación |
|---|---|
| Viabilidad | ❌ Requiere permisos de Azure AD que no están disponibles |
| UX / Personalización | ✅ Total |
| Rendimiento | ✅ Excelente |
| **Veredicto** | Ideal técnicamente, pero bloqueado por restricciones organizativas |

### 12.4 Alternativa — Plataformas externas (Jira, ServiceNow, etc.)

| Aspecto | Evaluación |
|---|---|
| Viabilidad | ⚠️ Depende de licencias disponibles |
| Adaptación al caso | ❌ Diseñadas para ticket management, no para evidence collection |
| Costo | ❌ Alto (licencias adicionales por usuario) |
| **Veredicto** | Sobredimensionado y no adaptado al caso de uso |

---

## 13. Requisitos no funcionales

### 13.1 Rendimiento

| Métrica | Objetivo |
|---|---|
| Tiempo de carga de página | < 2 segundos |
| Tiempo de respuesta API | < 500ms (p95) |
| Subida de archivos (50MB) | < 30 segundos |
| Generación de informe PDF | < 10 segundos |
| Envío de correo (Power Automate) | < 5 segundos end-to-end |

### 13.2 Disponibilidad

| Métrica | Objetivo |
|---|---|
| Uptime del servidor | 99.5% (horario laboral) |
| RPO (Recovery Point Objective) | 1 hora |
| RTO (Recovery Time Objective) | 4 horas |
| Backup de base de datos | Diario, retención 30 días |

### 13.3 Escalabilidad

| Métrica | Capacidad mínima |
|---|---|
| Campañas activas simultáneas | 50+ |
| Requests por campaña | 500+ |
| Usuarios emisores concurrentes | 20+ |
| Tamaño máximo de archivo individual | 100 MB |
| Almacenamiento total en SharePoint | Según plan M365 (1TB+) |

### 13.4 Seguridad

| Control | Implementación |
|---|---|
| Comunicación cifrada | HTTPS / TLS 1.3 |
| Tokens firmados | JWT con HS256 / RS256 |
| Rate limiting | 100 req/min por IP en endpoints públicos |
| Validación de archivos | Tipo MIME + extensión + tamaño máximo |
| SQL Injection | ORM con queries parametrizadas |
| XSS | Sanitización de inputs + CSP headers |
| CSRF | Token CSRF en formularios |
| Audit trail | Registro inmutable en tabla audit_log |

### 13.5 Compatibilidad

| Navegador/Entorno | Versión mínima |
|---|---|
| Chrome / Edge | Últimas 2 versiones |
| Firefox | Últimas 2 versiones |
| Safari | Últimas 2 versiones |
| Mobile (responsive) | iOS Safari 15+, Chrome Android |

---

## 14. Plan de despliegue

### 14.1 Entornos

```
┌────────────────────────────────────────────────────────────────┐
│  DEV (local)     │  STAGING              │  PRODUCTION         │
├──────────────────┼───────────────────────┼─────────────────────┤
│  localhost:3000   │  staging.firma.com    │  app.firma.com      │
│  SQLite / PG     │  PostgreSQL           │  PostgreSQL (Azure) │
│  Mock PA flows   │  PA flows (test)      │  PA flows (prod)    │
│  Mailhog         │  Test mailbox         │  Shared mailbox     │
│  Local storage   │  SP test site         │  SP production site │
└──────────────────┴───────────────────────┴─────────────────────┘
```

### 14.2 Pipeline CI/CD

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Commit  │───>│  Build   │───>│  Test    │───>│  Stage   │───>│  Prod    │
│  (Git)   │    │  (CI)    │    │  (CI)    │    │  Deploy  │    │  Deploy  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                 • lint          • unit tests    • auto          • manual
                 • typecheck     • integration   • smoke test    • approval
                 • build         • API tests     • PA flow test  • rollback
                                                                   plan
```

### 14.3 Docker (producción)

```dockerfile
# Dockerfile de ejemplo
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: doc_requests
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  pgdata:
```

---

## 15. Observabilidad y monitoreo

### 15.1 Logs estructurados

```json
{
  "timestamp": "2026-02-19T14:30:00.123Z",
  "level": "info",
  "service": "request-service",
  "action": "evidence_validated",
  "campaign_id": "CAMP-2026-001",
  "request_id": "REQ-001",
  "evidence_id": "EV-003",
  "actor": "asmith@firma.com",
  "duration_ms": 45
}
```

### 15.2 Métricas clave

| Métrica | Tipo | Descripción |
|---|---|---|
| `campaigns_active` | Gauge | Campañas activas |
| `requests_by_status` | Gauge | Requests por estado |
| `evidence_submission_time` | Histogram | Tiempo de subida |
| `pa_webhook_latency` | Histogram | Latencia de Power Automate |
| `pa_webhook_errors` | Counter | Errores de Power Automate |
| `reminder_sent_total` | Counter | Total de recordatorios enviados |

### 15.3 Alertas

| Alerta | Condición | Severidad |
|---|---|---|
| PA Flow Error | Error rate > 5% en 15 min | 🔴 Critical |
| API High Latency | p95 > 2s durante 5 min | 🟡 Warning |
| DB Connection Pool | > 80% utilización | 🟡 Warning |
| Disk Space | < 10% libre | 🔴 Critical |
| Overdue Requests | Requests sin respuesta > 15 días | 🟡 Warning |

---

## 16. Riesgos y mitigación

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Power Automate no disponible | Baja | Alto | Cola de reintentos; alertas de monitoreo; flujo manual de backup |
| R2 | Límites de ejecución de PA alcanzados | Media | Medio | Monitorear uso; batch processing; upgrade de licencia si necesario |
| R3 | Token de enlace comprometido | Baja | Medio | OTP obligatorio; expiración corta; registro de cada acceso con IP |
| R4 | SharePoint lleno / no accesible | Baja | Alto | Almacenamiento temporal como fallback; alertas de espacio |
| R5 | Pérdida de datos en base de datos | Muy baja | Crítico | Backups diarios; replicación; testing de restauración |
| R6 | Cambio de políticas de IT global | Media | Alto | Diseño modular; ADR-001 permite migrar a Graph API fácilmente |
| R7 | Rechazo por parte de usuarios finales | Media | Alto | UX sencilla; formación; soporte; piloto con grupo reducido |
| R8 | Correos marcados como spam | Baja | Medio | Shared mailbox configurada; SPF/DKIM; contenido corporativo |

---

<p align="center">
  <strong>Forvis Mazars</strong> · Arquitectura técnica · v1.0<br>
  <em>Documento de referencia para el diseño e implementación del sistema.</em>
</p>

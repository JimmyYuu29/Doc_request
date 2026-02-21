# 📋 Sistema de Petición de Documentación y Recopilación de Evidencias

> **Internal Document Request & Evidence Collection System**
>
> Plataforma interna para la gestión estructurada, seguimiento automatizado y auditoría completa de solicitudes de documentación dirigidas a **managers y socios** dentro de una firma internacional de servicios profesionales.

---

## 📑 Índice

- [Contexto del proyecto](#-contexto-del-proyecto)
- [Problema que resuelve](#-problema-que-resuelve)
- [Propuesta de solución](#-propuesta-de-solución)
- [Funcionalidades principales](#-funcionalidades-principales)
- [Flujo de proceso completo](#-flujo-de-proceso-completo)
- [Stack tecnológico](#-stack-tecnológico)
- [Requisitos previos](#-requisitos-previos)
- [Instalación y despliegue](#-instalación-y-despliegue)
- [Configuración de Power Automate](#-configuración-de-power-automate)
- [Configuración de SharePoint](#-configuración-de-sharepoint)
- [Seguridad y autenticación](#-seguridad-y-autenticación)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Uso de la aplicación](#-uso-de-la-aplicación)
- [Roadmap y evoluciones futuras](#-roadmap-y-evoluciones-futuras)
- [Contribuciones](#-contribuciones)
- [Licencia](#-licencia)

---

## 🏢 Contexto del proyecto

Este sistema está diseñado para **firmas internacionales de servicios profesionales** (Big 4, Top 10, grandes despachos de auditoría y consultoría) que necesitan gestionar solicitudes de información interna de manera centralizada.

### Restricciones del entorno corporativo

| Restricción | Descripción |
|---|---|
| **Sin acceso a Microsoft SSO** | La organización no dispone de permisos de administración global sobre Azure AD / Microsoft Entra ID para registrar aplicaciones propias |
| **Sin permisos de Graph API directos** | No es posible integrar directamente la app con Microsoft Graph para envío de correos o gestión de archivos |
| **Sin intervención de IT Global** | La solución debe funcionar sin requerir aprobaciones ni despliegues por parte del departamento de IT central del grupo |
| **Ecosistema Microsoft obligatorio** | Los usuarios utilizan Outlook, SharePoint y OneDrive como herramientas corporativas estándar |

### Solución adoptada

Se utiliza **Power Automate** como **capa intermediaria autorizada** entre la aplicación y los servicios de Microsoft 365, permitiendo:

- ✅ Envío de correos desde cuentas Outlook corporativas
- ✅ Almacenamiento de archivos en SharePoint / OneDrive
- ✅ Recordatorios y escalados automáticos
- ✅ Todo ello **sin necesidad de permisos de IT global**

---

## ❓ Problema que resuelve

### Situación actual (AS-IS)

```
📧 Correos dispersos     →  Pérdida de trazabilidad
📁 Carpetas no estandarizadas  →  Dificultad de localización
⏰ Seguimiento manual    →  Retrasos y olvidos frecuentes
📊 Sin visibilidad global →  Imposibilidad de reportar el estado
🔍 Sin registro de auditoría →  Riesgo de incumplimiento
```

### Situación objetivo (TO-BE)

```
✅ Solicitudes estructuradas    →  Campañas con identificador único
✅ Archivado automático         →  SharePoint organizado por control/campaña
✅ Recordatorios escalonados    →  3 niveles con escalado jerárquico
✅ Dashboard en tiempo real     →  KPIs de cumplimiento y retrasos
✅ Trazabilidad completa        →  Audit log inmutable de cada acción
```

---

## 💡 Propuesta de solución

El sistema se basa en tres conceptos fundamentales:

### 1. Campañas (*Campaigns*)
Agrupan múltiples solicitudes bajo un mismo control interno (ej. `HR-FCTRL-1`). Cada campaña define fechas, responsables, políticas de recordatorio y plantillas de comunicación.

### 2. Solicitudes (*Requests*)
Cada destinatario (manager/socio) recibe una solicitud individual con un identificador único, enlace de acceso tokenizado y lista personalizada de evidencias requeridas.

### 3. Evidencias (*Evidence Items*)
Elementos concretos de documentación solicitada (PDFs, Excels, actas, accesos a plataformas, etc.), cada uno con su propio ciclo de vida: `Pendiente → Enviada → Validada / Rechazada`.

---

## ⚡ Funcionalidades principales

### Para el responsable del control (emisor)

| Funcionalidad | Descripción |
|---|---|
| **Crear campañas** | Definir nombre, código de control, fechas, responsables y políticas |
| **Gestionar destinatarios** | Dos modos: por persona o por evidencia (asignación masiva) |
| **Revisar antes del envío** | Vista previa de cada solicitud individual con posibilidad de ajuste |
| **Envío automatizado** | Correos individuales vía Power Automate con enlaces tokenizados |
| **Validar/Rechazar evidencias** | Revisión individual de cada documento con motivo obligatorio en rechazo |
| **Subsanaciones automáticas** | Re-solicitud automática de elementos pendientes o rechazados |
| **Dashboard de campaña** | Estado global, KPIs, pendientes, retrasos y exportación de informes |
| **Cierre y archivo** | Bloqueo de solicitud, generación de informe de auditoría y archivado |

### Para el destinatario (manager/socio)

| Funcionalidad | Descripción |
|---|---|
| **Acceso sin login** | Enlace tokenizado sin necesidad de SSO ni credenciales adicionales |
| **Envío parcial** | Posibilidad de enviar documentación de forma gradual |
| **Múltiples formatos** | Subida de archivos, aclaraciones escritas, capturas, etc. |
| **Notificación de estado** | Correo de confirmación tras cada envío |

### Automatizaciones del sistema

| Automatización | Descripción |
|---|---|
| **Recordatorio Nivel 1** | Correo al destinatario principal |
| **Recordatorio Nivel 2** | Correo al destinatario + copia al delegado/asistente |
| **Recordatorio Nivel 3** | Correo al destinatario + copia al socio o superior jerárquico |
| **Notificaciones de envío** | Aviso al responsable cuando se recibe documentación |
| **Archivado automático** | Almacenamiento en SharePoint con estructura estandarizada |

---

## 🔄 Flujo de proceso completo

El sistema opera en **8 fases secuenciales**:

```
┌─────────────────────────────────────────────────────────┐
│  FASE 01 │ Creación de la campaña                       │
│          │ Definición de parámetros, control y SLA      │
├──────────┼──────────────────────────────────────────────┤
│  FASE 02 │ Destinatarios y documentación                │
│          │ Asignación de evidencias por persona/masiva  │
├──────────┼──────────────────────────────────────────────┤
│  FASE 03 │ Envío automático de comunicaciones           │
│          │ Correo individual con enlace tokenizado      │
├──────────┼──────────────────────────────────────────────┤
│  FASE 04 │ Acceso y envío de documentación              │
│          │ El destinatario sube archivos desde su enlace│
├──────────┼──────────────────────────────────────────────┤
│  FASE 05 │ Revisión por parte del responsable           │
│          │ Validación o rechazo con motivo              │
├──────────┼──────────────────────────────────────────────┤
│  FASE 06 │ Recordatorios y escalado automático          │
│          │ 3 niveles escalonados con registro           │
├──────────┼──────────────────────────────────────────────┤
│  FASE 07 │ Cierre de la solicitud                       │
│          │ Bloqueo, informe de auditoría y notificación │
├──────────┼──────────────────────────────────────────────┤
│  FASE 08 │ Archivo y reporte final                      │
│          │ Almacenamiento estructurado y dashboard      │
└──────────┴──────────────────────────────────────────────┘
```

### Estados de una solicitud

```
Borrador → Enviada → En progreso → Parcial → Pendiente de revisión → Lista para cerrar → Cerrada
  Draft     Sent    In Progress   Partial       Review               Ready-to-close     Closed
```

> 📎 Para el flujo visual interactivo completo, consulte el archivo `flowchart_es.html`.

---

## 🛠 Stack tecnológico

### Opción A — Stack ligero (recomendado para MVP)

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | HTML/CSS/JS estático o React/Vue SPA | Se puede servir desde SharePoint o cualquier hosting ligero |
| **Backend** | Node.js (Express) / Python (FastAPI/Flask) | API REST para lógica de negocio |
| **Base de datos** | PostgreSQL / SQLite (MVP) | Almacenamiento de campañas, requests, logs |
| **Correo y archivado** | Power Automate (4 flujos HTTP) | Sin dependencia de Graph API directa |
| **Almacenamiento** | SharePoint Document Library | Estructura estandarizada por control/campaña |
| **Hosting** | Azure App Service / VM local / Docker | Flexible según restricciones de la firma |

### Opción B — Stack 100% Microsoft 365 (sin servidor propio)

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | Power Apps (Canvas App) | No requiere desarrollo web; integrable con el ecosistema |
| **Backend / Lógica** | Power Automate (Flujos avanzados) | Toda la orquestación gestiona vía flujos |
| **Base de datos** | SharePoint Lists / Dataverse (si disponible) | Almacenamiento nativo en M365 |
| **Correo** | Outlook connector en Power Automate | Envío desde el buzón del usuario autorizado |
| **Almacenamiento** | SharePoint Document Library | Igual que Opción A |
| **Hosting** | No aplica | Todo reside en M365 |

### Opción C — Stack híbrido (recomendado para producción)

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | React / Next.js SPA | UX profesional, responsive, componentes ricos |
| **Backend** | Node.js + Express / NestJS | API robusta con middleware de autenticación |
| **Base de datos** | PostgreSQL (Azure DB / RDS) | Escalable, relacional, con soporte JSONB |
| **Correo y archivado** | Power Automate (4 flujos) | Capa intermedia hacia M365 sin permisos IT |
| **Almacenamiento** | SharePoint + Azure Blob (backup) | Doble almacenamiento para resiliencia |
| **Hosting** | Azure App Service + CDN | Producción escalable con CI/CD |
| **Monitoreo** | Application Insights / Sentry | Observabilidad y alertas |

---

## 📦 Requisitos previos

### Para todas las opciones

- [ ] Cuenta Microsoft 365 con licencia que incluya **Power Automate** (plan mínimo: Power Automate Premium o equivalente con HTTP connector)
- [ ] Acceso a un **sitio de SharePoint** donde crear bibliotecas de documentos
- [ ] Permiso para crear **flujos de Power Automate** con trigger HTTP (webhooks)
- [ ] Buzón de Outlook corporativo desde el cual se enviarán las comunicaciones

### Para Opciones A y C (con servidor propio)

- [ ] Servidor o servicio de hosting (Azure App Service, VM, Docker, etc.)
- [ ] Node.js ≥ 18.x o Python ≥ 3.10
- [ ] Base de datos PostgreSQL (local o gestionada)
- [ ] Dominio o URL accesible para los destinatarios (enlaces tokenizados)

---

## 🚀 Instalación y despliegue

### Paso 1 — Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd peticion-documentacion
```

### Paso 2 — Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# ── Aplicación ──
APP_PORT=3000
APP_BASE_URL=https://tu-dominio.com
APP_SECRET_KEY=<clave-secreta-para-tokens>
TOKEN_EXPIRY_DAYS=7

# ── Base de datos ──
DB_HOST=localhost
DB_PORT=5432
DB_NAME=doc_requests
DB_USER=app_user
DB_PASSWORD=<contraseña-segura>

# ── Power Automate Webhooks ──
PA_FLOW_SEND_REQUESTS=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_SEND_OTP=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_ARCHIVE_FILES=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_CLOSE_ARCHIVE=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_REMINDERS=https://prod-xx.westeurope.logic.azure.com/workflows/...

# ── SharePoint ──
SP_SITE_URL=https://tuempresa.sharepoint.com/sites/EvidenciasControl
SP_LIBRARY_NAME=Evidencias

# ── OTP (opcional) ──
OTP_ENABLED=true
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
```

### Paso 3 — Instalar dependencias

```bash
npm install        # Node.js
# o
pip install -r requirements.txt  # Python
```

### Paso 4 — Inicializar base de datos

```bash
npm run db:migrate
npm run db:seed    # Datos de ejemplo (opcional)
```

### Paso 5 — Ejecutar en desarrollo

```bash
npm run dev
# Aplicación disponible en http://localhost:3000
```

### Paso 6 — Despliegue en producción

```bash
npm run build
npm start
# O usar Docker:
docker build -t doc-requests .
docker run -p 3000:3000 --env-file .env doc-requests
```

---

## ⚙ Configuración de Power Automate

Se requieren **4 flujos principales** en Power Automate:

### Flow 1: Envío de solicitudes iniciales

```
Trigger:       HTTP Request (POST)
Entrada:       { to, cc, subject, body_html, request_id, control_code }
Acciones:
  1. Parse JSON del body
  2. Send Email (V2) - Outlook connector
     - To: {{to}}
     - CC: {{cc}}
     - Subject: [{{control_code}}] Solicitud {{request_id}}
     - Body: {{body_html}}
  3. Response 200 OK
```

### Flow 2: Envío de OTP (opcional)

```
Trigger:       HTTP Request (POST)
Entrada:       { email, otp_code }
Acciones:
  1. Send Email con código OTP
  2. Response 200 OK
```

### Flow 3: Recordatorios y escalados

```
Trigger:       Recurrence (daily, 08:00 CET)
Acciones:
  1. HTTP GET → API interna: /api/requests/pending-reminders
  2. Para cada request pendiente:
     a. Determinar nivel de escalado (1, 2 o 3)
     b. Send Email con CC según nivel
     c. HTTP POST → API interna: /api/requests/{id}/reminder-sent
```

### Flow 4: Archivado de evidencias

```
Trigger:       HTTP Request (POST)
Entrada:       { file_content_base64, file_name, folder_path }
Acciones:
  1. Create File en SharePoint
     - Site: {{SP_SITE_URL}}
     - Library: {{SP_LIBRARY_NAME}}
     - Folder: {{folder_path}}
     - File Name: {{file_name}}
     - File Content: base64ToBinary({{file_content_base64}})
  2. Response 200 OK con metadata del archivo
```

---

## 📂 Configuración de SharePoint

### Estructura de bibliotecas de documentos

```
📁 Evidencias (Document Library)
├── 📁 HR-FCTRL-1/                          ← Código de control
├── 📁 CAMP-2026-001/                   ← ID de campaña
│   ├── 📁 REQ-001_jgarcia@firma.com/   ← Request + destinatario
│   │   ├── 📄 Evidence_001_Balance_2025.xlsx
│   │   ├── 📄 Evidence_002_Acta_reunion.pdf
│   │   └── 📄 metadata.json
│   ├── 📁 REQ-002_mlopez@firma.com/
│   │   └── ...
│   └── 📄 Campaign_Report.pdf          ← Informe de auditoría
└── 📁 CAMP-2026-002/
    └── ...
├── 📁 FIN-CTRL-3/
│   └── ...
└── ...
```

### Permisos recomendados

| Nivel | Permiso | Grupo/Persona |
|---|---|---|
| Sitio SharePoint | Propietario | Equipo de control interno |
| Biblioteca | Contribuir | Cuenta de servicio de Power Automate |
| Carpetas de request | Solo lectura | Destinatarios (si aplica acceso directo) |

---

## 🔐 Seguridad y autenticación

### Modelo de autenticación sin SSO

Dado que no se dispone de Microsoft SSO corporativo, el sistema implementa un modelo de autenticación propio:

```
┌─────────────────────────────────────────────────────┐
│           MODELO DE AUTENTICACIÓN                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Token firmado (JWT / HMAC)                      │
│     - Incluido en el enlace de cada solicitud       │
│     - Expiración configurable (default: 7 días)     │
│     - Vinculado a un request_id específico          │
│                                                     │
│  2. OTP por correo (opcional, recomendado)           │
│     - Código de 6 dígitos enviado al email           │
│     - Expiración: 10 minutos                        │
│     - Máximo 3 intentos antes de bloquear            │
│                                                     │
│  3. Delegados autorizados                            │
│     - Emails explícitamente registrados             │
│     - Pueden actuar en nombre del destinatario       │
│                                                     │
│  4. Registro de auditoría                            │
│     - Cada acceso queda registrado (IP, timestamp)  │
│     - Cada acción queda en el AuditLog inmutable    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Medidas de seguridad adicionales

- **HTTPS obligatorio** en producción
- **Rate limiting** en endpoints públicos
- **CORS restringido** al dominio de la aplicación
- **Validación de entrada** en todos los formularios
- **Sanitización de archivos** subidos (antivirus / tipo MIME)
- **Encriptación at-rest** de la base de datos

---

## 📁 Estructura del proyecto

```
peticion-documentacion/
├── 📄 README.md                            ← Este archivo
├── 📄 ARCHITECTURE.md                      ← Arquitectura técnica detallada
├── 📄 flowchart_es.html                    ← Flujo de proceso interactivo (visual)
├── 📁 Diagrama de uso/
│   ├── 📄 readme_internal_...app.md        ← Especificación funcional detallada
│   ├── 📄 *.mmd                            ← Diagrama Mermaid del flujo de uso
│   └── 🖼 *.png                            ← Diagrama renderizado
├── 📁 Diagrama tecnico/
│   ├── 📄 *.mmd                            ← Diagrama Mermaid técnico
│   ├── 🖼 *.png                            ← Diagrama técnico renderizado
│   └── 🖼 *.svg                            ← Versión vectorial del diagrama
└── 🖼 *.svg                                ← Diagrama de campaña (raíz)
```

---

## 📖 Uso de la aplicación

### 1. Crear una campaña

1. Acceder a la aplicación web
2. Pulsar **"Nueva Campaña"**
3. Rellenar los campos obligatorios:
   - Nombre de la campaña
   - Código de control (ej. `HR-FCTRL-1`)
   - Fecha de inicio y fecha límite
   - Responsable principal y alternativo
   - Frecuencia de recordatorios y niveles de escalado
4. Guardar como borrador o confirmar directamente

### 2. Definir destinatarios y evidencias

**Modo A — Por persona:**
1. Seleccionar un manager o socio
2. Asignar las evidencias que debe entregar
3. Repetir para cada destinatario

**Modo B — Por evidencia:**
1. Seleccionar una evidencia
2. Asignar a múltiples destinatarios a la vez
3. Repetir para cada evidencia

### 3. Revisar y enviar

1. Verificar el resumen de cada solicitud individual
2. Ajustar fechas, destinatarios en copia o delegados si es necesario
3. Confirmar el envío → el sistema genera enlaces y envía los correos

### 4. Seguimiento y validación

1. Desde el dashboard, monitorizar el estado de cada solicitud
2. Al recibir documentación, revisarla individualmente
3. Marcar como **Validada** o **Rechazada** (con motivo)
4. Si hay pendientes, el sistema genera la subsanación automáticamente

### 5. Cierre

1. Cuando todas las evidencias obligatorias estén validadas → estado "Lista para cerrar"
2. Confirmar cierre → se genera informe de auditoría y se archiva todo en SharePoint

---

## 🗺 Roadmap y evoluciones futuras

### v1.0 — MVP (Alcance actual)
- [x] Diseño del flujo de proceso
- [x] Diagramas de uso y técnicos
- [x] Especificación funcional completa
- [ ] Implementación del backend (API REST)
- [ ] Implementación del frontend (SPA)
- [ ] Configuración de Power Automate (4 flujos)
- [ ] Configuración de SharePoint (biblioteca estandarizada)
- [ ] Testing y validación

### v1.1 — Mejoras funcionales
- [ ] Multi-idioma (ES, EN, FR, DE, PT)
- [ ] Plantillas de campaña reutilizables
- [ ] Importación masiva de destinatarios (CSV/Excel)
- [ ] Notificaciones in-app además de email
- [ ] Exportación avanzada de informes (PDF, Excel)

### v2.0 — Integraciones avanzadas
- [ ] Integración SSO cuando IT Global lo permita
- [ ] Firma electrónica interna
- [ ] Clasificación automática de evidencias (IA)
- [ ] Integración con herramientas GRC (Governance, Risk, Compliance)
- [ ] Exportación XBRL / ESG / Compliance
- [ ] API pública documentada (OpenAPI 3.0)

### v3.0 — Escala enterprise
- [ ] Multi-tenant (múltiples oficinas/países)
- [ ] Roles y permisos granulares (RBAC)
- [ ] Workflow configurables por tipo de control
- [ ] Integración con sistemas ERP/HRIS
- [ ] Mobile app (PWA o nativa)

---

## 🤝 Contribuciones

Este es un proyecto interno. Para contribuir:

1. Crear una rama desde `main`: `feature/nombre-funcionalidad`
2. Seguir las convenciones de código establecidas
3. Incluir tests para nuevas funcionalidades
4. Crear un Pull Request con descripción detallada
5. Obtener aprobación de al menos un revisor

---

## 📄 Licencia

**Uso interno exclusivo.** Este software es propiedad de la firma y está destinado únicamente para uso dentro de la organización. Queda prohibida su distribución, modificación o uso fuera del ámbito corporativo sin autorización expresa.

---

<p align="center">
  <strong>Forvis Mazars</strong> · Documentación interna · Sistema de Evidencias<br>
  <em>Diseñado para entornos corporativos con restricciones de IT global,<br>
  priorizando control, trazabilidad y automatización sin fricción organizativa.</em>
</p>

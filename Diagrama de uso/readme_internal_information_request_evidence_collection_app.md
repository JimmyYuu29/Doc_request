# 📁 Internal Information Request & Evidence Collection App

Aplicación interna para la **gestión, seguimiento y auditoría de solicitudes de información y documentación** dirigidas a managers y socios dentro de la organización, apoyándose en **Power Automate como capa intermedia** para el envío de correos, recordatorios y archivado en ecosistema Microsoft, **sin necesidad de SSO ni permisos directos sobre Azure AD / Graph**.

---

## 🎯 Objetivo del proyecto

Sustituir el proceso actual basado en correos manuales y carpetas dispersas por un **flujo estructurado, trazable y auditable**, que permita:

- Lanzar campañas internas de solicitud de información
- Solicitar la **misma o distinta documentación a múltiples responsables** (managers/socios)
- Recibir documentación de forma **ordenada y parcial**
- Validar, rechazar y solicitar subsanaciones
- Automatizar recordatorios y escalados
- Archivar evidencias por **control interno (ej. HR-FCTRL-1)**
- Generar **informes de auditoría** del proceso completo

Todo ello **sin integración directa con Microsoft SSO**, utilizando **Power Automate como intermediario autorizado**.

---

## 🧩 Alcance funcional

La aplicación cubre exclusivamente **procesos internos**:

- Los “clientes” del sistema son **usuarios internos** (managers, socios, delegados)
- La información solicitada es **documentación corporativa interna**
- El usuario de la app es el **responsable del control / emisor de la solicitud**

---

## 🏗️ Arquitectura general

```
[ Usuario (browser) ]
        │
        ▼
[ Internal App (Server) ]
  - UI & lógica de negocio
  - Tokens y validación
  - Estados y auditoría
        │  (HTTP Webhook)
        ▼
[ Power Automate ]
  - Envío de correos Outlook
  - Recordatorios y escalados
  - Archivado SharePoint / OneDrive
        │
        ▼
[ SharePoint / OneDrive ]
  - Evidencias
  - Estructura por control/campaña
```

---

## 🧠 Principios de diseño

- **Campaign-based**: todas las solicitudes se agrupan en campañas
- **Request-based**: cada destinatario tiene una solicitud individual (Request ID)
- **Evidence-based**: cada request se compone de evidencias estructuradas
- **Audit-first**: todo el proceso queda registrado (logs, timestamps, decisiones)
- **No SSO dependency**: autenticación mediante token + validación por correo (OTP opcional)

---

## 📚 Modelo de datos (alto nivel)

### 1. Campaign
Representa una campaña de solicitud de información.

Campos principales:
- campaign_id
- nombre
- control_code (ej. HR-FCTRL-1)
- responsable / backup_responsable
- fecha_inicio / fecha_fin
- política_reminders
- política_escalado
- plantilla_correo
- estado

---

### 2. Request
Una solicitud individual dirigida a un manager/socio.

Campos principales:
- request_id
- campaign_id
- destinatario_principal
- cc / delegado
- deadline
- estado (Sent, In Progress, Submitted, Partial, Ready-to-close, Closed, Overdue)
- reminder_count
- token_expiration

---

### 3. EvidenceItem
Elemento concreto de información/documentación solicitada.

Campos principales:
- evidence_id
- request_id
- nombre_visible
- tipo (Excel, PDF, Aclaración, Acceso plataforma, Correo, Acta, Teams…)
- obligatorio (Y/N)
- instrucciones
- estado (Pending, Submitted, Validated, Rejected)

---

### 4. Submission
Registro de cada envío parcial realizado por el destinatario.

Campos principales:
- submission_id
- request_id
- fecha_envio
- enviado_por (email)

---

### 5. AuditLog
Registro inmutable de eventos del sistema.

Campos principales:
- log_id
- entidad (Campaign / Request / Evidence)
- entidad_id
- acción (Send, Reminder, Upload, Validate, Reject, Close, etc.)
- usuario
- timestamp
- detalle

---

## 🔄 Flujo funcional detallado

### Paso 1. Creación de Campaign
El usuario crea una campaña indicando:
- Nombre y control interno
- Responsable y backup
- Periodo y SLA
- Política de recordatorios y escalado
- Plantilla de correo

---

### Paso 2. Generación de Requests
Desde la campaña se generan requests mediante dos modos:

- **Modo A**: seleccionar destinatario → seleccionar evidencias
- **Modo B**: seleccionar evidencias → seleccionar múltiples destinatarios

Cada request admite:
- Evidencias obligatorias y opcionales
- Delegado autorizado para enviar información

---

### Paso 3. Confirmación por destinatario
Antes del envío se muestra un resumen por request:
- Request ID
- Destinatarios y CC
- Evidencias solicitadas
- Fecha límite

Permite ajustes manuales antes de confirmar.

---

### Paso 4. Envío de correos (Power Automate)

La app llama a un Flow de Power Automate que:
- Envía un correo individual por request
- Incluye:
  - Control code y Request ID en el asunto
  - Lista de evidencias
  - Fecha límite
  - Enlace de acceso (tokenizado)

---

### Paso 5. Acceso mediante enlace seguro (sin SSO)

- Enlace único por request con token firmado
- Validez configurable (por defecto 7 días, renovable)
- Opción de validación adicional por correo (OTP)

---

### Paso 6. Envío de documentación

El destinatario o su delegado puede:
- Subir evidencias de forma parcial
- Añadir comentarios explicativos

Cada envío genera:
- Registro de Submission
- Notificación automática al usuario emisor

---

### Paso 7. Validación y subsanación

El usuario revisa cada EvidenceItem:
- **Validar** → evidencia aceptada
- **Rechazar** → motivo obligatorio

Si hay pendientes o rechazados:
- El sistema genera automáticamente una solicitud de subsanación
- Solo incluye evidencias no válidas

---

### Paso 8. Cierre del request

Cuando todas las evidencias obligatorias están validadas:
- Estado pasa a **Ready-to-close**
- El usuario decide cerrar manualmente

Al cerrar:
- Se envía correo de finalización
- Se congela el estado
- Se genera informe de auditoría

---

### Paso 9. Dashboard y reporting

La app ofrece:
- Vista por campaña y por request
- KPIs: tasa de completitud, retrasos, nº reminders, escalados
- Descarga de:
  - Informe por request
  - Informe completo de campaña (auditable)

---

## ⚙️ Power Automate – Flujos necesarios

Se recomienda limitar a **4 flujos principales**:

1. **Send Initial Requests**  
   - Trigger HTTP
   - Envío de correos iniciales

2. **Send OTP (opcional)**  
   - Trigger HTTP
   - Envío de código de verificación

3. **Reminder & Escalation Scheduler**  
   - Trigger programado (diario)
   - Recordatorios y escalados automáticos

4. **Archive Evidence Files**  
   - Trigger HTTP desde App
   - Guardado de archivos en SharePoint / OneDrive

---

## 📂 Estructura de archivado recomendada

```
/{control_code}/
   /{campaign_id}/
      /{request_id}_{destinatario}/
         /Evidence_001/
         /Evidence_002/
```

Cada archivo se acompaña de:
- Metadatos
- Timestamps
- Estado de validación

---

## 🛡️ Seguridad y trazabilidad

- Tokens firmados con expiración
- OTP por correo (opcional)
- Delegados explícitos
- Registro completo de acciones
- No dependencia de credenciales Microsoft en la app

---

## 📄 Resultados clave del sistema

- Proceso estandarizado y defendible ante auditoría
- Reducción drástica de correos manuales
- Visibilidad total del estado de cada control
- Evidencia clara de solicitudes, respuestas y seguimientos

---

## 🚀 Evoluciones futuras (no incluidas en MVP)

- Integración SSO cuando IT Global lo permita
- Firma electrónica interna
- Clasificación automática de evidencias
- Exportación XBRL / ESG / Compliance
- Integración con herramientas de gestión de riesgos

---

**Proyecto diseñado para entornos corporativos con restricciones de IT global, priorizando control, trazabilidad y automatización sin fricción organizativa.**


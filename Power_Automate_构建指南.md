# Power Automate 流程构建指南与 SharePoint 集成方案

> **Petición de Documentación — Power Automate & SharePoint Integration Guide**
> 
> 📅 最后更新：2026-02-21

---

## 目录

- [一、概述与架构说明](#一概述与架构说明)
- [二、前置准备工作](#二前置准备工作)
- [三、SharePoint 站点与文档库配置](#三sharepoint-站点与文档库配置)
- [四、Flow 1：发送文档请求邮件](#四flow-1发送文档请求邮件)
- [五、Flow 2：发送 OTP 验证码邮件](#五flow-2发送-otp-验证码邮件)
- [六、Flow 3：发送提醒邮件（含升级抄送）](#六flow-3发送提醒邮件含升级抄送)
- [七、Flow 4：归档文件到 SharePoint](#七flow-4归档文件到-sharepoint)
- [八、环境变量配置与上线切换](#八环境变量配置与上线切换)
- [九、测试与验证方案](#九测试与验证方案)
- [十、故障排除与常见问题](#十故障排除与常见问题)
- [附录A：完整 JSON Schema 参考](#附录a完整-json-schema-参考)
- [附录B：SharePoint 目录结构图](#附录bsharepoint-目录结构图)

---

## 一、概述与架构说明

### 1.1 为什么使用 Power Automate？

本系统的核心设计约束是：**在没有 IT 部门授权、没有 Azure AD / Microsoft Graph API 权限的企业环境下**运行。因此，我们选择 **Power Automate** 作为**授权代理中间件**：

- 员工的个人 Microsoft 365 账号自带 Power Automate 许可证
- Power Automate 可以代替用户发送 Outlook 邮件、操作 SharePoint
- 通过 HTTP Webhook 触发，后端应用不需要任何 Microsoft API token

### 1.2 通信架构

```
┌─────────────────────┐     HTTP POST (JSON)      ┌──────────────────────┐
│   Node.js 后端       │ ──────────────────────────→│   Power Automate     │
│   (Express Server)  │                            │   (Cloud Flow)       │
│                     │ ←────── HTTP 200/201 ──────│                      │
└─────────────────────┘                            └──────────┬───────────┘
                                                              │
                                                   ┌──────────▼───────────┐
                                                   │  Microsoft 365       │
                                                   │  · Outlook 邮件发送   │
                                                   │  · SharePoint 文件库  │
                                                   └──────────────────────┘
```

### 1.3 四个 Flow 总览

| # | Flow 名称 | 触发方式 | 用途 | 对应环境变量 |
|---|-----------|---------|------|-------------|
| 1 | Send Document Request | HTTP POST Webhook | 发送包含访问链接的正式请求邮件 | `PA_FLOW_SEND_REQUESTS` |
| 2 | Send OTP Code | HTTP POST Webhook | 发送 6 位 OTP 验证码邮件 | `PA_FLOW_SEND_OTP` |
| 3 | Send Reminder | HTTP POST Webhook | 发送提醒/催促邮件（支持3级升级抄送） | `PA_FLOW_REMINDERS` |
| 4 | Archive to SharePoint | HTTP POST Webhook | 将 Base64 编码的文件上传到 SharePoint | `PA_FLOW_ARCHIVE_FILES` |

### 1.4 Mock 模式说明

当前系统运行在 **Mock 模式**，判断逻辑位于 `src/services/notification.service.ts`：

```typescript
const isMockMode = !config.powerAutomate.sendRequests || config.isDev;
```

当 `NODE_ENV=development` 或未配置 Webhook URL 时，所有 Power Automate 调用仅在控制台输出日志，不发送真实请求。

---

## 二、前置准备工作

### 2.1 账号与权限要求

| 项目 | 要求 |
|------|------|
| Microsoft 365 账号 | 需具有 Power Automate 许可（大多数企业版自带） |
| Outlook 邮箱 | 用于发送所有通知邮件 |
| SharePoint 站点 | 需创建权限或由管理员预配置 |
| Power Automate 环境 | 推荐使用 Default environment |

### 2.2 Power Automate 使用入口

1. 浏览器打开 **https://make.powerautomate.com**
2. 使用企业 Microsoft 365 账号登录
3. 左侧菜单选择 **My flows**
4. 点击 **+ New flow** → **Instant cloud flow**

### 2.3 推荐命名规范

为便于管理，建议使用以下命名格式：

```
[PetDoc] Flow 1 - Send Document Request
[PetDoc] Flow 2 - Send OTP Code
[PetDoc] Flow 3 - Send Reminder
[PetDoc] Flow 4 - Archive to SharePoint
```

---

## 三、SharePoint 站点与文档库配置

### 3.1 创建 SharePoint 站点

1. 打开 **https://你的企业.sharepoint.com**
2. 点击右上角 **+ Create site**
3. 选择 **Team site**（推荐）或 **Communication site**
4. 填写信息：
   - **Site name**: `EvidenciasControl`（或自定义名称）
   - **Site description**: `Internal document request evidence archive`
   - **Privacy settings**: **Private** – only members can access
   - **Language**: English（或根据企业设置）
5. 点击 **Finish** 创建

> 📝 创建完成后，站点 URL 格式如：`https://tuempresa.sharepoint.com/sites/EvidenciasControl`

### 3.2 创建文档库

1. 进入刚创建的 SharePoint 站点
2. 左侧导航点击 **+ New** → **Document library**
3. 命名为：`Evidencias`
4. 点击 **Create**

### 3.3 添加自定义元数据列（可选但推荐）

在 Evidencias 文档库中添加自定义列，便于后续检索与审计：

1. 进入 **Evidencias** 库 → 点击 **+ Add column**
2. 依次添加以下列：

| 列名 | 类型 | 说明 |
|------|------|------|
| `RequestID` | Single line of text | 关联的请求 ID |
| `EvidenceID` | Single line of text | 关联的证据项 ID |
| `UploadedBy` | Single line of text | 上传者邮箱 |
| `UploadedAt` | Date and time | 上传时间 |
| `ControlCode` | Single line of text | 活动控制代码 |

### 3.4 文件目录结构规划

系统会根据以下规则自动创建文件夹层级（由 Flow 4 实现）：

```
SharePoint Site: EvidenciasControl
└── Document Library: Evidencias
    └── {control_code}/              ← 活动控制代码，如 "HR-FCTRL-1"
        └── {campaign_id}/           ← 活动唯一 ID
            └── {request_id}/        ← 请求唯一 ID
                └── 文件1.pdf
                └── 文件2.xlsx
                └── ...
```

> 后端 `submission.service.ts` 中构建路径的代码：
> ```typescript
> const folderPath = `${request.campaign.control_code}/${request.campaign_id}/${params.requestId}`;
> ```

### 3.5 权限管理建议

| 角色 | SharePoint 权限级别 | 说明 |
|------|---------------------|------|
| Power Automate 服务账号 | **Contribute** 或 **Edit** | 需要创建文件夹和上传文件 |
| 审计人员 / 管理员 | **Full Control** | 管理站点和查看所有文件 |
| 普通用户 | **Read** 或不授权 | 通过应用访问，不需直接访问 SP |

---

## 四、Flow 1：发送文档请求邮件

### 4.1 用途

当管理员在系统中点击"发送请求"按钮时，后端调用此 Flow 发送一封包含唯一访问链接的正式文档请求邮件给接收方。

### 4.2 后端调用代码

来自 `notification.service.ts` → `sendInitialRequest()` 和 `request.service.ts` → `send()`：

```typescript
// 调用参数
{
  to: "recipient@company.com",         // 收件人邮箱
  cc: "delegate@company.com",          // 委托人邮箱（可选）
  subject: "[HR-FCTRL-1] Solicitud de documentación abc12345",
  body_html: "<div>...HTML邮件内容...</div>",
  importance: "High",                  // 邮件重要性
  request_id: "uuid-of-request",       // 请求 ID（供审计）
  control_code: "HR-FCTRL-1"           // 控制代码（供审计）
}
```

### 4.3 详细构建步骤

#### Step 1：创建 Flow

1. 进入 **Power Automate** → **My flows** → **+ New flow** → **Instant cloud flow**
2. 命名：`[PetDoc] Flow 1 - Send Document Request`
3. 选择触发器：**When an HTTP request is received**
4. 点击 **Create**

#### Step 2：配置 HTTP 触发器

1. 点击触发器 **When an HTTP request is received**
2. **Who can trigger the flow**: `Anyone`（或配置 IP 白名单）
3. **Request Method**: 选择 `POST`
4. 在 **Request Body JSON Schema** 中填入：

```json
{
  "type": "object",
  "properties": {
    "to": { "type": "string" },
    "cc": { "type": "string" },
    "subject": { "type": "string" },
    "body_html": { "type": "string" },
    "importance": { "type": "string" },
    "request_id": { "type": "string" },
    "control_code": { "type": "string" }
  },
  "required": ["to", "subject", "body_html"]
}
```

5. 点击 **Save** → 系统将生成 **HTTP POST URL**（即 Webhook URL）

> ⚠️ **务必复制此 URL**，后续需配置到 `.env` 的 `PA_FLOW_SEND_REQUESTS` 变量。

#### Step 3：添加条件判断（CC 抄送）

1. 点击 **+ New step** → 搜索 **Condition**
2. 设置条件：
   - **Left**: 选择 Dynamic content → `cc`
   - **Operator**: `is not equal to`
   - **Right**: 留空（即 `null`）

#### Step 4a：If Yes（有抄送人）— 添加发送邮件操作

1. 在 **If yes** 分支点击 **Add an action**
2. 搜索 **Office 365 Outlook** → 选择 **Send an email (V2)**
3. 配置字段：

| 字段 | 值 | 说明 |
|------|---|------|
| **To** | `@{triggerBody()?['to']}` | Dynamic content: `to` |
| **Subject** | `@{triggerBody()?['subject']}` | Dynamic content: `subject` |
| **Body** | `@{triggerBody()?['body_html']}` | Dynamic content: `body_html` |
| **CC** | `@{triggerBody()?['cc']}` | Dynamic content: `cc` |
| **Importance** | `@{triggerBody()?['importance']}` | Dynamic content: `importance` |

4. 展开 **Advanced options**：
   - **Is HTML**: 选择 `Yes`

#### Step 4b：If No（无抄送人）— 添加发送邮件操作

1. 在 **If no** 分支点击 **Add an action**
2. 同样选择 **Send an email (V2)**
3. 配置方式相同，但**不填写 CC 字段**

#### Step 5：添加响应操作

1. 在条件分支**之后**（即并行于条件之外），点击 **+ New step**
2. 搜索 **Response** → 选择 **Response**（HTTP Response）
3. 配置：
   - **Status Code**: `200`
   - **Headers**: `Content-Type` = `application/json`
   - **Body**:
   ```json
   {
     "status": "sent",
     "message": "Email sent successfully",
     "request_id": "@{triggerBody()?['request_id']}"
   }
   ```

#### Step 6：保存并测试

1. 点击 **Save**
2. 使用 Postman 或 curl 发送测试请求：

```bash
curl -X POST "你的Webhook_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@company.com",
    "subject": "[TEST] Document Request",
    "body_html": "<h2>Test Email</h2><p>This is a test.</p>",
    "importance": "High",
    "request_id": "test-001",
    "control_code": "TEST-01"
  }'
```

### 4.4 完整流程图

```
┌───────────────────────────────┐
│  When an HTTP request         │
│  is received (POST)           │
│  Schema: to, cc, subject,     │
│  body_html, importance,       │
│  request_id, control_code     │
└──────────────┬────────────────┘
               │
       ┌───────▼────────┐
       │  Condition:     │
       │  cc is not null │
       └───┬────────┬────┘
      Yes  │        │  No
    ┌──────▼──┐  ┌──▼──────┐
    │Send mail│  │Send mail│
    │ with CC │  │ no CC   │
    └──────┬──┘  └──┬──────┘
           └───┬────┘
        ┌──────▼──────┐
        │  Response   │
        │  HTTP 200   │
        └─────────────┘
```

---

## 五、Flow 2：发送 OTP 验证码邮件

### 5.1 用途

当接收方通过令牌链接访问门户时，系统自动生成 6 位 OTP 验证码并通过此 Flow 发送邮件。OTP 有效期 10 分钟，最多 3 次尝试。

### 5.2 后端调用代码

来自 `notification.service.ts` → `sendOTP()`：

```typescript
{
  email: "recipient@company.com",    // 收件人邮箱
  otp_code: "482916"                 // 6 位验证码
}
```

### 5.3 详细构建步骤

#### Step 1：创建 Flow

1. **+ New flow** → **Instant cloud flow**
2. 命名：`[PetDoc] Flow 2 - Send OTP Code`
3. 触发器选择：**When an HTTP request is received**

#### Step 2：配置 HTTP 触发器

**Request Body JSON Schema**：

```json
{
  "type": "object",
  "properties": {
    "email": { "type": "string" },
    "otp_code": { "type": "string" }
  },
  "required": ["email", "otp_code"]
}
```

#### Step 3：添加发送邮件操作

1. **+ New step** → **Office 365 Outlook** → **Send an email (V2)**
2. 配置字段：

| 字段 | 值 |
|------|---|
| **To** | `@{triggerBody()?['email']}` |
| **Subject** | `Your verification code - Document Request Portal` |
| **Body** | 见下方 HTML 模板 |
| **Importance** | `High` |

3. **Is HTML**: `Yes`

**邮件 Body HTML 模板**：

```html
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a365d; text-align: center;">Verification Code</h2>
  <p>Your one-time verification code is:</p>
  <div style="background: #edf2f7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2b6cb0;">
      @{triggerBody()?['otp_code']}
    </span>
  </div>
  <p style="color: #718096; font-size: 14px;">
    This code will expire in <strong>10 minutes</strong>.<br/>
    If you did not request this code, please ignore this email.
  </p>
</div>
```

#### Step 4：添加响应

```json
{
  "status": "sent",
  "message": "OTP email sent successfully"
}
```

#### Step 5：保存并获取 Webhook URL

保存后复制 URL → 配置到 `.env` 的 `PA_FLOW_SEND_OTP`。

### 5.4 完整流程图

```
┌─────────────────────────┐
│ When an HTTP request    │
│ is received (POST)      │
│ Schema: email, otp_code │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ Send an email (V2)      │
│ To: {email}             │
│ Subject: Verification   │
│ Body: OTP HTML template │
│ Importance: High        │
│ Is HTML: Yes            │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ Response: HTTP 200      │
│ { status: "sent" }      │
└─────────────────────────┘
```

---

## 六、Flow 3：发送提醒邮件（含升级抄送）

### 6.1 用途

系统对未响应的请求发送提醒邮件。支持 **3 级升级机制**：
- **Level 1**：仅通知接收人
- **Level 2**：抄送委托人（delegate）
- **Level 3**：抄送上级（如合伙人）

### 6.2 后端调用代码

来自 `notification.service.ts` → `sendReminder()`：

```typescript
{
  to: "recipient@company.com",
  cc: "delegate@company.com",           // Level 2+ 才有
  subject: "[HR-FCTRL-1] Reminder: Pending documentation",
  body_html: "<div>...提醒内容...</div>",
  request_id: "uuid-of-request",
  level: 2                              // 升级级别 (1/2/3)
}
```

### 6.3 提醒触发机制说明

提醒的触发**不在 Power Automate 内部调度**，而是由后端通过 API 端点 `GET /api/requests/pending-reminders` 计算：

```
后端计算逻辑 (request.service.ts → getPendingReminders()):
1. 查询状态为 SENT / IN_PROGRESS / PARTIAL / OVERDUE 的请求
2. 根据活动的 reminder_policy 计算是否到期
3. 根据 escalation_policy 计算升级级别
4. 返回需要提醒的请求列表
```

**推荐方案：创建一个额外的"调度 Flow"（Scheduled Flow）**：

#### 调度 Flow（可选）：定期检查并触发提醒

1. **+ New flow** → **Scheduled cloud flow**
2. 命名：`[PetDoc] Scheduler - Check Reminders`
3. 设置每天运行 1~2 次（如每天 9:00 和 14:00）
4. 步骤：
   - **HTTP Action** → `GET http://你的服务器:3002/api/requests/pending-reminders`
   - **Parse JSON** 解析返回的 `reminders` 数组
   - **Apply to each** 遍历每条提醒
   - 对每条提醒调用 **Flow 3** 的 Webhook URL 发送邮件
   - 发送后回调 `POST /api/requests/{id}/reminder-sent` 通知后端

### 6.4 Flow 3 详细构建步骤

#### Step 1：创建 Flow 与 HTTP 触发器

**Request Body JSON Schema**：

```json
{
  "type": "object",
  "properties": {
    "to": { "type": "string" },
    "cc": { "type": "string" },
    "subject": { "type": "string" },
    "body_html": { "type": "string" },
    "request_id": { "type": "string" },
    "level": { "type": "integer" }
  },
  "required": ["to", "subject", "body_html", "level"]
}
```

#### Step 2：条件判断 — 根据级别决定抄送

1. **Condition**: `level` is greater than `1`
   - **If yes**: 发送邮件 **with CC**
   - **If no**: 发送邮件 **without CC**

配置方式同 Flow 1，只是 Body 使用 `body_html` 动态内容。

#### Step 3：回调后端（关键步骤）

发送邮件后，Flow 需要回调后端接口通知已发送：

1. **+ New step** → **HTTP**
2. 配置：
   - **Method**: `POST`
   - **URI**: `http://你的服务器:3002/api/requests/@{triggerBody()?['request_id']}/reminder-sent`
   - **Headers**: `Content-Type` = `application/json`
   - **Body**:
   ```json
   {
     "level": @{triggerBody()?['level']}
   }
   ```

> 后端收到回调后，会执行 `recordReminderSent()`：
> - `reminder_count` 自增 1
> - 更新 `last_reminder_at` 时间戳
> - 更新 `escalation_level`
> - 写入审计日志

#### Step 4：响应

```json
{
  "status": "sent",
  "level": @{triggerBody()?['level']},
  "request_id": "@{triggerBody()?['request_id']}"
}
```

### 6.5 完整流程图

```
┌──────────────────────────────┐
│ When an HTTP request         │
│ is received (POST)           │
│ Schema: to, cc, subject,     │
│ body_html, request_id, level │
└──────────────┬───────────────┘
               │
       ┌───────▼────────┐
       │  Condition:     │
       │  level > 1      │
       └───┬────────┬────┘
      Yes  │        │  No
    ┌──────▼──┐  ┌──▼──────┐
    │Send mail│  │Send mail│
    │ with CC │  │ no CC   │
    └──────┬──┘  └──┬──────┘
           └───┬────┘
        ┌──────▼──────────┐
        │ HTTP POST       │
        │ /reminder-sent  │
        │ callback        │
        └──────┬──────────┘
        ┌──────▼──────┐
        │ Response    │
        │ HTTP 200    │
        └─────────────┘
```

---

## 七、Flow 4：归档文件到 SharePoint

### 7.1 用途

当接收方上传证据文件时，系统立即将文件以 Base64 编码发送到此 Flow，由 Flow 将其上传到 SharePoint 文档库的相应文件夹。

### 7.2 后端调用代码

来自 `notification.service.ts` → `archiveFile()` 和 `submission.service.ts` → `create()`：

```typescript
{
  file_content_base64: "JVBERi0xLjQK...",     // 文件的 Base64 编码
  file_name: "balance_sheet_2025.pdf",          // 原始文件名
  folder_path: "HR-FCTRL-1/campaign-uuid/request-uuid",  // 存储路径
  metadata: {
    request_id: "uuid-of-request",
    evidence_id: "uuid-of-evidence",
    uploaded_by: "recipient@company.com",
    uploaded_at: "2026-02-21T10:30:00.000Z"
  }
}
```

### 7.3 后端期望的返回格式

```typescript
interface ArchiveResponse {
  status: string;     // "archived"
  sp_path: string;    // SharePoint 文件相对路径
  sp_url: string;     // SharePoint 文件完整 URL
}
```

后端收到返回后，会将 `sp_path` 和 `sp_url` 存入数据库中的 `evidence_items` 表和 `submission_files` 表。

### 7.4 详细构建步骤

#### Step 1：创建 Flow 与 HTTP 触发器

**Request Body JSON Schema**：

```json
{
  "type": "object",
  "properties": {
    "file_content_base64": { "type": "string" },
    "file_name": { "type": "string" },
    "folder_path": { "type": "string" },
    "metadata": {
      "type": "object",
      "properties": {
        "request_id": { "type": "string" },
        "evidence_id": { "type": "string" },
        "uploaded_by": { "type": "string" },
        "uploaded_at": { "type": "string" }
      }
    }
  },
  "required": ["file_content_base64", "file_name", "folder_path"]
}
```

#### Step 2：初始化变量

1. **+ New step** → **Initialize variable**
   - **Name**: `FullFolderPath`
   - **Type**: `String`
   - **Value**: `@{triggerBody()?['folder_path']}`

2. **+ New step** → **Initialize variable**
   - **Name**: `SiteUrl`
   - **Type**: `String`
   - **Value**: `https://tuempresa.sharepoint.com/sites/EvidenciasControl`（你的站点URL）

#### Step 3：拆分文件夹路径并逐级创建

由于 SharePoint 不支持一次性创建多级文件夹，需要逐级创建：

**方法 A：使用 Compose + Split 手动创建（推荐）**

1. **Compose** — 拆分路径：
   - **Inputs**: `@{split(triggerBody()?['folder_path'], '/')}`

2. **Initialize variable** `CurrentPath` = `""`（空字符串）

3. **Apply to each** — 遍历路径分段：
   - **Input**: `@{outputs('Compose')}`（上一步的输出）
   
   循环内的操作：
   
   a. **Append to string variable** `CurrentPath`:
      - **Value**: `@{if(empty(variables('CurrentPath')), items('Apply_to_each'), concat('/', items('Apply_to_each')))}`
   
   b. **SharePoint** → **Send an HTTP request to SharePoint** (创建文件夹)：
      - **Site Address**: 你的 SharePoint 站点
      - **Method**: `POST`
      - **URI**: `_api/web/getfolderbyserverrelativeurl('Evidencias')/folders`
      - **Headers**:
        ```
        Accept: application/json;odata=nometadata
        Content-Type: application/json
        ```
      - **Body**:
        ```json
        {
          "__metadata": { "type": "SP.Folder" },
          "ServerRelativeUrl": "Evidencias/@{variables('CurrentPath')}"
        }
        ```
   
   c. **Configure run after** → 设置此步骤"Configure run after"允许失败（文件夹已存在时会返回错误）

**方法 B：简化方案 — 使用 Create File 动作自动创建路径**

SharePoint 的 **Create file** 动作可以自动创建路径。直接跳至 Step 4。

#### Step 4：上传文件到 SharePoint

1. **+ New step** → 搜索 **SharePoint** → 选择 **Create file**
2. 配置：

| 字段 | 值 |
|------|---|
| **Site Address** | `https://tuempresa.sharepoint.com/sites/EvidenciasControl` |
| **Folder Path** | `/Evidencias/@{triggerBody()?['folder_path']}` |
| **File Name** | `@{triggerBody()?['file_name']}` |
| **File Content** | `@{base64ToBinary(triggerBody()?['file_content_base64'])}` |

> ⚠️ **关键表达式**：`base64ToBinary(triggerBody()?['file_content_base64'])` — 将 Base64 字符串转换为二进制文件内容。

#### Step 5：更新文件元数据（如果添加了自定义列）

1. **+ New step** → **SharePoint** → **Update file properties**
2. 配置：

| 字段 | 值 |
|------|---|
| **Site Address** | 同上 |
| **Library Name** | `Evidencias` |
| **Id** | `@{outputs('Create_file')?['body/ItemId']}` |
| **RequestID** | `@{triggerBody()?['metadata']?['request_id']}` |
| **EvidenceID** | `@{triggerBody()?['metadata']?['evidence_id']}` |
| **UploadedBy** | `@{triggerBody()?['metadata']?['uploaded_by']}` |
| **UploadedAt** | `@{triggerBody()?['metadata']?['uploaded_at']}` |

#### Step 6：构建并返回响应

1. **Compose** — 构建 SharePoint 路径：
   - **Inputs**: `@{outputs('Create_file')?['body/Path']}`

2. **Response**：
   - **Status Code**: `201`
   - **Headers**: `Content-Type` = `application/json`
   - **Body**:
   ```json
   {
     "status": "archived",
     "sp_path": "@{outputs('Create_file')?['body/Path']}",
     "sp_url": "@{outputs('Create_file')?['body/{Link}']}"
   }
   ```

### 7.5 完整流程图

```
┌──────────────────────────────────┐
│ When an HTTP request is received │
│ (POST) - file_content_base64,   │
│ file_name, folder_path, metadata │
└───────────────┬──────────────────┘
                │
┌───────────────▼──────────────────┐
│ SharePoint: Create file          │
│ Site: EvidenciasControl          │
│ Folder: /Evidencias/{folder_path}│
│ Name: {file_name}                │
│ Content: base64ToBinary(...)     │
└───────────────┬──────────────────┘
                │
┌───────────────▼──────────────────┐
│ SharePoint: Update file props    │
│ RequestID, EvidenceID,           │
│ UploadedBy, UploadedAt           │
└───────────────┬──────────────────┘
                │
┌───────────────▼──────────────────┐
│ Response: HTTP 201               │
│ { status, sp_path, sp_url }      │
└──────────────────────────────────┘
```

### 7.6 大文件处理注意事项

| 限制 | 值 | 说明 |
|------|---|------|
| Power Automate HTTP 请求体 | 100 MB | 默认限制 |
| SharePoint 单文件上限 | 250 MB | 标准限制 |
| 系统 `MAX_FILE_SIZE_MB` | 100 MB | `.env` 可配 |
| Base64 编码膨胀 | ~33% | 75MB 文件编码后约 100MB |

> 建议：对于大于 50MB 的文件，考虑使用分块上传（Chunked Upload），但对于一般的审计证据文件（PDF、截图等），100MB 限制通常足够。

---

## 八、环境变量配置与上线切换

### 8.1 从 Mock 切换到生产模式

完成所有 4 个 Flow 的创建后，按以下步骤切换到生产模式：

#### 步骤 1：收集所有 Webhook URL

在每个 Flow 的触发器中复制 **HTTP POST URL**，格式如：
```
https://prod-xx.westeurope.logic.azure.com:443/workflows/xxxxxxx/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xxxxxxxxx
```

#### 步骤 2：更新 .env 文件

```bash
# ── Power Automate Webhooks ──
PA_FLOW_SEND_REQUESTS=https://prod-xx.westeurope.logic.azure.com/workflows/your-flow-1-url
PA_FLOW_SEND_OTP=https://prod-xx.westeurope.logic.azure.com/workflows/your-flow-2-url
PA_FLOW_REMINDERS=https://prod-xx.westeurope.logic.azure.com/workflows/your-flow-3-url
PA_FLOW_ARCHIVE_FILES=https://prod-xx.westeurope.logic.azure.com/workflows/your-flow-4-url

# ── SharePoint ──
SP_SITE_URL=https://tuempresa.sharepoint.com/sites/EvidenciasControl
SP_LIBRARY_NAME=Evidencias

# ── 切换到生产模式 ──
NODE_ENV=production
```

#### 步骤 3：重启后端服务

```bash
# 本地部署
npm run dev    # 如使用开发模式（不切换NODE_ENV也可配置URL测试）

# Docker 部署
docker-compose restart app
```

### 8.2 生产模式判断逻辑

```typescript
// notification.service.ts
const isMockMode = !config.powerAutomate.sendRequests || config.isDev;
```

**条件说明**：
- `config.isDev` = `NODE_ENV === 'development'` → 即使配置了 URL，开发模式下仍为 Mock
- `!config.powerAutomate.sendRequests` → 未配置 URL 则为 Mock
- 只有 `NODE_ENV=production` **且** 已配置 URL 时，才会发送真实请求

---

## 九、测试与验证方案

### 9.1 逐步测试流程

| 步骤 | 操作 | 验证点 |
|------|------|--------|
| 1 | 手动用 Postman 调用每个 Flow 的 Webhook URL | 确认返回 200/201 |
| 2 | 检查 Outlook 收件箱 | 确认邮件到达和格式正确 |
| 3 | 检查 SharePoint 文档库 | 确认文件夹创建和文件上传 |
| 4 | 在 `.env` 中配置 URL，`NODE_ENV=development` 改为 `production` | 确认不再输出 Mock 日志 |
| 5 | 在系统中创建活动 → 添加请求 → 发送 | 确认邮件发送成功 |
| 6 | 使用接收方链接 → 触发 OTP | 确认 OTP 邮件到达 |
| 7 | 上传文件 → 检查 SharePoint | 确认文件归档成功 |

### 9.2 Flow 运行日志查看

1. 进入 **Power Automate** → **My flows**
2. 点击对应 Flow → **Run history**
3. 点击具体运行记录 → 查看每个步骤的输入/输出

### 9.3 后端日志查看

后端使用 Winston 记录所有 Power Automate 交互：

```bash
# 开发环境 — 控制台彩色输出
npm run dev

# 生产环境 — 查看 Docker 日志
docker-compose logs -f app | grep "Power Automate"
```

---

## 十、故障排除与常见问题

### Q1：Flow 触发后返回 401 Unauthorized

**原因**：Webhook URL 中的签名（`sig` 参数）已过期或被修改。

**解决**：
1. 进入 Flow → 触发器设置 → 重新生成 URL
2. 更新 `.env` 中的对应变量
3. 重启服务

### Q2：邮件发送成功但收件人未收到

**排查步骤**：
1. 检查收件人的垃圾邮件/Junk 文件夹
2. 在 Power Automate Run History 中确认 `Send an email` 步骤成功
3. 检查企业邮件网关是否拦截

### Q3：SharePoint 创建文件夹失败 (403 Forbidden)

**原因**：Power Automate 连接使用的账号缺少 SharePoint 站点权限。

**解决**：
1. 进入 SharePoint 站点 → **Site permissions**
2. 确保 Flow 使用的账号有 **Edit** 或 **Contribute** 权限
3. 在 Power Automate 中重新建立 SharePoint 连接

### Q4：大文件上传超时

**原因**：文件 Base64 编码后体积膨胀约 33%，可能超过 Power Automate 超时限制。

**解决**：
1. 减小 `MAX_FILE_SIZE_MB`
2. 考虑在 Flow 中增加超时设置（HTTP Action → Timeout: `PT5M`）
3. 对于超大文件，使用 SharePoint REST API 的分块上传

### Q5：后端报 "Power Automate sendRequests fallido" 错误

**排查**：
1. 确认 Webhook URL 完整且有效
2. 检查网络连通性（特别是 Docker 容器到外网）
3. 检查 Power Automate 的 Flow 是否处于 **On** 状态
4. 查看 Flow Run History 确认收到并处理了请求

### Q6：OTP 验证码总是失败

**排查**：
1. 确认 `OTP_ENABLED=true`
2. 检查 Flow 2 的 Run History 确认邮件已发送
3. 确认验证码在 10 分钟内使用（`OTP_EXPIRY_MINUTES`）
4. 确认尝试次数未超过 3 次（`OTP_MAX_ATTEMPTS`）

---

## 附录A：完整 JSON Schema 参考

### Flow 1 — 发送请求邮件请求体

```json
{
  "to": "manager@company.com",
  "cc": "delegate@company.com",
  "subject": "[HR-FCTRL-1] Solicitud de documentación abc12345",
  "body_html": "<div style='font-family:Arial'>...<a href='https://app.com/submit/token123'>Access</a>...</div>",
  "importance": "High",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "control_code": "HR-FCTRL-1"
}
```

### Flow 2 — 发送 OTP 请求体

```json
{
  "email": "manager@company.com",
  "otp_code": "482916"
}
```

### Flow 3 — 发送提醒请求体

```json
{
  "to": "manager@company.com",
  "cc": "partner@company.com",
  "subject": "[HR-FCTRL-1] Reminder: Pending documentation (Level 2)",
  "body_html": "<div>...<strong>Deadline: 15/03/2026</strong>...</div>",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "level": 2
}
```

### Flow 4 — 归档文件请求体

```json
{
  "file_content_base64": "JVBERi0xLjQKMSAwIG9iago8PC...",
  "file_name": "balance_2025.pdf",
  "folder_path": "HR-FCTRL-1/campaign-uuid/request-uuid",
  "metadata": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "evidence_id": "660e8400-f39c-52e5-b827-557766550000",
    "uploaded_by": "manager@company.com",
    "uploaded_at": "2026-02-21T10:30:00.000Z"
  }
}
```

### Flow 4 — 期望的响应体

```json
{
  "status": "archived",
  "sp_path": "/sites/EvidenciasControl/Evidencias/HR-FCTRL-1/campaign-uuid/request-uuid/balance_2025.pdf",
  "sp_url": "https://tuempresa.sharepoint.com/sites/EvidenciasControl/Evidencias/HR-FCTRL-1/campaign-uuid/request-uuid/balance_2025.pdf"
}
```

---

## 附录B：SharePoint 目录结构图

```
https://tuempresa.sharepoint.com/sites/EvidenciasControl
│
└── Evidencias (Document Library)
    │
    ├── HR-FCTRL-1/                          ← 控制代码
    │   ├── a1b2c3d4-e5f6.../               ← 活动 ID (Campaign UUID)
    │   │   ├── f7g8h9i0-j1k2.../           ← 请求 ID (Request UUID)
    │   │   │   ├── balance_2025.pdf
    │   │   │   ├── access_matrix.xlsx
    │   │   │   └── approval_email.png
    │   │   │
    │   │   └── m3n4o5p6-q7r8.../           ← 另一个请求
    │   │       └── contract_signed.pdf
    │   │
    │   └── ...
    │
    ├── IT-CTRL-2/                           ← 另一个活动的控制代码
    │   └── ...
    │
    └── FIN-AUDIT-3/
        └── ...
```

**数据库中存储的路径示例**：

| 表 | 字段 | 示例值 |
|---|------|--------|
| `evidence_items` | `file_sp_path` | `/HR-FCTRL-1/a1b2c3d4/f7g8h9i0/balance_2025.pdf` |
| `evidence_items` | `file_sp_url` | `https://tuempresa.sharepoint.com/sites/.../balance_2025.pdf` |
| `submission_files` | `sp_path` | `/HR-FCTRL-1/a1b2c3d4/f7g8h9i0/balance_2025.pdf` |
| `submission_files` | `sp_url` | `https://tuempresa.sharepoint.com/sites/.../balance_2025.pdf` |

---

> 📝 **文档维护说明**：本文档应与源代码中 `src/services/notification.service.ts` 保持同步。当后端 API 接口或数据格式发生变化时，请同步更新对应的 Flow JSON Schema 和配置。
>
> 📧 **技术支持**：如有问题，请检查 Power Automate 的 Run History 日志和后端 Winston 日志进行排查。

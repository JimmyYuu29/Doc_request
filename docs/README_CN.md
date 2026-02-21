# 📋 文档请求与凭证收集系统

> **Internal Document Request & Evidence Collection System**
>
> 这是一个为国际专业服务公司内部设计的平台，旨在对针对**经理和合伙人**的文档请求进行结构化管理、自动跟踪和全面审计。

---

## 📑 目录

- [项目背景](#-项目背景)
- [解决的问题](#-解决的问题)
- [解决方案提案](#-解决方案提案)
- [主要功能](#-主要功能)
- [完整流程](#-完整流程)
- [技术栈](#-技术栈)
- [先决条件](#-先决条件)
- [安装与部署](#-安装与部署)
- [Power Automate 配置](#-power-automate-配置)
- [SharePoint 配置](#-sharepoint-配置)
- [安全与认证](#-安全与认证)
- [项目结构](#-项目结构)
- [应用使用指南](#-应用使用指南)
- [路线图与未来发展](#-路线图与未来发展)
- [贡献](#-贡献)
- [许可证](#-许可证)

---

## 🏢 项目背景

本系统专为**国际专业服务公司**（如四大、Top 10、大型审计和咨询公司）设计，用于集中管理内部信息请求。

### 企业环境限制

| 限制 | 描述 |
|---|---|
| **无 Microsoft SSO 访问权限** | 组织没有 Azure AD / Microsoft Entra ID 的全局管理权限来注册自定义应用程序 |
| **无直接 Graph API 权限** | 应用程序无法直接集成 Microsoft Graph 来发送邮件或管理文件 |
| **无全球 IT 部门干预** | 解决方案必须在不需要集团 IT 部门批准或部署的情况下运行 |
| **强制使用 Microsoft 生态** | 用户使用 Outlook、SharePoint 和 OneDrive 作为标准企业工具 |

### 采用的解决方案

使用 **Power Automate** 作为应用程序与 Microsoft 365 服务之间的**授权中间层**，从而实现：

- ✅ 从企业 Outlook 账户发送邮件
- ✅ 将文件存储在 SharePoint / OneDrive 中
- ✅ 自动提醒和升级通知
- ✅ 所有操作**无需全球 IT 权限**

---

## ❓ 解决的问题

### 当前状况 (AS-IS)

```
📧 邮件分散          →  缺乏可追溯性
📁 文件夹非标准化    →  难以定位文件
⏰ 手动跟进          →  经常延迟和遗漏
📊 无全局可见性      →  无法报告状态
🔍 无审计日志        →  合规风险
```

### 目标状况 (TO-BE)

```
✅ 结构化请求        →  具有唯一标识符的活动 (Campaigns)
✅ 自动归档          →  按控制/活动在 SharePoint 中组织
✅ 分级提醒          →  3 级分层升级提醒
✅ 实时仪表盘        →  合规性和延迟 KPI
✅ 完整可追溯性      →  每个操作的不可变审计日志
```

---

## 💡 解决方案提案

本系统基于三个基本概念：

### 1. 专项活动 (*Campaigns*)
将多个请求归类在同一个内部控制项目下（例如 `HR-FCTRL-1`）。每个活动定义了日期、负责人、提醒策略和沟通模板。

### 2. 请求 (*Requests*)
每个接收人（经理/合伙人）都会收到一个单独的请求，其中包含唯一标识符、凭证化访问链接和所需凭证的个性化列表。

### 3. 凭证 (*Evidence Items*)
具体请求的文档元素（PDF、Excel、会议纪要、平台访问截图等），每个元素都有自己的生命周期：`待处理 → 已提交 → 已验证 / 已拒绝`。

---

## ⚡ 主要功能

### 针对控制负责人（发起人）

| 功能 | 描述 |
|---|---|
| **创建活动** | 定义名称、控制代码、日期、负责人和策略 |
| **管理接收人** | 两种模式：按人员或按凭证（批量分配） |
| **发送前预览** | 预览每个单独的请求并进行调整 |
| **自动发送** | 通过 Power Automate 发送包含凭证化链接的个人邮件 |
| **验证/拒绝凭证** | 逐个审查文档，拒绝时必须填写理由 |
| **自动补正** | 自动重新请求待处理或被拒绝的元素 |
| **活动仪表盘** | 全局状态、KPI、待处理项、延迟和报告导出 |
| **关闭与归档** | 锁定请求，生成审计报告并归档 |

### 针对接收人（经理/合伙人）

| 功能 | 描述 |
|---|---|
| **免登录访问** | 无需 SSO 或额外凭据，通过凭证化链接访问 |
| **部分提交** | 支持分批提交文档 |
| **多种格式** | 支持上传文件、书面说明、截图等 |
| **状态通知** | 每次提交后收到确认邮件 |

### 系统自动化

| 自动化 | 描述 |
|---|---|
| **1 级提醒** | 发送邮件给主要接收人 |
| **2 级提醒** | 发送邮件给接收人 + 抄送给代表/助理 |
| **3 级提醒** | 发送邮件给接收人 + 抄送给合伙人或上级主管 |
| **提交通知** | 收到文档时通知负责人 |
| **自动归档** | 以标准化结构存储在 SharePoint 中 |

---

## 🔄 完整流程

系统按 **8 个顺序阶段** 运行：

```
┌─────────────────────────────────────────────────────────┐
│  阶段 01 │ 创建活动                                     │
│          │ 定义参数、控制和 SLA                         │
├──────────┼──────────────────────────────────────────────┤
│  阶段 02 │ 接收人与文档                                 │
│          │ 按人员/批量分配凭证                          │
├──────────┼──────────────────────────────────────────────┤
│  阶段 03 │ 自动发送通信                                 │
│          │ 包含凭证化链接的个人邮件                     │
├──────────┼──────────────────────────────────────────────┤
│  阶段 04 │ 访问与文档提交                               │
│          │ 接收人通过链接上传文件                       │
├──────────┼──────────────────────────────────────────────┤
│  阶段 05 │ 负责人审查                                   │
│          │ 验证或拒绝（附带理由）                       │
├──────────┼──────────────────────────────────────────────┤
│  阶段 06 │ 自动提醒与升级                               │
│          │ 带记录的 3 级分层提醒                        │
├──────────┼──────────────────────────────────────────────┤
│  阶段 07 │ 关闭请求                                     │
│          │ 锁定、审计报告和通知                         │
├──────────┼──────────────────────────────────────────────┤
│  阶段 08 │ 归档与最终报告                               │
│          │ 结构化存储和仪表盘                           │
└──────────┴──────────────────────────────────────────────┘
```

### 请求状态

```
草稿 → 已发送 → 进行中 → 部分提交 → 待审查 →由此关闭 → 已关闭
Draft  Sent    In Progress Partial   Review    Ready-to-close Closed
```

> 📎 有关完整的交互式可视化流程，请参阅文件 `flowchart_es.html`。

---

## 🛠 技术栈

### 选项 A — 轻量级栈（推荐用于 MVP）

| 层级 | 技术 | 理由 |
|---|---|---|
| **前端** | 静态 HTML/CSS/JS 或 React/Vue SPA | 可从 SharePoint 或任何轻量级主机提供服务 |
| **后端** | Node.js (Express) / Python (FastAPI/Flask) | 用于业务逻辑的 REST API |
| **数据库** | PostgreSQL / SQLite (MVP) | 存储活动、请求、日志 |
| **邮件与归档** | Power Automate (4 个 HTTP 流) | 无需直接依赖 Graph API |
| **存储** | SharePoint 文档库 | 按控制/活动标准化的结构 |
| **托管** | Azure App Service / 本地 VM / Docker | 根据公司限制灵活选择 |

### 选项 B — 100% Microsoft 365 栈（无自有服务器）

| 层级 | 技术 | 理由 |
|---|---|---|
| **前端** | Power Apps (Canvas App) | 无需 Web 开发；可与生态系统集成 |
| **后端/逻辑** | Power Automate (高级流) | 所有编排均通过流管理 |
| **数据库** | SharePoint Lists / Dataverse (如可用) | M365 原生存储 |
| **邮件** | Power Automate 中的 Outlook 连接器 | 从授权用户邮箱发送 |
| **存储** | SharePoint 文档库 | 同选项 A |
| **托管** | 不适用 | 全部驻留在 M365 中 |

### 选项 C — 混合栈（推荐用于生产环境）

| 层级 | 技术 | 理由 |
|---|---|---|
| **前端** | React / Next.js SPA | 专业 UX、响应式、丰富的组件 |
| **后端** | Node.js + Express / NestJS | 具有身份验证中间件的稳健 API |
| **数据库** | PostgreSQL (Azure DB / RDS) | 可扩展、关系型、支持 JSONB |
| **邮件与归档** | Power Automate (4 个流) | 无需 IT 权限通往 M365 的中间层 |
| **存储** | SharePoint + Azure Blob (备份) | 双重存储以确保存储弹性 |
| **托管** | Azure App Service + CDN | 具有 CI/CD 的可扩展生产环境 |
| **监控** | Application Insights / Sentry | 可观测性和警报 |

---

## 📦 先决条件

### 适用于所有选项

- [ ] 包含 **Power Automate** 的 Microsoft 365 账户（最低计划：Power Automate Premium 或具有 HTTP 连接器的同等计划）
- [ ] 访问 **SharePoint 站点**的权限，用于创建文档库
- [ ] 创建带有 HTTP 触发器 (webhooks) 的 **Power Automate 流**的权限
- [ ] 用于发送通信的企业 Outlook 邮箱

### 适用于选项 A 和 C（自有服务器）

- [ ] 服务器或托管服务（Azure App Service, VM, Docker 等）
- [ ] Node.js ≥ 18.x 或 Python ≥ 3.10
- [ ] PostgreSQL 数据库（本地或托管）
- [ ] 接收人可访问的域名或 URL（凭证化链接）

---

## 🚀 安装与部署

### 步骤 1 — 克隆代码库

```bash
git clone <repository-url>
cd peticion-documentacion
```

### 步骤 2 — 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# ── 应用程序 ──
APP_PORT=3000
APP_BASE_URL=https://tu-dominio.com
APP_SECRET_KEY=<token-secret-key>
TOKEN_EXPIRY_DAYS=7

# ── 数据库 ──
DB_HOST=localhost
DB_PORT=5432
DB_NAME=doc_requests
DB_USER=app_user
DB_PASSWORD=<secure-password>

# ── Power Automate Webhooks ──
PA_FLOW_SEND_REQUESTS=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_SEND_OTP=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_ARCHIVE_FILES=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_CLOSE_ARCHIVE=https://prod-xx.westeurope.logic.azure.com/workflows/...
PA_FLOW_REMINDERS=https://prod-xx.westeurope.logic.azure.com/workflows/...

# ── SharePoint ──
SP_SITE_URL=https://tuempresa.sharepoint.com/sites/EvidenciasControl
SP_LIBRARY_NAME=Evidencias

# ── OTP (可选) ──
OTP_ENABLED=true
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
```

### 步骤 3 — 安装依赖

```bash
npm install        # Node.js
# 或
pip install -r requirements.txt  # Python
```

### 步骤 4 — 初始化数据库

```bash
npm run db:migrate
npm run db:seed    # 示例数据（可选）
```

### 步骤 5 — 在开发环境运行

```bash
npm run dev
# 应用程序可在 http://localhost:3000 访问
```

### 步骤 6 — 生产环境部署

```bash
npm run build
npm start
# 或使用 Docker:
docker build -t doc-requests .
docker run -p 3000:3000 --env-file .env doc-requests
```

---

## ⚙ Power Automate 配置

需要在 Power Automate 中创建 **4 个主流**：

### Flow 1: 发送初始请求

```
触发器:       HTTP Request (POST)
输入:         { to, cc, subject, body_html, request_id, control_code }
操作:
  1. 解析 Body 中的 JSON
  2. Send Email (V2) - Outlook 连接器
     - To: {{to}}
     - CC: {{cc}}
     - Subject: [{{control_code}}] 请求 {{request_id}}
     - Body: {{body_html}}
  3. Response 200 OK
```

### Flow 2: 发送 OTP（可选）

```
触发器:       HTTP Request (POST)
输入:         { email, otp_code }
操作:
  1. 发送包含 OTP 代码的邮件
  2. Response 200 OK
```

### Flow 3: 提醒和升级

```
触发器:       Recurrence (每天, 08:00 CET)
操作:
  1. HTTP GET → 内部 API: /api/requests/pending-reminders
  2. 对于每个待处理请求:
     a. 确定升级级别 (1, 2 或 3)
     b. 根据级别发送邮件并抄送
     c. HTTP POST → 内部 API: /api/requests/{id}/reminder-sent
```

### Flow 4: 凭证归档

```
触发器:       HTTP Request (POST)
输入:         { file_content_base64, file_name, folder_path }
操作:
  1. 在 SharePoint 中创建文件
     - Site: {{SP_SITE_URL}}
     - Library: {{SP_LIBRARY_NAME}}
     - Folder: {{folder_path}}
     - File Name: {{file_name}}
     - File Content: base64ToBinary({{file_content_base64}})
  2. Response 200 OK 附带文件元数据
```

---

## 📂 SharePoint 配置

### 文档库结构

```
📁 Evidencias (文档库)
├── 📁 HR-FCTRL-1/                          ← 控制代码
├── 📁 CAMP-2026-001/                   ← 活动 ID
│   ├── 📁 REQ-001_jgarcia@firma.com/   ← 请求 + 接收人
│   │   ├── 📄 Evidence_001_Balance_2025.xlsx
│   │   ├── 📄 Evidence_002_Acta_reunion.pdf
│   │   └── 📄 metadata.json
│   ├── 📁 REQ-002_mlopez@firma.com/
│   │   └── ...
│   └── 📄 Campaign_Report.pdf          ← 审计报告
└── 📁 CAMP-2026-002/
    └── ...
├── 📁 FIN-CTRL-3/
│   └── ...
└── ...
```

### 推荐权限

| 级别 | 权限 | 组/人员 |
|---|---|---|
| SharePoint 站点 | 所有者 | 内部控制团队 |
| 库 | 贡献 | Power Automate 服务账户 |
| 请求文件夹 | 只读 | 接收人（如果适用直接访问） |

---

## 🔐 安全与认证

### 无 SSO 的认证模型

由于没有企业 Microsoft SSO，系统实施了自己的认证模型：

```
┌─────────────────────────────────────────────────────┐
│                   认证模型                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. 签名令牌 (JWT / HMAC)                           │
│     - 包含在每个请求的链接中                        │
│     - 过期时间可配置（默认：7 天）                  │
│     - 绑定到特定的 request_id                       │
│                                                     │
│  2. 邮件 OTP（可选，推荐）                           │
│     - 发送到邮件的 6 位代码                         │
│     - 有效期：10 分钟                               │
│     - 锁定前最多 3 次尝试                           │
│                                                     │
│  3. 授权代表                                        │
│     - 明确注册的邮箱                                │
│     - 可以代表接收人行事                            │
│                                                     │
│  4. 审计记录                                        │
│     - 每次访问都被记录（IP, 时间戳）                │
│     - 每个操作都保存在不可变的审计日志中            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 额外安全措施

- 生产环境**强制 HTTPS**
- 公共端点**速率限制**
- 限制到应用程序域的 **CORS**
- 所有表单的**输入验证**
- 上传文件的**清理**（反病毒 / MIME 类型）
- 数据库**静态加密**

---

## 📁 项目结构

```
peticion-documentacion/
├── 📄 README.md                            ← 本文件
├── 📄 ARCHITECTURE.md                      ← 详细技术架构
├── 📄 flowchart_es.html                    ← 交互式流程图（可视化）
├── 📁 Diagrama de uso/
│   ├── 📄 readme_internal_...app.md        ← 详细功能规范
│   ├── 📄 *.mmd                            ← 使用流程 Mermaid 图
│   └── 🖼 *.png                            ← 渲染图
├── 📁 Diagrama tecnico/
│   ├── 📄 *.mmd                            ← 技术 Mermaid 图
│   ├── 🖼 *.png                            ← 技术渲染图
│   └── 🖼 *.svg                            ← 矢量版图表
└── 🖼 *.svg                                ← 活动图表（根目录）
```

---

## 📖 应用使用指南

### 1. 创建活动

1. 访问 Web 应用程序
2. 点击 **"新建活动"**
3. 填写必填字段：
   - 活动名称
   - 控制代码（如 `HR-FCTRL-1`）
   - 开始日期和截止日期
   - 主要负责人和替代负责人
   - 提醒频率和升级级别
4. 保存为草稿或直接确认

### 2. 定义接收人和凭证

**模式 A — 按人员:**
1. 选择一位经理或合伙人
2. 分配其必须提交的凭证
3. 对每位接收人重复此操作

**模式 B — 按凭证:**
1. 选择一个凭证
2. 同时分配给多位接收人
3. 对每个凭证重复此操作

### 3. 审查并发送

1. 核对每个单独请求的摘要
2. 如有必要，调整日期、抄送接收人或代表
3. 确认发送 → 系统生成链接并发送邮件

### 4. 跟进与验证

1. 从仪表盘监控每个请求的状态
2. 收到文档后，逐个进行审查
3. 标记为 **已验证** 或 **已拒绝**（附带理由）
4. 如果有待处理项，系统会自动生成补正请求

### 5. 关闭

1. 当所有强制性凭证都已验证 → 状态变为 "由此关闭"
2. 确认关闭 → 生成审计报告并将所有内容归档到 SharePoint

---

## 🗺 路线图与未来发展

### v1.0 — MVP (当前范围)
- [x] 流程设计
- [x] 用例和技术图表
- [x] 完整功能规范
- [ ] 后端实现 (API REST)
- [ ] 前端实现 (SPA)
- [ ] Power Automate 配置 (4 个流)
- [ ] SharePoint 配置 (标准化库)
- [ ] 测试与验证

### v1.1 — 功能改进
- [ ] 多语言支持 (ES, EN, FR, DE, PT)
- [ ] 可重用的活动模板
- [ ] 批量导入接收人 (CSV/Excel)
- [ ]除邮件外的应用内通知
- [ ] 高级报告导出 (PDF, Excel)

### v2.0 — 高级集成
- [ ] 全球 IT 允许时的 SSO 集成
- [ ] 内部电子签名
- [ ] 凭证自动分类 (AI)
- [ ] 与 GRC 工具（治理、风险、合规）集成
- [ ] XBRL / ESG / 合规性导出
- [ ] 文档化的公共 API (OpenAPI 3.0)

### v3.0 — 企业级扩展
- [ ] 多租户（多办事处/国家）
- [ ] 细粒度角色和权限 (RBAC)
- [ ] 可按控制类型配置的工作流
- [ ] 与 ERP/HRIS 系统集成
- [ ] 移动应用 (PWA 或原生)

---

## 🤝 贡献

这是一个内部项目。如需贡献：

1. 从 `main` 创建分支：`feature/功能名称`
2. 遵循既定的代码规范
3. 为新功能包含测试
4. 创建包含详细说明的 Pull Request
5. 获得至少一位审查者的批准

---

## 📄 许可证

**仅限内部使用。** 本软件是公司的财产，仅供组织内部使用。未经明确授权，禁止在公司范围外分发、修改或使用。

---

<p align="center">
  <strong>Forvis Mazars</strong> · 内部文档 · 凭证系统<br>
  <em>专为受全球 IT 限制的企业环境设计，<br>
  优先考虑控制、可追溯性和无组织摩擦的自动化。</em>
</p>

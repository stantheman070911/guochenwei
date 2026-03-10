# 郭寶 — Personal AI 管家 (MVP Spec v2)
郭寶是一個存在於 LINE 對話中的 Personal AI。
當它了解你的目標後，它會用強勢、嚴厲的方式督促你完成目標，並幫你組織生活。
## 核心概念
- AI accountability partner
- 生活管理 + 目標督促
- LINE chat interface
- Harsh / strict personality（詳細 prompt 設計另案處理）
---
## 系統架構 Overview
```
User → Registration Website → Supabase (PostgreSQL)
                                    ↓
                          User adds LINE Bot
                                    ↓
                          Sends activation code in LINE
                                    ↓
                     LINE Webhook → Next.js API Route
                                    ↓
                              Claude API (Haiku)
                                    ↓
                           LINE Reply/Push Message → User
```
### 三大模組
| 模組 | 職責 |
|------|------|
| Registration Portal | 使用者註冊、生成 activation code、寄送 email |
| Backend API | LINE webhook 處理、activation 驗證、Claude 呼叫、LINE 回覆 |
| Scheduled Jobs | 主動提醒、目標追蹤 push（Vercel Cron） |
---
## Tech Stack（已定案）
| Layer | Choice | 理由 |
|-------|--------|------|
| Framework | Next.js 16 (App Router) | 前後端一條龍，Vercel 部署最順 |
| Language | TypeScript | 型別安全，減少 runtime error |
| Styling | Tailwind CSS + shadcn/ui | 快速出 UI |
| Database | PostgreSQL via Supabase | 免費 tier 夠 MVP 用，內建 auth 備用 |
| ORM | Prisma | Type-safe query，schema migration 方便 |
| AI | Anthropic Claude API (`claude-haiku-4-5-20251001`) | 性價比最好的選擇 |
| Hosting | Vercel | Serverless + Edge + Cron Jobs |
| Email | Resend | 開發者體驗好，免費額度夠 |
| LINE | LINE Messaging API | Official Account + Webhook |
---
## User Flow
### Flow 1：Registration（網站註冊）
1. User 進入註冊網站
2. 填寫 name + email
3. Backend 生成 8 字元 activation code（格式：`JBX7K2P9`，純英數無分隔符）
4. Code 存入 `activation_codes` table，status: `pending`，有效期 24hr
5. 畫面顯示 code + 寄送至 email（雙重保障）
6. 畫面引導 User 加入 LINE Bot（顯示 QR code 或連結）
### Flow 2：Activation（LINE 啟動）
1. User 在 LINE 傳送 activation code
2. Webhook 收到訊息，取得 `line_user_id` + `message_text`
3. Backend 驗證：code 存在 → 未使用 → 未過期
4. **Valid** → 綁定 `line_user_id`，code 標記 `used`，user status → `active`
   - Bot 回覆：「好，你被我盯上了。說說你要做什麼。」
5. **Invalid** → Bot 回覆：「這什麼鬼碼，去網站重新拿。」
### Flow 3：Chat（日常對話）
1. Webhook 收到 LINE 訊息
2. 查詢 `line_user_id` → 確認 `user.status = active`
3. **立即回 200 給 LINE**（避免 webhook timeout）
4. 組裝 context：system prompt + 使用者目標摘要 + 最近 N 條對話
5. 呼叫 Claude API（含 Tool Use：`manage_user_goal`）
6. 若 Claude 呼叫工具 → 執行工具 → 回傳 `tool_result` → 再次呼叫 Claude 取得最終回覆
7. 用 LINE **Reply Message API** 回傳（免費）；若 token 過期則自動降級為 **Push Message API**
8. 儲存本輪對話（user message + assistant reply）
9. 目標變更由 Claude Tool Use 自動處理（create / update / complete / abandon）
### Flow 4：未啟動用戶
- Bot 回覆：「先去網站拿啟動碼。」+ 附上註冊網站連結
### Flow 5：主動提醒（Scheduled Push）
1. Vercel Cron Job 定時觸發（例如每日 9:00 AM, 9:00 PM）
2. 查詢所有 active users 的 pending goals
3. 對有逾期或即將到期目標的 user，組裝提醒 context
4. 呼叫 Claude 生成提醒訊息
5. 用 LINE Push Message 發送
---
## Database Schema
### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | CUID | Primary key (`@default(cuid())`) |
| email | TEXT | Unique, not null |
| name | TEXT | Display name |
| line_user_id | TEXT | Unique, nullable（啟動後填入）|
| status | ENUM | `pending` / `active` |
| timezone | TEXT | 預設 `Asia/Taipei`，用於排程提醒 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
### `activation_codes`
| Column | Type | Notes |
|--------|------|-------|
| id | CUID | Primary key (`@default(cuid())`) |
| code | TEXT | Unique (ex: `JBX7K2P9`) |
| user_id | CUID | FK → users.id |
| used | BOOLEAN | default `false` |
| expires_at | TIMESTAMP | 建立時間 + 24hr |
| created_at | TIMESTAMP | |
### `goals`
| Column | Type | Notes |
|--------|------|-------|
| id | CUID | Primary key (`@default(cuid())`) |
| user_id | CUID | FK → users.id |
| title | TEXT | 目標名稱（由 AI 從對話中提取）|
| description | TEXT | 詳細描述，nullable |
| status | ENUM | `active` / `completed` / `abandoned` |
| due_date | TIMESTAMP | nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| id | CUID | Primary key (`@default(cuid())`) |
| user_id | CUID | FK → users.id |
| role | ENUM | `user` / `assistant` |
| content | TEXT | 訊息內容 |
| created_at | TIMESTAMP | |
**對話保留策略：** 每個 user 保留最近 20 條訊息用於 Claude context。超過的訊息保留在 DB（未來分析用），但不送入 prompt。
---
## Claude Context 組裝策略
每次呼叫 Claude 時，messages 的組裝順序：
```
1. System Prompt（persona + 行為規範，另案設計）
2. Goal Summary（從 goals table 撈取 active goals，格式化為文字摘要）
3. Recent Conversations（最近 20 條 messages）
4. Current User Message
```
這樣做的好處：目標資訊結構化儲存，不依賴 Claude 從長對話中「記住」；token 用量可控；即使對話被截斷，目標資訊不會遺失。
---
## 關鍵工程細節
### Webhook 處理 & Timeout 防護
LINE webhook 要求在一定時間內回 200，否則會重送。處理方式：
```
收到 webhook → 驗證 signature → 立即回 200
              → async 處理 Claude 呼叫 + LINE push message
```
使用 `waitUntil`（Vercel Edge）或背景處理，確保不阻塞 response。
### Idempotency
LINE 可能重送同一個 webhook event。處理方式：
- 用 LINE event 的 `webhookEventId` 做 dedup
- 在 Redis 或 DB 中記錄已處理的 event ID（TTL 5 分鐘即可）
- MVP 階段可先用 in-memory Set（單 instance 夠用），之後再換 Redis
### Rate Limiting
防止用戶短時間內大量傳訊息燒 Claude credits：
- 每個 user 每分鐘最多 5 則訊息
- 超過時 Bot 回覆：「你很煩欸，喘口氣好嗎。」
- 實作方式：Supabase 或 Vercel KV 記錄 user 的訊息時間戳
### Error Handling
| 情境 | 處理方式 |
|------|---------|
| Claude API timeout / 500 | 回覆「我在想事情，等一下再說。」，log error |
| Claude API rate limit | Queue + retry with backoff |
| LINE API 失敗 | Log + retry 1 次 |
| Invalid webhook signature | 回 401，不處理 |
| DB 連線失敗 | 回覆 generic error message，alert 通知 |
---
## 成本估算（MVP 階段）
假設：50 個早期用戶，每人每天平均 10 則對話
| 項目 | 估算 |
|------|------|
| Claude API | ~500 次/日 × ~2K tokens/次 ≈ 1M tokens/日。Haiku 約 $1/M input + $5/M output → 約 **$3–8/月** |
| Vercel | Free tier（Hobby）應可支撐 MVP |
| Supabase | Free tier（500MB DB, 50K auth）夠用 |
| Resend | Free tier（100 emails/日）夠用 |
| LINE | Messaging API free tier（有月訊息量上限，需確認最新方案） |
| **總計** | **~$5–15/月**（主要是 Claude API） |
---
## Monitoring & Logging
MVP 階段最低限度：
- **Vercel built-in logs**：API route 執行狀況
- **Sentry**（free tier）：error tracking + alerting
- **簡易 dashboard**：Supabase 內建 SQL editor 查詢 daily active users / 訊息量 / error rate
- **Claude cost tracking**：log 每次 API call 的 token usage，存 DB 或 Supabase
---
## MVP Scope & 排除項
### MVP 包含（Phase 1）
- [x] 註冊網站 + activation code 機制
- [x] LINE Bot 啟動 + 綁定
- [x] AI 對話（被動回覆）
- [x] 目標提取 + 結構化儲存
- [x] 主動每日提醒（Cron push）
- [ ] 基本 rate limiting
- [x] Error handling + logging
### 排除（Phase 2+）
- [ ] 付費機制 / Stripe 整合
- [ ] Invite code 分享系統
- [ ] 多語言支援
- [ ] 語音訊息處理
- [ ] 圖片 / 檔案處理
- [ ] 進階數據分析 dashboard
- [ ] 使用者自訂 persona 嚴厲程度
- [ ] LINE Rich Menu / LIFF 整合

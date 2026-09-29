# linebot-qa-file

LINE 問答機器人：依 `content/` 裡的文件內容，用 Gemini 回答問題。

取代原本「LINE → Dify → dify-firestore」的流程，改成一個 Next.js 專案直接處理：

```
LINE webhook → /api/line/webhook
  → 驗證 x-line-signature
  → Gemini（gemini-2.5-flash，規則全文放在 system prompt）
  → 回覆 LINE
  → 寫入 Firestore chatbot collection
```

## 檔案

| 檔案 | 用途 |
|---|---|
| `content/rules.md` | 比賽規則全文（Markdown），要換規則改這裡 |
| `content/prompt.md` | 系統提示語、無法回答 / 發生錯誤時的回覆 |
| `content/settings.json` | Gemini 模型、temperature、群組回覆方式 |
| `lib/content.ts` | 讀取並檢查 `content/` 裡的規則、提示語與設定 |
| `lib/gemini.ts` | Gemini 呼叫 |
| `lib/firestore.ts` | 寫入 `chatbot` collection（與 dify-firestore 同欄位，另加 `group_id` / `room_id`） |
| `app/api/line/webhook/route.ts` | LINE webhook |
| `app/api/health/route.ts` | 健康檢查 |

## 修改規則、提示語與設定

- 規則：`content/rules.md`
- 提示語：`content/prompt.md`（`## ` 標題不要改，`{{rules}}` 會自動換成規則全文）
- 設定：`content/settings.json`（模型、temperature、群組回覆方式，各欄位說明寫在檔案的 `_說明` 裡）

內容有誤（例如 JSON 格式錯、少了段落）時，Vercel 部署會失敗並顯示原因，線上會繼續跑上一個正常版本。

直接編輯，commit 並推上 GitHub 後，Vercel 會自動重新部署，大約一分鐘後生效。
在 GitHub 網頁上點檔案 → 鉛筆圖示就能直接改，不需要在電腦上裝開發環境。

## 群組行為

在群組或多人聊天室中，預設只有在 **@機器人** 時才回覆，避免每句話都被回。
想改成全部都回，把 `content/settings.json` 的 `replyOnlyWhenMentionedInGroup` 改成 `false`。

## 防止金鑰外洩

`npm install` 時會自動啟用 `.githooks/pre-commit`，每次 commit 前執行 `scripts/check-secrets.mjs`，
擋下 `.env` 檔、Firebase 金鑰 JSON，以及看起來像 API key / token 的內容。
也可以手動執行 `npm run check-secrets`（檢查已 `git add` 的檔案）。

## 本機開發

```bash
npm install
cp .env.example .env.local   # 填入金鑰
npm run dev
```

## 部署到 Vercel

1. 把這個資料夾推到新的 GitHub repo（建議設為私有），在 Vercel 匯入。
2. 在 Vercel → Settings → Environment Variables 設定 `.env.example` 裡的變數：
   - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`：LINE Developers Console → 你的 Messaging API channel
   - `GEMINI_API_KEY`：Google AI Studio
   - `FIREBASE_SERVICE_ACCOUNT`：可直接沿用 dify-firestore 專案的同一個值
3. 部署完成後，到 LINE Developers Console → Messaging API：
   - Webhook URL 改成 `https://<你的網域>.vercel.app/api/line/webhook`
   - 按 **Verify**，應顯示 Success
   - 確認 **Use webhook** 已開啟
4. 在 LINE 傳訊息測試，再到 Firestore 確認 `chatbot` 有新資料。

改 Webhook URL 的那一刻就完成切換；有問題時把 URL 改回原本 Dify 的就能退回。
確認穩定後，再停用 Dify 的 app 與 dify-firestore 專案。

## 授權

MIT

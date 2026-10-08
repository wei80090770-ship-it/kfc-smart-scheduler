# KFC 智慧排班｜GitHub Pages 部署包

## 這份 ZIP 可部署到 GitHub Pages，但正式營運需先驗證 Supabase

1. **不要直接覆蓋目前正式站**：建議先用新 Repository / 測試 Pages 網址部署。ZIP 內所有 `.html`、`.js` 放在 Repo 根目錄。
2. 在備份後的 Supabase 測試專案先檢查、執行 `supabase_upgrade.sql`，再執行 `github-publish.sql`。前一份 SQL 含 `CREATE POLICY`，**若之前已執行過，不可直接重複執行**，須由 DBA 對照現況處理。
3. 確認 `profiles.role` 實際角色值、各來源表的 RLS SELECT 權限，及 Auth Email 帳號可登入。
4. 在「系統設定」登入；切換至 TC 預測，確認 8 週／去年假日資料載入；到 Group 階梯班表「讀取本週班表」；編輯後按「儲存本週草稿」；核對無誤再按「正式發布本週」。
5. 發布透過單一 PostgreSQL RPC 交易完成，資料存於 `scheduler_daily_rosters` / `scheduler_published_weeks`，**不會覆寫原有 `schedule_shifts` 匯入資料**。原有 Delivery OP 尚未自動改為讀取新發布表，須另外調整讀取端。

## 已包含
- 原有頁面、中心與 Group 階梯、各 Group 分區、超排橘色／缺人紅色／符合綠色。
- 歷史 TC：同餐廳、同半小時、前 8 週同星期；缺資料排除、實際 0 納入。
- 假日：去年同 `event_key`；連假前一天以星期五資料預測。假日資料不完整時不應當成正式預測。
- 員工主 Group／支援 Group、每週固定一至兩段可排班、每週指休、Excel 匯出。
- Supabase Auth、RLS（新增資料表）、班表週草稿讀寫、單交易發布及跨 Group 同時段衝突檢查。

## 仍需正式環境驗收的限制
- 這裡無法登入你的 Supabase，因此**沒有**實際 Auth/RLS 及資料讀寫端到端驗收；不能宣稱正式營運可用。
- 歷史資料、假日與 Group 對照需在正式資料庫核對，且預測缺資料時不能當成 0 單。
- 排班發布 SQL 會檢查跨 Group 重疊與支援 Group 權限；**尚未於資料庫端驗證每日可排班時間、每週休假、工時 40 小時等全部限制**，因此發布前仍須主管檢核。
- 週發布狀態只在頁面載入後同步；同時有多位主管操作時，應透過資料庫權限與正式鎖定規則再強化。
- `scheduler_daily_rosters` 是新的排班發布資料來源；不會直接回寫舊 `schedule_shifts`，避免破壞歷史匯入。
- 前端有示範資料的舊版畫面，在未登入時不得當成正式數據。

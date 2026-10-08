# KFC 智慧排班｜中心權限 + 真實 DMS 串接部署候選版

## 主要變更
- 中心帳號以 Supabase Auth 登入，從 profiles.center_id 自動鎖定所屬中心，不提供跨中心切換。
- 登入前遮蔽原始本機/示範畫面，避免將 localStorage 誤認正式資料。
- 透過 SECURITY DEFINER、中心權限驗證 RPC 讀取 restaurants 與 dms_30m；不改動 Delivery OP 原有資料或原表 RLS。
- DMS 前 8 週分頁讀取，每次 1000 筆，不再僅取最近 1000 筆。
- 缺少餐廳時段資料標記資料不足，0 單保留，不再強行當 0。
- 中心資料修改、員工與指休、班表草稿與發布沿用 scheduler_* RLS，scheduler_can_manage 僅認帳號的所屬中心。

## 安裝順序（已存在的表可保留資料）
1. SQL Editor 執行 01_supabase_upgrade_repeatable.sql（若已完成則可略過）。
2. SQL Editor 執行 02_github_publish.sql（已有資料表可保留；此檔會重建該兩表的 RLS policies）。
3. **最後**執行 03_center_access.sql，將 scheduler_can_manage 改為嚴格單中心，建立中心隔離的讀取 RPC。
4. 確認 Supabase Auth 中各中心使用者已有啟用的 profiles 紀錄，且 center_id 與 centers.id、dms_30m.center_id 一致。不要提供密碼或 secret key。
5. GitHub Pages 根目錄上傳 index.html 和全部 .js（含 center-secure.js）。
6. 登入後應顯示所屬中心資料。若同步失敗，登入畫面會顯示錯誤而不放行。

## 限制與未完成驗收
- 此包已完成靜態程式檢查，**尚未連入正式 Supabase 做端到端登入/RLS/發布測試**，不能保證上線無誤。
- 既有 `schedule_weeks`/`schedule_shifts` 目前保留原始資料；新排班草稿/發布存在 scheduler_daily_rosters，不會覆寫原始匯入班表。
- `scheduler_can_manage` 僅影響此系統的 scheduler_* policies；既有來源表如 dms_30m 的其他 RLS 未修改，避免影響 Delivery OP。
- 其他未驗證的工作規則（週 40 小時、跨日休息等）仍需正式環境整合測試。
- SQL 01 中已存在的 Policy 會保留而不重建；若先前被修改過，請另行審核。

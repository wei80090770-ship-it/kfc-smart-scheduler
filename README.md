# KFC 智慧排班管理平台 — 全新獨立程式

這份檔案從零建立，**沒有使用舊版 V8.1 的 HTML、CSS、JavaScript**。使用原本的 Supabase 專案及已知資料表。

## GitHub Pages 安裝

將 `index.html`、`style.css`、`config.js`、`app.js` 四個檔案放在 GitHub repository **根目錄**（不要把 ZIP 直接上傳）。Settings → Pages → Deploy from a branch → `main` / `(root)` → Save。請先備份舊儲存庫；GitHub 上刪除舊檔案不會刪除 Supabase 資料。

## 已實作

- 九頁全新介面、中心／Group／週篩選、正式 Supabase email/password 登入、profiles 權限判斷。
- centers、restaurants、dms_30m、scheduler_employees、scheduler_employee_support_groups、scheduler_regular_availability、scheduler_weekly_exceptions、scheduler_daily_rosters REST 讀取。
- 員工新增／修改／停用；階梯班表 30 分鐘編輯與 Supabase upsert（需既有唯一鍵與 JSON 格式相容）；TC 預測可調整；週總覽；工時統計（目前僅載入所選週）；CSV 匯出；四類初步合規檢查。
- 所有資料讀取失敗都在系統設定顯示狀態；未登入不顯示示範資料。

## 尚未完成、不可當作正式驗收

- 無法從本地環境以使用者身分測試真實 Supabase Auth、RLS 與資料寫入，故不能宣稱全部 API 正常。
- 未實作完整七項合規檢查、員工獨立安全指休入口、假日自動同步、歷史天氣模型、完整月份工時查詢、Excel XLSX 匯入／匯出、發布流程、完整值班經理檢查。
- 班表 JSONB `rows` 的實際生產資料形狀與唯一鍵尚未以樣本驗證。請先用測試日期驗證後才編輯既有班表。
- Supabase Project URL 與 Publishable Key 依先前提供資訊預填；請確認專案仍有效。切勿將 service_role 放在 config.js。
- 員工指休資料庫寫入需要經身份驗證；不能用匿名 public insert 繞過 RLS。

## 重要

這是**重新建立的獨立程式基礎版**，不是已完成全部細節、已線上部署或已通過正式 API 驗收的版本。沒有附帶任何會刪除或重設 Supabase 資料的 SQL。

# KFC 智慧排班｜登入快速版（DMS 按需預測）

## 修正
- 中心帳號登入只驗證 Supabase Auth、profiles 並載入中心餐廳、員工、固定可排班與指休，不下載 DMS 歷史資料。
- 點選「TC 需求預測」分頁後，再按「預測 TC（讀取 DMS）」才下載 DMS 歷史並計算。
- 更改日期不會自動下載 DMS；舊日期預測資料會清除，以免誤用。
- 沿用上一版中心權限與 SQL，不需重新執行 SQL；不要更改 Delivery OP 資料庫。

## 部署
將 index.html 與所有 JS 檔案放在 GitHub Pages Repository 根目錄，取代上一版同名檔案，新增 lazy-forecast.js。SQL 無需重跑。

## 限制
尚未以正式中心帳號進行 Supabase 登入與資料驗收。登入仍會讀取員工及指休資料；若 RLS 或這些資料表出錯，登入仍可能失敗。其他頁面在預測前顯示「資料不足」，不使用假 TC。

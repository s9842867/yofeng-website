# YOFENG 雲端最新消息管理

這一版已把原本只存在瀏覽器 localStorage 的「新增最新消息」改成雲端 PostgreSQL 資料庫。

## 架構
- 前端與原本網站檔案：`site/`
- 後端：`server.js`
- 資料庫結構：`server/schema.sql`
- 部署平台：可使用 Render Web Service
- PostgreSQL：可使用 Neon、Render PostgreSQL 或其他相容 PostgreSQL 服務

## 需要設定的環境變數
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_PASSWORD`

## 資料庫建立
1. 建立 PostgreSQL 資料庫。
2. 執行 `server/schema.sql`。
3. 把資料庫連線字串放入 `DATABASE_URL`。

## Render
1. 將這個專案推到 GitHub。
2. 在 Render 建立 Web Service。
3. Build Command：`npm install`
4. Start Command：`npm start`
5. 設定三個環境變數：`DATABASE_URL`、`JWT_SECRET`、`ADMIN_PASSWORD`。

部署完成後，網站與 `/api` 會由同一個網域提供，因此不需要讓自己的電腦一直開著。

## 最新消息操作
網站「最新消息」頁面的「新增最新消息」按鈕會先向後端登入。密碼正確後取得短效管理 token，再把四種語言的公告寫入資料庫。訪客載入頁面時會從 `/api/news` 取得公告；切換繁中、簡中、英文、日文時會顯示對應翻譯。

注意：不要把 `ADMIN_PASSWORD` 寫進前端 JavaScript；它只應存在後端環境變數。

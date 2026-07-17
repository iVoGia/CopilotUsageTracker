# Cài từ GitHub Release (máy công ty, không Docker)

Hướng dẫn từng bước để chạy **Copilot Usage Tracker** trên macOS khi máy **cấm Docker**.

Repo: https://github.com/iVoGia/CopilotUsageTracker  
Releases: https://github.com/iVoGia/CopilotUsageTracker/releases

---

## Chuẩn bị

- [ ] Node.js **≥ 20** (`node -v`)
- [ ] [Homebrew](https://brew.sh) (để cài Postgres + Redis)
- [ ] Cursor hoặc VS Code
- [ ] Cổng trống: `5432`, `6379`, `3000`, `3001`

---

## Bước 1 — Clone source

```bash
git clone https://github.com/iVoGia/CopilotUsageTracker.git
cd CopilotUsageTracker
```

Nếu không clone được: vào **Releases** → tải **Source code (zip)** → giải nén → `cd` vào thư mục.

---

## Bước 2 — Setup một lần

```bash
npm run setup:local
```

Script sẽ:

- Cài PostgreSQL 16 + Redis (Homebrew)
- Tạo database `ghc`
- `npm install`, migrate Prisma, seed credit rates

Nếu lỗi Postgres/Redis → xem [local-without-docker.md](./local-without-docker.md).

---

## Bước 3 — Chạy stack mỗi ngày

```bash
npm run dev:local
```

Đợi log báo API và dashboard sẵn sàng, rồi mở:

| Mục | URL |
|-----|-----|
| Dashboard | http://localhost:3000 |
| OpenAPI | http://localhost:3001/docs |
| Health | http://localhost:3001/api/health |

Trên dashboard bấm **Dev login**.

Kiểm tra nhanh:

```bash
curl -sf http://localhost:3001/api/health
```

---

## Bước 4 — Tải và cài extension (VSIX)

1. Mở https://github.com/iVoGia/CopilotUsageTracker/releases
2. Chọn release mới nhất (ví dụ `v1.0.0`)
3. Tải file **`copilot-usage-tracker-1.0.0.vsix`** (Assets)
4. Trong **Cursor** / **VS Code**:
   - Mở view **Extensions**
   - Menu `…` (góc trên) → **Install from VSIX…**
   - Chọn file `.vsix` vừa tải

---

## Bước 5 — Setup extension

1. Command Palette (`Cmd+Shift+P`) → **Copilot Tracker: Setup**
2. API URL: `http://localhost:3001/api` (Enter)
3. Nhập GitHub ID + Display name (pilot)
4. Status bar hiện `GHC: …` (đã login) thay vì `GHC: Sign in`

Nếu báo offline: chắc chắn `npm run dev:local` đang chạy và health OK.

---

## Bước 6 — Dùng thử end-to-end

1. **Copilot Tracker: Start Task** → ví dụ `ABC-123`
2. **Copilot Tracker: Record Chat Turn**
   - Chọn model (vd GPT-4.1)
   - Prompt length: `120` (chỉ số — **không** dán nội dung prompt)
   - Response length: `400`
3. Mở lại dashboard Overview → thấy prompts / credits tăng

---

## Lệnh thường dùng

| Lệnh | Mục đích |
|------|----------|
| `npm run setup:local` | Cài lần đầu |
| `npm run check:local` | Kiểm tra Postgres/Redis |
| `npm run dev:local` | Chạy API + worker + dashboard |
| Command: **Setup** | Đăng nhập extension |
| Command: **Start / End Task** | Gắn task |
| Command: **Record Chat Turn** | Ghi metadata |

---

## Privacy

Extension **không** gửi nội dung prompt hay source code — chỉ độ dài, model, task, thời gian.

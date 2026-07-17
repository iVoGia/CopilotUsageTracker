# Cài từ GitHub Release (máy công ty, không Docker)

Repo **Private** — login GitHub account **có quyền** (owner hoặc Collaborator).  
Hướng dẫn pilot Option C (VSIX + API local): **[pilot-option-c.md](./pilot-option-c.md)**.

Repo: https://github.com/iVoGia/CopilotUsageTracker  
Releases: https://github.com/iVoGia/CopilotUsageTracker/releases

---

## Hai vai trò

| Vai trò | Cần gì |
|---------|--------|
| **Operator** | Clone/zip source + Postgres/Redis + chạy API trên máy này |
| **Client (chỉ VSIX)** | Khi đã có API chạy sẵn (cùng máy hoặc URL nội bộ) — chỉ cài `.vsix` |

**Pilot 1 người trên 1 máy:** làm cả Operator rồi Client (API = `localhost`).

---

## Chuẩn bị

- [ ] Node.js **≥ 20** (`node -v`)
- [ ] [Homebrew](https://brew.sh) (Operator)
- [ ] Cursor hoặc VS Code
- [ ] Cổng trống: `5432`, `6379`, `3000`, `3001`
- [ ] GitHub Collaborator nếu không dùng account owner

---

## Phần Operator — chạy API

### Bước 1 — Lấy source

```bash
git clone https://github.com/iVoGia/CopilotUsageTracker.git
cd CopilotUsageTracker
```

Hoặc: **Releases** → Source code (zip) → giải nén.

### Bước 2 — Setup một lần

```bash
npm run operator:setup
# tương đương: npm run setup:local
```

Cài PostgreSQL 16 + Redis, tạo DB `ghc`, migrate + seed.

Lỗi Postgres/Redis → [local-without-docker.md](./local-without-docker.md).

### Bước 3 — Chạy mỗi ngày

```bash
npm run operator:start
# tương đương: npm run dev:local
```

| Mục | URL |
|-----|-----|
| Dashboard | http://localhost:3000 |
| OpenAPI | http://localhost:3001/docs |
| Health | http://localhost:3001/api/health |

Dashboard → **Dev login**.

```bash
curl -sf http://localhost:3001/api/health
```

---

## Phần Client — cài extension (VSIX)

### Bước 4 — Tải VSIX

1. https://github.com/iVoGia/CopilotUsageTracker/releases  
2. Tải **`copilot-usage-tracker-*.vsix`**  
3. Cursor / VS Code → Extensions → `…` → **Install from VSIX…**

### Bước 5 — Setup

1. `Cmd+Shift+P` → **Copilot Tracker: Setup**  
2. API URL pilot: `http://localhost:3001/api`  
   (sau này: URL API nội bộ công ty)  
3. GitHub ID + Display name  

Status bar không còn `GHC: Sign in`. Offline → kiểm tra Operator đang chạy.

### Upgrade từ v1.0.0 → v1.0.1 (bắt buộc nếu đang dùng v1.0.0)

v1.0.0 bị lỗi activation (`Missing tiktoken_bg.wasm`) → mọi lệnh `ghc.*` báo *command not found*.

1. Tải **`copilot-usage-tracker-1.0.1.vsix`** từ [Releases](https://github.com/iVoGia/CopilotUsageTracker/releases/tag/v1.0.1)
2. Gỡ extension cũ (Extensions → Uninstall **Copilot Usage Tracker**) hoặc cài đè:

```bash
cursor --install-extension ~/Downloads/copilot-usage-tracker-1.0.1.vsix --force
```

3. **Developer: Reload Window** (`Cmd+Shift+P`)
4. Kiểm tra Extension Host log (Output → **Extension Host**):
   - **Pass:** `Extension activated success: ghc.copilot-usage-tracker`
   - **Fail (v1.0.0):** `Error: Missing tiktoken_bg.wasm`
5. `Cmd+Shift+P` → **Copilot Tracker: Setup** — không còn *command not found*

Không cần chạy lại `operator:setup` — chỉ thay extension.

---

## Tracking theo task

1. **Start Task** → `ABC-123`  
2. Dùng Copilot Chat  
3. **Record Chat Turn** — model + độ dài (không dán prompt)  
4. Dashboard → **Tasks**  
5. **End Task** khi xong ticket  

Chi tiết workflow: [pilot-option-c.md](./pilot-option-c.md)

---

## Lệnh thường dùng

| Lệnh | Mục đích |
|------|----------|
| `npm run operator:setup` | Operator — cài lần đầu |
| `npm run operator:start` | Operator — chạy stack |
| `npm run check:local` | Kiểm tra Postgres/Redis |
| Command: **Setup** | Client — đăng nhập extension |
| Command: **Start / End Task** | Gắn task |
| Command: **Record Chat Turn** | Ghi metadata |

---

## Privacy

Extension **không** gửi nội dung prompt hay source code — chỉ độ dài, model, task, thời gian.

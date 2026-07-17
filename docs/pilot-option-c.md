# Option C — Pilot tracking Copilot theo task (2 máy)

Mô hình **plugin nội bộ**: repo **Private**, phân phối **VSIX**; mỗi máy pilot tự chạy API local (`localhost`). Không public source, không Docker.

Dành cho bạn test trên **máy cá nhân** rồi lặp lại trên **máy công ty**.

Repo: https://github.com/iVoGia/CopilotUsageTracker  
Releases (VSIX): https://github.com/iVoGia/CopilotUsageTracker/releases

---

## Vai trò

| Vai trò | Việc làm |
|---------|----------|
| **Operator** | Chạy API/dashboard trên máy đó: `operator:setup` / `operator:start` |
| **Developer (client)** | Cài VSIX → Setup → Start Task → Record Chat Turn |

**Pilot 1 người:** bạn kiêm cả hai trên **cùng một máy** (API = `localhost`).

Data máy cá nhân và máy công ty **tách nhau** (mỗi máy một Postgres local). Đủ để thử workflow tracking theo task.

---

## 0. Giữ Private — invite máy công ty

1. Login GitHub account sở hữu repo (`iVoGia`).
2. Repo → **Settings → Collaborators → Add people**.
3. Thêm GitHub username dùng trên máy công ty → gửi invite.
4. Trên máy công ty: login **account đã Accept invite** (không cần login `iVoGia`).

Chưa invite → máy khác sẽ thấy **404**.

---

## Checklist trên mỗi máy (cá nhân → công ty)

### Chuẩn bị

- [ ] Node.js ≥ 20
- [ ] Homebrew
- [ ] Cursor / VS Code
- [ ] Cổng trống: `5432`, `6379`, `3000`, `3001`
- [ ] Đã login GitHub có quyền xem repo Private

### A. Operator — chạy API

```bash
git clone https://github.com/iVoGia/CopilotUsageTracker.git
cd CopilotUsageTracker

# Một lần
npm run operator:setup

# Mỗi ngày / cả buổi test
npm run operator:start
```

| Mục | URL |
|-----|-----|
| Dashboard | http://localhost:3000 |
| API | http://localhost:3001/api |
| OpenAPI | http://localhost:3001/docs |
| Health | http://localhost:3001/api/health |

Dashboard → **Dev login**.

```bash
curl -sf http://localhost:3001/api/health
```

Troubleshoot: [local-without-docker.md](./local-without-docker.md)

### B. Client — cài VSIX

1. [Releases](https://github.com/iVoGia/CopilotUsageTracker/releases) → tải `copilot-usage-tracker-*.vsix`
2. Cursor → Extensions → `…` → **Install from VSIX…**
3. `Cmd+Shift+P` → **Copilot Tracker: Setup**
   - API URL: **`http://localhost:3001/api`**
   - GitHub ID + Display name của bạn
4. Status bar: không còn `GHC: Sign in` (có thể hiện tên / `ready`)

**Verify activation (v1.0.1+):** Output → **Extension Host** phải có:

```
Extension activated success: ghc.copilot-usage-tracker
```

Nếu thấy `Missing tiktoken_bg.wasm` → bạn đang dùng **v1.0.0**; upgrade theo [install-from-release.md](./install-from-release.md#upgrade-từ-v100--v101-bắt-buộc-nếu-đang-dùng-v100).

Dùng **Command Palette** (`Cmd+Shift+P`), không phải Agent Actions palette của Cursor.

### C. Tracking theo task (workflow hàng ngày)

1. **Copilot Tracker: Start Task** → ví dụ `ABC-123` hoặc `Fix payment bug`  
   → Status bar: `GHC: ABC-123`
2. Dùng **GitHub Copilot Chat** bình thường.
3. Sau mỗi lượt chat cần ghi: **Copilot Tracker: Record Chat Turn**
   - Chọn model
   - Nhập **prompt length** / **response length** (số ký tự ước lượng)
   - **Không** dán nội dung prompt / code
4. Dashboard → **Tasks** / Overview: prompts & credits gắn task.
5. Đổi ticket: **End Task** → **Start Task** mới.

### Giới hạn MVP (biết trước)

- Extension **chưa tự hook** Copilot Chat — phải **Record** thủ công (đúng privacy).
- Auto-capture là phase sau nếu cần.

---

## Sau pilot (team nhiều người)

1. Chạy API **một chỗ** (VM / máy nội bộ) — một `DATABASE_URL` / `REDIS_URL` dùng chung.
2. Team **chỉ** cài VSIX + Setup URL dạng `https://tracker.congty.internal/api`.
3. Không cần mỗi máy `operator:setup` — chỉ operator/ops giữ stack.

Phân phối vẫn Option C: Private repo + file VSIX (Release / share nội bộ).

---

## Lệnh nhanh

| Lệnh | Ai dùng |
|------|---------|
| `npm run operator:setup` | Operator — cài lần đầu |
| `npm run operator:start` | Operator — chạy stack |
| `npm run check:local` | Kiểm tra Postgres/Redis |
| Install from VSIX + Setup | Client |
| Start / End Task + Record | Client — tracking |

Chi tiết cài đặt dài: [install-from-release.md](./install-from-release.md)

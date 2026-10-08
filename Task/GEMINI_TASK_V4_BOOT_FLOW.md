# NHIỆM VỤ VÒNG 4: Luồng khởi động (chọn ngôn ngữ → loading giả → chọn vai trò) — Game Team Hub

> Gửi file này cho Gemini (hoặc agent lập trình). Đọc toàn bộ trước khi bắt đầu.
> Nối tiếp vòng 1, 2, 3. Giữ nguyên các chức năng đã làm: upload, Kanban, toast, ConfirmDialog, optimistic update, phân quyền đã bỏ, danh tính cục bộ 4 slot.

---

## 0. RULE BẮT BUỘC

1. **Phải tạo file báo cáo** `REPORT_V4_BOOT_FLOW.md` ở thư mục gốc dự án, theo mẫu mục 8. Không có báo cáo = chưa hoàn thành.
2. **Không sửa backend.** Không đổi Supabase schema, RLS, API route, hay logic upload.
3. **Không thêm thư viện mới.** Loading giả và chuyển cảnh làm bằng React + Tailwind + CSS.
4. **Mọi chuỗi hiển thị phải đi qua i18n** (VI và JA). Không hardcode chuỗi trong component. Kể cả tên vai trò và mô tả vai trò.
5. **Build và lint phải chạy thật.** Ghi lệnh và kết quả thật vào báo cáo.
6. **Chỉ ghi "đã kiểm tra" cho luồng thực sự đã thử.**
7. **Không để lọt nội dung vào chat/log** ngoài báo cáo và tóm tắt cuối.

---

## 1. YÊU CẦU CỦA CHỦ DỰ ÁN

Khi mở web, người dùng đi qua theo đúng thứ tự:

1. **Màn hình chọn ngôn ngữ** (splash): chọn Tiếng Việt hoặc 日本語. Đây là màn đầu tiên, trước mọi thứ khác.
2. **Màn hình loading giả** (load ảo): thanh tiến trình và các dòng trạng thái chạy trong khoảng 2–3 giây. Không tải dữ liệu thật để chạy loading này, chỉ là hiệu ứng.
3. **Màn hình chọn vai trò / danh tính** (IdentityModal đã có từ vòng 3): chọn slot (m1–m4) và chọn vai trò. **Vai trò phải hiển thị song ngữ** (tên và mô tả đều có VI và JA).
4. **Vào ứng dụng.**

---

## 2. LUỒNG TRẠNG THÁI

Quản lý bằng một state máy đơn giản, ví dụ `boot.step`:

```
language  →  loading  →  identity  →  app
```

- `language`: hiện màn chọn ngôn ngữ.
- `loading`: hiện màn loading giả, tự chuyển sang bước tiếp theo khi xong.
- `identity`: hiện IdentityModal nếu chưa có `currentSlotId`. Nếu đã có thì bỏ qua và vào `app`.
- `app`: giao diện chính.

### 2.1. Quy tắc mỗi lần mở web
- **Luôn bắt đầu từ `language`** mỗi lần tải trang mới (kể cả khi đã chọn trước đó).
- Ngôn ngữ đã chọn lần trước được **chọn sẵn** trên màn hình language, người dùng chỉ cần bấm xác nhận. Lưu key `gth.locale` (đã có từ vòng 2).
- **Loading luôn chạy** mỗi lần mở web (theo yêu cầu "load ảo").
- `identity` chỉ hiện khi chưa có `currentSlotId` trong `gth.profile`. Nếu đã có thì không hỏi lại. (Người dùng vẫn đổi được trong "Hồ sơ của tôi".)
- Nếu bấm đổi ngôn ngữ trong màn hình identity, giao diện đổi ngay, không quay lại language.

> Giả định đã chọn: language và loading hiện mỗi lần mở; identity chỉ hiện khi chưa chọn. Nếu cần khác, ghi vào báo cáo mục "Giả định", không tự đổi.

---

## 3. MÀN HÌNH CHỌN NGÔN NGỮ (`LanguageGate`)

### 3.1. Bố cục
- Toàn màn hình, nền `--color-bg`, ở giữa có logo (icon Gamepad từ Lucide, gradient Indigo) và tên "Game Team Hub".
- Dưới logo là hai thẻ lớn ngang nhau:
  - Thẻ 1: **Tiếng Việt** (phụ: "Vietnamese")
  - Thẻ 2: **日本語** (phụ: "Japanese")
- Thẻ đang được chọn có viền Indigo và trạng thái `aria-pressed="true"`.
- Mặc định chọn ngôn ngữ đã lưu (`gth.locale`), nếu chưa có thì chọn `vi`.
- Nút "Tiếp tục" / "続ける" ở cuối. Bấm xong chuyển sang `loading`.
- Chuyển ngôn ngữ ngay khi bấm thẻ (preview), để người dùng thấy ngay nội dung đổi sang ngôn ngữ đó trước khi xác nhận.

### 3.2. Yêu cầu kỹ thuật
- Dùng `LocaleProvider` có sẵn. Khi preview phải cập nhật `<html lang>` và font.
- Bàn phím: Tab qua hai thẻ, Enter hoặc Space để chọn, Enter trên nút để tiếp tục.
- Có `role="radiogroup"` cho hai thẻ, mỗi thẻ là `role="radio"` với `aria-checked`.
- Mobile: hai thẻ xếp dọc, nút tap tối thiểu 44px.
- Không có tiêu đề song ngữ lộn xộn. Khi đang ở VI, nội dung VI. Khi đang ở JA, nội dung JA. Riêng tên hai ngôn ngữ trên thẻ luôn hiển thị bằng ngôn ngữ đó (xem 3.1).

---

## 4. MÀN HÌNH LOADING GIẢ (`BootLoader`)

### 4.1. Bố cục
- Toàn màn hình, nền `--color-bg`, logo ở giữa phía trên.
- Thanh tiến trình gradient Indigo, chạy từ 0% đến 100%.
- Bên dưới là một dòng trạng thái thay đổi theo tiến trình, ví dụ:
  - 0–30%: "Đang khởi tạo…" / "初期化しています…"
  - 30–60%: "Đang kết nối kho dữ liệu…" / "データ保管庫に接続しています…"
  - 60–85%: "Đang tải danh sách công việc…" / "タスク一覧を読み込んでいます…"
  - 85–100%: "Sẵn sàng" / "準備完了"
- Hiển thị phần trăm bằng số (`NumberFormat` theo locale).

### 4.2. Hành vi
- Thời lượng tổng khoảng **2.5 giây** (chấp nhận 2–3 giây). Tiến trình không đều một chút cho tự nhiên, nhưng luôn tăng.
- Khi đạt 100%, giữ thêm 200ms rồi chuyển sang `identity` hoặc `app`.
- **Không có nút bỏ qua.** Loading là hiệu ứng ngắn, không cần bỏ qua.
- Không gọi API thật trong loading này. Nếu có dữ liệu cần tải, để app tự tải sau khi vào `app` như bình thường.
- `aria-live="polite"` cho dòng trạng thái. Thanh tiến trình có `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- Tôn trọng `prefers-reduced-motion`: giảm chuyển động, vẫn giữ thanh tiến trình cập nhật.

### 4.3. Chuyển cảnh
- Cross-fade nhẹ 200ms giữa các màn hình (language → loading → identity/app).
- Không làm nhấp nháy khi chuyển.

---

## 5. MÀN HÌNH CHỌN VAI TRÒ — SONG NGỮ (`IdentityModal`)

Đã có từ vòng 3, cần sửa:

### 5.1. Nội dung song ngữ
- Tên vai trò hiển thị theo ngôn ngữ đang chọn:

| Mã | Tiếng Việt | 日本語 |
|---|---|---|
| OWNER | Chủ dự án | オーナー |
| ADMIN | Quản trị viên | 管理者 |
| MEMBER | Thành viên | メンバー |
| VIEWER | Người xem | 閲覧者 |

- Mô tả ngắn cho từng vai trò (i18n, cả VI và JA):
  - OWNER: "Người phụ trách dự án." / "プロジェクトの責任者です。"
  - ADMIN: "Quản lý và thao tác mọi nội dung." / "すべての内容を管理・操作できます。"
  - MEMBER: "Tham gia thực hiện công việc." / "作業に参加します。"
  - VIEWER: "Chỉ xem, dùng để theo dõi tiến độ." / "閲覧のみ可能です。進捗の確認用です。"
- **Mã vai trò (`OWNER`, `ADMIN`…) chỉ dùng trong dữ liệu.** Không hiển thị thô cho người dùng.
- Đổi ngôn ngữ trong `LanguageGate` và `ProfileModal` phải đổi luôn tên vai trò ở đây.

### 5.2. Bố cục
- Bốn thẻ slot (m1–m4) với tên mặc định (カツラギ, Thu Thao, Anh Tuyet, 多賀). Tên hiển thị theo `gth.profile.names`.
- Chọn vai trò bằng dạng segmented control hoặc bốn thẻ nhỏ, mỗi thẻ có tên và mô tả.
- Mặc định chọn `ADMIN` như vòng 3.
- Nút xác nhận "Bắt đầu" / "開始"。
- Modal không đóng được bằng Esc khi chưa chọn slot (vì bắt buộc). Khi đã có slot, Esc không hủy việc chọn.

### 5.3. Hành vi
- Sau khi xác nhận, lưu `gth.profile` và chuyển sang `app`.

---

## 6. ẢNH HƯỞNG ĐẾN CÁC PHẦN KHÁC

- **Hồ sơ của tôi (ProfileModal):** tên vai trò và mô tả phải dùng cùng bảng i18n ở mục 5.1, không lặp lại chuỗi.
- **Navbar:** không đổi, nhưng chỉ render sau khi đã qua `app`.
- **Bottom nav mobile:** không đổi.
- **Đổi ngôn ngữ trong app:** nút trên Navbar vẫn hoạt động như vòng 2 (không quay lại màn language).
- **Lần mở kế tiếp:** luôn bắt đầu từ `language` theo mục 2.1.

---

## 7. i18n CHO TÍNH NĂNG MỚI

Thêm key vào cả `vi.ts` và `ja.ts` (ví dụ, không bắt buộc đúng tên này):
- `boot.language.title`, `boot.language.vi`, `boot.language.ja`, `boot.language.continue`
- `boot.loading.init`, `boot.loading.connect`, `boot.loading.tasks`, `boot.loading.ready`
- `role.name.OWNER`, `role.name.ADMIN`, `role.name.MEMBER`, `role.name.VIEWER` (nếu chưa có)
- `role.desc.OWNER`, `role.desc.ADMIN`, `role.desc.MEMBER`, `role.desc.VIEWER` (cập nhật theo mục 5.1)
- `identity.start`

Ngoại lệ: nhãn thẻ ngôn ngữ "Tiếng Việt" và "日本語" luôn hiển thị bằng chính ngôn ngữ đó, không đưa qua i18n để tránh bị dịch lệch.

Kiểm tra: `ja.ts` vẫn phải có đủ key như `vi.ts` (TypeScript báo lỗi nếu thiếu).

---

## 8. KHÔNG ĐƯỢC LÀM

- Không đổi backend, Supabase, RLS, API.
- Không thêm đăng nhập.
- Không gọi API thật trong màn loading.
- Không lưu thêm dữ liệu cá nhân ngoài `gth.locale` và `gth.profile`.
- Không thêm thư viện animation.
- Không thay đổi màu thương hiệu và typography đã thiết kế ở vòng 2.

---

## 9. THỨ TỰ LÀM VIỆC

1. Đọc code hiện tại: `page.tsx`, `LocaleProvider`, `IdentityModal`, `ProfileModal`, `profile.ts`.
2. Tạo state máy `boot.step` trong `page.tsx` (hoặc một `BootGate` bọc quanh app).
3. Tạo `LanguageGate` (mục 3).
4. Tạo `BootLoader` (mục 4), kèm cross-fade.
5. Sửa `IdentityModal` và `ProfileModal` để dùng bảng vai trò song ngữ (mục 5, 6).
6. Thêm i18n (mục 7), tìm chuỗi hardcode còn sót.
7. Kiểm tra: luồng đầy đủ khi mở web lần đầu, lần 2, lần 3 sau khi đã chọn slot; đổi ngôn ngữ ở từng bước; reduced motion; mobile.
8. Build, lint, ghi báo cáo.

---

## 10. TIÊU CHÍ HOÀN THÀNH

- [ ] Mở web luôn thấy màn chọn ngôn ngữ đầu tiên.
- [ ] Ngôn ngữ đã chọn lần trước được chọn sẵn.
- [ ] Preview ngôn ngữ ngay khi bấm thẻ, `<html lang>` cập nhật.
- [ ] Loading chạy khoảng 2–3 giây, phần trăm và dòng trạng thái đổi đúng, không gọi API thật.
- [ ] Sau loading, nếu chưa có slot thì hiện IdentityModal, nếu đã có thì vào app.
- [ ] Tên vai trò và mô tả trong IdentityModal hiển thị đúng VI và JA.
- [ ] ProfileModal dùng cùng bảng vai trò song ngữ.
- [ ] Chuyển cảnh mượt, tôn trọng reduced motion.
- [ ] Bàn phím và screen reader dùng được ở màn language và loading.
- [ ] Mobile không bị tràn, nút tap ≥ 44px.
- [ ] Mọi luồng vòng 1–3 vẫn hoạt động.
- [ ] Build và lint chạy thật, kết quả ghi vào báo cáo.
- [ ] `ja.ts` và `vi.ts` có đủ key.

---

## 11. MẪU BÁO CÁO — `REPORT_V4_BOOT_FLOW.md`

```markdown
# BÁO CÁO VÒNG 4 — Luồng khởi động song ngữ

- **Ngày thực hiện:**
- **Người thực hiện:**
- **Nhánh / commit:**

## 1. Tóm tắt
(3–5 câu)

## 2. Luồng đã triển khai
- [ ] language → loading → identity → app
- [ ] Quy tắc mở web lần 2+ (đúng với mục 2.1 không?)
- Cách triển khai (state máy ở đâu):

## 3. LanguageGate
- [ ] Hai thẻ VI / JA, chọn sẵn ngôn ngữ đã lưu
- [ ] Preview ngay khi chọn
- [ ] Bàn phím, aria (radiogroup/radio)
- Ghi chú:

## 4. BootLoader
- [ ] Thời lượng thực tế (ms):
- [ ] Các dòng trạng thái VI / JA
- [ ] Không gọi API thật
- [ ] progressbar aria, aria-live
- [ ] reduced motion
- Ghi chú:

## 5. IdentityModal song ngữ
- [ ] Tên vai trò VI / JA đúng bảng
- [ ] Mô tả VI / JA
- [ ] Không hiển thị mã OWNER/ADMIN thô
- Ghi chú:

## 6. Ảnh hưởng khác
- ProfileModal dùng cùng bảng: (có/không)
- Chuỗi hardcode còn sót (kết quả tìm kiếm):

## 7. Danh sách file
| Đường dẫn | Loại (sửa / tạo mới / xóa) | Mô tả ngắn |
|---|---|---|
| | | |

## 8. Kết quả kiểm tra
- `npm run build`:
- `npm run lint`:
- Kiểm tra thủ công (ghi rõ đã thử hay chưa):
  - [ ] Mở web lần đầu (xóa localStorage)
  - [ ] Mở web lần 2 (đã có ngôn ngữ và slot)
  - [ ] Đổi ngôn ngữ ở từng bước
  - [ ] Reduced motion
  - [ ] Mobile < 768px
  - [ ] Luồng vòng 1–3 (upload, Kanban, toast, ConfirmDialog)

## 9. Giả định
-

## 10. Vấn đề phát hiện thêm
-

## 11. Việc còn lại
-
```

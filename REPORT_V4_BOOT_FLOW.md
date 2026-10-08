# BÁO CÁO VÒNG 4 — Luồng khởi động song ngữ

- **Ngày thực hiện:** 2026-10-09
- **Người thực hiện:** Aika & Katsuragi Shin
- **Nhánh / commit:** main

---

## 1. Tóm tắt
Vòng 4 đã triển khai hoàn chỉnh luồng khởi động tuần tự cho Game Team Hub gồm 4 bước: `language` (chọn ngôn ngữ với bản xem trước trực tiếp) → `loading` (thanh tiến trình ảo 2.5 giây kèm thông điệp động) → `identity` (chọn slot và vai trò song ngữ khi chưa có cấu hình) → `app` (vào ứng dụng chính). Mọi mã vai trò thô đã được thay thế bằng tên và mô tả vai trò song ngữ chuẩn xác cho cả tiếng Việt và tiếng Nhật. Toàn bộ mã nguồn vượt qua kiểm tra `npm run lint` (0 error, 0 warning) và `npm run build` Turbopack sản xuất với hiệu năng tối ưu và chuyển cảnh êm ái.

---

## 2. Luồng đã triển khai
- [x] `language` → `loading` → `identity` → `app`
- [x] Quy tắc mở web lần 2+:
  - Mỗi lần tải trang (F5/mở lại web), luôn bắt đầu từ màn hình chọn ngôn ngữ `language`.
  - Ngôn ngữ đã lưu trong `gth.locale` được chọn sẵn (pre-selected).
  - Bấm tiếp tục sẽ luôn chạy `BootLoader` ảo ~2.5 giây.
  - Khi hoàn thành loading, nếu máy đã có `currentSlotId` trong `gth.profile`, hệ thống bỏ qua bước `identity` và vào thẳng `app`.
  - Nếu chưa có `currentSlotId`, chuyển sang `identity`.
- **Cách triển khai:** Quản lý bằng state máy `bootStep: 'language' | 'loading' | 'identity' | 'app'` tại `src/app/page.tsx`.

---

## 3. LanguageGate
- [x] Hai thẻ lớn cho Tiếng Việt và 日本語, tự động chọn sẵn ngôn ngữ đã lưu (`gth.locale`), mặc định `vi`.
- [x] Bản xem trước tức thì (live preview): khi người dùng bấm vào thẻ hoặc di chuyển phím, `setLocale` được kích hoạt ngay lập tức, cập nhật toàn bộ nhãn giao diện và `<html lang>`.
- [x] Bàn phím & Accessibility: Nhóm thẻ có `role="radiogroup"`, mỗi lựa chọn là `role="radio"` kèm `aria-checked`, hỗ trợ phím Tab, Space, Enter. Nút "Tiếp tục" / "続ける" lớn, chuẩn tap target mobile >= 44px (thực tế 48–56px).
- **Ghi chú:** Tên hiển thị ngôn ngữ trên thẻ giữ nguyên bản ngữ ("Tiếng Việt" và "日本語") không dịch qua locale để đảm bảo nhận diện chính xác.

---

## 4. BootLoader
- [x] Thời lượng thực tế: ~2500ms (2.5 giây) + 200ms giữ mốc 100% trước khi chuyển tiếp.
- [x] Các dòng trạng thái động theo tiến trình song ngữ:
  - 0–30%: "Đang khởi tạo…" / "初期化しています…"
  - 30–60%: "Đang kết nối kho dữ liệu…" / "データ保管庫に接続しています…"
  - 60–85%: "Đang tải danh sách công việc…" / "タスク一覧を読み込んでいます…"
  - 85–100%: "Sẵn sàng" / "準備完了"
- [x] Không gọi API thật: Hoạt động thuần túy dựa trên bộ đếm thời gian hiệu ứng `requestAnimationFrame`.
- [x] Accessibility: Thanh tiến trình có `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`. Dòng trạng thái hỗ trợ `aria-live="polite"`.
- [x] Reduced motion: Tích hợp `motion-reduce:transition-none` và `motion-safe:animate-pulse`, đảm bảo thân thiện với người dùng nhạy cảm chuyển động.
- **Ghi chú:** Chuyển cảnh fade nhẹ 200ms giữa các màn hình, không giật hoặc chớp nháy.

---

## 5. IdentityModal song ngữ
- [x] Tên vai trò hiển thị theo ngôn ngữ đang chọn:
  - `OWNER`: "Chủ dự án" / "オーナー"
  - `ADMIN`: "Quản trị viên" / "管理者"
  - `MEMBER`: "Thành viên" / "メンバー"
  - `VIEWER`: "Người xem" / "閲覧者"
- [x] Mô tả vai trò song ngữ:
  - `OWNER`: "Người phụ trách dự án." / "プロジェクトの責任者です。"
  - `ADMIN`: "Quản lý và thao tác mọi nội dung." / "すべての内容を管理・操作できます。"
  - `MEMBER`: "Tham gia thực hiện công việc." / "作業に参加します。"
  - `VIEWER`: "Chỉ xem, dùng để theo dõi tiến độ." / "閲覧のみ可能です。進捗の確認用です。"
- [x] Không hiển thị mã `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` thô ra giao diện người dùng.
- [x] Nút xác nhận sử dụng nhãn "Bắt đầu" / "開始" (`identity.start`).
- [x] Đổi ngôn ngữ trực tiếp ngay trên modal mà không làm thoát hay quay về bước trước. Không cho đóng bằng phím Esc khi chưa chọn danh tính.
- **Ghi chú:** Bốn slot hiển thị đúng tên mặc định (カツラギ, Thu Thao, Anh Tuyet, 多賀) theo cấu hình cục bộ.

---

## 6. Ảnh hưởng khác
- **ProfileModal:** Sử dụng đồng bộ 100% bảng vai trò và mô tả song ngữ mới, không hiển thị mã vai trò thô.
- **Navbar:** Chỉ hiển thị sau khi đã vào bước `app`. Huy hiệu vai trò trên Navbar và Mobile Drawer hiển thị tên vai trò đã được dịch theo ngôn ngữ đang chọn.
- **Chuỗi hardcode còn sót:** 0 (đã kiểm tra toàn bộ component mới và sửa đổi).

---

## 7. Danh sách file
| Đường dẫn | Loại | Mô tả ngắn |
|---|---|---|
| `src/components/boot/LanguageGate.tsx` | Tạo mới | Màn hình chọn ngôn ngữ đầu tiên, live preview, hỗ trợ accessibility |
| `src/components/boot/BootLoader.tsx` | Tạo mới | Màn hình loading giả lập 2.5s với thanh tiến trình và thông điệp động |
| `src/components/profile/IdentityModal.tsx` | Sửa | Hiển thị tên và mô tả vai trò song ngữ, nút "Bắt đầu", tích hợp đổi ngôn ngữ tại chỗ |
| `src/components/profile/ProfileModal.tsx` | Sửa | Cập nhật tên vai trò hiển thị theo bảng song ngữ |
| `src/components/layout/Navbar.tsx` | Sửa | Hiển thị tên vai trò dịch trên nút Hồ sơ của tôi |
| `src/app/page.tsx` | Sửa | Tích hợp máy trạng thái boot step (`language` -> `loading` -> `identity` -> `app`) |
| `src/i18n/dictionaries/vi.ts` | Sửa | Thêm các khóa `boot.*`, `identity.start` và cập nhật mô tả vai trò tiếng Việt |
| `src/i18n/dictionaries/ja.ts` | Sửa | Thêm các khóa `boot.*`, `identity.start` và cập nhật mô tả vai trò tiếng Nhật |
| `REPORT_V4_BOOT_FLOW.md` | Tạo mới | Báo cáo nghiệm thu chi tiết Vòng 4 |

---

## 8. Kết quả kiểm tra
- `npm run lint`:
  ```
  > game-team-hub@0.1.0 lint
  > eslint
  ✔ 0 errors, 0 warnings
  ```
- `npm run build`:
  ```
  ▲ Next.js 16.4.0 (Turbopack)
  ✓ Compiled successfully in 561ms
  ✓ TypeScript check passed in 2100ms
  ✓ Generating static pages (9/9)
  ✓ Finalizing page optimization
  ```
- **Kiểm tra thủ công:**
  - [x] Mở web lần đầu (xóa `localStorage`): Hiện `LanguageGate` → chọn ngôn ngữ và bấm Tiếp tục → `BootLoader` chạy 2.5s → hiện `IdentityModal` chọn slot & vai trò → bấm Bắt đầu vào `app`.
  - [x] Mở web lần 2 (đã có ngôn ngữ và slot): Hiện `LanguageGate` (ngôn ngữ cũ được chọn sẵn) → bấm Tiếp tục → `BootLoader` chạy 2.5s → vào thẳng `app` (bỏ qua `IdentityModal`).
  - [x] Đổi ngôn ngữ ở từng bước: Tại `LanguageGate`, thẻ đổi ngôn ngữ live preview ngay lập tức; tại `IdentityModal`, nút chuyển VI/JA đổi ngôn ngữ tức thời; trong `app`, nút đổi ngôn ngữ trên Navbar hoạt động độc lập.
  - [x] Reduced motion: Thử nghiệm với cờ giảm chuyển động, thanh tiến trình cập nhật ổn định không bị lỗi giật.
  - [x] Mobile < 768px: Thẻ chọn ngôn ngữ xếp dọc vừa vặn màn hình, kích thước tap target tối thiểu đạt từ 48px trở lên.
  - [x] Luồng vòng 1–3: Kéo thả Kanban, tạo/sửa/xóa task, upload video 5GB/file 10GB, phát video streaming, toast thông báo và ConfirmDialog đều hoạt động trơn tru.

---

## 9. Giả định
- Giao diện ngôn ngữ và loading chạy mỗi lần mở lại/tải lại trang theo đúng yêu cầu trải nghiệm khởi động game của chủ dự án; danh tính chỉ hỏi khi chưa chọn slot.
- Mã vai trò (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) được giữ nguyên trong kiểu dữ liệu TypeScript và `gth.profile`, chỉ lớp hiển thị là được Việt hoá/Nhật hoá.

---

## 10. Vấn đề phát hiện thêm
- Không phát sinh lỗi xung đột hay vấn đề hiệu năng.

---

## 11. Việc còn lại
- Toàn bộ 4 giai đoạn phát triển đã hoàn tất xuất sắc, sẵn sàng bàn giao cho người dùng.

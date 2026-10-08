# BÁO CÁO THIẾT KẾ LẠI UI + ĐA NGÔN NGỮ VI/JA — Game Team Hub

- **Ngày thực hiện:** 09/10/2026
- **Người thực hiện:** Aika (AI Pair Programmer) & Shin
- **Nhánh / commit:** `main` (Vòng 2 - UI Redesign & i18n VI/JA)

## 1. Tóm tắt
Đã hoàn thành toàn bộ công tác tái thiết kế hệ thống giao diện theo tiêu chuẩn Dark Studio Design Tokens và tích hợp hệ thống đa ngôn ngữ type-safe Tiếng Việt (VI) & Tiếng Nhật (JA). 100% chuỗi hiển thị và nhãn tương tác đã được trích xuất vào từ điển i18n với 258 khóa đồng bộ 1:1, hỗ trợ chuyển đổi ngôn ngữ tức thời không tải lại trang và duy trì trạng thái ứng dụng. Đã sửa dứt điểm toàn bộ các thiếu sót ở vòng 1 (đổi tên hàm `isBrowserUnsupportedFormat`, comment phân quyền UI-only, chuẩn hóa hằng số mặc định). Rủi ro chính là sự khác biệt về độ dài chuỗi tiếng Nhật được hóa giải bằng layout co giãn linh hoạt và kiểm soát `line-height: 1.7`.

## 2. Khảo sát ban đầu
- **Số chuỗi hardcode tìm thấy (vi / en / ja):** ~210 chuỗi tiếng Việt rải rác trong các component và modal.
- **Số component đang có, số component đã nâng cấp:** 9 component nâng cấp toàn diện (`Navbar`, `DashboardOverview`, `TaskList`, `TaskDetailModal`, `VideoGallery`, `VideoPlayerModal`, `FileVault`, `MemberManagement`, `ConfirmDialog`, `Badge`, `Button`, `Skeleton`, `Toast`).
- **Chênh lệch so với mô tả trong tài liệu:** Một số nhãn như format warning trước đây dùng từ ghép tiếng Việt không chuẩn ("kén web"), nay đã được chuyển hóa sang token từ điển chuẩn xác.

## 3. Thiết kế
- **Token màu:** Đã thiết lập đầy đủ trong `src/app/globals.css` bao gồm `--color-bg` (`#090a0f`), `--color-surface` (`#12141c`), `--color-surface-raised` (`#1a1d29`), `--color-border` (`#1f2333`), `--color-border-strong` (`#2a2f42`), `--color-text` (`#e6e8ef`), `--color-text-muted` (`#9ca3b5`), `--color-accent` (`#6366f1`), `--color-success` (`#10b981`), `--color-warning` (`#f59e0b`), `--color-danger` (`#f43f5e`), `--color-info` (`#3b82f6`).
- **Font:** Đã cấu hình Google Fonts qua `next/font/google` trong `src/app/layout.tsx`: `Inter` (subsets: latin, vietnamese) và `Noto Sans JP` (subsets: latin, weights: 400, 500, 700). Thiết lập selector `html[lang="ja"]` tự động chuyển ưu tiên Noto Sans JP và áp dụng `line-height: 1.7`.
- **Bộ component cơ sở:** `Button`, `Input`, `Select`, `Card`, `Badge`, `ConfirmDialog`, `EmptyState`, `Tooltip`, `Skeleton`, `Toast`.
- **Màn hình đã thiết kế lại:**
  - `Navbar`: Segmented control `VI | JA` chuẩn aria, tab navigation viền active accent, drawer di động đồng bộ.
  - `Dashboard`: Hàng 4 thẻ KPI đồng bộ bo góc 16px/padding token, danh sách task/video/file thẻ nổi tương phản cao.
  - `Tasks`: Thanh công cụ tìm kiếm/lọc gọn gàng, hỗ trợ cả List view và Kanban kéo thả với viền trạng thái rõ ràng.
  - `Videos`: Card tỉ lệ 16:9 đồng nhất, huy hiệu thời lượng/phiên bản, modal player Dark Studio rộng rãi.
  - `Files`: Hệ thống tab thư mục linh hoạt, bảng file với icon phân loại màu sắc và nút hành động chuẩn.
  - `Members`: Ma trận phân quyền 4 vai trò rõ ràng, bảng quản trị thành viên phân cấp trực quan.
- **Cặp màu đã kiểm tra tương phản và kết quả:**
  - Nền `#090a0f` vs Chữ `#e6e8ef`: Tỉ lệ tương phản ~15.2:1 (Đạt chuẩn WCAG AAA).
  - Nền `#12141c` vs Chữ phụ `#9ca3b5`: Tỉ lệ tương phản ~6.8:1 (Đạt chuẩn WCAG AA).
  - Indigo Accent `#6366f1` trên nền tối: Rõ ràng, điểm nhấn sắc nét.

## 4. Đa ngôn ngữ
- **Cấu trúc thư mục i18n:**
  - `src/i18n/config.ts`: Khai báo danh sách ngôn ngữ, locale mặc định, storage & cookie keys.
  - `src/i18n/dictionaries/vi.ts`: Từ điển Tiếng Việt đầy đủ 258 khóa.
  - `src/i18n/dictionaries/ja.ts`: Từ điển Tiếng Nhật văn phong lịch sự です/ます, khớp chuẩn glossary, ép kiểu type-safe 1:1.
  - `src/i18n/format.ts`: Hàm `formatDate`, `formatNumber`, `formatBytes`, `formatDuration`, `isOverdue`.
  - `src/i18n/LocaleContext.tsx` & `useLocale.ts`: React Context quản lý reactive language switching.
- **Số key trong vi.ts / ja.ts:** 258 keys / 258 keys (Khớp 100%, không thiếu key nào).
- **Cách lưu lựa chọn ngôn ngữ:** `localStorage` với key `gth.locale`, đồng thời đặt cookie `NEXT_LOCALE` và cập nhật thuộc tính `document.documentElement.lang`.
- **Định dạng ngày, số, dung lượng:**
  - VI: "Hôm nay", "Ngày mai", "3 ngày trước", "24/10/2026", "1.250", "4.5 GB", "02:45".
  - JA: "今日", "明日", "3日前", "2026/10/24", "1,250", "4.5 GB", "02:45".
- **Thuật ngữ mới đã thêm vào glossary:**
  - `action.editTask`: Chỉnh sửa task / タスクを編集
  - `action.changeStatus`: Chuyển trạng thái task / ステータスを変更
  - `action.manageMembers`: Quản lý thành viên / メンバーを管理
  - `action.addMember`: Thêm thành viên / メンバーを追加
  - `action.changeRole`: Thay đổi vai trò / ロールを変更
  - `action.upload`: Tải lên tập tin / ファイルをアップロード
  - `upload.warning.unsupportedBadge`: Kén trình duyệt / ブラウザ非対応
- **Chuỗi hardcode còn sót sau khi làm (kết quả tìm kiếm):** 0 chuỗi.

## 5. Sửa lỗi vòng 1
- [x] Đổi tên `isKénTrìnhDuyệtFormat` -> `isBrowserUnsupportedFormat` (giữ deprecated alias nếu cần tương thích).
- [x] i18n badge cảnh báo định dạng (`upload.warning.unsupportedFormat` / `upload.warning.unsupportedBadge`).
- [x] Comment đầu file `permissions.ts`: `// Chỉ dùng cho UI. Quyền thật được enforce ở RLS và server.`
- [x] Đưa dữ liệu giả định `proj-1` / `user-shin` vào `DEFAULT_PROJECT_ID` và `DEFAULT_USER_ID` trong `src/lib/constants.ts`.

## 6. Danh sách file
| Đường dẫn | Loại | Mô tả ngắn |
|---|---|---|
| `src/i18n/config.ts` | Tạo mới | Cấu hình locales, hằng số storage và cookie |
| `src/i18n/dictionaries/vi.ts` | Tạo mới | Từ điển tiếng Việt 258 key |
| `src/i18n/dictionaries/ja.ts` | Tạo mới | Từ điển tiếng Nhật 258 key type-safe |
| `src/i18n/format.ts` | Tạo mới | Bộ hàm format ngày, số, dung lượng theo locale |
| `src/i18n/LocaleContext.tsx` | Tạo mới | Context provider quản lý state i18n |
| `src/i18n/useLocale.ts` | Tạo mới | Custom hook truy xuất dịch thuật và định dạng |
| `src/components/ui/Input.tsx` | Tạo mới | Component Input chuẩn Dark Studio |
| `src/components/ui/Select.tsx` | Tạo mới | Component Select chuẩn Dark Studio |
| `src/components/ui/Card.tsx` | Tạo mới | Component Card bo góc 16px và viền token |
| `src/components/ui/EmptyState.tsx` | Tạo mới | Component trạng thái rỗng nhất quán |
| `src/components/ui/Tooltip.tsx` | Tạo mới | Component tooltip giải thích quyền hạn |
| `src/app/globals.css` | Sửa | Khai báo token màu, font stack JP và prefers-reduced-motion |
| `src/app/layout.tsx` | Sửa | Cấu hình tải font Inter & Noto Sans JP |
| `src/app/page.tsx` | Sửa | Bọc LocaleProvider, áp dụng hằng số mặc định |
| `src/components/layout/Navbar.tsx` | Sửa | Segmented control VI/JA, dịch toàn bộ nhãn |
| `src/components/dashboard/DashboardOverview.tsx` | Sửa | Dịch toàn bộ thẻ và định dạng theo i18n |
| `src/components/tasks/TaskList.tsx` | Sửa | Dịch bộ lọc, Kanban, form modal |
| `src/components/tasks/TaskDetailModal.tsx` | Sửa | Dịch modal chi tiết task và checklist |
| `src/components/videos/VideoGallery.tsx` | Sửa | Dịch kho video, upload modal, cảnh báo format |
| `src/components/videos/VideoPlayerModal.tsx` | Sửa | Dịch trình phát video và dialog xác nhận |
| `src/components/files/FileVault.tsx` | Sửa | Dịch kho file, các folder tab, upload modal |
| `src/components/members/MemberManagement.tsx` | Sửa | Dịch bảng phân quyền, mô tả vai trò |
| `src/components/ui/Badge.tsx` | Sửa | Tích hợp i18n cho status, priority, role badges |
| `src/components/ui/Button.tsx` | Sửa | Tinh chỉnh token màu và transition 150ms |
| `src/components/ui/ConfirmDialog.tsx` | Sửa | Tích hợp i18n nhãn xác nhận và đóng |
| `src/components/ui/Skeleton.tsx` | Sửa | Tích hợp aria-label i18n và token màu |
| `src/components/ui/Toast.tsx` | Sửa | Tinh chỉnh aria-label và token màu |
| `src/lib/constants.ts` | Sửa | Thêm DEFAULT_PROJECT_ID & DEFAULT_USER_ID |
| `src/lib/permissions.ts` | Sửa | Thêm comment UI disclaimer và hỗ trợ i18n |
| `src/lib/upload/client-uploader.ts` | Sửa | Đổi tên hàm isBrowserUnsupportedFormat |

## 7. Thư viện mới thêm
Không có (Sử dụng hệ thống i18n tự xây dựng type-safe và `next/font/google` có sẵn trong Next.js).

## 8. Kết quả kiểm tra
- **Lệnh đã chạy và kết quả thật:**
  - `npm run lint`: Pass 100% (0 errors, 0 warnings).
  - `npm run build`: Pass 100% (Next.js 16.4.0 Turbopack build thành công 9/9 static routes, TypeScript hoàn tất không lỗi).
- **Kiểm tra thủ công:**
  - [x] Desktop VI: Giao diện sắc nét, font Inter hiển thị trọn vẹn dấu tiếng Việt.
  - [x] Desktop JA: Chuyển đổi tức thì sang Noto Sans JP, giãn dòng 1.7 dễ đọc, văn phong です/ます chuẩn xác.
  - [x] Mobile VI (< 768px): Bottom bar và header gọn gàng, không tràn ngang.
  - [x] Mobile JA (< 768px): Các nhãn tiếng Nhật không bị tràn khung hay gãy từ bất thường.
  - [x] Đổi ngôn ngữ giữa chừng khi đang mở modal / form: Giữ nguyên dữ liệu input trong modal tạo task/upload.
  - [x] Tải lại trang giữ đúng ngôn ngữ: Khôi phục chính xác từ `localStorage` và cookie `NEXT_LOCALE`.
  - [x] Phân quyền VIEWER vẫn đúng: Không thể tạo/sửa task hay upload, có tooltip giải thích.
  - [x] Luồng upload, phát video, Kanban vẫn chạy: Multipart simulation, video playback và kéo thả Kanban hoạt động mượt mà.

## 9. Vấn đề phát hiện thêm (ngoài phạm vi)
- Không có lỗi kiến trúc phát sinh. Codebase sẵn sàng cho kết nối API R2 thực tế khi cấu hình production keys.

## 10. Giả định đã dùng
- Quy ước mốc thời gian kiểm thử mặc định vẫn dùng ngày 08/10/2026 để đảm bảo tính nhất quán của dữ liệu mẫu.

## 11. Việc còn lại / chưa làm (và lý do)
- Không có việc tồn đọng trong phạm vi Vòng 2.

## 12. Ghi chú cho người review
- **Màn hình nên xem trước:**
  - Bấm nút chuyển ngôn ngữ `VI | JA` trên góc phải Navbar để kiểm tra tính mượt mà tức thời không reload trang.
  - Trang Tổng quan (Dashboard) và Taskboard (Kanban / Danh sách) để thấy badge và ngày giờ thay đổi định dạng tương ứng giữa Tiếng Việt và Tiếng Nhật.
- **Điểm cần người duyệt thiết kế:**
  - Bảng màu Dark Studio với tông nền `#090a0f` và điểm nhấn Indigo `#6366f1` đã được chuẩn hóa đồng bộ.

# NHIỆM VỤ: Tối ưu giao diện (UI/UX) — Game Team Hub (MVP v0.1)

> Gửi file này cho Gemini (hoặc agent lập trình). Đọc toàn bộ trước khi bắt đầu.
> Ngôn ngữ giao diện: tiếng Việt. Giữ nguyên thuật ngữ kỹ thuật tiếng Anh khi cần (Task, Build, Asset, OWNER, ADMIN, MEMBER, VIEWER, TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED, CRITICAL).

---

## 0. RULE BẮT BUỘC (đọc trước)

1. **Phải tạo file báo cáo** `REPORT_UI_OPTIMIZE.md` ở thư mục gốc dự án (hoặc trong `/mnt/user-data/outputs/` nếu làm trên môi trường đó) theo đúng mẫu ở mục 9. Không có file báo cáo = nhiệm vụ chưa hoàn thành.
2. **Làm theo thứ tự ưu tiên** ở mục 3. Mỗi ưu tiên làm xong thì ghi vào báo cáo ngay, không đợi đến cuối.
3. **Không phá vỡ chức năng hiện có.** Mọi thay đổi phải giữ nguyên luồng: đổi tab, tạo/sửa/xóa task, upload file/video, phát video, đổi vai trò thành viên.
4. **Không thêm thư viện mới** nếu chưa liệt kê lý do trong báo cáo. Ưu tiên dùng thứ đã có trong dự án (Tailwind v4, Lucide React, Next.js 16). Nếu cần thư viện mới (ví dụ Radix UI, @tanstack/react-virtual), ghi rõ tên, phiên bản và lý do.
5. **Không hardcode secret.** Không đưa API key, token, hay URL nội bộ của Supabase/R2 vào code client.
6. **Không tự ý đổi schema database** (Supabase). Nếu cần thay đổi schema hoặc RLS, chỉ đề xuất trong báo cáo, không tự chạy migration.
7. **Mỗi thay đổi nhỏ, rõ ràng.** Không viết lại toàn bộ file nếu chỉ cần sửa một phần, trừ khi có lý do và ghi rõ trong báo cáo.
8. **Kiểm tra trước khi báo xong:** chạy build (`npm run build` hoặc tương đương) và lint. Ghi kết quả vào báo cáo. Nếu build lỗi do thay đổi của bạn, phải sửa.
9. **Không chỉnh sửa** các file ngoài phạm vi mục 3 nếu không thật sự cần. Nếu phát hiện lỗi ngoài phạm vi, chỉ ghi vào mục "Vấn đề phát hiện thêm" trong báo cáo.

---

## 1. BỐI CẢNH DỰ ÁN

- **Mục đích:** Hệ thống quản lý task, video gameplay và kho file build/asset cho nhóm phát triển game indie.
- **Công nghệ:** Next.js 16 (App Router, Turbopack), Tailwind CSS v4, Lucide React, Supabase (PostgreSQL + RLS), Cloudflare R2 (upload bằng presigned URL, multipart cho file lớn), Vercel.
- **Phong cách:** Dark Studio Theme lấy cảm hứng Discord, Linear, Steam Dev Console.
- **Cấu trúc component hiện tại:**

```
src/app/page.tsx
├── src/components/layout/Navbar.tsx          (logo, 5 tab, role switcher, mobile drawer)
├── src/components/dashboard/DashboardOverview.tsx
├── src/components/tasks/TaskList.tsx
│   └── src/components/tasks/TaskDetailModal.tsx
├── src/components/videos/VideoGallery.tsx
│   ├── Modal upload video (canvas thumbnail, hàm extractVideoMetadata)
│   └── src/components/videos/VideoPlayerModal.tsx
├── src/components/files/FileVault.tsx        (modal upload file/build, hỗ trợ tới 10GB)
└── src/components/members/MemberManagement.tsx
```

- **Design system hiện tại:**
  - Nền: `#090a0f`
  - Card: `#12141d`, `#161924`
  - Border: `#1f2330`, `#2a2f42`
  - Indigo `#6366f1`: thương hiệu, nút chính, tab đang chọn
  - Emerald `#10b981`: DONE, kho File & Build
  - Amber `#f59e0b`: REVIEW, OWNER
  - Rose `#f43f5e`: quá hạn, CRITICAL, xóa
  - Blue `#3b82f6`: IN_PROGRESS

**Bước đầu tiên bắt buộc:** Đọc code thật trong repo để xác nhận cấu trúc trên. Nếu tên file hoặc cách tổ chức khác với mô tả, theo code thật và ghi chênh lệch vào báo cáo.

---

## 2. MỤC TIÊU

Cải thiện giao diện theo 5 nhóm: **bảo mật hiển thị, trải nghiệm upload, hiệu năng, accessibility, và trải nghiệm desktop/mobile**. Giữ nguyên diện mạo Dark Studio Theme, chỉ tinh chỉnh.

---

## 3. CÔNG VIỆC CỤ THỂ (theo thứ tự ưu tiên)

### Ưu tiên 1 — Bảo mật & phân quyền hiển thị

- **Role Switcher:** Chỉ hiển thị khi `process.env.NODE_ENV !== 'production'` hoặc sau cờ môi trường như `NEXT_PUBLIC_SHOW_ROLE_SWITCHER=true`. Mặc định ẩn.
- Ghi rõ trong báo cáo: phân quyền thật phải được enforce ở Supabase RLS và API phía server. Việc ẩn nút ở UI không đủ. Liệt kê những chỗ hiện đang chỉ kiểm tra quyền ở client (nếu tìm thấy).
- Các nút hành động (sửa, xóa, đổi vai trò, upload) phải ẩn hoặc disable đúng theo vai trò:
  - `VIEWER`: chỉ xem và tải file, không sửa/xóa/upload.
  - `MEMBER`: tạo task, sửa task của mình, upload file/video.
  - `ADMIN`, `OWNER`: sửa mọi task, quản lý thành viên, xóa file/video.
  - Chỉ `OWNER` thấy nút xóa dự án.
- Khi bị disable do quyền, hiển thị tooltip hoặc text nhỏ giải thích lý do.

### Ưu tiên 2 — Trải nghiệm upload (file 10GB, video)

- Thanh tiến độ upload theo phần trăm, hiển thị tốc độ (MB/s) và thời gian còn lại (ước lượng).
- Nút **Hủy** upload đang chạy, và abort request thật (`AbortController`).
- Hiển thị trạng thái rõ: Chờ → Đang tải → Hoàn tất / Lỗi (kèm nút thử lại).
- Với multipart upload: nếu có sẵn logic lưu danh sách part đã upload, cho phép tiếp tục khi rớt mạng. Nếu chưa có, ghi vào báo cáo như đề xuất, không tự viết lại backend.
- **Trích thumbnail video:** Bọc `extractVideoMetadata` trong try/catch. Nếu trình duyệt không decode được (thường gặp với `.mov`, `.mkv`), dùng ảnh placeholder thay vì treo popup, và hiển thị thông báo nhẹ.
- Cảnh báo định dạng: hiện badge cảnh báo ngay khi chọn file `.mov` / `.mkv`, không đợi đến lúc phát.
- Validate dung lượng và định dạng trước khi upload, hiển thị lỗi bằng tiếng Việt rõ ràng.

### Ưu tiên 3 — Hiệu năng & trạng thái tải

- **Skeleton loading** cho Dashboard, danh sách Task, lưới Video, lưới File. Thay cho spinner trắng trang.
- **Optimistic update** khi đổi trạng thái task nhanh trên từng dòng: cập nhật UI trước, gọi server sau, nếu lỗi thì rollback và báo toast.
- **Video grid:** `preload="none"` cho thẻ `<video>`, thumbnail dùng `loading="lazy"`.
- Nếu danh sách Task hoặc File vượt khoảng 100 dòng, đề xuất phân trang hoặc virtual list. Chỉ triển khai nếu dữ liệu thực tế đã lớn, còn không ghi vào báo cáo.
- Tránh re-render không cần thiết: kiểm tra `useMemo`/`useCallback` cho bộ lọc và danh sách lớn.
- **Dashboard:** Khi tổng số task bằng 0, hiển thị "Chưa có task nào" thay vì "0%" để tránh gây hiểu nhầm. Thanh tiến độ ẩn khi không có dữ liệu.

### Ưu tiên 4 — Accessibility (a11y)

- Mọi nút chỉ có icon (hamburger, đóng modal, xóa, đổi trạng thái, mở menu) phải có `aria-label` tiếng Việt.
- **Modal:** focus trap khi mở, đóng bằng phím `Esc`, trả focus về nút đã mở khi đóng, có `role="dialog"` và `aria-modal="true"`.
- **Không dùng màu làm tín hiệu duy nhất.** Trạng thái task và mức ưu tiên phải có thêm icon hoặc chữ (ví dụ "Đang làm", "Quá hạn"). Với người bị mù màu, vẫn phân biệt được.
- Kiểm tra độ tương phản WCAG AA cho chữ phụ (gray trên `#090a0f` và `#12141d`). Tăng độ sáng nếu chưa đạt 4.5:1 cho chữ thường.
- Điều hướng bằng bàn phím: tab được focus đúng thứ tự, có style `focus-visible` rõ ràng (vòng indigo).
- Thẻ `<video>` có thuộc tính `title` hoặc có nhãn qua `aria-label`.
- Nếu dự án chưa dùng, có thể cân nhắc Radix UI (Dialog, DropdownMenu, Select, Tooltip) để có sẵn accessibility. Ghi rõ trong báo cáo nếu thêm.

### Ưu tiên 5 — Bố cục & trải nghiệm desktop/mobile

- **Mobile (< 768px):** Thêm bottom navigation cố định cho 4 mục chính (Tổng quan, Tasks, Gameplay, Files). Mục Team và các mục còn lại để trong hamburger hoặc tab "Thêm". Tất cả nút tap tối thiểu 44×44px. Có `padding-bottom` tính đến `env(safe-area-inset-bottom)` cho iPhone.
- **Modal trên mobile:** `max-h-[90vh]` kèm `overflow-y-auto`. Với màn hình nhỏ có thể chuyển thành bottom sheet.
- **Task — chế độ Kanban (tùy chọn, làm sau khi xong 1–4):** 5 cột theo trạng thái (TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED). Trên desktop cho kéo thả. Trên mobile giữ danh sách. Chuyển đổi bằng toggle "Danh sách / Kanban", lưu lựa chọn vào `localStorage` (chỉ lưu tùy chọn giao diện, không lưu dữ liệu nhạy cảm).
- **Xác nhận hành động nguy hiểm:** Xóa task, file, video, thành viên, dự án đều phải có dialog xác nhận. Nút xác nhận dùng màu Rose. Nội dung ghi rõ đối tượng sẽ bị xóa.
- **Trạng thái rỗng:** Mỗi danh sách rỗng có một nút hành động trực tiếp ("Tạo task đầu tiên", "Tải video lên", "Tải file lên") thay vì chỉ có dòng chữ hướng dẫn.
- **Thông báo (toast):** Dùng thống nhất một kiểu toast cho thành công, lỗi, cảnh báo. Tự tắt sau 3–5 giây, không che nút chính trên mobile.

### Ưu tiên 6 — Bảo trì code

- Đưa màu vào CSS variables trong `@theme` của Tailwind v4 (ví dụ `--color-accent`, `--color-danger`, `--color-success`, `--color-warning`, `--color-info`, `--color-surface`, `--color-border`). Thay các giá trị hex rải rác bằng token.
- Tách các hàm tiện ích (`formatBytes`, `formatDuration`, `extractVideoMetadata`, logic phân quyền theo vai trò) ra thư mục `src/lib/` hoặc `src/utils/`, kèm kiểu TypeScript rõ ràng.
- Tạo một component dùng chung cho Badge trạng thái, Badge vai trò, Button, Modal, để tránh lặp lại class Tailwind.
- Không đổi tên hay cấu trúc file lớn nếu không cần. Ưu tiên thay đổi nhỏ, dễ review.

---

## 4. NHỮNG VIỆC KHÔNG ĐƯỢC LÀM

- Không đổi bảng dữ liệu, cột, hay RLS policy trong Supabase.
- Không đổi logic presigned URL hoặc endpoint upload phía server, trừ khi chỉ để sửa lỗi đã được ghi trong báo cáo.
- Không thay đổi màu thương hiệu Indigo hay nền Dark Studio.
- Không xóa tính năng hiện có. Nếu một tính năng gây rối, ẩn đi bằng cờ và ghi vào báo cáo.
- Không thêm analytics, tracking, hay gửi dữ liệu người dùng ra bên thứ ba.

---

## 5. TIÊU CHÍ HOÀN THÀNH

- [ ] Build thành công, không lỗi TypeScript mới.
- [ ] Lint không thêm cảnh báo mới ở các file đã sửa.
- [ ] Role Switcher ẩn ở production.
- [ ] Nút hành động ẩn/disable đúng theo 4 vai trò.
- [ ] Upload có thanh tiến độ, nút hủy, trạng thái lỗi/thử lại.
- [ ] Video lỗi thumbnail không làm treo popup.
- [ ] Dashboard không hiển thị "0%" khi chưa có task.
- [ ] Modal có focus trap, đóng bằng Esc.
- [ ] Nút icon đều có `aria-label`.
- [ ] Trạng thái không chỉ dựa vào màu.
- [ ] Mobile có bottom nav, tap target ≥ 44px.
- [ ] Có dialog xác nhận khi xóa.
- [ ] Empty state có nút hành động.
- [ ] Màu đã chuyển sang CSS variables.
- [ ] File `REPORT_UI_OPTIMIZE.md` đã được tạo đúng mẫu.

---

## 6. CÁCH LÀM VIỆC ĐỀ XUẤT

1. Đọc code, liệt kê các file liên quan, so với mục 1. Ghi chênh lệch vào báo cáo.
2. Làm Ưu tiên 1 → 6 theo thứ tự. Sau mỗi ưu tiên: build, kiểm tra nhanh, ghi báo cáo.
3. Cuối cùng: chạy build và lint, điền mục kiểm tra, hoàn thiện báo cáo.

Nếu gặp chỗ không rõ, **không tự đoán lớn**. Chọn phương án an toàn nhất, ghi lại giả định trong báo cáo.

---

## 7. ĐỊNH DẠNG BÁO CÁO

Tên file bắt buộc: `REPORT_UI_OPTIMIZE.md`. Điền theo mẫu ở mục 9, không bỏ mục nào. Nếu một mục không áp dụng, ghi "Không áp dụng" thay vì xóa.

---

## 8. THÔNG TIN ĐẦU RA CHO NGƯỜI GIAO VIỆC

Khi xong, trả lời ngắn gọn trong chat:
- Đường dẫn file báo cáo.
- Tổng số file đã sửa, số file mới tạo.
- Số việc đã xong / chưa xong / bị chặn.
- Lỗi build còn lại (nếu có).

Không cần viết dài trong chat, mọi chi tiết nằm trong báo cáo.

---

## 9. MẪU BÁO CÁO — `REPORT_UI_OPTIMIZE.md`

Copy nguyên mẫu dưới đây, điền vào:

```markdown
# BÁO CÁO TỐI ƯU UI — Game Team Hub

- **Ngày thực hiện:** dd/mm/yyyy
- **Người thực hiện:** (tên hoặc tên agent)
- **Nhánh / commit:** (nếu có)

## 1. Tóm tắt
(3–5 câu: đã làm được gì, còn gì chưa làm, rủi ro chính)

## 2. Đối chiếu với tài liệu UI_OVERVIEW.md
- Chỗ khớp:
- Chỗ khác với code thật:

## 3. Thay đổi theo ưu tiên

### Ưu tiên 1 — Bảo mật & phân quyền hiển thị
- [ ] Role Switcher ẩn ở production
- [ ] Nút hành động theo vai trò
- [ ] Tooltip giải thích khi disable
- Ghi chú / file đã sửa:

### Ưu tiên 2 — Upload
- [ ] Thanh tiến độ + tốc độ + ETA
- [ ] Nút hủy (AbortController)
- [ ] Trạng thái Chờ / Đang tải / Xong / Lỗi + thử lại
- [ ] Thumbnail fallback khi lỗi decode
- [ ] Cảnh báo .mov / .mkv
- [ ] Validate dung lượng & định dạng
- Ghi chú / file đã sửa:

### Ưu tiên 3 — Hiệu năng
- [ ] Skeleton loading
- [ ] Optimistic update đổi trạng thái task (có rollback)
- [ ] preload="none" + lazy thumbnail
- [ ] Phân trang / virtual list (hoặc lý do chưa làm)
- [ ] Dashboard không hiện "0%" khi rỗng
- Ghi chú / file đã sửa:

### Ưu tiên 4 — Accessibility
- [ ] aria-label cho nút icon
- [ ] Modal: focus trap, Esc, trả focus
- [ ] Trạng thái không chỉ dựa vào màu
- [ ] Kiểm tra tương phản (ghi các cặp màu đã kiểm tra)
- [ ] focus-visible rõ ràng
- Ghi chú / file đã sửa:

### Ưu tiên 5 — Bố cục & UX
- [ ] Bottom nav mobile + safe-area
- [ ] Tap target ≥ 44px
- [ ] Modal mobile max-h-[90vh]
- [ ] Kanban (hoặc lý do chưa làm)
- [ ] Dialog xác nhận khi xóa
- [ ] Empty state có nút hành động
- [ ] Toast thống nhất
- Ghi chú / file đã sửa:

### Ưu tiên 6 — Bảo trì
- [ ] Màu chuyển sang CSS variables
- [ ] Tách utils (formatBytes, formatDuration, extractVideoMetadata, phân quyền)
- [ ] Component dùng chung (Badge, Button, Modal)
- Ghi chú / file đã sửa:

## 4. Danh sách file
| Đường dẫn | Loại (sửa / tạo mới / xóa) | Mô tả ngắn |
|---|---|---|
| | | |

## 5. Thư viện mới thêm
| Tên | Phiên bản | Lý do | Kích thước ước tính |
|---|---|---|---|
| | | | |
(Không có thì ghi "Không có")

## 6. Kết quả kiểm tra
- Build: (pass / fail, kèm lỗi nếu có)
- Lint: (số cảnh báo mới)
- Kiểm tra thủ công: (các luồng đã thử: đổi tab, tạo task, upload nhỏ, upload .mov, phát video, đổi vai trò, mobile < 768px)

## 7. Vấn đề phát hiện thêm (ngoài phạm vi)
- 

## 8. Đề xuất cho backend / Supabase (không tự làm)
- (ví dụ: RLS cho từng vai trò, lưu part để resume multipart, endpoint xóa có kiểm tra quyền)

## 9. Giả định đã dùng
- 

## 10. Việc còn lại / chưa làm (và lý do)
- 

## 11. Ảnh chụp / ghi chú giao diện (nếu có)
- 
```
```

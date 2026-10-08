# NHIỆM VỤ: Thiết kế lại UI chuyên nghiệp + Đa ngôn ngữ VI / JA — Game Team Hub

> Gửi file này cho Gemini (hoặc agent lập trình). Đọc toàn bộ trước khi bắt đầu.
> Đây là vòng 2, nối tiếp `GEMINI_TASK_UI_OPTIMIZE.md`. Giữ nguyên các chức năng đã làm ở vòng 1.

---

## 0. RULE BẮT BUỘC

1. **Phải tạo file báo cáo** `REPORT_UI_REDESIGN.md` ở thư mục gốc dự án, theo mẫu ở mục 10. Không có báo cáo = chưa hoàn thành.
2. **Không phá chức năng hiện có.** Đổi tab, tạo/sửa/xóa task, Kanban kéo thả, upload file/video (tốc độ, ETA, hủy), phát video, phân quyền RBAC, toast, dialog xác nhận, optimistic update, skeleton — tất cả phải chạy như cũ sau khi thiết kế lại.
3. **Không hardcode chuỗi hiển thị bằng tiếng Việt hay tiếng Nhật trong component.** Mọi chuỗi UI phải đi qua hệ thống i18n (mục 4). Có kiểm tra bằng tìm kiếm trước khi báo xong.
4. **Không thêm thư viện i18n nặng** (ví dụ `react-intl`, `i18next`) nếu không cần thiết. Ưu tiên tự viết dictionary + hook nhỏ gọn (mục 4). Nếu chọn thư viện, ghi lý do vào báo cáo.
5. **Không đổi schema Supabase, RLS, hay logic presigned URL / upload phía server.** Chỉ thay đổi lớp giao diện và chuỗi hiển thị.
6. **Không hardcode secret**, không đưa URL nội bộ vào client.
7. **Build và lint phải pass** trước khi báo xong. Ghi lệnh đã chạy và kết quả thực tế vào báo cáo. Không ghi "pass" nếu chưa chạy.
8. **Chỉ ghi "đã kiểm tra thủ công" cho những luồng thực sự đã thử.** Nếu không chạy được trình duyệt, ghi rõ là chưa kiểm tra.
9. Mỗi nhóm việc xong thì ghi vào báo cáo ngay, không đợi cuối.

---

## 1. BỐI CẢNH

- **Dự án:** Game Team Hub (MVP v0.1), quản lý task, video gameplay, kho file build/asset cho nhóm game indie.
- **Công nghệ:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, Supabase, Cloudflare R2, Vercel.
- **Vòng 1 đã làm:** phân quyền hiển thị, upload có tiến độ, skeleton, optimistic update, a11y cơ bản, bottom nav mobile, Kanban, ConfirmDialog, Toast, CSS variables, component dùng chung (Badge, Button, Skeleton).
- **Người dùng:** nhóm phát triển game, có thành viên nói tiếng Việt và tiếng Nhật. Ngôn ngữ mặc định là Tiếng Việt.

**Bước đầu tiên bắt buộc:** Đọc code hiện tại, liệt kê toàn bộ chuỗi hiển thị đang hardcode (dùng tìm kiếm theo ký tự tiếng Việt có dấu và các nhãn tiếng Anh như "Tasks", "Files Vault", "Team", "OWNER"...). Ghi số lượng vào báo cáo.

---

## 2. MỤC TIÊU

1. **Thiết kế lại giao diện theo hướng chuyên nghiệp** (xem mục 3), giữ tinh thần Dark Studio nhưng gọn gàng, nhất quán, dễ đọc hơn.
2. **Đa ngôn ngữ Tiếng Việt và Tiếng Nhật**, có nút chuyển ngôn ngữ luôn hiển thị trên Navbar. Đổi ngôn ngữ không tải lại trang và không mất trạng thái đang làm.
3. **Định dạng theo ngôn ngữ:** ngày giờ, số, dung lượng file, thời lượng video, tất cả theo locale đang chọn.

---

## 3. ĐỊNH HƯỚNG THIẾT KẾ CHUYÊN NGHIỆP

### 3.1. Nguyên tắc chung
- **Ít màu hơn, dùng có chủ đích.** Nền chính và nền card phân lớp rõ bằng độ sáng nhẹ, không lạm dụng gradient. Indigo chỉ dùng cho hành động chính, tab đang chọn, focus.
- **Khoảng cách nhất quán** theo thang 4px (4, 8, 12, 16, 24, 32). Không dùng số lẻ tùy ý.
- **Bo góc nhất quán:** một giá trị cho card (ví dụ `rounded-xl`), một giá trị cho nút và input (`rounded-lg`), một giá trị cho badge (`rounded-md` hoặc pill). Không trộn nhiều kiểu.
- **Viền mỏng 1px**, đổ bóng rất nhẹ hoặc không đổ bóng. Tránh viền phát sáng trang trí.
- **Mật độ thông tin vừa phải:** bảng và danh sách dùng chữ 14px cho nội dung, 12px cho nhãn phụ. Tiêu đề trang 20–24px, tiêu đề section 16px semibold.
- **Không dùng emoji làm icon chính.** Dùng Lucide React đồng nhất về kích thước (16px trong nút và badge, 20px trong navbar).

### 3.2. Bảng màu (token)
Giữ các giá trị vòng 1 làm gốc, chỉnh nếu cần để đạt tương phản WCAG AA (≥ 4.5:1 với chữ thường):

| Token | Giá trị gợi ý | Dùng cho |
|---|---|---|
| `--color-bg` | `#090a0f` | Nền trang |
| `--color-surface` | `#12141d` | Card, panel |
| `--color-surface-raised` | `#171a26` | Hover card, dropdown, modal |
| `--color-border` | `#1f2330` | Viền mặc định |
| `--color-border-strong` | `#2a2f42` | Viền input, divider mạnh |
| `--color-text` | `#e6e8ef` | Chữ chính |
| `--color-text-muted` | `#9ca3b5` | Chữ phụ (tối thiểu, không dùng màu tối hơn) |
| `--color-accent` | `#6366f1` | Hành động chính, tab đang chọn, focus |
| `--color-success` | `#10b981` | DONE, file/build |
| `--color-warning` | `#f59e0b` | REVIEW, OWNER |
| `--color-danger` | `#f43f5e` | Quá hạn, CRITICAL, xóa |
| `--color-info` | `#3b82f6` | IN_PROGRESS |

Toàn bộ màu phải đi qua token, không hardcode hex trong component.

### 3.3. Typography
- Font chính Latin và Tiếng Việt: **Inter** (hỗ trợ dấu tiếng Việt tốt). Dùng `next/font/google` với subset `latin` và `vietnamese`.
- Font Tiếng Nhật: **Noto Sans JP** qua `next/font/google`, subset `japanese` hoặc tải theo nhu cầu. Đặt làm font fallback khi `lang="ja"`.
- Đặt font stack theo `lang`: `html[lang="ja"]` dùng Noto Sans JP trước, còn lại dùng Inter.
- Tiếng Nhật cần `line-height` lớn hơn một chút (khoảng 1.7 cho đoạn văn, 1.5 cho nhãn). Tránh `letter-spacing` âm với tiếng Nhật.
- Không dùng `text-transform: uppercase` cho chữ tiếng Nhật hoặc tiếng Việt, chỉ dùng cho nhãn tiếng Anh ngắn (OWNER, ADMIN...) nếu cần.

### 3.4. Bố cục
- **Navbar desktop:** logo + tên dự án bên trái, 5 mục điều hướng ở giữa hoặc bên trái, cụm công cụ bên phải (chuyển ngôn ngữ, Role Switcher nếu bật, avatar/vai trò hiện tại). Chiều cao cố định 56–64px.
- **Trang Tổng quan:** hàng KPI 4 thẻ, phía dưới là 2 cột (desktop) hoặc 1 cột (mobile). Thẻ KPI có nhãn, số lớn, và một dòng phụ giải thích.
- **Danh sách Task:** thanh công cụ trên cùng gồm ô tìm kiếm, bộ lọc assignee, toggle Danh sách/Kanban, nút tạo task. Dòng task có cột rõ ràng: tiêu đề, người phụ trách, trạng thái, hạn chót, ưu tiên.
- **Lưới Video và File:** card đồng kích thước, thumbnail tỉ lệ 16:9 cố định, thông tin phụ dưới thumbnail.
- **Trang Team:** bảng với cột thành viên, vai trò (dropdown), hành động. Mobile chuyển thành danh sách card.
- **Mobile:** bottom nav giữ như vòng 1, nhưng nhãn phải được dịch và không bị cắt khi là tiếng Nhật hoặc tiếng Việt dài. Dùng `truncate` hoặc cho phép xuống dòng có kiểm soát.

### 3.5. Thành phần giao diện
- Một bộ component cơ sở thống nhất: `Button` (variant: primary, secondary, ghost, danger; size: sm, md), `Input`, `Select`, `Card`, `Badge`, `Modal`, `Tabs`, `EmptyState`, `Tooltip`. Các component cũ phải được nâng cấp để dùng bộ này.
- Trạng thái hover, active, disabled, focus-visible đồng nhất trên toàn bộ component.
- Disabled do phân quyền: giữ nút nhìn thấy nhưng mờ đi (opacity 50%), kèm tooltip giải thích. Không ẩn hoàn toàn trừ khi là điều hướng.

### 3.6. Chuyển động
- Chuyển động nhẹ, thời lượng 150–200ms, easing `ease-out`.
- Chỉ dùng cho hover, mở modal/dropdown, chuyển tab, kéo thả Kanban.
- Tôn trọng `prefers-reduced-motion`: tắt animation khi người dùng bật tùy chọn này.

---

## 4. HỆ THỐNG ĐA NGÔN NGỮ (i18n)

### 4.1. Cấu trúc đề xuất
```
src/i18n/
├── config.ts          // locales = ['vi', 'ja'], defaultLocale = 'vi', type Locale
├── dictionaries/
│   ├── vi.ts          // export default { ... } kiểu const để suy ra kiểu
│   └── ja.ts          // BẮT BUỘC có đủ mọi key như vi.ts (TypeScript kiểm tra)
├── LocaleProvider.tsx // Context: locale, setLocale, t(key, params?)
├── useLocale.ts       // hook tiện dụng
└── format.ts          // formatDate, formatNumber, formatBytes, formatDuration theo locale
```

### 4.2. Quy tắc
- **Key có cấu trúc theo màn hình**, ví dụ `nav.dashboard`, `tasks.status.todo`, `upload.speed`, `common.save`, `confirm.deleteTask.title`.
- **Dùng kiểu để ép đủ key:** `ja.ts` phải khai báo kiểu theo `vi.ts`, thiếu key là lỗi build.
- **Tham số:** dạng `{name}`, ví dụ `"Đã tải {percent}%"` / `"{percent}% 完了"`. Không ghép chuỗi bằng `+`.
- **Số nhiều:** nếu có số lượng, dùng hàm `t` có nhánh cho từng ngôn ngữ, hoặc tránh số nhiều bằng cách viết câu trung lập. Tiếng Nhật và tiếng Việt không cần biến đổi số ít/số nhiều như tiếng Anh, nên chỉ cần một dạng.
- **Ngày giờ, số, dung lượng:** dùng `Intl.DateTimeFormat` và `Intl.NumberFormat` với locale `vi-VN` hoặc `ja-JP`. Dung lượng dùng đơn vị KB/MB/GB ở cả hai ngôn ngữ. Thời lượng video dạng `mm:ss` hoặc `h:mm:ss`.
- **Trạng thái và vai trò:** key riêng, ví dụ `status.TODO`, `role.OWNER`. Không hiển thị trực tiếp chuỗi enum từ database (`IN_PROGRESS`) cho người dùng.
- **Lưu lựa chọn ngôn ngữ:** `localStorage` key `gth.locale`, kèm cookie `NEXT_LOCALE` nếu cần đọc từ server. Mặc định `vi`. Nếu giá trị lưu không hợp lệ, rơi về `vi`.
- **Thuộc tính `lang` trên `<html>`** phải cập nhật theo ngôn ngữ đang chọn (`vi` hoặc `ja`), để trình duyệt và trình đọc màn hình hoạt động đúng.
- **Không tải lại trang khi đổi ngôn ngữ.** Toàn bộ giao diện cập nhật ngay, giữ nguyên tab đang mở, nội dung form đang nhập, modal đang mở.
- Toast, dialog xác nhận, thông báo lỗi từ logic (ví dụ `validateUploadFile`) phải trả về key i18n hoặc nhận hàm `t`, không trả về chuỗi tiếng Việt cố định.

### 4.3. Nút chuyển ngôn ngữ
- Đặt trên Navbar desktop và trong menu mobile. Dạng segmented control hai nút `VI | JA` hoặc dropdown có cờ/nhãn.
- Nhãn hiển thị bằng ngôn ngữ đích: nút tiếng Việt ghi "Tiếng Việt", nút tiếng Nhật ghi "日本語", để người dùng nhận ra dù đang ở ngôn ngữ nào.
- Có `aria-label` và trạng thái `aria-pressed` hoặc `aria-current` rõ ràng.

### 4.4. Bảng thuật ngữ (glossary) — dùng nhất quán
Dùng đúng các cặp dưới đây để tránh dịch lung tung giữa các màn hình:

| Khóa | Tiếng Việt | Tiếng Nhật |
|---|---|---|
| Dashboard / Tổng quan | Tổng quan | ダッシュボード |
| Tasks | Công việc | タスク |
| Gameplay / Video | Video gameplay | ゲームプレイ動画 |
| Files Vault | Kho file | ファイル保管庫 |
| Team | Thành viên | メンバー |
| Build | Bản build | ビルド |
| Asset | Tài nguyên (asset) | アセット |
| Deadline | Hạn chót | 期限 |
| Assignee | Người phụ trách | 担当者 |
| Priority | Độ ưu tiên | 優先度 |
| Checklist | Danh sách kiểm tra | チェックリスト |
| Upload | Tải lên | アップロード |
| Download | Tải xuống | ダウンロード |
| Cancel | Hủy | キャンセル |
| Save | Lưu | 保存 |
| Delete | Xóa | 削除 |
| Confirm | Xác nhận | 確認 |
| Retry | Thử lại | 再試行 |
| Search | Tìm kiếm | 検索 |
| Filter | Bộ lọc | フィルター |
| Empty state (chung) | Chưa có dữ liệu | データがありません |
| Overdue | Quá hạn | 期限切れ |
| Role OWNER | Chủ dự án | オーナー |
| Role ADMIN | Quản trị viên | 管理者 |
| Role MEMBER | Thành viên | メンバー |
| Role VIEWER | Người xem | 閲覧者 |
| Status TODO | Cần làm | 未着手 |
| Status IN_PROGRESS | Đang làm | 進行中 |
| Status REVIEW | Chờ duyệt | レビュー中 |
| Status DONE | Hoàn tất | 完了 |
| Status BLOCKED | Bị chặn | ブロック中 |
| Priority CRITICAL | Khẩn cấp | 緊急 |

Có thể thêm thuật ngữ mới, nhưng phải ghi vào bảng này trong báo cáo.

**Lưu ý về tiếng Nhật:** văn phong lịch sự, dùng thể です/ます cho câu thông báo và lỗi. Nhãn ngắn trong nút và tiêu đề dùng dạng danh từ, không dùng câu dài.

---

## 5. CẦN SỬA Ở CODE VÒNG 1 (BẮT BUỘC)

Trong báo cáo vòng 1 có một số điểm cần xử lý trong vòng này:

1. **Tên hàm bị lỗi ký tự:** tên `isKénTrìnhDuyệtFormat` trong `src/lib/upload/client-uploader.ts` (và nơi gọi) phải đổi thành `isBrowserUnsupportedFormat`. Cập nhật toàn bộ nơi sử dụng.
2. **Chuỗi tiếng Việt lẫn trong code logic:** ví dụ "kén web", "kén trình duyệt" trong badge cảnh báo. Đưa vào i18n với key rõ nghĩa, ví dụ `upload.warning.unsupportedFormat`.
3. **Phân quyền chỉ là client-side:** `src/lib/permissions.ts` chỉ dùng để ẩn/disable giao diện. Không được ghi trong báo cáo hay comment rằng đây là bảo mật. Thêm comment ở đầu file: "Chỉ dùng cho UI. Quyền thật được enforce ở RLS và server."
4. **Dữ liệu giả định `proj-1` / `user-shin`:** nếu code đang hardcode, đưa vào một file config hoặc hàm lấy từ context, không để rải rác.
5. **Báo cáo vòng 1 ghi "Pass 100%" cho build, lint và kiểm tra thủ công:** trong vòng này, chạy lại build và lint thật, ghi kết quả thật vào báo cáo mới. Nếu vòng 1 có lỗi thật, ghi vào mục "Vấn đề phát hiện thêm".

---

## 6. NHỮNG VIỆC KHÔNG ĐƯỢC LÀM

- Không đổi bảng dữ liệu, RLS, hay API endpoint.
- Không đổi màu thương hiệu Indigo và nền Dark Studio cơ bản (chỉ tinh chỉnh token).
- Không thêm tính năng mới ngoài i18n và thiết kế lại (không thêm chat, thông báo đẩy, analytics).
- Không thêm tracking hay gửi dữ liệu ra bên thứ ba. Font Google tải qua `next/font` là ngoại lệ được phép.
- Không xóa tính năng hiện có.

---

## 7. THỨ TỰ LÀM VIỆC

1. **Khảo sát:** đọc code, liệt kê chuỗi hardcode, liệt kê component đang có, ghi vào báo cáo.
2. **Nền tảng:** thiết lập token màu, font (Inter + Noto Sans JP), bộ component cơ sở.
3. **i18n:** tạo cấu trúc `src/i18n/`, viết `vi.ts` trước (lấy từ chuỗi hiện có), rồi `ja.ts` đầy đủ key, LocaleProvider, nút chuyển ngôn ngữ.
4. **Thay chuỗi:** chuyển từng màn hình sang `t()`: Navbar → Dashboard → Tasks → Videos → Files → Team → Modal/Dialog/Toast.
5. **Thiết kế lại từng màn hình** theo mục 3, kiểm tra cả hai ngôn ngữ sau mỗi màn hình.
6. **Mục 5** (sửa lỗi vòng 1).
7. **Kiểm tra:** build, lint, tìm chuỗi hardcode còn sót, kiểm tra thủ công cả hai ngôn ngữ và cả desktop lẫn mobile.
8. **Viết báo cáo** theo mục 10.

Nếu gặp chỗ không rõ, chọn phương án an toàn và ghi giả định vào báo cáo. Không tự thêm tính năng lớn.

---

## 8. TIÊU CHÍ HOÀN THÀNH

**Thiết kế**
- [ ] Token màu đầy đủ, không còn hex hardcode trong component.
- [ ] Font Inter và Noto Sans JP hoạt động, đúng theo `lang`.
- [ ] Bộ component cơ sở được dùng ở mọi màn hình.
- [ ] Khoảng cách và bo góc nhất quán.
- [ ] Mobile không bị tràn ngang ở cả hai ngôn ngữ.
- [ ] Tôn trọng `prefers-reduced-motion`.

**Đa ngôn ngữ**
- [ ] Nút chuyển VI / JA trên desktop và mobile.
- [ ] Đổi ngôn ngữ không tải lại trang, giữ trạng thái form và modal.
- [ ] Lựa chọn được lưu, tải lại trang vẫn giữ.
- [ ] `<html lang>` cập nhật đúng.
- [ ] `ja.ts` có đủ key như `vi.ts` (TypeScript báo lỗi nếu thiếu).
- [ ] Ngày, số, dung lượng, thời lượng định dạng đúng theo locale.
- [ ] Không còn chuỗi hiển thị hardcode (đã tìm kiếm và ghi kết quả).
- [ ] Trạng thái, vai trò, ưu tiên đều dịch qua key, không hiện enum thô.
- [ ] Thuật ngữ khớp bảng glossary mục 4.4.

**Chức năng**
- [ ] Toàn bộ luồng vòng 1 vẫn hoạt động.
- [ ] Phân quyền hiển thị vẫn đúng theo 4 vai trò.
- [ ] Build và lint pass, kết quả thật được ghi vào báo cáo.

**Sửa lỗi vòng 1**
- [ ] Đổi tên hàm `isKénTrìnhDuyệtFormat` → `isBrowserUnsupportedFormat`.
- [ ] Badge cảnh báo định dạng được i18n.
- [ ] Comment cảnh báo trong `permissions.ts`.

---

## 9. ĐỊNH DẠNG ĐẦU RA CHO NGƯỜI GIAO VIỆC

Khi xong, trả lời ngắn trong chat:
- Đường dẫn file báo cáo `REPORT_UI_REDESIGN.md`.
- Số file đã sửa, số file mới tạo.
- Build và lint: pass hay fail, kèm lỗi nếu có.
- Số chuỗi đã chuyển sang i18n.
- Việc còn lại.

---

## 10. MẪU BÁO CÁO — `REPORT_UI_REDESIGN.md`

```markdown
# BÁO CÁO THIẾT KẾ LẠI UI + ĐA NGÔN NGỮ VI/JA — Game Team Hub

- **Ngày thực hiện:** dd/mm/yyyy
- **Người thực hiện:**
- **Nhánh / commit:**

## 1. Tóm tắt
(3–5 câu: đã làm gì, chưa làm gì, rủi ro chính)

## 2. Khảo sát ban đầu
- Số chuỗi hardcode tìm thấy (vi / en / ja):
- Số component đang có, số component đã nâng cấp:
- Chênh lệch so với mô tả trong tài liệu:

## 3. Thiết kế
- Token màu: (đã làm / file)
- Font: (Inter / Noto Sans JP: đã cấu hình thế nào)
- Bộ component cơ sở: (danh sách)
- Màn hình đã thiết kế lại: (danh sách, ghi chú thay đổi chính)
- Cặp màu đã kiểm tra tương phản và kết quả:

## 4. Đa ngôn ngữ
- Cấu trúc thư mục i18n:
- Số key trong vi.ts / ja.ts:
- Cách lưu lựa chọn ngôn ngữ (localStorage / cookie):
- Định dạng ngày, số, dung lượng: (mẫu hiển thị VI và JA)
- Thuật ngữ mới đã thêm vào glossary:
- Chuỗi hardcode còn sót sau khi làm (kết quả tìm kiếm):

## 5. Sửa lỗi vòng 1
- [ ] Đổi tên isKénTrìnhDuyệtFormat
- [ ] i18n badge cảnh báo định dạng
- [ ] Comment permissions.ts
- [ ] Các điểm khác:

## 6. Danh sách file
| Đường dẫn | Loại (sửa / tạo mới / xóa) | Mô tả ngắn |
|---|---|---|
| | | |

## 7. Thư viện mới thêm
| Tên | Phiên bản | Lý do |
|---|---|---|
| | | |
(Không có thì ghi "Không có")

## 8. Kết quả kiểm tra
- Lệnh đã chạy và kết quả thật:
  - `npm run build`: 
  - `npm run lint`: 
- Kiểm tra thủ công (ghi rõ đã thử hay chưa):
  - [ ] Desktop VI
  - [ ] Desktop JA
  - [ ] Mobile VI (< 768px)
  - [ ] Mobile JA (< 768px)
  - [ ] Đổi ngôn ngữ giữa chừng khi đang mở modal / form
  - [ ] Tải lại trang giữ đúng ngôn ngữ
  - [ ] Phân quyền VIEWER vẫn đúng
  - [ ] Luồng upload, phát video, Kanban vẫn chạy

## 9. Vấn đề phát hiện thêm (ngoài phạm vi)
-

## 10. Giả định đã dùng
-

## 11. Việc còn lại / chưa làm (và lý do)
-

## 12. Ghi chú cho người review
- Màn hình nên xem trước:
- Điểm cần người duyệt thiết kế (ví dụ: màu, bố cục):
```

# NHIỆM VỤ VÒNG 3: Bỏ phân quyền, bỏ mục Team, danh tính cục bộ — Game Team Hub

> Gửi file này cho Gemini (hoặc agent lập trình). Đọc toàn bộ trước khi bắt đầu.
> Nối tiếp `GEMINI_TASK_UI_OPTIMIZE.md` (vòng 1) và `GEMINI_TASK_UI_REDESIGN_I18N.md` (vòng 2). Giữ nguyên các phần đa ngôn ngữ, thiết kế, upload, Kanban, toast, ConfirmDialog đã làm.

---

## 0. RULE BẮT BUỘC

1. **Phải tạo file báo cáo** `REPORT_V3_TEAM_LOCAL.md` ở thư mục gốc dự án, theo mẫu mục 9. Không có báo cáo = chưa hoàn thành.
2. **Không sửa backend.** Không đổi schema Supabase, RLS, API route, hay logic upload/presigned URL phía server. Yêu cầu của chủ dự án là không cần sửa gì ở phía server cho phân quyền.
3. **Không hardcode secret**, không đưa URL nội bộ vào client.
4. **Không thêm thư viện mới.**
5. **Build và lint phải chạy thật.** Ghi lệnh và kết quả thật vào báo cáo. Không ghi "pass" nếu chưa chạy.
6. **Chỉ ghi "đã kiểm tra" cho luồng thực sự đã thử.**
7. **Mọi chuỗi hiển thị mới phải đi qua i18n** (VI và JA), theo cấu trúc `src/i18n/` đã có.
8. **Không dùng `localStorage` cho dữ liệu nghiệp vụ** (task, video, file). Chỉ dùng `localStorage` cho danh tính và tùy chọn giao diện như mô tả ở mục 3.

---

## 1. YÊU CẦU CỦA CHỦ DỰ ÁN

Nhóm có **4 người**. Thay vì quản trị viên phân vai trò, mỗi người tự chọn danh tính và vai trò của mình. Các yêu cầu cụ thể:

1. **Bỏ phân quyền giới hạn.** Mọi người dùng có toàn quyền như ADMIN: tạo, sửa, xóa task, video, file, upload, đổi trạng thái, kể cả xóa. Không còn VIEWER, không còn MEMBER bị giới hạn, không còn disable theo vai trò.
2. **Vai trò chỉ còn là nhãn hiển thị.** Mỗi người chọn một vai trò (OWNER, ADMIN, MEMBER, VIEWER) để hiển thị cho đồng đội biết. Lựa chọn này không ảnh hưởng đến quyền thao tác. Lưu cục bộ trên máy của người đó.
3. **Bỏ hoàn toàn mục Team (Thành viên).** Không còn tab, không còn trang, không còn `MemberManagement.tsx`, không còn nút "Thêm thành viên", không còn "kick".
4. **Bốn thành viên cố định, có tên mặc định:**

| Slot ID | Tên mặc định |
|---|---|
| `m1` | カツラギ |
| `m2` | Thu Thao |
| `m3` | Anh Tuyet |
| `m4` | 多賀 |

5. **Người dùng tự đổi tên** được, nhưng thay đổi lưu cục bộ trên máy đó.
6. **Dữ liệu danh tính và vai trò lưu tại máy người dùng** (localStorage).
7. **Không cần Role Switcher nữa.** Thay bằng một mục "Hồ sơ của tôi" (xem mục 3).

---

## 2. HIỆN TRẠNG CẦN THAY ĐỔI

Trước khi làm, đọc code và xác nhận các điểm sau, ghi vào báo cáo:

- `src/lib/permissions.ts`: các hàm `canCreateTask`, `canEditTask`, `canDeleteTask`, `canUpload`, `canDeleteMedia`, `canManageMembers`, `canDeleteProject`, `getRoleRestrictionMessage`. Cần gỡ bỏ gating, không dùng để chặn thao tác nữa.
- `src/components/members/MemberManagement.tsx` và tab Team trong `Navbar.tsx`, `page.tsx`: cần xóa.
- Role Switcher trong `Navbar.tsx`: cần thay bằng mục hồ sơ.
- Mọi chỗ đang disable nút theo quyền, hiện tooltip "VIEWER không được..." (TaskList, TaskDetailModal, VideoGallery, FileVault, VideoPlayerModal): cần bỏ disable và bỏ tooltip giới hạn.
- Các chuỗi i18n liên quan đến giới hạn quyền (`role restriction`, mô tả VIEWER/MEMBER trong bảng RBAC): cần xóa hoặc đổi thành nhãn vai trò.
- Mọi nơi dùng danh sách member từ database hoặc hardcode (ví dụ dropdown assignee): thay bằng danh sách 4 slot cố định.

Nếu code thực tế khác với mô tả này, theo code thật và ghi chênh lệch vào báo cáo.

---

## 3. THIẾT KẾ DANH TÍNH CỤC BỘ

### 3.1. Dữ liệu lưu trên máy
Lưu một object duy nhất trong `localStorage` với key `gth.profile`:

```json
{
  "currentSlotId": "m1",
  "role": "ADMIN",
  "names": {
    "m1": "カツラギ",
    "m2": "Thu Thao",
    "m3": "Anh Tuyet",
    "m4": "多賀"
  }
}
```

- `currentSlotId`: người này là ai trong 4 slot. Chưa chọn thì `null`, và bắt buộc chọn trước khi dùng app.
- `role`: một trong `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`. Mặc định `ADMIN`.
- `names`: tên hiển thị của cả 4 slot, mặc định như bảng mục 1. Có thể đổi tên bất kỳ slot nào trên máy này.
- Nếu dữ liệu lưu bị lỗi hoặc thiếu trường, rơi về mặc định. Không để app crash.

### 3.2. Màn hình chọn danh tính (lần đầu)
- Khi chưa có `currentSlotId`, hiện một màn hình chọn trước khi vào app: 4 thẻ tương ứng 4 slot, hiển thị tên hiện tại, người dùng bấm vào thẻ của mình.
- Sau khi chọn, chọn vai trò (4 lựa chọn, có mô tả ngắn: "Chủ dự án", "Quản trị viên", "Thành viên", "Người xem").
- Có nút xác nhận. Không bắt buộc đăng nhập.
- Màn hình này phải có i18n VI và JA.

### 3.3. Mục "Hồ sơ của tôi"
- Đặt ở góc phải Navbar: hiện tên và vai trò hiện tại, bấm để mở popover hoặc dialog.
- Trong popover có:
  - Đổi người đang dùng (chọn lại slot).
  - Đổi vai trò.
  - Đổi tên hiển thị của chính slot đó, và có thể đổi tên của slot khác để sửa nhầm (ghi rõ là lưu trên máy này).
  - Nút "Đặt lại" xóa `gth.profile` và đưa về màn hình chọn danh tính.
- Có `aria-label`, focus trap, đóng bằng Esc.

### 3.4. Hiển thị tên
- Mọi nơi hiển thị người phụ trách, người tạo, người tải lên đều lấy tên từ `names[slotId]` của máy đang xem.
- Task và file chỉ lưu `slotId` (ví dụ `m2`), không lưu tên. Nếu đồng đội đổi tên trên máy họ, máy bạn vẫn thấy tên cũ. Đây là giới hạn đã được chấp nhận và phải ghi vào phần "Giả định" của báo cáo.
- Nếu slot ID trong dữ liệu không tồn tại trong 4 slot (ví dụ dữ liệu cũ hoặc ID lạ), hiển thị "Không xác định" (i18n).

---

## 4. THAY ĐỔI CHI TIẾT

### 4.1. Navbar
- Còn **4 tab**: Tổng quan, Tasks, Gameplay, Files Vault. Bỏ tab Team.
- Bỏ Role Switcher và cờ `NEXT_PUBLIC_SHOW_ROLE_SWITCHER`.
- Thêm nút "Hồ sơ của tôi" (mục 3.3) bên phải, cạnh nút đổi ngôn ngữ.
- Bottom nav mobile còn 4 mục, không còn "Thêm" hay Team.

### 4.2. Phân quyền
- Gỡ bỏ toàn bộ gating theo vai trò trong UI. Mọi nút tạo/sửa/xóa/upload/đổi trạng thái luôn bật.
- `src/lib/permissions.ts`: có hai cách, chọn một và ghi vào báo cáo:
  - (a) Xóa file, gỡ mọi lời gọi tới các hàm `can*`.
  - (b) Giữ file, đổi mỗi hàm trả về `true`, kèm comment "Đã bỏ phân quyền theo yêu cầu. Vai trò chỉ là nhãn hiển thị."
  - Ưu tiên (a) nếu sạch, vì code gọn hơn.
- Vai trò vẫn hiển thị bằng `RoleBadge` ở hồ sơ và trên danh sách thành viên (nếu có chỗ hiển thị). Không ảnh hưởng thao tác.
- Vẫn giữ `ConfirmDialog` khi xóa, đây là xác nhận để tránh bấm nhầm, không phải phân quyền.

### 4.3. Xóa mục Team
- Xóa `src/components/members/MemberManagement.tsx`.
- Xóa route hoặc tab liên quan, xóa import thừa.
- Xóa các chuỗi i18n của trang Team không còn dùng (ghi số key đã xóa vào báo cáo). Giữ các key `role.*` và `status.*` vì vẫn dùng.
- Xóa các hàm gọi API quản lý thành viên ở phía client (nếu có). Không xóa endpoint phía server.

### 4.4. Assignee và người tạo
- Dropdown "Người phụ trách" trong TaskList, TaskDetailModal và bộ lọc: lấy từ danh sách 4 slot cố định, hiển thị tên theo mục 3.4, có thêm lựa chọn "Chưa gán".
- Khi tạo task hoặc file, lưu `slotId` của người đang dùng (`currentSlotId`).
- Bộ lọc "Của tôi" dùng `currentSlotId`.
- Dashboard "Task được gán cho tôi" dùng `currentSlotId`.

### 4.5. Dữ liệu đã có
- Nếu database đã có task hoặc file với `assignee` hoặc `uploaded_by` là chuỗi hoặc UUID cũ, không xóa. Hiển thị "Không xác định" cho những giá trị không khớp slot nào. Ghi số lượng bản ghi bị ảnh hưởng vào báo cáo nếu có thể kiểm tra được.

### 4.6. Thông báo và xác nhận
- Toast và dialog không còn thông báo kiểu "bạn không có quyền". Thay bằng hành động bình thường.
- Các chuỗi giới hạn quyền trong i18n: xóa, không dịch.

---

## 5. i18n CHO TÍNH NĂNG MỚI

Thêm key mới vào cả `vi.ts` và `ja.ts`, ví dụ:
- `profile.title`, `profile.changeUser`, `profile.changeRole`, `profile.rename`, `profile.reset`
- `identity.pickTitle`, `identity.pickDescription`, `identity.confirm`
- `role.description.OWNER`, `role.description.ADMIN`, `role.description.MEMBER`, `role.description.VIEWER`
- `assignee.unassigned`, `assignee.unknown`

Mô tả vai trò bằng tiếng Nhật, văn phong です/ます. Ví dụ:
- OWNER: "プロジェクトの責任者です。" / "Chủ dự án."
- ADMIN: "すべての操作ができます。" / "Quản trị viên, có thể thao tác mọi thứ."

Tên mặc định của 4 thành viên **không dịch**, giữ nguyên như mục 1.

---

## 6. KHÔNG ĐƯỢC LÀM

- Không sửa Supabase: schema, RLS, policy, dữ liệu.
- Không sửa API route phía server, kể cả route xóa hoặc route quản lý thành viên.
- Không thêm đăng nhập, không thêm Supabase Auth.
- Không gửi tên hoặc danh tính lên server ngoài các trường task/file đã có.
- Không thêm tính năng mới ngoài yêu cầu.
- Không đổi màu, font, bố cục đã thiết kế ở vòng 2, trừ phần Navbar và hồ sơ.

---

## 7. THỨ TỰ LÀM VIỆC

1. Đọc code, xác nhận mục 2, ghi chênh lệch.
2. Tạo `src/lib/profile.ts` (đọc/ghi `gth.profile`, giá trị mặc định, hàm `getSlotName`).
3. Tạo màn hình chọn danh tính và chặn app cho đến khi chọn.
4. Tạo mục "Hồ sơ của tôi" trên Navbar.
5. Gỡ gating quyền (mục 4.2), xóa Team (mục 4.3).
6. Thay dropdown assignee và logic "của tôi" (mục 4.4).
7. Xử lý dữ liệu cũ (mục 4.5).
8. Thêm i18n (mục 5), kiểm tra không còn chuỗi giới hạn quyền.
9. Build, lint, tìm chuỗi tiếng Việt/Anh hardcode còn sót.
10. Viết báo cáo.

---

## 8. TIÊU CHÍ HOÀN THÀNH

- [ ] Lần đầu mở app phải chọn danh tính và vai trò. Lần sau vào thẳng app.
- [ ] Bốn slot hiển thị đúng tên mặc định, người dùng đổi tên được và tên lưu sau khi tải lại trang.
- [ ] Vai trò lưu cục bộ, đổi được, không ảnh hưởng quyền thao tác.
- [ ] Mọi người đều tạo/sửa/xóa/upload được.
- [ ] Không còn tab Team, không còn `MemberManagement`, không còn nút thêm/kick thành viên.
- [ ] Không còn Role Switcher.
- [ ] Dropdown người phụ trách lấy từ 4 slot, có "Chưa gán".
- [ ] Bộ lọc "Của tôi" và Dashboard "Được gán cho tôi" dùng đúng slot hiện tại.
- [ ] Dữ liệu cũ không khớp slot hiển thị "Không xác định", không crash.
- [ ] Không sửa file phía server.
- [ ] Cả VI và JA đều có đủ key cho tính năng mới.
- [ ] Build và lint chạy thật, kết quả ghi vào báo cáo.
- [ ] Các luồng vòng 1 và 2 vẫn chạy: Kanban, upload có tiến độ, phát video, ConfirmDialog, toast, đổi ngôn ngữ.

---

## 9. MẪU BÁO CÁO — `REPORT_V3_TEAM_LOCAL.md`

```markdown
# BÁO CÁO VÒNG 3 — Danh tính cục bộ, bỏ phân quyền và mục Team

- **Ngày thực hiện:**
- **Người thực hiện:**
- **Nhánh / commit:**

## 1. Tóm tắt
(3–5 câu)

## 2. Đối chiếu hiện trạng (mục 2 của task)
- Chỗ khớp:
- Chỗ khác với code thật:

## 3. Danh tính cục bộ
- [ ] `src/lib/profile.ts` đọc/ghi `gth.profile`, có giá trị mặc định
- [ ] Màn hình chọn danh tính lần đầu
- [ ] Mục "Hồ sơ của tôi" trên Navbar
- [ ] Đổi tên slot lưu được sau khi tải lại
- [ ] Dữ liệu lỗi/thiếu không làm app crash (ghi cách đã thử)

## 4. Phân quyền
- Cách đã chọn: (a) xóa gọi hàm / (b) hàm trả true
- File đã sửa:
- Các nút đã bỏ disable / tooltip giới hạn:

## 5. Xóa mục Team
- [ ] Xóa MemberManagement.tsx
- [ ] Xóa tab Team khỏi Navbar và bottom nav
- [ ] Xóa Role Switcher
- [ ] Số key i18n đã xóa:
- [ ] Hàm client gọi API quản lý thành viên đã xóa:

## 6. Assignee và người tạo
- [ ] Dropdown lấy từ 4 slot, có "Chưa gán"
- [ ] Bộ lọc "Của tôi" đúng
- [ ] Dashboard "Được gán cho tôi" đúng
- Dữ liệu cũ không khớp slot: (số lượng, cách hiển thị)

## 7. i18n
- Số key thêm vào vi.ts / ja.ts:
- Chuỗi hardcode còn sót (kết quả tìm kiếm):

## 8. Danh sách file
| Đường dẫn | Loại (sửa / tạo mới / xóa) | Mô tả ngắn |
|---|---|---|
| | | |

## 9. Thư viện mới
(Không có thì ghi "Không có")

## 10. Kết quả kiểm tra
- `npm run build`:
- `npm run lint`:
- Kiểm tra thủ công (ghi rõ đã thử hay chưa):
  - [ ] Lần đầu mở app, chọn danh tính
  - [ ] Đổi tên slot, tải lại trang
  - [ ] Đổi vai trò, tạo/sửa/xóa task bình thường
  - [ ] Upload file/video, phát video
  - [ ] Kanban kéo thả
  - [ ] Đổi ngôn ngữ VI/JA
  - [ ] Mobile < 768px

## 11. Giả định và giới hạn đã biết
- Tên hiển thị đổi trên máy này không đồng bộ sang máy khác (vì lưu cục bộ). Đã ghi vào báo cáo cho người dùng: ...
- Vai trò không có tác dụng quyền:
- Quyền thật ở phía server (RLS, API) không được kiểm tra trong vòng này theo yêu cầu. Cần lưu ý nếu RLS đang dựa vào role: ...

## 12. Vấn đề phát hiện thêm
-

## 13. Việc còn lại
-
```

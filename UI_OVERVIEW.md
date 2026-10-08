# Tài liệu Kiến trúc & Thiết kế Giao diện (UI Architecture) - Game Team Hub

> **Dự án:** 4Crow(n) Chat / Game Team Hub (MVP v0.1)  
> **Tác giả:** Katsuragi Shin & Aika  
> **Cập nhật:** 08/10/2026  

---

## 1. Triết lý Thiết kế & Hệ thống Màu sắc (Design System)

Giao diện được thiết kế chuyên biệt cho các studio phát triển game độc lập (Indie Game Studio), lấy cảm hứng từ các công cụ hiện đại như Discord, Linear, và Steam Dev Console:

- **Tông màu chủ đạo (Dark Studio Theme):**
  - **Nền chính (*Background*):** `#090a0f` (Đen xanh đậm huyền bí, không chói mắt khi làm việc ban đêm).
  - **Thẻ nội dung (*Card background*):** `#12141d` và `#161924`.
  - **Đường viền ngăn cách (*Border*):** `#1f2330` và `#2a2f42`.
- **Màu nhận diện chức năng (*Accent Colors*):**
  - **Tím Indigo (`#6366f1`):** Màu thương hiệu, nút bấm hành động chính, tab đang chọn.
  - **Xanh Ngọc Emerald (`#10b981`):** Trạng thái `DONE` (hoàn tất), kho lưu trữ File & Game Build.
  - **Vàng Hổ Phách Amber (`#f59e0b`):** Trạng thái `REVIEW`, vai trò `OWNER`.
  - **Đỏ Rose (`#f43f5e`):** Cảnh báo task quá hạn (*Overdue*), độ ưu tiên `CRITICAL`, xóa dữ liệu.
  - **Xanh Lam Blue (`#3b82f6`):** Trạng thái `IN_PROGRESS`, task đang lập trình/vẽ art.

---

## 2. Cấu trúc Cây Giao diện (Component Tree)

Toàn bộ giao diện được xây dựng theo kiến trúc Component của **Next.js 16 (App Router)** và **Tailwind CSS**, phân tách thành các mô-đun độc lập tại thư mục `src/components/`:

```
src/app/page.tsx (Trang điều phối trung tâm)
│
├── src/components/layout/Navbar.tsx
│     ├── Brand Logo & Project Title
│     ├── Desktop Navigation Tabs (5 tabs)
│     ├── Role Switcher (Kiểm thử 4 Roles RBAC)
│     └── Mobile Drawer Navigation (Menu trượt di động)
│
└── Vùng hiển thị Nội dung (Chuyển đổi theo Tab):
      ├── [Tab 1] src/components/dashboard/DashboardOverview.tsx
      ├── [Tab 2] src/components/tasks/TaskList.tsx
      │             └── src/components/tasks/TaskDetailModal.tsx
      ├── [Tab 3] src/components/videos/VideoGallery.tsx
      │             ├── Modal Upload Video (HTML5 Canvas Thumbnail)
      │             └── src/components/videos/VideoPlayerModal.tsx
      ├── [Tab 4] src/components/files/FileVault.tsx
      │             └── Modal Upload File / Build (Hỗ trợ 10GB)
      └── [Tab 5] src/components/members/MemberManagement.tsx
                    └── Modal Thêm Thành viên mới
```

---

## 3. Chi tiết Từng Mô-đun Giao diện

### 3.1. Thanh Điều hướng (Navbar.tsx)
- **Vị trí:** Cố định ở đầu trang (`sticky top-0`), sử dụng hiệu ứng kính mờ (`backdrop-blur-md`).
- **Thành phần:**
  - **Logo Gamepad:** Biểu tượng tay cầm chơi game gradient tím phát sáng.
  - **5 Tab chuyển đổi:**
    1. `Tổng quan` (*Dashboard*)
    2. `Tasks` (*Quản lý công việc*)
    3. `Gameplay` (*Video test game*)
    4. `Files Vault` (*Kho file build & asset*)
    5. `Team` (*Quản lý phân quyền thành viên*)
  - **Bộ chuyển vai trò nhanh (*Role Switcher*):** Dropdown ở góc phải cho phép đổi ngay lập tức giữa `OWNER`, `ADMIN`, `MEMBER`, và `VIEWER` để kiểm tra phân quyền mà không cần đăng xuất.
  - **Menu Hamburger:** Tự động xuất hiện trên màn hình điện thoại (< 768px).

---

### 3.2. Màn hình Tổng quan (DashboardOverview.tsx)
Cung cấp cái nhìn toàn cảnh về dự án theo 4 khối thống kê và 2 cột nội dung chính:
- **4 Thẻ thống kê nhanh trên cùng:**
  1. *Tiến độ dự án:* Tính % số task hoàn thành (`DONE / Total Tasks`) kèm thanh tiến độ gradient.
  2. *Đang phát triển:* Số lượng task đang làm (`IN_PROGRESS`).
  3. *Quá Deadline:* Số task trễ hạn (tự đổi sang nền đỏ cảnh báo nếu > 0).
  4. *Kho Gameplay & File:* Tổng số video và file đang lưu trên Cloudflare R2.
- **Cột trái (Nhiệm vụ):**
  - Khung cảnh báo các task quá hạn cần xử lý gấp.
  - Danh sách task được gán cho người dùng hiện tại (*My Assigned Tasks*).
- **Cột phải (Tài nguyên mới nhất):**
  - Thẻ xem trước 3 clip gameplay mới nhất (hiển thị thumbnail, thời lượng, version).
  - Danh sách các file build / asset vừa được tải lên.

---

### 3.3. Quản lý Task & Checklist (TaskList.tsx & TaskDetailModal.tsx)
- **Danh sách phân nhóm 5 trạng thái:**
  - `TODO` (*Cần làm*)
  - `IN_PROGRESS` (*Đang làm*)
  - `REVIEW` (*Chờ duyệt*)
  - `DONE` (*Hoàn tất*)
  - `BLOCKED` (*Bị nghẽn*)
- **Bộ lọc & Tìm kiếm:** Lọc theo người phụ trách (*Assignee*), ô tìm kiếm tiêu đề thời gian thực.
- **Đổi trạng thái nhanh:** Menu chọn nhanh ngay trên từng dòng task mà không cần kéo thả phức tạp.
- **TaskDetailModal (Popup chi tiết):**
  - Đổi tiêu đề, mô tả, hạn chót (*Deadline*).
  - Checklist công việc: Thêm item mới, tích chọn hoàn thành (gạch ngang chữ), xóa item.
  - Thanh trượt % tiến độ (*Progress Slider*).
  - Phân quyền: Vai trò `VIEWER` chỉ được xem, `MEMBER` chỉ sửa task của mình, `ADMIN/OWNER` sửa tất cả.

---

### 3.4. Kho Video Gameplay (VideoGallery.tsx & VideoPlayerModal.tsx)
- **Danh sách Video Grid:** Hiển thị dạng lưới thẻ video kèm huy hiệu phiên bản (`v0.4.2`), thời lượng góc dưới (`formatDuration`), và dung lượng file (`formatBytes`).
- **Trích xuất Metadata thông minh tại Client (Không tốn tài nguyên server):**
  - Khi người dùng chọn file video từ máy tính, hàm `extractVideoMetadata`:
    1. Tạo thẻ `<video>` ngầm, lắng nghe sự kiện `loadedmetadata` để lấy thời lượng chính xác.
    2. Tua tới giây thứ 1 (hoặc 10% clip), vẽ khung hình lên thẻ `<canvas>` để tạo ảnh thumbnail JPG.
    3. Hiển thị thumbnail xem trước ngay lập tức trên popup trước khi bấm upload!
- **VideoPlayerModal:**
  - Trình phát video qua đường link an toàn Cloudflare R2 (presigned URL có hạn 1 giờ).
  - Tự động hiển thị cảnh báo tương thích nếu video là định dạng `.mov` hoặc `.mkv`.
  - Có nút làm mới link phát (*Refresh link*) nếu link quá hạn.

---

### 3.5. Kho Lưu trữ File & Game Build (FileVault.tsx)
- **Phân loại theo thư mục:**
  - `builds` (*File cài game nặng tới 10GB: .zip, .exe, .apk*)
  - `assets` (*Đồ hoạ, mô hình 3D: .ase, .psd, .fbx*)
  - `audio` (*Nhạc nền, âm thanh: .wav, .ogg*)
  - `general` (*Tài liệu thiết kế game GDD, kịch bản*)
- **Tự động nhận diện biểu tượng file:** Đổi icon tương ứng (nén, ảnh, nhạc, văn bản).
- **Liên kết Task:** Mỗi file có thể gắn với 1 task cụ thể để dễ tra cứu nguồn gốc.

---

### 3.6. Quản lý Thành viên (MemberManagement.tsx)
- **Bảng ma trận 4 vai trò (RBAC):**
  - `OWNER`: Chủ dự án, toàn quyền cấu hình, xóa dự án.
  - `ADMIN`: Quản trị viên, sửa mọi task, quản lý thành viên, xóa file/video.
  - `MEMBER`: Thành viên chính thức, tạo task, sửa task của mình, tải lên file/video.
  - `VIEWER`: Khách / Nhà phát hành, chỉ xem và tải file, không có quyền sửa đổi.
- **Thao tác:** Đổi vai trò thành viên bằng dropdown menu, xóa thành viên, thêm thành viên mới.

---

## 4. Tương thích Đa thiết bị (Responsive Mobile & PC)

- **Máy tính (Desktop):** Bố cục lưới rộng (tối đa `max-w-7xl`), chia 2 cột tỉ lệ 7:5 ở Dashboard, modal popup canh giữa màn hình có hiệu ứng nền mờ `backdrop-blur`.
- **Điện thoại (Mobile - iOS Safari & Chrome Android):**
  - Thanh điều hướng co gọn thành icon Hamburger.
  - Các bảng chuyển sang dạng cuộn dọc 1 cột (`grid-cols-1`).
  - Các nút bấm, selector có khoảng chạm (*touch target*) tối thiểu 44px, thân thiện với ngón tay.
  - Modal tự động điều chỉnh chiều cao tối đa `max-h-[90vh]` kèm thanh cuộn mượt mà.

---

## 5. Tổng kết Công nghệ Sử dụng

| Thành phần | Công nghệ | Mục đích |
|---|---|---|
| **Framework** | Next.js 16 (Turbopack) | Server Components & Client Hooks |
| **CSS Engine** | Tailwind CSS v4 | Thiết kế giao diện utility-first hiện đại |
| **Icons** | Lucide React | Bộ icon chuyên nghiệp, đồng bộ |
| **Lưu trữ Cloud** | Cloudflare R2 | Upload trực tiếp Multipart bằng presigned URL |
| **Database & Auth** | Supabase (PostgreSQL) | Bảng dữ liệu quan hệ và bảo mật hàng RLS |
| **Deploy Hosting** | Vercel | Máy chủ đám mây toàn cầu hoạt động 24/7 |

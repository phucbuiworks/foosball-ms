# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

**Project Name:** Foosball Tournament Tracker
**Type:** Internal Web Application (Sử dụng nội bộ, không commercial/marketing)

---

## 1. User Roles (Quyền người dùng)
Hệ thống sử dụng mô hình **Flat Access** (Không phân quyền). 
*   **Authenticated User (Người dùng nội bộ):** Bất kỳ ai có tài khoản đăng nhập vào hệ thống đều có full quyền hạn: Tạo giải đấu, thêm người chơi, chia đội, sinh lịch thi đấu, cập nhật tỷ số và xem bảng xếp hạng. 

*(Lưu ý từ vựng: Từ "Player" ở các phần dưới đây chỉ mang ý nghĩa là "Người tham gia thi đấu" trong data model, không phải là một System Role).*

---

## 2. Use Cases (Kịch bản sử dụng cốt lõi)

**Use Case 1: Khởi tạo giải đấu và đăng ký người tham gia**
*   **Actor:** Authenticated User
*   **Flow:** User đăng nhập -> Click "Create New Tournament" -> Nhập tên giải -> Nhập danh sách tên người tham gia (Players) -> Đánh dấu tick `is_seed` (Hạt giống) cho các player xuất sắc. -> Hệ thống validate tổng số người chơi phải là số chẵn và N >= 6.

**Use Case 2: Chia đội ngẫu nhiên (Team Randomization)**
*   **Actor:** Authenticated User
*   **Flow:** User click "Generate Teams" -> Hệ thống tự động bắt cặp 2 người/team. 
*   **Constraint:** Các player có cờ `is_seed = true` sẽ rải đều, không bao giờ chung team với nhau -> Giao diện hiển thị danh sách các Team vừa tạo.

**Use Case 3: Lên lịch và chuẩn bị thi đấu (Match Scheduling)**
*   **Actor:** Authenticated User
*   **Flow:** Hệ thống tự động tạo lịch thi đấu vòng tròn 2 lượt (Double Round-Robin) -> Mọi người mở ứng dụng xem lịch -> Nhìn vào visual indicator để biết trận tiếp theo team mình đá sân nhà (Màu Trắng) hay sân khách (Màu Đỏ) để đứng đúng vị trí trên bàn Foosball.

**Use Case 4: Nhập kết quả trận đấu (Score Tracking)**
*   **Actor:** Authenticated User
*   **Flow:** Khi trận đấu kết thúc, user click vào trận đó trên UI -> Popup nhập tỷ số hiện lên -> Nhập tỷ số (Ví dụ: Trắng 5 - 3 Đỏ) -> Submit. Nếu tỷ số không có đội nào đạt 5 điểm, hoặc cả 2 đội đều >= 5, hệ thống từ chối và báo lỗi Invalid.

**Use Case 5: Theo dõi Bảng xếp hạng (Leaderboard Tracking)**
*   **Actor:** Authenticated User
*   **Flow:** Ngay sau khi tỷ số 1 trận được submit, Leaderboard tự động tính toán lại Points, GD (Hiệu số), GF (Bàn thắng) và thay đổi thứ hạng realtime.

---

## 3. Danh sách tính năng chi tiết (Functional Requirements)

### 3.1. Module Authentication
*   **Sign-up / Sign-in:** Chức năng đăng nhập, đăng ký cơ bản cho nội bộ công ty. Mọi user sau khi Sign-in đều có quyền truy cập toàn bộ tính năng.

### 3.2. Module Tournament Setup (Khởi tạo giải đấu)
*   **Create Tournament:** Nhập tên giải, trạng thái giải đấu (`Draft`, `In Progress`, `Completed`).
*   **Player Entry Form:** 
    *   Thêm/Xóa player form.
    *   Toggle/Checkbox chọn Tier: Hạt giống (Seed) vs Thường (Non-seed).
*   **Validation Logic Engine:** 
    *   Rule 1: Tổng số players % 2 = 0.
    *   Rule 2: Tổng số players >= 6.
    *   Rule 3: Số lượng `is_seed` <= Số lượng Team (để đảm bảo đủ slot chia đều).

### 3.3. Module Team & Fixture Generator (Core Engine)
*   **Randomizer:** Nút bấm trigger thuật toán chia đội. Xáo trộn ngẫu nhiên nhưng phải tuân thủ Rule 3.
*   **Schedule Builder:** Thuật toán Circle Method.
    *   Generate Lượt đi (Leg 1).
    *   Generate Lượt về (Leg 2).
*   **Side Assigner:** Assign hardcode màu **Trắng (White)** cho Home Team và màu **Đỏ (Red)** cho Away team trong từng Match record. Đảo ngược lại ở Lượt về.

### 3.4. Module Tournament Dashboard (Giao diện chính)
*   **Leaderboard Table:**
    *   Các cột hiển thị: Team Name, Played (Số trận), W (Thắng), L (Thua), GF (Bàn thắng), GA (Bàn thua), GD (Hiệu số), **Points (Điểm)**.
    *   Sorting engine: Auto-sort theo Points -> GD -> GF.
*   **Match List View:**
    *   Filter/Tab: Xem tất cả, Xem theo vòng (Round), hoặc Lọc các trận "Chưa đá" (Pending).
    *   Hiển thị UI: Tên đội Trắng (có chấm Trắng) `[Tỷ số]` Tên đội Đỏ (có chấm Đỏ).
*   **Score Input Modal:**
    *   Form nhập 2 số nguyên.
    *   Validator: Bắt buộc (Score A = 5 and Score B < 5) OR (Score B = 5 and Score A < 5).

### 3.5. Module UI/UX & Non-Functional Requirements
*   **Mobile-first Responsive:** Giao diện bắt buộc phải tối ưu cho màn hình dọc (mobile) vì user chủ yếu tương tác bằng điện thoại quanh khu vực bàn bi lắc.
*   **Real-time / Auto-sync:** Data (kết quả trận đấu, leaderboard) cần được sync realtime hoặc re-fetch liên tục để mọi thiết bị đều nhìn thấy bảng điểm mới nhất.

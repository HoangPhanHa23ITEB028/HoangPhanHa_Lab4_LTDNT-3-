# Lab 04: Cải tiến ứng dụng Survey theo mô hình Offline-First
## 1. Cập nhật mô hình dữ liệu Survey
Schema của ứng dụng đã được mở rộng nhằm cho phép người dùng nhập thêm thông tin liên quan đến địa điểm và loại hạng mục cần khảo sát.
Các thuộc tính mới được thêm vào `survey-schema.js` gồm:
* **`building`**: Xác định khu vực/tòa nhà đang được khảo sát, với các lựa chọn:
  * Khu A
  * Khu B
  * Khu C
  * Khác
* **`facility_type`**: Phân loại đối tượng khảo sát:
  * Điện
  * Nước
  * Bàn ghế
  * Thiết bị
  * Khác
* **`note`**: Cho phép người dùng nhập thêm thông tin hoặc mô tả chi tiết. Trường này không bắt buộc.
Việc bổ sung các thuộc tính trên giúp dữ liệu thu thập được cụ thể hơn và thuận tiện cho quá trình xử lý về sau.
## 2. Hoàn thiện cơ chế Skip Logic
Ứng dụng tiếp tục sử dụng thuộc tính `showIf` trong schema để điều khiển việc hiển thị các trường phụ thuộc vào lựa chọn của người dùng.
Cụ thể:
* Khi người dùng chọn **`building = "other"`**, ứng dụng sẽ tự động mở thêm trường **`building_name`** để nhập tên tòa nhà.
* Khi lựa chọn **`facility_type = "other"`**, hệ thống hiển thị trường **`other_facility_name`**, cho phép người dùng mô tả loại hạng mục chưa có trong danh sách.
Cách triển khai này giúp giao diện chỉ hiển thị những thông tin thực sự cần thiết thay vì đưa toàn bộ trường nhập liệu lên màn hình ngay từ đầu.
## 3. Cải thiện danh sách Local Submissions
Phần hiển thị các submission được lưu cục bộ trong `app.js` đã được điều chỉnh để cung cấp nhiều thông tin hơn cho người dùng.
Mỗi bản ghi hiện có thể hiển thị các nội dung chính:
* Khu vực hoặc tòa nhà được lựa chọn.
* Nhóm hạng mục được khảo sát.
* Trạng thái/tình trạng của hạng mục.
* Thời điểm submission được tạo.
Nhờ đó, người dùng có thể nhanh chóng kiểm tra và phân biệt các dữ liệu đã nhập ngay trên danh sách Local Submissions.
## 4. Extension A – Theo dõi trạng thái đồng bộ
Một chức năng mới được bổ sung vào `index.html` và `app.js` nhằm giúp người dùng theo dõi tình trạng đồng bộ dữ liệu.
Hệ thống thực hiện phân loại các submission thành hai nhóm:
* **Pending**: Những bản ghi hiện vẫn đang chờ được đồng bộ.
* **Synced**: Những bản ghi đã được đồng bộ thành công.
Số lượng của từng nhóm được hiển thị trực tiếp trên giao diện. Bộ đếm này giúp người dùng dễ dàng nhận biết còn bao nhiêu dữ liệu chưa được đồng bộ và bao nhiêu dữ liệu đã hoàn tất quá trình đồng bộ.
## 5. Kết quả sau khi mở rộng
Sau các thay đổi, ứng dụng Survey có khả năng:
* Thu thập thông tin khảo sát chi tiết hơn.
* Xử lý các trường nhập liệu phát sinh theo lựa chọn của người dùng.
* Hiển thị đầy đủ hơn nội dung của các submission được lưu local.
* Theo dõi số lượng dữ liệu đang chờ đồng bộ và dữ liệu đã đồng bộ.
* Tiếp tục duy trì cơ chế hoạt động Offline-First của ứng dụng.

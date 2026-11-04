# Oẳn Tù Tì Online (2 người)

## Chạy trên máy tính
1. Cài Node.js 18 trở lên.
2. Mở terminal tại thư mục dự án.
3. Chạy `npm install`.
4. Chạy `npm start`.
5. Mở `http://localhost:3000`.

## Đẩy lên GitHub
Tạo repository mới trên GitHub, sau đó chạy trong thư mục dự án:

```bash
git init
git add .
git commit -m "Create online rock paper scissors game"
git branch -M main
git remote add origin https://github.com/TEN_TAI_KHOAN/TEN_REPOSITORY.git
git push -u origin main
```

Nếu đã có remote `origin`, không chạy lại lệnh `git remote add origin`.

## Deploy trên Render
1. Đăng nhập Render và chọn **New +** → **Web Service**.
2. Kết nối GitHub và chọn repository này.
3. Runtime: **Node**.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Chọn gói phù hợp rồi nhấn **Create Web Service**.
7. Chờ deploy thành công, mở URL Render được cấp.

Không cần tự khai báo PORT; Render tự truyền biến môi trường PORT.

## Cách chơi
- Người đầu tiên mở link, nhập tên và tạo phòng.
- Sao chép link mời hoặc mã phòng gửi cho người thứ hai.
- Người thứ hai mở link, nhập tên rồi vào phòng.
- Khi đủ hai người, bấm Bắt đầu trận đấu.
- Mỗi lượt có 5 giây. Nếu một người không chọn kịp, người đã chọn thắng lượt đó; nếu cả hai không chọn thì hòa.
- Mỗi người đạt 20 điểm trước sẽ thắng.

## Lưu ý
Phiên bản mẫu lưu trạng thái phòng trong bộ nhớ của server. Nếu Render khởi động lại hoặc deploy lại, phòng đang chơi sẽ bị mất. Đây là bản chơi thử, chưa có đăng nhập, lưu lịch sử hoặc thanh toán tiền thật. Số tiền VND chỉ là giá trị quy đổi hiển thị theo điểm.

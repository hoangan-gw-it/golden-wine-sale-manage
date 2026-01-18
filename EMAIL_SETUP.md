# Hướng dẫn cấu hình gửi email hóa đơn

## Tính năng

Khi cập nhật trạng thái đơn hàng thành "Đã thanh toán" (`financial_status: "paid"`), hệ thống sẽ tự động gửi email hóa đơn về email admin cố định để tổng hợp và kiểm tra.

## Cài đặt

### Bước 1: Cài đặt Nodemailer

```bash
pnpm add nodemailer @types/nodemailer
```

### Bước 2: Cấu hình Email Service

#### Option 1: Gmail (Đơn giản nhất)

**Bước 1: Bật 2-Step Verification**

1. Vào [Google Account Settings](https://myaccount.google.com/)
2. Click vào **Security** (Bảo mật)
3. Tìm **2-Step Verification** → Click **Get started** (Bắt đầu)
4. Làm theo hướng dẫn để bật xác thực 2 bước (nhập số điện thoại, xác nhận mã)

**Bước 2: Tạo App Password (Mật khẩu ứng dụng)**

> ⚠️ **Lưu ý:** Gmail không còn cho phép dùng mật khẩu thường để đăng nhập từ ứng dụng bên thứ ba. Bạn **bắt buộc** phải dùng App Password.

1. Vào [App Passwords](https://myaccount.google.com/apppasswords)
   - Hoặc: Google Account → Security → App passwords
2. Nếu chưa thấy, đảm bảo **2-Step Verification** đã được bật (bước 1)
3. Trong trang App passwords:
   - **Select app**: Chọn **Mail**
   - **Select device**: Chọn **Other (Custom name)** → Nhập tên (ví dụ: "IPOS App")
   - Click **Generate** (Tạo)
4. Google sẽ hiển thị mật khẩu 16 ký tự (ví dụ: `abcd efgh ijkl mnop`)
   - ⚠️ **Copy ngay mật khẩu này** - bạn chỉ thấy 1 lần!
   - Mật khẩu có dạng: 4 nhóm, mỗi nhóm 4 ký tự, có dấu cách

**Bước 3: Thêm vào `.env.local`**

Mở file `.env.local` trong thư mục gốc của project và thêm:

```env
# Gmail Configuration
EMAIL_USER=your-email@gmail.com
# App Password: Copy từ Google App Passwords, có thể giữ hoặc bỏ dấu cách
EMAIL_PASSWORD=abcd efgh ijkl mnop  # Hoặc: abcdefghijklmnop
EMAIL_FROM=noreply@goldenwine.vn  # Email hiển thị là người gửi
ADMIN_EMAIL=admin@goldenwine.vn  # Email nhận hóa đơn

# Optional: Explicit SMTP config (nếu muốn chỉ định rõ)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Ví dụ cụ thể:**

Nếu Google App Password của bạn là: `abcd efgh ijkl mnop`

Bạn có thể ghi trong `.env.local` theo 1 trong 2 cách:

```env
EMAIL_PASSWORD=abcd efgh ijkl mnop
# HOẶC (bỏ dấu cách):
EMAIL_PASSWORD=abcdefghijklmnop
```

**Lưu ý quan trọng:**

- ✅ App Password **khác** với mật khẩu Gmail thông thường
- ✅ Mỗi App Password chỉ hiển thị **1 lần duy nhất** - nhớ copy ngay
- ✅ Nếu quên App Password, tạo mới và cập nhật lại `.env.local`
- ✅ Không chia sẻ App Password với ai khác

#### Option 2: SMTP Server khác (Outlook, Custom SMTP)

```env
# SMTP Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-password

EMAIL_FROM=noreply@goldenwine.vn
ADMIN_EMAIL=admin@goldenwine.vn
```

**Lưu ý:**

- `SMTP_SECURE=true` cho port 465 (SSL)
- `SMTP_SECURE=false` cho port 587 (TLS)

#### Option 3: SendGrid (Nếu muốn dùng SendGrid)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx  # SendGrid API Key

EMAIL_FROM=noreply@goldenwine.vn
ADMIN_EMAIL=admin@goldenwine.vn
```

### Bước 3: Restart Server

```bash
pnpm dev
```

## Cách hoạt động

1. **Khi thanh toán chuyển khoản:**
   - Bấm "Đã thanh toán" trong QR modal
   - Hệ thống cập nhật `financial_status = "paid"`
   - Tự động gửi email hóa đơn về email admin

2. **Khi thanh toán tiền mặt:**
   - Bấm "Thanh toán"
   - Hệ thống cập nhật `financial_status = "paid"` ngay
   - Tự động gửi email hóa đơn về email admin

## Email đích

Email được gửi về email admin cố định được cấu hình trong biến môi trường `ADMIN_EMAIL`.

**Lưu ý:** Nếu không cấu hình `ADMIN_EMAIL`, hệ thống sẽ trả về lỗi khi cố gắng gửi email.

## Template Email

Email hóa đơn bao gồm:

- Thông tin shop (GOLDEN WINE)
- Số hóa đơn, ngày đặt hàng
- Danh sách sản phẩm với số lượng, giá
- Tổng tiền
- Footer với chính sách đổi trả

## API Endpoint

### Gửi email hóa đơn thủ công

```typescript
POST /api/orders/[id]/send-invoice
Body: {
  orderData: {...} // Optional, will fetch if not provided
}
```

## Troubleshooting

### Email không được gửi?

1. **Kiểm tra biến môi trường:**
   - Đảm bảo `.env.local` có `EMAIL_USER` và `EMAIL_PASSWORD`
   - Restart server sau khi sửa `.env.local`: `pnpm dev`

2. **Với Gmail:**
   - ✅ Đã bật **2-Step Verification** chưa?
   - ✅ Đang dùng **App Password** (không phải mật khẩu Gmail thông thường)?
   - ✅ App Password có đúng 16 ký tự không?

3. **Kiểm tra lỗi:**
   - Xem console logs khi test gửi email
   - Kiểm tra lỗi xác thực (authentication failed)

4. **Kiểm tra network:**
   - Firewall có chặn port 587 (SMTP) không?
   - Proxy/VPN có ảnh hưởng không?

### Gmail: "Less secure app access"

- Gmail không còn hỗ trợ "Less secure app access"
- **Bắt buộc phải dùng App Password** (xem Option 1, Bước 2)

### Lỗi "Invalid login" hoặc "Authentication failed"

1. **Gmail:**
   - Đảm bảo đang dùng **App Password**, không phải mật khẩu Gmail
   - Kiểm tra `EMAIL_USER` là địa chỉ email đầy đủ (ví dụ: `your-email@gmail.com`)
   - Thử tạo App Password mới nếu bị lỗi

2. **SMTP khác:**
   - Kiểm tra `SMTP_USER` và `SMTP_PASS` đúng chưa
   - Đảm bảo `SMTP_HOST` và `SMTP_PORT` đúng với nhà cung cấp email

### Làm sao để kiểm tra EMAIL_PASSWORD đúng chưa?

Cách đơn giản nhất: **Tạo đơn hàng test và thanh toán**. Nếu email được gửi thành công, password đúng.

Nếu muốn test thủ công, có thể gọi API:

```bash
POST /api/orders/[order-id]/send-invoice
```

### Email vào spam?

- Cấu hình SPF, DKIM records cho domain
- Sử dụng email từ domain đã được verify
- Tránh gửi quá nhiều email cùng lúc

## Ưu điểm của Nodemailer

- ✅ Miễn phí (không cần đăng ký dịch vụ riêng nếu dùng Gmail/SMTP)
- ✅ Linh hoạt: Hỗ trợ nhiều SMTP server
- ✅ Phổ biến trong Node.js ecosystem
- ✅ Dễ cấu hình với Gmail

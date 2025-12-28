# Sửa lỗi Firebase: Error (auth/unauthorized-domain)

## Vấn đề

Khi deploy lên Vercel và truy cập qua custom domain, bạn gặp lỗi:

```
Firebase: Error (auth/unauthorized-domain)
```

Hoặc khi đăng nhập Google, không hiển thị popup chọn email.

## Nguyên nhân

Firebase Authentication chỉ cho phép các domain đã được authorize mới có thể sử dụng. Domain của bạn (subdomain) chưa được thêm vào danh sách authorized domains.

## Cách sửa

### Bước 1: Xác định domain của bạn

Domain của bạn sẽ là một trong các trường hợp:

- Custom domain: `internal.yourdomain.com` (nếu đã cấu hình)
- Vercel domain: `your-project.vercel.app` (domain mặc định của Vercel)
- Preview domain: `your-project-xxx.vercel.app` (nếu là preview deployment)

### Bước 2: Thêm domain vào Firebase Authorized Domains

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Authentication** > **Settings** (cài đặt)
4. Cuộn xuống phần **Authorized domains**
5. Click **Add domain**
6. Nhập domain của bạn:
   - Nếu là custom domain: `internal.yourdomain.com` (không có `https://` hoặc `http://`)
   - Nếu là Vercel domain: `your-project.vercel.app`
7. Click **Add**

### Bước 3: Kiểm tra các domains đã có

Firebase mặc định có các domains:

- `localhost` (cho development)
- `your-project.firebaseapp.com`
- `your-project.web.app`

Bạn cần thêm:

- ✅ Domain production của Vercel
- ✅ Domain custom (nếu có)

### Bước 4: Xác nhận

Sau khi thêm, domain sẽ xuất hiện trong danh sách **Authorized domains**.

### Bước 5: Test lại

1. Refresh trang web
2. Thử đăng nhập lại
3. Popup chọn email Google sẽ hiển thị

## Ví dụ

Giả sử bạn đã deploy lên:

- Custom domain: `internal.goldenwine.com`
- Vercel domain: `golden-wine-sale.vercel.app`

Bạn cần thêm CẢ HAI vào Firebase:

```
Authorized domains:
├── localhost (mặc định)
├── golden-wine-internal.firebaseapp.com (mặc định)
├── golden-wine-internal.web.app (mặc định)
├── internal.goldenwine.com ← THÊM
└── golden-wine-sale.vercel.app ← THÊM
```

## Lưu ý quan trọng

### 1. Không thêm protocol

- ❌ SAI: `https://internal.yourdomain.com`
- ✅ ĐÚNG: `internal.yourdomain.com`

### 2. Không thêm trailing slash

- ❌ SAI: `internal.yourdomain.com/`
- ✅ ĐÚNG: `internal.yourdomain.com`

### 3. Thêm tất cả domains sẽ dùng

- Production domain
- Preview domains (nếu muốn test)
- Development domains (nếu deploy staging)

### 4. Thay đổi có hiệu lực ngay

- Không cần restart hay rebuild
- Chỉ cần refresh trang browser

## Troubleshooting

### Vẫn còn lỗi sau khi thêm domain

1. **Kiểm tra domain đã được thêm đúng:**
   - Vào Firebase Console > Authentication > Settings > Authorized domains
   - Xác nhận domain có trong danh sách

2. **Kiểm tra domain đang truy cập:**
   - Xem URL trên browser address bar
   - Đảm bảo domain khớp chính xác (cả www và non-www khác nhau)

3. **Clear cache và thử lại:**
   - Hard refresh: `Ctrl + Shift + R` (Windows) hoặc `Cmd + Shift + R` (Mac)
   - Hoặc clear browser cache

4. **Kiểm tra HTTPS:**
   - Firebase Auth yêu cầu HTTPS (trừ localhost)
   - Vercel tự động cấp SSL, đảm bảo bạn đang dùng `https://`

### Popup không hiển thị

1. Kiểm tra popup blocker trong browser
2. Kiểm tra domain đã được authorize
3. Kiểm tra Console có lỗi gì không (F12)

### Lỗi trên mobile

- Kiểm tra domain đã được thêm vào authorized domains
- Kiểm tra đang dùng HTTPS
- Thử clear cache của mobile browser

## Checklist

- [ ] Đã xác định domain đang dùng (custom domain hoặc vercel.app)
- [ ] Đã thêm domain vào Firebase Authorized domains
- [ ] Domain được thêm đúng format (không có https://, không có /)
- [ ] Đã refresh trang sau khi thêm domain
- [ ] Đã test đăng nhập lại

## Quick Fix

1. Vào Firebase Console: <https://console.firebase.google.com/>
2. Chọn project > Authentication > Settings
3. Scroll xuống "Authorized domains"
4. Click "Add domain"
5. Nhập domain của bạn (ví dụ: `internal.yourdomain.com`)
6. Click "Add"
7. Refresh trang web
8. Test đăng nhập

Xong! 🎉

# Hướng dẫn bật Google Sign-In trong Firebase

## Bước 1: Bật Google Authentication Provider

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Authentication** > **Sign-in method**
4. Click vào **Google** provider
5. Bật **Enable** toggle
6. Chọn **Project support email** (email của bạn)
7. Click **Save**

## Bước 2: Cấu hình OAuth consent screen (nếu cần)

Nếu bạn chưa có OAuth consent screen:

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project tương ứng với Firebase project
3. Vào **APIs & Services** > **OAuth consent screen**
4. Chọn **External** (cho development) hoặc **Internal** (cho G Suite)
5. Điền thông tin:
   - App name
   - User support email
   - Developer contact information
6. Click **Save and Continue**
7. Ở màn hình **Scopes**, click **Save and Continue**
8. Ở màn hình **Test users** (nếu chọn External), thêm test users nếu cần
9. Click **Save and Continue** > **Back to Dashboard**

## Bước 3: Thêm Authorized domains (nếu cần)

Firebase tự động thêm các domain:
- `localhost` (cho development)
- Firebase hosting domains

Nếu deploy lên domain khác, thêm vào:
1. Firebase Console > Authentication > Settings
2. Trong **Authorized domains**, click **Add domain**
3. Thêm domain của bạn

## Bước 4: Test đăng nhập

1. Chạy ứng dụng: `pnpm dev`
2. Mở http://localhost:3000/login
3. Click "Đăng nhập với Google"
4. Chọn tài khoản Google
5. Cho phép quyền truy cập

**Lưu ý:** User phải đã được tạo trong Firestore collection `users` trước (xem `HUONG_DAN_TAO_USER.md`)

## Troubleshooting

### Lỗi: "Error 400: redirect_uri_mismatch"
- Kiểm tra Authorized domains trong Firebase Console
- Đảm bảo domain đang sử dụng đã được thêm vào

### Lỗi: "Access blocked: This app's request is invalid"
- Kiểm tra OAuth consent screen đã được cấu hình đúng
- Đảm bảo project support email đã được đặt

### User đăng nhập thành công nhưng bị từ chối truy cập
- Kiểm tra user đã được tạo trong Firestore collection `users`
- Đảm bảo `isActive` = `true`
- Kiểm tra email khớp với email trong Firestore



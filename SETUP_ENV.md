# Hướng dẫn tạo file .env.local

## Lỗi hiện tại

Bạn đang gặp lỗi: `Firebase: Error (auth/invalid-api-key)`

Điều này xảy ra vì file `.env.local` chưa được tạo hoặc thiếu thông tin Firebase.

## Cách khắc phục

### Bước 1: Lấy thông tin Firebase

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn (hoặc tạo project mới)
3. Click vào biểu tượng **⚙️ Settings** (Cài đặt) > **Project settings**
4. Cuộn xuống phần **Your apps**
5. Nếu chưa có web app, click **Add app** > chọn biểu tượng **</>** (Web)
6. Đặt tên app và click **Register app**
7. Copy thông tin config từ **Firebase SDK snippet** (phần Config)

Bạn sẽ thấy một đoạn code như này:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Bước 2: Tạo file .env.local

1. Trong thư mục gốc của project (cùng cấp với `package.json`)
2. Tạo file mới tên `.env.local`
3. Copy nội dung sau và điền thông tin từ Firebase:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy... (giá trị apiKey)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com (giá trị authDomain)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id (giá trị projectId)
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com (giá trị storageBucket)
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789 (giá trị messagingSenderId)
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456 (giá trị appId)

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token

# VietQR Configuration (for payment QR code)
NEXT_PUBLIC_VIETQR_BANK_ID=vietinbank
NEXT_PUBLIC_VIETQR_ACCOUNT_NO=your-account-number
NEXT_PUBLIC_VIETQR_TEMPLATE=compact2
NEXT_PUBLIC_VIETQR_ACCOUNT_NAME=Your Account Name
```

**Ví dụ:**

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbc123Def456Ghi789Jkl012Mno345
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-sales-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-sales-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-sales-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=987654321
NEXT_PUBLIC_FIREBASE_APP_ID=1:987654321:web:xyz789abc123def456

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=my-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# VietQR Configuration (for payment QR code)
NEXT_PUBLIC_VIETQR_BANK_ID=vietinbank
NEXT_PUBLIC_VIETQR_ACCOUNT_NO=113366668888
NEXT_PUBLIC_VIETQR_TEMPLATE=compact2
NEXT_PUBLIC_VIETQR_ACCOUNT_NAME=Golden Wine
```

### Bước 3: Khởi động lại dev server

Sau khi tạo file `.env.local`, bạn **phải khởi động lại** dev server:

1. Dừng server hiện tại (Ctrl + C)
2. Chạy lại:
   ```bash
   pnpm dev
   ```

### Bước 4: Kiểm tra

Nếu vẫn còn lỗi, kiểm tra:

1. ✅ File `.env.local` đã được tạo trong thư mục gốc (cùng cấp với `package.json`)
2. ✅ Tất cả các biến đều có giá trị (không có `your-...`)
3. ✅ Không có dấu ngoặc kép `"` hoặc dấu phẩy `,` trong giá trị
4. ✅ Đã khởi động lại dev server

## Lưu ý

- File `.env.local` đã được thêm vào `.gitignore` nên sẽ không bị commit lên Git
- Không chia sẻ file `.env.local` với người khác
- Mỗi môi trường (local, staging, production) cần có file `.env` riêng

## Shopify Configuration

Nếu bạn sử dụng tính năng IPOS, bạn cần cấu hình Shopify API:

1. Xem file `SHOPIFY_SETUP.md` để biết cách lấy Admin Access Token
2. Thêm các biến sau vào `.env.local`:
   ```env
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
   SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token
   ```
3. **Quan trọng**: Sau khi thêm biến môi trường, phải khởi động lại dev server

## Chưa có Firebase Project?

Nếu bạn chưa có Firebase project, xem:
- `FIREBASE_SETUP.md` - Hướng dẫn tạo Firebase project
- `HUONG_DAN_NHANH.md` - Hướng dẫn nhanh



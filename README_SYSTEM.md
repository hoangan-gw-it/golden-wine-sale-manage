# Hệ thống Quản lý Bán hàng - Sales Management System

Hệ thống quản lý bán hàng fullstack với Firebase, hỗ trợ đăng nhập Google, phân quyền admin/sale, và xuất báo cáo Excel.

## Tính năng chính

### 🔐 Authentication
- Đăng nhập với Google
- Whitelist system - Chỉ user được tạo trong hệ thống mới đăng nhập được
- Phân quyền theo role (admin/sale)

### 👨‍💼 Nhân viên Sale
- Nhập sản phẩm bán hàng (tên sản phẩm, số lượng, giá)
- Xem lịch sử bán hàng của mình
- Thống kê doanh thu hôm nay

### 👨‍💻 Admin
- Xem tất cả dữ liệu bán hàng
- Lọc theo ngày, tuần, khoảng thời gian
- Xuất báo cáo ra file Excel
- Thống kê tổng quan (tổng đơn, doanh thu, trung bình/đơn)

## Cấu trúc Project

```
internal-app/
├── app/
│   ├── admin/              # Trang admin
│   ├── dashboard/          # Trang nhân viên sale
│   ├── login/              # Trang đăng nhập
│   └── page.tsx            # Home page (redirect)
├── components/
│   └── Layout.tsx          # Layout component với navigation
├── lib/
│   ├── firebase/
│   │   ├── auth.ts         # Authentication functions
│   │   ├── config.ts       # Firebase config
│   │   ├── firestore.ts    # Firestore helpers
│   │   ├── sales.ts        # Sales records functions
│   │   ├── storage.ts      # Storage functions
│   │   └── users.ts        # User management functions
│   ├── hooks/
│   │   └── useAuth.ts      # Auth hook
│   └── types/
│       └── index.ts        # TypeScript types
└── ...
```

## Quick Start

### 1. Setup Firebase

Xem `FIREBASE_SETUP.md` và `FIREBASE_SETUP_GOOGLE.md` để:
- Tạo Firebase project
- Bật Google Authentication
- Cấu hình Firestore
- Thêm environment variables

### 2. Tạo User đầu tiên

**Quan trọng:** Bạn cần tạo user đầu tiên trong Firestore trước khi đăng nhập.

Xem `HUONG_DAN_TAO_USER.md` để biết cách tạo user admin đầu tiên.

**Cách nhanh:**
1. Đăng nhập Google một lần (sẽ bị từ chối)
2. Vào Firebase Console > Authentication > Copy UID
3. Vào Firestore > Tạo collection `users` > Tạo document với ID = UID
4. Thêm fields:
   ```json
   {
     "id": "uid-here",
     "email": "your-email@gmail.com",
     "displayName": "Admin",
     "role": "admin",
     "isActive": true,
     "createdAt": "2024-01-01T00:00:00Z",
     "updatedAt": "2024-01-01T00:00:00Z"
   }
   ```
5. Đăng nhập lại - thành công!

### 3. Chạy project

```bash
pnpm install
pnpm dev
```

Mở http://localhost:3000

## Firestore Collections

### Collection: `users`

```typescript
{
  id: string;              // Firebase Auth UID
  email: string;
  displayName?: string;
  role: "admin" | "sale";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Collection: `sales_records`

```typescript
{
  id: string;
  productName: string;
  quantity: number;
  price: number;
  totalAmount: number;
  salesPersonId: string;
  salesPersonName: string;
  date: string;            // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}
```

## Các Route

- `/` - Home (redirect dựa trên auth state)
- `/login` - Đăng nhập với Google
- `/dashboard` - Trang nhân viên sale (role: sale)
- `/admin` - Trang admin (role: admin)

## Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Sales records
    match /sales_records/{recordId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.salesPersonId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

## Tạo User mới

### Qua Firebase Console

1. User đăng nhập Google một lần (bị từ chối)
2. Lấy UID từ Authentication
3. Tạo document trong `users` collection với ID = UID
4. Set role = "sale" hoặc "admin"
5. User đăng nhập lại - thành công!

### Qua code (cần admin script)

```typescript
import { createOrUpdateUser } from '@/lib/firebase/users';

await createOrUpdateUser(
  userId,
  email,
  displayName,
  'sale', // hoặc 'admin'
  true
);
```

## Export Excel

Admin có thể xuất báo cáo ra Excel với:
- Tất cả dữ liệu
- Lọc theo ngày
- Lọc theo tuần
- Lọc theo khoảng thời gian

File Excel sẽ chứa:
- Ngày/giờ
- Nhân viên
- Sản phẩm
- Số lượng
- Giá
- Tổng tiền

## Troubleshooting

### Lỗi đăng nhập: "Tài khoản chưa được cấp quyền"
- User chưa được tạo trong Firestore collection `users`
- Hoặc `isActive` = false

### Lỗi: "Can't resolve 'firebase/auth'"
- Chạy `pnpm install` để cài dependencies

### Không xuất được Excel
- Kiểm tra đã cài package `xlsx`: `pnpm add xlsx`

## Tài liệu tham khảo

- `FIREBASE_SETUP.md` - Setup Firebase cơ bản
- `FIREBASE_SETUP_GOOGLE.md` - Bật Google Sign-In
- `HUONG_DAN_TAO_USER.md` - Tạo user trong hệ thống
- `README.md` - Tổng quan Firebase services

## License

Private project



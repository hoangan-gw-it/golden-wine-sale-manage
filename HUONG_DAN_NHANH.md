# Hướng dẫn nhanh - Bắt đầu với Firebase

## Bước 1: Tạo Firebase Project (5 phút)

1. Vào https://console.firebase.google.com/
2. Click "Add project" 
3. Đặt tên project → Next → Tắt Analytics (hoặc bật) → Create project
4. Chọn **Spark Plan** (FREE)

## Bước 2: Thêm Web App

1. Trong Firebase Console, click biểu tượng `</>` (Web)
2. Đặt tên app → Register app
3. **Copy các giá trị config** (bạn sẽ cần chúng ở bước sau)

## Bước 3: Bật các dịch vụ

### Authentication
- Vào **Authentication** → Get started
- Chọn **Email/Password** → Enable → Save

### Firestore Database  
- Vào **Firestore Database** → Create database
- Chọn **Start in test mode** → Next
- Chọn location (ví dụ: asia-southeast1 cho Việt Nam) → Enable

### Storage (tùy chọn)
- Vào **Storage** → Get started  
- Chọn **Start in test mode** → Next → Done

## Bước 4: Tạo file .env.local

Tạo file `.env.local` trong thư mục gốc (cùng cấp với `package.json`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Lưu ý:** Thay các giá trị bằng thông tin từ Firebase Console (bước 2)

## Bước 5: Chạy project

```bash
pnpm dev
```

Mở http://localhost:3000

## Sử dụng trong code

### Authentication
```typescript
import { signUp, signIn, logout } from '@/lib/firebase/auth';

// Đăng ký
await signUp('email@example.com', 'password', 'Tên người dùng');

// Đăng nhập  
await signIn('email@example.com', 'password');

// Đăng xuất
await logout();
```

### Database
```typescript
import { addDocument, getDocuments } from '@/lib/firebase/firestore';

// Thêm dữ liệu
await addDocument('users', { name: 'John', email: 'john@example.com' });

// Lấy dữ liệu
const { data } = await getDocuments('users');
```

### Storage
```typescript
import { uploadFile } from '@/lib/firebase/storage';

// Upload file
const { url } = await uploadFile('images/photo.jpg', file);
```

## Quan trọng - Security Rules

Sau khi setup xong, nhớ cập nhật Security Rules trong Firebase Console:

**Firestore Rules** (Firestore Database → Rules):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Rules** (Storage → Rules):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Cần giúp đỡ?

Xem file `FIREBASE_SETUP.md` để biết chi tiết đầy đủ hơn.



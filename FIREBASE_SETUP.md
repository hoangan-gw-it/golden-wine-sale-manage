# Hướng dẫn thiết lập Firebase

## Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" hoặc chọn project có sẵn
3. Điền thông tin project (chọn Spark Plan - FREE)
4. Bật Google Analytics (tùy chọn)

## Bước 2: Thêm Web App vào Firebase

1. Trong Firebase Console, click biểu tượng Web (`</>`)
2. Đăng ký app với nickname (ví dụ: "internal-app")
3. Copy các giá trị config từ Firebase SDK snippet

## Bước 3: Bật các dịch vụ Firebase

### Authentication
1. Vào **Authentication** > **Get started**
2. Chọn **Email/Password** provider
3. Bật "Email/Password" (First option)
4. Click **Save**

### Firestore Database
1. Vào **Firestore Database** > **Create database**
2. Chọn **Start in test mode** (cho development)
3. Chọn location gần nhất
4. Click **Enable**

### Storage (tùy chọn)
1. Vào **Storage** > **Get started**
2. Chọn **Start in test mode**
3. Chọn location (có thể giống Firestore)
4. Click **Done**

## Bước 4: Cấu hình Environment Variables

1. Tạo file `.env.local` trong thư mục gốc của project:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

2. Thay thế các giá trị bằng thông tin từ Firebase Console

## Bước 5: Cấu hình Firestore Security Rules (Quan trọng!)

Vào **Firestore Database** > **Rules** và cập nhật rules phù hợp:

**Cho development (không an toàn cho production):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**Cho production (an toàn hơn):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Bước 6: Cấu hình Storage Rules

Vào **Storage** > **Rules** và cập nhật:

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

## Lưu ý về Free Tier (Spark Plan)

Firebase Free Tier bao gồm:
- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day, 20K deletes/day
- **Storage**: 5 GB storage, 1 GB/day downloads
- **Authentication**: Unlimited
- **Hosting**: 10 GB storage, 360 MB/day transfer

## Sử dụng trong code

```typescript
// Import Firebase utilities
import { signIn, signUp, logout } from '@/lib/firebase/auth';
import { addDocument, getDocument, getDocuments } from '@/lib/firebase/firestore';
import { uploadFile, getFileURL } from '@/lib/firebase/storage';

// Example: Đăng nhập
const { user, error } = await signIn('email@example.com', 'password');

// Example: Thêm document
const { id, error } = await addDocument('users', { name: 'John', email: 'john@example.com' });

// Example: Upload file
const { url, error } = await uploadFile('images/profile.jpg', file);
```



# Hướng dẫn tạo User đầu tiên trong hệ thống

Vì hệ thống yêu cầu whitelist (chỉ cho phép các user đã được tạo trong hệ thống đăng nhập), bạn cần tạo user đầu tiên trước khi có thể đăng nhập.

## Cách 1: Tạo user trực tiếp trong Firebase Console (Khuyến nghị)

1. Đăng nhập vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Firestore Database**
4. Click **Start collection** (nếu chưa có collection `users`)
5. Collection ID: `users`
6. Document ID: Bạn có thể để tự động hoặc tự nhập (sẽ là `userId` sau khi đăng nhập Google)
7. Thêm các fields:
   - `email` (string): Email của user (ví dụ: `admin@example.com`)
   - `displayName` (string): Tên hiển thị (ví dụ: `Admin User`)
   - `role` (string): `admin` hoặc `sale` (ví dụ: `admin`)
   - `isActive` (boolean): `true`
   - `createdAt` (timestamp): Thời gian hiện tại
   - `updatedAt` (timestamp): Thời gian hiện tại

**Lưu ý:** Document ID sẽ là Firebase Auth UID của user sau khi họ đăng nhập Google lần đầu. Vì vậy cách tốt nhất là để user đăng nhập Google một lần (sẽ bị từ chối), sau đó lấy UID từ Firebase Console > Authentication, rồi tạo document với UID đó.

## Cách 2: Sử dụng Firebase Console Authentication để lấy UID

1. Yêu cầu user đăng nhập Google (sẽ bị từ chối vì chưa có trong whitelist)
2. Vào Firebase Console > **Authentication**
3. Copy UID của user vừa đăng nhập (nếu có)
4. Tạo document trong Firestore collection `users` với Document ID = UID đó
5. Thêm các fields như trên

## Cách 3: Tạo user bằng code (Cần admin script)

Bạn có thể tạo một script tạm thời để tạo user. Tạo file `scripts/create-user.ts`:

```typescript
import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createUser() {
  const userId = "USER_ID_HERE"; // Thay bằng UID từ Firebase Auth
  const email = "admin@example.com"; // Thay bằng email của user
  const displayName = "Admin User"; // Thay bằng tên
  const role = "admin"; // hoặc "sale"

  await setDoc(doc(db, "users", userId), {
    id: userId,
    email,
    displayName,
    role,
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  console.log("User created successfully!");
}

createUser();
```

## Quy trình đề xuất

1. **Tạo Firebase Project và cấu hình** (xem `FIREBASE_SETUP.md`)
2. **Bật Google Sign-In** trong Firebase Console > Authentication > Sign-in method
3. **Đăng nhập Google một lần** (sẽ bị từ chối)
4. **Lấy UID** từ Firebase Console > Authentication
5. **Tạo user document** trong Firestore với UID đó và role = "admin"
6. **Đăng nhập lại** - bây giờ sẽ thành công!

## Cấu trúc User Document

```json
{
  "id": "firebase-auth-uid",
  "email": "user@example.com",
  "displayName": "User Name",
  "role": "admin", // hoặc "sale"
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## Lưu ý

- User phải tồn tại trong collection `users` trước khi đăng nhập
- `isActive` phải là `true` để user có thể đăng nhập
- `role` có thể là `"admin"` hoặc `"sale"`
- Sau khi user đăng nhập Google lần đầu thành công, document sẽ được tự động cập nhật (nếu đã tồn tại)



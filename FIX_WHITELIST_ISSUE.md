# Giải quyết lỗi "Tài khoản chưa được cấp quyền"

## Vấn đề

Bạn đã tạo user trong Firestore nhưng vẫn bị lỗi "Tài khoản chưa được cấp quyền".

## Nguyên nhân

Code tìm user theo **email** bằng cách query Firestore, không phải theo Document ID. Điều này có nghĩa:

1. ✅ Document ID có thể là bất kỳ giá trị nào (nhưng nên là UID)
2. ✅ Document **PHẢI có field `email`** với giá trị đúng
3. ⚠️ Có thể cần **Firestore Index** cho query theo email
4. ⚠️ Firestore Security Rules có thể chặn query

## Cách kiểm tra và sửa

### Bước 1: Kiểm tra Document trong Firestore

Vào Firebase Console > Firestore Database > Collection `users` > Document của bạn

**Đảm bảo document có đủ các fields:**

```json
{
  "email": "hoangan072024@gmail.com",  // ← QUAN TRỌNG: Phải khớp với email đăng nhập
  "displayName": "Hoang An IT",
  "role": "admin",
  "isActive": true,                     // ← QUAN TRỌNG: Phải là true
  "id": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Bước 2: Kiểm tra email có khớp không

1. Kiểm tra email bạn đang đăng nhập có đúng là `hoangan072024@gmail.com` không
2. Email trong Firestore phải **chính xác** (không có khoảng trắng, chữ hoa/thường phải khớp)

### Bước 3: Tạo Firestore Index (nếu cần)

1. Vào Firebase Console > Firestore Database
2. Click tab **Indexes**
3. Nếu thấy warning về index, click **Create Index**
4. Hoặc vào Console và xem có lỗi gì về index không

### Bước 4: Kiểm tra Firestore Rules

Vào Firebase Console > Firestore Database > **Rules**

Đảm bảo rules cho phép đọc collection `users`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - cho phép đọc khi đã đăng nhập
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Sales records
    match /sales_records/{recordId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Lưu ý:** Nếu đang ở chế độ test mode, rules sẽ cho phép tất cả trong 30 ngày đầu.

### Bước 5: Kiểm tra Console để xem lỗi chi tiết

1. Mở Developer Tools (F12)
2. Vào tab **Console**
3. Đăng nhập lại và xem có lỗi gì không
4. Có thể có lỗi về Firestore permission hoặc index

## Cách đơn giản nhất: Tạo lại Document đúng cách

### Cách 1: Sửa Document hiện tại

1. Vào Firestore Console
2. Tìm document có email `hoangan072024@gmail.com`
3. Đảm bảo:
   - Field `email` = `hoangan072024@gmail.com` (chính xác)
   - Field `isActive` = `true` (boolean, không phải string)
   - Field `role` = `admin` hoặc `sale`

### Cách 2: Xóa và tạo lại Document

1. **Xóa document hiện tại** (document ID: `AIzaSyDieg06Bt-pBVWxiHmVBKziWaEyBxRuO7M`)
2. **Tạo document mới**:
   - Document ID: Để tự động (Auto-ID) HOẶC lấy UID từ Firebase Auth
   - Fields:

     ```
     email: hoangan072024@gmail.com
     displayName: Hoang An IT
     role: admin
     isActive: true
     id: (copy Document ID vào đây)
     createdAt: (chọn timestamp, chọn "now")
     updatedAt: (chọn timestamp, chọn "now")
     ```

## Lấy UID từ Firebase Auth (Cách đúng nhất)

1. Đăng nhập Google một lần (sẽ bị từ chối)
2. Vào Firebase Console > **Authentication**
3. Nếu user đã đăng nhập, bạn sẽ thấy UID (ví dụ: `abc123xyz789...`)
4. Copy UID đó
5. Tạo document trong Firestore với **Document ID = UID đó**
6. Thêm các fields như trên
7. Đăng nhập lại

## Debug trong Code

Nếu vẫn không được, thêm console.log để debug:

Trong file `lib/firebase/users.ts`, sửa function `getUserByEmail`:

```typescript
export const getUserByEmail = async (email: string) => {
  console.log("Looking for user with email:", email);
  const { data, error } = await getDocuments<User>(USERS_COLLECTION, [
    where("email", "==", email),
  ]);
  
  console.log("Query result:", { data, error });
  
  if (error || !data || data.length === 0) {
    return { user: null, error: error || "User not found" };
  }
  
  return { user: data[0], error: null };
};
```

Sau đó mở Console và xem log khi đăng nhập.


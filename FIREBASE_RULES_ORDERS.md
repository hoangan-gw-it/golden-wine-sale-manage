# Hướng dẫn cập nhật Firestore Rules cho Orders

## Vấn đề

Khi tạo order, bạn gặp lỗi:
```
PERMISSION_DENIED: Missing or insufficient permissions
```

## Nguyên nhân

Firestore security rules chưa cho phép ghi vào collection `orders`.

## Giải pháp

Cần cập nhật Firestore Security Rules trong Firebase Console.

### Bước 1: Mở Firebase Console

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Firestore Database** > **Rules**

### Bước 2: Cập nhật Rules (Development - Cho phép tất cả)

**QUAN TRỌNG**: Vì API route dùng client SDK, cần rules cho phép tất cả cho development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Cảnh báo**: Rules này cho phép tất cả, KHÔNG an toàn cho production! Chỉ dùng cho development/testing.

### Bước 3: Publish Rules (QUAN TRỌNG!)

1. **Copy toàn bộ rules trên** vào textbox
2. Click nút **Publish** (màu xanh, ở góc trên bên phải)
3. Đợi thấy thông báo "Rules published successfully"
4. **Đợi 10-30 giây** để rules được sync

### Kiểm tra Rules đã được Publish chưa

- Sau khi click Publish, bạn sẽ thấy timestamp "Last published: ..." ở phía dưới
- Nếu không thấy, rules chưa được publish

### Production Rules (Sau này khi cần)

Khi sẵn sàng cho production, dùng rules sau:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
    
    match /customers/{customerId} {
      allow read, write: if request.auth != null;
    }
    
    match /sales_records/{recordId} {
      allow read, write: if request.auth != null;
    }
    
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Kiểm tra

Sau khi cập nhật rules, thử tạo order lại. Nếu vẫn lỗi:
1. Kiểm tra user đã đăng nhập chưa
2. Kiểm tra console có lỗi gì khác không
3. Đợi vài phút để rules được sync

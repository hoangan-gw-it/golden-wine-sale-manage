# Sửa lỗi sản phẩm không hiển thị trong Dashboard Sale

## Vấn đề

Khi thêm sản phẩm ở trang Sale, sản phẩm không hiển thị trong danh sách, nhưng Admin có thể thấy.

## Nguyên nhân có thể

1. **Firestore Composite Index chưa được tạo** - Query với `where` và `orderBy` cùng lúc cần index
2. **salesPersonId không khớp** - ID dùng để lưu không khớp với ID dùng để query
3. **Firestore Rules** - Rules có thể chặn query

## Cách sửa

### Bước 1: Kiểm tra Console (Developer Tools)

1. Mở Developer Tools (F12)
2. Vào tab **Console**
3. Thêm sản phẩm và xem log:
   - `Loading sales records for user: ...` - User ID
   - `Sales records result: ...` - Kết quả query
   - `Creating sales record with: ...` - Dữ liệu đang lưu
   - `Create sales record result: ...` - Kết quả lưu

### Bước 2: Tạo Firestore Composite Index

1. Vào Firebase Console > Firestore Database
2. Click tab **Indexes**
3. Nếu có link "Create Index", click vào
4. Hoặc vào tab **Console** trong Firebase và xem có error về index không
5. Tạo index với:
   - Collection: `sales_records`
   - Fields:
     - `salesPersonId` (Ascending)
     - `createdAt` (Descending)
   - Query scope: Collection

**Hoặc** code đã được sửa để tự động fallback nếu thiếu index (sẽ query không có orderBy).

### Bước 3: Kiểm tra salesPersonId có khớp không

Trong Console log, so sánh:
- `Loading sales records for user: [USER_ID]`
- `Creating sales record with: { salesPersonId: [USER_ID] }`

Hai ID này phải giống nhau.

### Bước 4: Kiểm tra Firestore Rules

Vào Firebase Console > Firestore Database > **Rules**

Đảm bảo có rules cho phép đọc:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sales_records/{recordId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Bước 5: Kiểm tra dữ liệu trong Firestore

1. Vào Firebase Console > Firestore Database
2. Mở collection `sales_records`
3. Kiểm tra:
   - Document có field `salesPersonId` không?
   - Giá trị `salesPersonId` có khớp với User ID không?
   - Field `createdAt` có tồn tại không?

## Kiểm tra nhanh

Mở Console (F12) và xem:
- Có lỗi về index không? (sẽ có link tạo index)
- User ID trong log có khớp với `salesPersonId` trong Firestore không?
- Có lỗi permission không?

## Nếu vẫn không được

Thử refresh trang hoặc clear cache và đăng nhập lại.



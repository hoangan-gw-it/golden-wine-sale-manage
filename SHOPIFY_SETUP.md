# Hướng dẫn Setup Shopify API

## Lấy Shopify Admin Access Token

Để sử dụng tính năng IPOS (tìm kiếm khách hàng, tạo đơn hàng), bạn cần Shopify Admin API Access Token.

### Bước 1: Tạo Custom App trong Shopify Admin

1. Đăng nhập vào [Shopify Admin](https://admin.shopify.com/)
2. Vào **Settings** > **Apps and sales channels**
3. Click **Develop apps** (hoặc **Develop apps for your store**)
4. Click **Create an app**
5. Đặt tên app (ví dụ: "IPOS System")
6. Click **Create app**

### Bước 2: Cấu hình Admin API Scopes

1. Sau khi tạo app, click vào app vừa tạo
2. Vào tab **Configuration**
3. Scroll xuống phần **Admin API integration**
4. Click **Configure Admin API scopes**
5. Chọn các scopes cần thiết:
   - ✅ `read_customers` - Đọc thông tin khách hàng
   - ✅ `write_customers` - Tạo/cập nhật khách hàng
   - ✅ `read_orders` - Đọc đơn hàng
   - ✅ `write_orders` - Tạo đơn hàng
   - ✅ `read_price_rules` - Đọc discount codes
   - ✅ `read_products` - Đọc sản phẩm (nếu cần)
6. Click **Save**

### Bước 3: Cài đặt App và lấy Access Token

1. Vào tab **API credentials**
2. Click **Install app** (nếu chưa install)
3. Sau khi install, bạn sẽ thấy **Admin API access token**
4. Click **Reveal token once** để xem token
5. **Copy token này ngay** (chỉ hiển thị 1 lần!)

### Bước 4: Lấy Storefront Access Token (nếu chưa có)

1. Vẫn trong tab **API credentials**
2. Scroll xuống phần **Storefront API**
3. Click **Configure Storefront API scopes**
4. Chọn scopes:
   - ✅ `unauthenticated_read_product_listings` - Đọc sản phẩm
   - ✅ `unauthenticated_read_product_inventory` - Đọc tồn kho
5. Click **Save**
6. Copy **Storefront API access token**

### Bước 5: Thêm vào file .env.local

Thêm các biến sau vào file `.env.local`:

```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token
```

**Lưu ý:**
- `SHOPIFY_STORE_DOMAIN`: Tên store của bạn (ví dụ: `my-store.myshopify.com`)
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`: Token từ Storefront API (dùng để đọc sản phẩm)
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: Token từ Admin API (dùng để quản lý khách hàng, đơn hàng)

### Bước 6: Khởi động lại dev server

Sau khi thêm biến môi trường, **phải khởi động lại** dev server:

```bash
# Dừng server (Ctrl + C)
# Chạy lại
pnpm dev
```

## Kiểm tra

Sau khi setup, bạn có thể test bằng cách:
1. Vào trang IPOS (`/ipos`)
2. Thử tìm kiếm khách hàng bằng số điện thoại
3. Nếu không có lỗi, setup đã thành công!

## Troubleshooting

### Lỗi: "Shopify Admin credentials are not configured"
- ✅ Kiểm tra file `.env.local` đã có `SHOPIFY_ADMIN_ACCESS_TOKEN` chưa
- ✅ Kiểm tra token có đúng format không (bắt đầu bằng `shpat_`)
- ✅ Đã khởi động lại dev server chưa

### Lỗi: "Failed to fetch Shopify Admin data: 401"
- Token không hợp lệ hoặc đã hết hạn
- Kiểm tra lại token trong Shopify Admin
- Đảm bảo app đã được install và có đủ scopes

### Lỗi: "Failed to fetch Shopify Admin data: 403"
- App thiếu quyền (scopes)
- Vào Shopify Admin > App > Configuration > Admin API scopes
- Đảm bảo đã chọn đủ các scopes cần thiết


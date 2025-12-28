# Hướng dẫn Deploy lên Vercel với Subdomain

## Bước 1: Chuẩn bị code

Đảm bảo code đã sẵn sàng:

```bash
# Kiểm tra build thành công
pnpm build
```

## Bước 2: Tạo tài khoản Vercel (nếu chưa có)

1. Vào <https://vercel.com>
2. Đăng nhập bằng GitHub/Google/GitLab
3. Chọn "Add New Project"

## Bước 3: Deploy Project lên Vercel

### Cách 1: Deploy qua Vercel Dashboard

1. Vào Vercel Dashboard
2. Click "Add New..." > "Project"
3. Import Git Repository (GitHub/GitLab/Bitbucket)
4. Hoặc upload folder `internal-app`

### Cách 2: Deploy qua Vercel CLI (Khuyến nghị)

```bash
# Cài đặt Vercel CLI (nếu chưa có)
npm i -g vercel

# Đăng nhập
vercel login

# Deploy (từ thư mục project)
cd d:\workspace\golden-wine\internal-app
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (chọn account của bạn)
# - Link to existing project? N
# - Project name: internal-app (hoặc tên khác)
# - Directory: ./
# - Override settings? N
```

### Cách 3: Deploy qua GitHub (CI/CD)

1. Push code lên GitHub repository
2. Vào Vercel Dashboard > Add New Project
3. Import từ GitHub repository
4. Vercel sẽ tự động deploy mỗi khi push code

## Bước 4: Cấu hình Environment Variables

Sau khi deploy, vào **Project Settings** > **Environment Variables** và thêm:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Lưu ý:** Thêm cho tất cả environments: Production, Preview, Development

Sau khi thêm, **Redeploy** project để áp dụng biến môi trường.

## Bước 5: Cấu hình Custom Domain (Subdomain)

### 5.1. Thêm Domain trong Vercel

1. Vào **Project Settings** > **Domains**
2. Nhập subdomain (ví dụ: `internal.yourdomain.com` hoặc `admin.yourdomain.com`)
3. Click "Add"

### 5.2. Cấu hình DNS

Vercel sẽ hiển thị thông tin DNS cần thêm. Bạn cần thêm DNS record trong:

**Nếu domain quản lý ở:**

- **Shopify Admin**: Vào Settings > Domains > Manage DNS records
- **DNS Provider khác** (Cloudflare, GoDaddy, Namecheap...): Vào DNS settings của provider

**Thêm DNS Record:**

Loại record: **CNAME** hoặc **A Record**

**Cách 1: Dùng CNAME (Khuyến nghị)**

```
Type: CNAME
Name: internal (hoặc subdomain bạn muốn)
Value: cname.vercel-dns.com
TTL: Auto hoặc 3600
```

**Cách 2: Dùng A Record (nếu không hỗ trợ CNAME)**

```
Type: A
Name: internal
Value: 76.76.21.21 (IP của Vercel - kiểm tra trong Vercel Dashboard)
TTL: Auto hoặc 3600
```

### 5.3. Xác nhận Domain

- DNS có thể mất 24-48 giờ để propagate
- Vercel sẽ tự động verify domain
- Khi domain verified, bạn sẽ thấy green checkmark

## Bước 6: Cấu hình Firebase Authorized Domains

Sau khi có subdomain, cần thêm vào Firebase:

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Authentication** > **Settings** > **Authorized domains**
4. Click **Add domain**
5. Thêm subdomain của bạn (ví dụ: `internal.yourdomain.com`)
6. Click **Add**

**Lưu ý:** Vercel tự động thêm các domain sau:

- `vercel.app` domains
- `*.vercel.app` preview domains

## Bước 7: Kiểm tra Deploy

1. Vào domain mới: `https://internal.yourdomain.com`
2. Kiểm tra:
   - ✅ Trang login hiển thị
   - ✅ Google Sign-In hoạt động
   - ✅ Có thể đăng nhập
   - ✅ Dashboard/Admin load được

## Bước 8: Cấu hình Production Domain trong Firebase (Tùy chọn)

Nếu muốn Firebase hosting trỏ về domain chính, bạn có thể cấu hình trong Firebase Hosting, nhưng vì bạn đang dùng Vercel nên không cần.

## Troubleshooting

### Domain không hoạt động

1. **Kiểm tra DNS propagation:**

   ```bash
   # Windows
   nslookup internal.yourdomain.com
   
   # Hoặc dùng online tool: https://dnschecker.org
   ```

2. **Kiểm tra SSL Certificate:**
   - Vercel tự động cấp SSL certificate
   - Có thể mất vài phút để certificate được tạo

3. **Kiểm tra DNS Record:**
   - Đảm bảo record đã được thêm đúng
   - Kiểm tra TTL và giá trị

### Lỗi Firebase Auth sau khi deploy

1. Kiểm tra environment variables đã được thêm chưa
2. Kiểm tra domain đã được thêm vào Firebase Authorized domains chưa
3. Redeploy sau khi thay đổi environment variables

### Build failed

1. Kiểm tra log trong Vercel Dashboard
2. Đảm bảo `pnpm build` chạy thành công local
3. Kiểm tra các dependencies

## Cấu trúc DNS Example

Nếu domain chính là `yourdomain.com` và bạn muốn dùng `internal.yourdomain.com`:

```
Domain: yourdomain.com (đã dùng cho Shopify)
├── @ → Shopify (A record hoặc CNAME)
├── www → Shopify (CNAME)
└── internal → Vercel (CNAME → cname.vercel-dns.com) ← THÊM CÁI NÀY
```

## Lưu ý

- **Subdomain hoàn toàn độc lập** với domain chính
- Shopify và Vercel có thể cùng dùng một domain với subdomain khác nhau
- SSL certificate được Vercel tự động cấp (free)
- Mỗi lần push code lên Git, Vercel sẽ auto-deploy (nếu đã connect Git)

## Production Checklist

- [ ] Code đã được test local
- [ ] Environment variables đã được thêm vào Vercel
- [ ] Domain đã được thêm vào Vercel
- [ ] DNS record đã được cấu hình
- [ ] Domain đã được verify trong Vercel
- [ ] Domain đã được thêm vào Firebase Authorized domains
- [ ] Test đăng nhập trên production domain
- [ ] Test tất cả features trên production

## Support

Nếu gặp vấn đề:

- Vercel Docs: <https://vercel.com/docs>
- Vercel Support: <https://vercel.com/support>

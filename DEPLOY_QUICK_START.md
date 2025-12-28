# Quick Start - Deploy lên Vercel

## Bước nhanh nhất

### 1. Push code lên GitHub (nếu chưa có)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy qua Vercel Dashboard

1. Vào https://vercel.com/new
2. Import GitHub repository
3. Configure:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `pnpm build` (hoặc để mặc định)
   - Install Command: `pnpm install`
4. Add Environment Variables (xem bên dưới)
5. Click "Deploy"

### 3. Thêm Environment Variables

Vào **Settings** > **Environment Variables**, thêm:

```
NEXT_PUBLIC_FIREBASE_API_KEY=<your-value>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-value>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-value>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-value>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-value>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-value>
```

Sau đó **Redeploy**.

### 4. Thêm Custom Domain

1. Vào **Settings** > **Domains**
2. Nhập subdomain: `internal.yourdomain.com`
3. Click "Add"
4. Copy DNS record Vercel cung cấp
5. Thêm DNS record vào DNS provider của bạn:
   - Type: CNAME
   - Name: internal
   - Value: (giá trị từ Vercel)
6. Đợi DNS propagate (5-60 phút)

### 5. Cấu hình Firebase

Vào Firebase Console > Authentication > Settings > Authorized domains:
- Thêm: `internal.yourdomain.com`

## Xong!

Truy cập: `https://internal.yourdomain.com`


# Internal App - Fullstack với Firebase

Dự án Next.js 16 fullstack sử dụng Firebase cho database và các dịch vụ khác ở mức free tier.

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Package Manager**: pnpm

## Cấu trúc Project

```
internal-app/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── example/       # Example API endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/                   # Utilities và helpers
│   ├── firebase/          # Firebase configuration và services
│   │   ├── config.ts      # Firebase initialization
│   │   ├── auth.ts        # Authentication helpers
│   │   ├── firestore.ts   # Firestore database helpers
│   │   ├── storage.ts     # Storage helpers
│   │   └── index.ts       # Barrel export
│   └── utils.ts           # General utilities
├── components/            # React components (nếu có)
├── .env.local             # Environment variables (không commit)
└── FIREBASE_SETUP.md      # Hướng dẫn setup Firebase
```

## Bắt đầu

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Thiết lập Firebase

Xem file `FIREBASE_SETUP.md` để biết chi tiết cách:

- Tạo Firebase project
- Lấy credentials
- Cấu hình environment variables

### 3. Tạo file `.env.local`

Tạo file `.env.local` trong thư mục gốc và thêm Firebase config:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token
```

### 4. Chạy development server

```bash
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## Sử dụng Firebase Services

### Authentication

```typescript
import { signIn, signUp, logout, getCurrentUser } from '@/lib/firebase/auth';

// Đăng ký
const { user, error } = await signUp('email@example.com', 'password', 'Display Name');

// Đăng nhập
const { user, error } = await signIn('email@example.com', 'password');

// Đăng xuất
await logout();

// Lấy user hiện tại
const user = getCurrentUser();
```

### Firestore Database

```typescript
import { addDocument, getDocument, getDocuments, updateDocument, deleteDocument, where, orderBy } from '@/lib/firebase/firestore';

// Thêm document
const { id, error } = await addDocument('users', { name: 'John', email: 'john@example.com' });

// Lấy document theo ID
const { data, error } = await getDocument('users', 'document-id');

// Lấy tất cả documents với query
const { data, error } = await getDocuments('users', [
  where('email', '==', 'john@example.com'),
  orderBy('createdAt', 'desc')
]);

// Cập nhật document
const { error } = await updateDocument('users', 'document-id', { name: 'Jane' });

// Xóa document
const { error } = await deleteDocument('users', 'document-id');
```

### Storage

```typescript
import { uploadFile, getFileURL, deleteFile } from '@/lib/firebase/storage';

// Upload file
const file = // File object từ input
const { url, error } = await uploadFile('images/profile.jpg', file);

// Lấy URL của file
const { url, error } = await getFileURL('images/profile.jpg');

// Xóa file
const { error } = await deleteFile('images/profile.jpg');
```

## API Routes

Project sử dụng Next.js API Routes trong thư mục `app/api/`. Xem `app/api/example/route.ts` để tham khảo.

## Build cho Production

```bash
pnpm build
pnpm start
```

## Firebase Free Tier Limits

- **Firestore**: 1 GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5 GB storage, 1 GB/day downloads
- **Authentication**: Unlimited
- **Hosting**: 10 GB storage, 360 MB/day transfer

## License

Private project

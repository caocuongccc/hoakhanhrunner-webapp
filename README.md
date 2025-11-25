# Running Club - Hệ thống quản lý sự kiện chạy bộ

Ứng dụng web quản lý sự kiện chạy bộ với tích hợp Strava, hệ thống rules engine, và bảng xếp hạng realtime.

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Công nghệ sử dụng](#công-nghệ-sử-dụng)
3. [Cấu trúc dự án](#cấu-trúc-dự-án)
4. [Setup Database](#setup-database)
5. [Setup Web App](#setup-web-app)
6. [Setup Webhook Service](#setup-webhook-service)
7. [Giải thích Webhook](#giải-thích-webhook)
8. [Deploy Production](#deploy-production)
9. [Tính năng](#tính-năng)

---

## 🎯 Tổng quan

Running Club là nền tảng giúp cộng đồng chạy bộ:

- Tạo và tham gia các sự kiện (cá nhân hoặc theo đội)
- Tự động đồng bộ hoạt động từ Strava
- Áp dụng rules engine để tính điểm
- Xem bảng xếp hạng realtime
- Chia sẻ và tương tác với cộng đồng

---

## 🛠 Công nghệ sử dụng

### Web App

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database & Auth
- **Cloudinary** - Image storage
- **Resend** - Email service

### Webhook Service

- **Node.js + Express** - Standalone service
- **Supabase Client** - Database access

### External APIs

- **Strava API** - OAuth & Activities sync
- **Strava Webhooks** - Realtime activity updates

---

## 📁 Cấu trúc dự án

```
running-club/
├── web/                      # Next.js Web App (Deploy Vercel)
│   ├── app/
│   │   ├── page.tsx
│   │   ├── events/
│   │   │   ├── individual/
│   │   │   ├── team/
│   │   │   └── [id]/
│   │   ├── activities/
│   │   ├── feed/
│   │   ├── members/
│   │   ├── admin/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.local
│
├── webhook/                  # Webhook Service (Deploy Railway/Render)
│   ├── index.js
│   ├── package.json
│   └── .env
│
└── README.md
```

**Tại sao tách riêng webhook?**

- Web app (Next.js) deploy trên Vercel
- Webhook cần public URL ổn định để Strava gọi vào
- Tách riêng giúp scale và maintain dễ hơn

---

## 🗄️ Setup Database

### Bước 1: Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com)
2. Tạo project mới
3. Lưu lại:
   - `Project URL`
   - `anon public key`
   - `service_role key` (cho webhook)

### Bước 2: Chạy Database Schema

Vào **SQL Editor** trong Supabase và chạy các script sau theo thứ tự:

#### 1. Main Schema

```sql
-- Chạy file: db_schema (artifact đã tạo)
-- Tạo tất cả tables: users, events, teams, activities, etc.
```

#### 2. Strava Schema

```sql
-- Chạy file: strava_schema (artifact đã tạo)
-- Thêm fields Strava vào users
-- Tạo strava_activities, strava_webhook_events tables
```

#### 3. Remove Captain Migration

```sql
-- Chạy file: remove_captain_migration
ALTER TABLE teams DROP COLUMN IF EXISTS captain_id;
```

#### 4. RPC Functions

```sql
-- Chạy file: likes_rpc_functions
-- Tạo functions: increment_likes, decrement_likes, etc.
```

### Bước 3: Setup Row Level Security (RLS)

```sql
-- Enable RLS cho tất cả tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ... (enable cho tất cả tables)

-- Tạo policies cho read (public)
CREATE POLICY "Public can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public can read users" ON users FOR SELECT USING (true);

-- Policies cho write (authenticated users only)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 🌐 Setup Web App

### Bước 1: Install Dependencies

```bash
cd web
npm install
```

### Bước 2: Tạo Strava App

1. Truy cập [strava.com/settings/api](https://www.strava.com/settings/api)
2. Tạo app mới:
   - **Application Name**: Running Club
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: localhost
3. Lưu lại:
   - Client ID
   - Client Secret

### Bước 3: Setup Cloudinary

1. Đăng ký tại [cloudinary.com](https://cloudinary.com)
2. Lấy credentials:
   - Cloud Name
   - API Key
   - API Secret

### Bước 4: Setup Resend (Email)

1. Đăng ký tại [resend.com](https://resend.com)
2. Tạo API Key

### Bước 5: Configure Environment Variables

Tạo file `web/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=xxx

# Resend Email
RESEND_API_KEY=re_xxx

# Strava
NEXT_PUBLIC_STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=xxx
STRAVA_WEBHOOK_VERIFY_TOKEN=random_string_123
NEXT_PUBLIC_STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback

# App
NEXT_PUBLIC_APP_NAME=Running Club
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Bước 6: Chạy Development Server

```bash
npm run dev
```

Web app sẽ chạy tại: http://localhost:3000

---

## 🔔 Setup Webhook với Vercel Serverless Functions

### Tại sao dùng Vercel Serverless?

**So với standalone webhook service:**

- ✅ Đơn giản hơn - không cần deploy riêng
- ✅ Cùng 1 project, cùng 1 git repo
- ✅ Auto deploy khi push code
- ✅ Public URL ổn định ngay lập tức

**Lưu ý:**

- Vercel serverless có giới hạn timeout 10s (Hobby plan)
- Nếu xử lý phức tạp lâu hơn 10s → dùng standalone service

### Cấu trúc mới (đơn giản):

```
running-club/
├── app/                    # Next.js app
├── components/
├── lib/
├── api/                    # ⚡ Vercel Serverless Functions
│   └── strava-webhook.js   # Webhook endpoint
├── package.json
└── vercel.json
```

### Bước 1: Setup Webhook URL

Sau khi deploy lên Vercel, webhook URL của bạn sẽ là:

```
https://your-app.vercel.app/api/strava-webhook
```

**Development (Local):**

```bash
# Terminal 1: Chạy Next.js
npm run dev

# Terminal 2: Expose với ngrok
ngrok http 3000

# Webhook URL cho development:
https://abc123.ngrok.io/api/strava-webhook
```

### Bước 2: Đăng ký Webhook với Strava

#### Production:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://your-app.vercel.app/api/strava-webhook \
  -F verify_token=YOUR_VERIFY_TOKEN
```

#### Development:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://abc123.ngrok.io/api/strava-webhook \
  -F verify_token=YOUR_VERIFY_TOKEN
```

### Bước 3: Test Webhook

1. Record activity trên Strava
2. Check Vercel logs:
   - Vào Vercel Dashboard
   - Project → Logs
   - Sẽ thấy "🔥 Webhook received"

3. Check database:

```sql
SELECT * FROM strava_webhook_events
ORDER BY created_at DESC
LIMIT 5;
```

### Environment Variables cho Vercel:

Vào Vercel Dashboard → Settings → Environment Variables:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...service_role
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=xxx
STRAVA_WEBHOOK_VERIFY_TOKEN=random_string_123
```

**⚠️ Quan trọng:** Dùng `SUPABASE_SERVICE_KEY` (không phải anon key) vì webhook cần quyền admin.

---

## 🚀 Deploy với Vercel (Đơn giản nhất)

### Bước 1: Push lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/running-club.git
git push -u origin main
```

### Bước 2: Deploy lên Vercel

1. Truy cập [vercel.com](https://vercel.com)
2. Login bằng GitHub
3. "New Project" → Import repo
4. Framework Preset: **Next.js** (auto detect)
5. Root Directory: **Leave empty** (hoặc `/` nếu có)
6. Add Environment Variables (như trên)
7. Deploy!

### Bước 3: Update Webhook URL

Sau khi deploy xong, bạn sẽ có URL: `https://your-app.vercel.app`

Update webhook subscription:

```bash
# Xóa webhook cũ (nếu có)
curl -X DELETE https://www.strava.com/api/v3/push_subscriptions/SUBSCRIPTION_ID \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET

# Tạo webhook mới
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://your-app.vercel.app/api/strava-webhook \
  -F verify_token=YOUR_VERIFY_TOKEN
```

Hoặc dùng Admin Panel: `/admin/strava`

### ✅ Xong! Toàn bộ hệ thống giờ chạy trên Vercel

**Lợi ích:**

- ✅ Web + Webhook cùng 1 project
- ✅ Auto deploy khi push code
- ✅ Free SSL certificate
- ✅ Global CDN
- ✅ Dễ debug với Vercel Logs

---

## 🔍 Giải thích Webhook với Vercel Serverless

**Webhook là gì?**

- Webhook là một URL mà Strava sẽ gọi đến khi có sự kiện mới (activity created/updated)
- Thay vì app phải liên tục hỏi Strava "có activity mới không?", Strava sẽ tự động thông báo cho app

**Workflow:**

```
User chạy xong → Upload lên Strava
→ Strava gọi webhook của bạn
→ Webhook nhận thông báo
→ Lấy chi tiết activity từ Strava API
→ Lưu vào database
→ Tự động link vào sự kiện đang diễn ra
```

**Tại sao tách riêng?**

- Webhook cần URL public và ổn định (https://your-webhook.com/webhook)
- Vercel serverless functions có timeout 10s (không đủ cho xử lý phức tạp)
- Tách riêng giúp dễ debug và scale

### Bước 1: Setup Local Webhook Service

#### 1.1 Install Dependencies

```bash
cd webhook
npm install
```

#### 1.2 Configure Environment

Tạo file `webhook/.env`:

```env
# Supabase (sử dụng SERVICE_ROLE_KEY, không phải anon key)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...service_role_key

# Strava
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=xxx
STRAVA_WEBHOOK_VERIFY_TOKEN=random_string_123

# Port
PORT=3001
```

**⚠️ Quan trọng:** Dùng `service_role_key` vì webhook cần quyền admin để xử lý data

#### 1.3 Chạy Webhook Service

```bash
npm start
```

Webhook service sẽ chạy tại: http://localhost:3001

### Bước 2: Expose Webhook ra Internet (Development)

**Vấn đề:** Strava cần gọi được webhook của bạn từ internet, nhưng localhost:3001 chỉ chạy local.

**Giải pháp:** Dùng ngrok để tạo tunnel

#### 2.1 Install ngrok

```bash
# macOS
brew install ngrok

# hoặc download từ ngrok.com
```

#### 2.2 Chạy ngrok

```bash
ngrok http 3001
```

Bạn sẽ nhận được URL như:

```
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

**Lưu lại URL này!** Đây là webhook URL bạn sẽ đăng ký với Strava.

### Bước 3: Đăng ký Webhook với Strava

#### 3.1 Qua Admin Panel (Recommended)

1. Đăng nhập vào web app
2. Truy cập: http://localhost:3000/admin/strava
3. Nhấn **"Tạo Webhook"**
4. Hệ thống tự động đăng ký với URL: `https://abc123.ngrok.io/webhook`

#### 3.2 Qua API thủ công (Optional)

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://abc123.ngrok.io/webhook \
  -F verify_token=random_string_123
```

### Bước 4: Test Webhook

#### 4.1 Kiểm tra webhook đang chạy

```bash
# Test health endpoint
curl http://localhost:3001/health

# Response: {"status":"ok","service":"strava-webhook"}
```

#### 4.2 Test với activity thật

1. Mở app Strava trên điện thoại
2. Record một activity chạy bộ ngắn (hoặc manual upload)
3. Hoàn thành activity
4. Kiểm tra logs của webhook service:

```bash
# Terminal chạy webhook sẽ hiển thị:
Webhook event received: {
  object_type: 'activity',
  aspect_type: 'create',
  object_id: 123456,
  ...
}
Activity processed successfully
```

5. Kiểm tra trong web app:
   - Vào trang Activities
   - Activity sẽ tự động xuất hiện!

---

## 🔍 Giải thích Webhook Chi tiết

### Luồng hoạt động đầy đủ:

```
┌─────────────┐
│   User      │
│ chạy xong   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Strava App     │
│  Upload         │
│  activity       │
└──────┬──────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│         STRAVA SERVERS                    │
│  1. Lưu activity vào database            │
│  2. Tìm các webhook subscriptions        │
│  3. Gửi POST request đến webhook URL     │
└──────┬───────────────────────────────────┘
       │
       │ POST https://your-webhook.com/webhook
       │ Body: {
       │   "object_type": "activity",
       │   "aspect_type": "create",
       │   "object_id": 123456,
       │   "owner_id": 789
       │ }
       │
       ▼
┌──────────────────────────────────────────┐
│      YOUR WEBHOOK SERVICE                 │
│  (webhook/index.js)                       │
│                                           │
│  1. Nhận event từ Strava                 │
│  2. Log vào strava_webhook_events table  │
│  3. Tìm user bằng owner_id               │
│  4. Get access token (refresh nếu cần)   │
│  5. Fetch chi tiết activity từ Strava    │
│  6. Lưu vào strava_activities table      │
│  7. Check user có tham gia event nào?    │
│  8. Sync vào activities table             │
│  9. Rules engine tính điểm               │
│  10. Update rankings                      │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│   SUPABASE DB    │
│   Tables:        │
│   - strava_activities  │
│   - activities         │
│   - event_participants │
└──────────────────┘
```

### Code Flow trong webhook/index.js:

```javascript
// 1. Nhận webhook event
app.post("/webhook", async (req, res) => {
  const { object_id, owner_id, aspect_type } = req.body;

  // 2. Log event
  await logEvent(req.body);

  // 3. Process trong background
  processActivity(object_id, owner_id, aspect_type);

  // 4. Return success ngay lập tức (Strava yêu cầu response < 2s)
  res.json({ success: true });
});

// 5. Process activity
async function processActivity(activityId, athleteId, aspectType) {
  // 5.1 Tìm user
  const user = await findUserByStravaId(athleteId);

  // 5.2 Get access token (refresh nếu hết hạn)
  const token = await getValidAccessToken(user.id);

  // 5.3 Fetch chi tiết từ Strava
  const activity = await fetchFromStrava(activityId, token);

  // 5.4 Lưu vào DB
  await saveStravaActivity(activity);

  // 5.5 Sync vào event activities
  await syncToEventActivities(activity, user.id);
}
```

### Các loại events từ Strava:

```javascript
// Create - Activity mới
{
  "aspect_type": "create",
  "object_type": "activity",
  "object_id": 123456
}

// Update - Sửa activity (đổi tên, description, etc.)
{
  "aspect_type": "update",
  "object_type": "activity",
  "object_id": 123456
}

// Delete - Xóa activity
{
  "aspect_type": "delete",
  "object_type": "activity",
  "object_id": 123456
}
```

### Debug Webhook:

```bash
# 1. Check webhook service đang chạy
curl http://localhost:3001/health

# 2. Check webhook subscription status
curl http://localhost:3000/api/admin/strava-webhook

# 3. Xem logs realtime
cd webhook
npm run dev  # sẽ hiển thị logs chi tiết

# 4. Check database
# Vào Supabase → Table Editor → strava_webhook_events
# Xem các events đã nhận được
```

---

## 🚀 Deploy Production

### Deploy Web App (Vercel)

```bash
cd web

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables trong Vercel Dashboard
# Project Settings → Environment Variables
```

**Important:** Update `NEXT_PUBLIC_APP_URL` và `NEXT_PUBLIC_STRAVA_REDIRECT_URI` với domain thật

### Deploy Webhook Service (Railway)

**Tại sao dùng Railway?**

- Free tier hào phóng
- Auto deploy từ Git
- Public URL ổn định
- Dễ setup

#### Bước 1: Push code lên GitHub

```bash
# Tạo repo mới trên GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/running-club.git
git push -u origin main
```

#### Bước 2: Deploy lên Railway

1. Truy cập [railway.app](https://railway.app)
2. Login bằng GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Chọn repo `running-club`
5. Railway sẽ tự detect `webhook` folder
6. Set **Root Directory** = `webhook`
7. Add Environment Variables:
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   STRAVA_CLIENT_ID
   STRAVA_CLIENT_SECRET
   STRAVA_WEBHOOK_VERIFY_TOKEN
   PORT=3001
   ```
8. Deploy!

Railway sẽ cung cấp URL như: `https://your-app.railway.app`

#### Bước 3: Update Webhook Subscription

1. Delete webhook cũ (ngrok URL):

   ```bash
   curl -X DELETE https://www.strava.com/api/v3/push_subscriptions/SUBSCRIPTION_ID \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET
   ```

2. Tạo webhook mới với Railway URL:

   ```bash
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -F client_id=YOUR_CLIENT_ID \
     -F client_secret=YOUR_CLIENT_SECRET \
     -F callback_url=https://your-app.railway.app/webhook \
     -F verify_token=YOUR_VERIFY_TOKEN
   ```

3. Hoặc dùng Admin Panel:
   - Vào https://your-domain.vercel.app/admin/strava
   - Delete webhook cũ
   - Create webhook mới (URL sẽ tự động lấy từ Railway)

---

## 🎯 Tính năng

### Admin Panel

- ✅ Dashboard tổng quan
- ✅ Quản lý sự kiện (CRUD)
  - Upload hình ảnh
  - Chọn rules engine
  - Set password
- ✅ Quản lý đội (CRUD)
- ✅ Quản lý thành viên đội
- ✅ Xem tất cả users
- ✅ Cấu hình Strava webhook

### User Features

- ✅ Đăng nhập qua Strava OAuth
- ✅ Browse sự kiện (Individual vs Team)
- ✅ Join sự kiện với password
- ✅ Chọn đội (cho team events)
- ✅ Auto sync activities từ Strava
- ✅ Xem hoạt động của mình
- ✅ Update personal records (5K, 10K, HM, FM)
- ✅ Bảng tin cộng đồng
- ✅ Like/Comment posts
- ✅ Xem danh sách members
- ✅ Rankings realtime (team & individual)

### Rules Engine

6 loại rules có sẵn:

1. **Tăng dần cá nhân** - Mỗi ngày phải chạy nhiều hơn ngày trước
2. **Tăng dần theo đội** - Tổng km đội phải tăng
3. **Số người tối thiểu** - Mỗi ngày cần X người chạy
4. **Giới hạn pace** - Pace phải trong khoảng min-max
5. **Ngày nhân đôi** - Chủ nhật x2 điểm
6. **Giới hạn thời gian** - Chỉ tính trong khung giờ

---

## 🐛 Troubleshooting

### Webhook không nhận events

**Kiểm tra:**

```bash
# 1. Webhook service có chạy không?
curl http://localhost:3001/health

# 2. ngrok có chạy không?
# Mở http://localhost:4040 để xem ngrok dashboard

# 3. Webhook subscription có active?
# Vào /admin/strava để check

# 4. Xem logs
cd webhook
npm run dev
```

### Strava activities không sync

**Kiểm tra:**

```sql
-- Check strava_webhook_events
SELECT * FROM strava_webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Check processed status
SELECT processed, error_message, *
FROM strava_webhook_events
WHERE processed = false;

-- Check strava_activities
SELECT * FROM strava_activities
ORDER BY created_at DESC
LIMIT 10;
```

### Token expired

Webhook tự động refresh token nếu hết hạn. Nếu lỗi:

```sql
-- Check token expiry
SELECT
  username,
  strava_token_expires_at,
  strava_token_expires_at < NOW() as is_expired
FROM users
WHERE strava_id IS NOT NULL;
```

Giải pháp: User cần login lại qua Strava để refresh token.

---

## 📞 Support

Nếu gặp vấn đề:

1. Check logs trong webhook service
2. Check Supabase logs
3. Check ngrok requests tại http://localhost:4040
4. Xem strava_webhook_events table

---

## 📝 License

MIT License - Tự do sử dụng cho mục đích cá nhân và thương mại.

---

**Happy Running! 🏃‍♂️💨**

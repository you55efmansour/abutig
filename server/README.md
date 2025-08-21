# نظام إدارة الشكاوى البلدية - الباك اند

## 🚀 تشغيل الخادم

### 1. تثبيت المتطلبات

```bash
cd server
npm install
```

### 2. إعداد قاعدة البيانات

```bash
npx prisma generate
npx prisma db push
```

### 3. تشغيل الخادم

```bash
npm start
# أو
node index.js
```

الخادم سيعمل على: `http://localhost:3001`

## 📋 البيانات التجريبية

### الأدمن

- **البريد:** emanhassanmahmoud1@gmail.com
- **كلمة المرور:** Emovmmm#951753

### المواطن

- **الاسم:** أحمد الأمير
- **الرقم القومي:** 30201452369852
- **الهاتف:** 01236528471

## 🔧 المتغيرات البيئية

إنشاء ملف `.env` في مجلد `server`:

```env
# البريد الإلكتروني (اختياري)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# إعدادات أخرى
NODE_ENV=development
PORT=3001
```

## 📡 API Endpoints

### المصادقة

- `POST /api/auth/login` - تسجيل دخول الموظفين
- `POST /api/auth/verify-citizen` - تسجيل دخول المواطنين

### الشكاوى

- `POST /api/complaints/submit` - تقديم شكوى جديدة
- `GET /api/complaints` - قائمة الشكاوى
- `PUT /api/complaints/:id/update` - تحديث حالة الشكوى
- `GET /api/complaints/export` - تصدير الشكاوى

### الإحصائيات

- `GET /api/stats/overview` - إحصائيات عامة
- `GET /api/stats/export` - تصدير الإحصائيات

## 🛡️ الأمان

- ✅ تشفير كلمات المرور
- ✅ JWT tokens
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Input validation
- ✅ File upload security

## 📧 البريد الإلكتروني

النظام يدعم إرسال إشعارات بالبريد عند:

- تقديم شكوى جديدة
- تحديث حالة الشكوى

**ملاحظة:** يجب إعداد متغيرات البريد الإلكتروني لتفعيل هذه الميزة.

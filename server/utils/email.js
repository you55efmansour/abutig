const nodemailer = require("nodemailer");

// إعداد الناقل للبريد الإلكتروني - يمكن تغييرها لاحقاً
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com", // سيتم تغييرها لاحقاً
    pass: process.env.EMAIL_PASS || "your-app-password", // سيتم تغييرها لاحقاً
  },
});

// قائمة الإدارة
const ADMIN_EMAILS = [
  "emanhassanmahmoud1@gmail.com",
  "karemelolary8@gmail.com",
];

// دالة إرسال إشعار شكوى جديدة
const sendComplaintNotification = async (complaint, complainant) => {
  try {
    // إذا لم يتم إعداد البريد الإلكتروني، نتجاهل الإرسال
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(
        "⚠️ إعدادات البريد الإلكتروني غير مكتملة - تم تجاهل إرسال الإشعار"
      );
      return true;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: ADMIN_EMAILS.join(","),
      subject: `شكوى جديدة - ${complaint.title}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            شكوى جديدة تم تقديمها
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">تفاصيل الشكوى:</h3>
            <p><strong>العنوان:</strong> ${complaint.title}</p>
            <p><strong>الوصف:</strong> ${complaint.description}</p>
            <p><strong>النوع:</strong> ${complaint.type.name}</p>
            <p><strong>الموقع:</strong> ${complaint.location || "غير محدد"}</p>
            <p><strong>رقم الشكوى:</strong> ${complaint.id}</p>
            <p><strong>تاريخ التقديم:</strong> ${new Date(
              complaint.createdAt
            ).toLocaleString("ar-EG")}</p>
          </div>
          
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">معلومات مقدم الشكوى:</h3>
            <p><strong>الاسم:</strong> ${complainant.fullName}</p>
            <p><strong>رقم الهاتف:</strong> ${complainant.phone}</p>
            <p><strong>الرقم القومي:</strong> ${complainant.nationalId}</p>
            <p><strong>البريد الإلكتروني:</strong> ${
              complainant.email || "غير محدد"
            }</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px;">
              تم إرسال هذا الإشعار تلقائياً من نظام إدارة الشكاوى البلدية
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ تم إرسال إشعار الشكوى بنجاح:", result.messageId);
    return true;
  } catch (error) {
    console.error("❌ خطأ في إرسال إشعار الشكوى:", error.message);
    return false;
  }
};

// دالة إرسال إشعار تحديث حالة الشكوى
const sendStatusUpdateNotification = async (
  complaint,
  complainant,
  oldStatus,
  newStatus,
  notes
) => {
  try {
    // إذا لم يتم إعداد البريد الإلكتروني أو لا يوجد بريد للمشتكي، نتجاهل الإرسال
    if (
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS ||
      !complainant.email
    ) {
      console.log(
        "⚠️ إعدادات البريد الإلكتروني غير مكتملة أو لا يوجد بريد للمشتكي - تم تجاهل إرسال الإشعار"
      );
      return true;
    }

    const statusNames = {
      UNRESOLVED: "غير محلولة",
      IN_PROGRESS: "قيد التنفيذ",
      BEING_RESOLVED: "يتم حلها الآن",
      OVERDUE: "متأخرة",
      RESOLVED: "تم الحل",
    };

    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: complainant.email,
      subject: `تحديث حالة الشكوى - ${complaint.title}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            تم تحديث حالة شكواك
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #e74c3c; margin-top: 0;">تفاصيل الشكوى:</h3>
            <p><strong>العنوان:</strong> ${complaint.title}</p>
            <p><strong>رقم الشكوى:</strong> ${complaint.id}</p>
          </div>
          
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #27ae60; margin-top: 0;">تحديث الحالة:</h3>
            <p><strong>الحالة السابقة:</strong> ${
              statusNames[oldStatus] || oldStatus
            }</p>
            <p><strong>الحالة الجديدة:</strong> ${
              statusNames[newStatus] || newStatus
            }</p>
            ${notes ? `<p><strong>ملاحظات:</strong> ${notes}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #7f8c8d; font-size: 14px;">
              شكراً لك على استخدام نظام إدارة الشكاوى البلدية
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ تم إرسال إشعار تحديث الحالة بنجاح:", result.messageId);
    return true;
  } catch (error) {
    console.error("❌ خطأ في إرسال إشعار تحديث الحالة:", error.message);
    return false;
  }
};

module.exports = {
  sendComplaintNotification,
  sendStatusUpdateNotification,
  transporter,
};

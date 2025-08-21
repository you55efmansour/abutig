import React from "react";
import {
  FileText,
  Users,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
} from "lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const features = [
    {
      icon: FileText,
      title: "تقديم الشكاوى",
      description: "قدم شكواك بسهولة وتابع حالتها خطوة بخطوة",
      color: "bg-blue-500",
    },
    {
      icon: Clock,
      title: "متابعة سريعة",
      description: "تابع حالة شكواك في الوقت الفعلي واحصل على تحديثات فورية",
      color: "bg-green-500",
    },
    {
      icon: Users,
      title: "فريق متخصص",
      description: "فريق من الموظفين المدربين للتعامل مع جميع أنواع الشكاوى",
      color: "bg-purple-500",
    },
    {
      icon: Shield,
      title: "أمان البيانات",
      description: "نضمن حماية بياناتك الشخصية وسرية معلوماتك",
      color: "bg-red-500",
    },
  ];

  const complaintTypes = [
    {
      icon: "🏚️",
      name: "شكوى بناء مخالف",
      description: "بناء بدون ترخيص أو مخالف للقوانين",
    },
    {
      icon: "🚽",
      name: "شكوى صرف صحي",
      description: "مشاكل في شبكة الصرف الصحي",
    },
    {
      icon: "♻️",
      name: "شكوى نظافة أو قمامة",
      description: "تراكم القمامة أو عدم النظافة",
    },
    {
      icon: "🚧",
      name: "شكوى طريق أو رصف",
      description: "تلف في الطرق أو الأرصفة",
    },
    {
      icon: "💡",
      name: "شكوى إنارة",
      description: "مشاكل في الإنارة العامة",
    },
    {
      icon: "📶",
      name: "شكوى ضعف أو انقطاع الإنترنت",
      description: "ضعف أو انقطاع الإنترنت / الشبكة",
    },
    {
      icon: "🌳",
      name: "شكوى تعديات على ممتلكات عامة",
      description: "تعديات على أراضي أو ممتلكات عامة",
    },
    {
      icon: "🛠️",
      name: "شكوى صيانة أو كهرباء",
      description: "مشاكل في الصيانة أو الكهرباء",
    },
    {
      icon: "🚓",
      name: "شكوى أمنية أو تعدي",
      description: "مشاكل أمنية أو تعديات",
    },
    {
      icon: "✉️",
      name: "أخرى",
      description: "شكاوى أخرى مع تحديد التفاصيل",
    },
  ];

  const stats = [
    {
      number: "1,234",
      label: "شكوى تم حلها",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      number: "89",
      label: "شكوى قيد المعالجة",
      icon: AlertCircle,
      color: "text-orange-600",
    },
    {
      number: "45",
      label: "شكوى جديدة",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      number: "24/7",
      label: "خدمة على مدار الساعة",
      icon: Clock,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="text-white py-20 relative overflow-hidden"
        style={{
          backgroundImage: "url(/images/logo.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center pt-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              نظام الشكاوى البلدية
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              مجلس مدينة أبوتيج - خدمة المواطنين أولوية
            </p>
            <p className="text-lg mb-12 max-w-3xl mx-auto text-blue-50">
              نوفر لك خدمة متكاملة لتقديم الشكاوى ومتابعتها بكل سهولة وشفافية.
              فريقنا المتخصص جاهز لخدمتك على مدار الساعة لضمان حل جميع المشاكل
              بسرعة وكفاءة.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onNavigate("complaint-form")}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                تقديم شكوى جديدة
              </button>
              <div className="flex items-center space-x-reverse space-x-4">
                <button
                  onClick={() => onNavigate("login")}
                  className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105"
                >
                  موظف/أدمن
                </button>
                <button
                  onClick={() => onNavigate("citizen-login")}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105"
                >
                  مواطن
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <stat.icon className={`w-12 h-12 mx-auto mb-4 ${stat.color}`} />
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              لماذا تختار نظامنا؟
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              نقدم لك تجربة متميزة في تقديم الشكاوى ومتابعتها بأحدث التقنيات
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div
                  className={`${feature.color} w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Complaint Types Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              أنواع الشكاوى المتاحة
            </h2>
            <p className="text-xl text-gray-600">
              نتعامل مع جميع أنواع الشكاوى البلدية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complaintTypes.map((type, index) => (
              <div
                key={index}
                className="bg-gray-50 p-6 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center mb-4">
                  <span className="text-3xl ml-4">{type.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {type.name}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">تواصل معنا</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <Phone className="w-12 h-12 mb-4 text-blue-200" />
                <h3 className="text-xl font-semibold mb-2">الهاتف</h3>
                <p className="text-blue-100">088-1234567</p>
              </div>
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 mb-4 text-blue-200" />
                <h3 className="text-xl font-semibold mb-2">
                  البريد الإلكتروني
                </h3>
                <p className="text-blue-100">complaints@abuttig.gov</p>
              </div>
              <div className="flex flex-col items-center">
                <Clock className="w-12 h-12 mb-4 text-blue-200" />
                <h3 className="text-xl font-semibold mb-2">ساعات العمل</h3>
                <p className="text-blue-100">24/7 خدمة مستمرة</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

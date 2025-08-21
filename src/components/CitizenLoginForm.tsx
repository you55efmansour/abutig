import React, { useState } from "react";
import { Phone, User, Shield, ArrowRight } from "lucide-react";

interface CitizenLoginFormProps {
  onNavigate: (page: string) => void;
}

const CitizenLoginForm: React.FC<CitizenLoginFormProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    nationalId: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleLogin = async () => {
    if (!formData.fullName || !formData.nationalId || !formData.phone) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (formData.nationalId.length !== 14) {
      setError("الرقم القومي يجب أن يكون 14 رقم");
      return;
    }

    if (formData.phone.length !== 11) {
      setError("رقم الموبايل يجب أن يكون 11 رقم");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:3001/api/auth/citizen/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            nationalId: formData.nationalId,
            phone: formData.phone,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("complainant", JSON.stringify(data.complainant));
        localStorage.setItem("userType", "complainant");
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.message || "بيانات غير صحيحة");
      }
    } catch (error) {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            تسجيل دخول المواطن
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            أدخل بياناتك للدخول إلى النظام
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                الاسم الكامل
              </label>
              <div className="mt-1 relative">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="أدخل اسمك الكامل"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="nationalId"
                className="block text-sm font-medium text-gray-700"
              >
                الرقم القومي
              </label>
              <div className="mt-1 relative">
                <input
                  id="nationalId"
                  name="nationalId"
                  type="text"
                  required
                  maxLength={14}
                  value={formData.nationalId}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="أدخل الرقم القومي (14 رقم)"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                رقم الموبايل
              </label>
              <div className="mt-1 relative">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={11}
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="أدخل رقم الموبايل (11 رقم)"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    تسجيل الدخول
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => onNavigate("home")}
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};

export default CitizenLoginForm;

import React, { useState, useEffect } from "react";
import {
  Home,
  FileText,
  Users,
  Settings,
  LogIn,
  LogOut,
  User,
  Bell,
  Menu,
  X,
} from "lucide-react";
import HomePage from "./components/HomePage";
import ComplaintForm from "./components/ComplaintForm";
import CitizenDashboard from "./components/CitizenDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import AdminDashboard from "./components/AdminDashboard";
import LoginForm from "./components/LoginForm";
import CitizenLoginForm from "./components/CitizenLoginForm";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const AppContent: React.FC = () => {
  const { user, logout, userType, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // One-time: derive initial page from URL path to support direct links like /complaint-form
  useEffect(() => {
    const path = window.location.pathname;
    const pathToPage: Record<string, string> = {
      "/complaint-form": "complaint-form",
      "/citizen-dashboard": "citizen-dashboard",
      "/employee-dashboard": "employee-dashboard",
      "/admin-dashboard": "admin-dashboard",
      "/": "home",
    };
    const initial = pathToPage[path];
    if (initial) {
      setCurrentPage(initial);
    }
  }, []);

  const getDashboardPage = () => {
    if (userType === "complainant") return "citizen-dashboard";
    if (user?.role === "EMPLOYEE") return "employee-dashboard";
    if (user?.role === "ADMIN") return "admin-dashboard";
    return "home";
  };

  // التوجيه التلقائي بعد تسجيل الدخول مع احترام الصفحات اليدوية (مثل صفحة تقديم الشكوى)
  useEffect(() => {
    if (loading) return;
    if (user || userType === "complainant") {
      const dashboardPage = getDashboardPage();
      setCurrentPage((prev) => {
        // لا تغيّر الصفحة إذا كان المستخدم اختار صفحة يدوية مثل نموذج الشكوى
        const lockedPages = ["complaint-form"];
        if (lockedPages.includes(prev)) return prev;
        // غيّر فقط لو كنّا على صفحات الدخول/الرئيسية أو قيمة غير معروفة
        const autoPages = [
          "home",
          "login",
          "citizen-login",
          "",
          undefined as any,
        ];
        return autoPages.includes(prev as any) ? dashboardPage : prev;
      });
    } else {
      setCurrentPage("home");
    }
  }, [user, userType, loading]);

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
    setMobileMenuOpen(false); // Close mobile menu when navigating
    // Keep the URL in sync for direct reloads
    const pageToPath: Record<string, string> = {
      home: "/",
      "complaint-form": "/complaint-form",
      "citizen-dashboard": "/citizen-dashboard",
      "employee-dashboard": "/employee-dashboard",
      "admin-dashboard": "/admin-dashboard",
      login: "/login",
      "citizen-login": "/citizen-login",
    };
    const path = pageToPath[page];
    if (path) {
      window.history.pushState({}, "", path);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentPage("home");
    setMobileMenuOpen(false);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={handleNavigation} />;
      case "complaint-form":
        return <ComplaintForm onNavigate={handleNavigation} />;
      case "citizen-dashboard":
        return (
          <ProtectedRoute allowedRoles={["CITIZEN"]}>
            <CitizenDashboard />
          </ProtectedRoute>
        );
      case "employee-dashboard":
        return (
          <ProtectedRoute allowedRoles={["EMPLOYEE", "ADMIN"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        );
      case "admin-dashboard":
        return (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        );
      case "login":
        return <LoginForm onNavigate={handleNavigation} />;
      case "citizen-login":
        return <CitizenLoginForm onNavigate={handleNavigation} />;
      default:
        return <HomePage onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 ml-2" />
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  مركز مدينة أبوتيج
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-reverse space-x-4">
              <button
                onClick={() => handleNavigation("home")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === "home"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Home className="w-4 h-4 ml-1" />
                الرئيسية
              </button>

              {(user || userType === "complainant") && (
                <button
                  onClick={() => handleNavigation(getDashboardPage())}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage.includes("dashboard")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <User className="w-4 h-4 ml-1" />
                  لوحة التحكم
                </button>
              )}

              {!user && userType !== "complainant" && (
                <div className="flex items-center space-x-reverse space-x-2">
                  <button
                    onClick={() => handleNavigation("login")}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === "login"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <LogIn className="w-4 h-4 ml-1" />
                    موظف/أدمن
                  </button>
                  <button
                    onClick={() => handleNavigation("citizen-login")}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === "citizen-login"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <User className="w-4 h-4 ml-1" />
                    مواطن
                  </button>
                </div>
              )}

              {(user || userType === "complainant") && (
                <div className="flex items-center space-x-reverse space-x-2">
                  <span className="text-sm text-gray-600 hidden sm:block">
                    {user?.fullName || "مواطن"}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4 ml-1" />
                    <span className="hidden sm:inline">تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => handleNavigation("home")}
                className={`block w-full text-right px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  currentPage === "home"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center">
                  <Home className="w-5 h-5 ml-2" />
                  الرئيسية
                </div>
              </button>

              {(user || userType === "complainant") && (
                <button
                  onClick={() => handleNavigation(getDashboardPage())}
                  className={`block w-full text-right px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    currentPage.includes("dashboard")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center">
                    <User className="w-5 h-5 ml-2" />
                    لوحة التحكم
                  </div>
                </button>
              )}

              {!user && userType !== "complainant" && (
                <>
                  <button
                    onClick={() => handleNavigation("login")}
                    className={`block w-full text-right px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      currentPage === "login"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center">
                      <LogIn className="w-5 h-5 ml-2" />
                      موظف/أدمن
                    </div>
                  </button>
                  <button
                    onClick={() => handleNavigation("citizen-login")}
                    className={`block w-full text-right px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      currentPage === "citizen-login"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center">
                      <User className="w-5 h-5 ml-2" />
                      مواطن
                    </div>
                  </button>
                </>
              )}

              {(user || userType === "complainant") && (
                <div className="border-t border-gray-200 pt-2">
                  <div className="px-3 py-2 text-sm text-gray-600">
                    {user?.fullName || "مواطن"}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-right px-3 py-2 text-base text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center">
                      <LogOut className="w-5 h-5 ml-2" />
                      تسجيل الخروج
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{renderCurrentPage()}</main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-300 text-sm sm:text-base">
              © 2025 مركز مدينة أبوتيج - مجلس مدينة أبوتيج
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-2">جميع الحقوق محفوظة</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

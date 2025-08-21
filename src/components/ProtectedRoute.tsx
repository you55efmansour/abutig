import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'EMPLOYEE' | 'CITIZEN')[];
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requireAuth = true,
  fallback
}) => {
  const { user, complainant, userType, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // If no auth required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Check if user is authenticated
  const isAuthenticated = user || complainant;
  if (!isAuthenticated) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">غير مصرح بالوصول</div>
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول للوصول لهذه الصفحة</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // If no specific roles required, render children
  if (allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check role-based access
  let hasAccess = false;

  if (user) {
    // For registered users, check their role
    hasAccess = allowedRoles.includes(user.role);
  } else if (complainant) {
    // For complainants, check if CITIZEN role is allowed
    hasAccess = allowedRoles.includes('CITIZEN');
  }

  if (!hasAccess) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">غير مصرح بالوصول</div>
          <p className="text-gray-600 mb-4">ليس لديك الصلاحيات المطلوبة للوصول لهذه الصفحة</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

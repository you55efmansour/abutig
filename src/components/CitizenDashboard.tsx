import React, { useState, useEffect } from "react";
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Wrench,
  Plus,
  Bell,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import NotificationCenter from "./NotificationCenter";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  type: {
    name: string;
    icon: string;
  };
  createdAt: string;
  resolvedAt?: string;
}

const CitizenDashboard: React.FC = () => {
  const { complainant } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (complainant) {
      fetchComplaints();
    }
  }, [complainant]);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.log("No auth token found");
        setComplaints([]);
        setLoading(false);
        return;
      }

      // For citizens, we don't need to send complainant ID - the backend will filter based on the token
      const response = await fetch("http://localhost:3001/api/complaints", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setComplaints(result.complaints);
      } else if (response.status === 401) {
        // Token is invalid, clear storage and redirect
        localStorage.clear();
        window.location.reload();
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UNRESOLVED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "BEING_RESOLVED":
        return "bg-purple-100 text-purple-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "UNRESOLVED":
        return "غير محلولة";
      case "IN_PROGRESS":
        return "قيد التنفيذ";
      case "BEING_RESOLVED":
        return "يتم حلها الآن";
      case "OVERDUE":
        return "متأخرة";
      case "RESOLVED":
        return "تم الحل";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "UNRESOLVED":
        return <AlertCircle className="w-4 h-4" />;
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4" />;
      case "BEING_RESOLVED":
        return <Wrench className="w-4 h-4" />;
      case "OVERDUE":
        return <AlertTriangle className="w-4 h-4" />;
      case "RESOLVED":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                أهلاً بك، {complainant?.fullName}
              </h1>
              <p className="text-gray-600 mt-1">
                تابع شكاواك وحالتها من خلال لوحة التحكم
              </p>
            </div>
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {complaints.length}
                </div>
                <div className="text-sm text-gray-600">إجمالي الشكاوى</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {complaints.filter((c) => c.status === "RESOLVED").length}
                </div>
                <div className="text-sm text-gray-600">تم حلها</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {
                    complaints.filter((c) =>
                      ["UNRESOLVED", "IN_PROGRESS", "BEING_RESOLVED"].includes(
                        c.status
                      )
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">قيد المعالجة</div>
              </div>
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                شكاواي ({complaints.length})
              </h2>
              <button
                onClick={() => (window.location.href = "/complaint-form")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 ml-1" />
                شكوى جديدة
              </button>
            </div>
          </div>

          {complaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لا توجد شكاوى
              </h3>
              <p className="text-gray-600 mb-6">لم تقم بتقديم أي شكاوى بعد</p>
              <button
                onClick={() => (window.location.href = "/complaint-form")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                تقديم شكوى جديدة
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الشكوى
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      تاريخ التقديم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {complaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {complaint.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {complaint.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="text-lg ml-2">
                            {complaint.type.icon}
                          </span>
                          <span className="text-sm text-gray-900">
                            {complaint.type.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {getStatusIcon(complaint.status)}
                          <span className="mr-1">
                            {getStatusLabel(complaint.status)}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(complaint.createdAt).toLocaleDateString(
                          "ar-EG"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <button
                          onClick={() => setSelectedComplaint(complaint)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Complaint Details Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    تفاصيل الشكوى
                  </h3>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedComplaint.title}
                  </h4>
                  <div className="flex items-center space-x-reverse space-x-4 mb-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        selectedComplaint.status
                      )}`}
                    >
                      {getStatusIcon(selectedComplaint.status)}
                      <span className="mr-1">
                        {getStatusLabel(selectedComplaint.status)}
                      </span>
                    </span>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg ml-2">
                        {selectedComplaint.type.icon}
                      </span>
                      {selectedComplaint.type.name}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    وصف الشكوى:
                  </h5>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      تاريخ التقديم:
                    </span>
                    <br />
                    <span className="text-gray-600">
                      {new Date(selectedComplaint.createdAt).toLocaleDateString(
                        "ar-EG",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                  {selectedComplaint.resolvedAt && (
                    <div>
                      <span className="font-medium text-gray-700">
                        تاريخ الحل:
                      </span>
                      <br />
                      <span className="text-gray-600">
                        {new Date(
                          selectedComplaint.resolvedAt
                        ).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Center */}
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      </div>
    </div>
  );
};

export default CitizenDashboard;

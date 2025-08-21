import React, { useState, useEffect } from "react";
import {
  FileText,
  Users,
  Settings,
  BarChart3,
  Eye,
  Download,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Paperclip,
  X,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building,
  Wrench,
  Shield,
  Lightbulb,
  Wifi,
  Leaf,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  type: {
    id: string;
    name: string;
    icon: string;
  };
  createdAt: string;
  resolvedAt?: string;
  complainant: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    fullName: string;
  };
  priority: "LOW" | "MEDIUM" | "HIGH";
  location: string;
  internalNotes?: string[];
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
  }>;
  updates?: Array<{
    id: string;
    message: string;
    createdAt: string;
    createdBy: string;
  }>;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface ComplaintType {
  id: string;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
}



const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "complaints" | "types" | "settings"
  >("overview");

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplaintType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nationalId: "",
    role: "EMPLOYEE" as "EMPLOYEE" | "ADMIN",
    password: "",
  });
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: "",
    notes: "",
  });
  const [complaintFilters, setComplaintFilters] = useState({
    status: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user is admin
  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      console.error("Access denied: User is not an admin");
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user || user.role !== "ADMIN") return;

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      switch (activeTab) {
        case "users":
          await fetchUsers(token);
          break;
        case "complaints":
          await fetchComplaints(token);
          break;
        case "types":
          await fetchComplaintTypes(token);
          break;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };



  const fetchComplaints = async (token: string) => {
    try {
      const queryParams = new URLSearchParams();
      if (complaintFilters.status)
        queryParams.append("status", complaintFilters.status);
      if (complaintFilters.type)
        queryParams.append("type", complaintFilters.type);
      if (complaintFilters.dateFrom)
        queryParams.append("dateFrom", complaintFilters.dateFrom);
      if (complaintFilters.dateTo)
        queryParams.append("dateTo", complaintFilters.dateTo);
      if (searchTerm) queryParams.append("search", searchTerm);

      const response = await fetch(
        `http://localhost:3001/api/complaints/admin?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setComplaints(data.complaints || []);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch("http://localhost:3001/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("http://localhost:3001/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });

      if (response.ok) {
        setShowUserModal(false);
        setUserForm({
          fullName: "",
          email: "",
          phone: "",
          nationalId: "",
          role: "EMPLOYEE",
          password: "",
        });
        await fetchUsers(token);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "فشل إنشاء المستخدم");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("حدث خطأ أثناء إنشاء المستخدم");
    }
  };

  const handleUpdateComplaintStatus = async () => {
    if (!selectedComplaint || !statusUpdateForm.status) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/complaints/${selectedComplaint.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: statusUpdateForm.status,
            notes: statusUpdateForm.notes,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert("تم تحديث حالة الشكوى بنجاح");

        // Update the selected complaint with new status
        setSelectedComplaint({
          ...selectedComplaint,
          status: statusUpdateForm.status,
        });

        // Reset form
        setStatusUpdateForm({ status: "", notes: "" });

        // Refresh data
        await fetchData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "فشل تحديث حالة الشكوى");
      }
    } catch (error) {
      console.error("Error updating complaint status:", error);
      alert("حدث خطأ أثناء تحديث حالة الشكوى");
    }
  };

  const fetchComplaintTypes = async (token: string) => {
    try {
      const response = await fetch("http://localhost:3001/api/types", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setComplaintTypes(Array.isArray(data) ? data : data.types || []);
      }
    } catch (error) {
      console.error("Error fetching complaint types:", error);
    }
  };

  const handleViewComplaintDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowComplaintModal(true);
  };

  const applyFilters = () => {
    fetchData();
  };

  const exportComplaints = async (format: "excel" | "csv") => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (complaintFilters.status)
        queryParams.append("status", complaintFilters.status);
      if (complaintFilters.type)
        queryParams.append("type", complaintFilters.type);
      if (complaintFilters.dateFrom)
        queryParams.append("dateFrom", complaintFilters.dateFrom);
      if (complaintFilters.dateTo)
        queryParams.append("dateTo", complaintFilters.dateTo);

      const response = await fetch(
        `http://localhost:3001/api/complaints/export/${format}?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `complaints-${format}-${
          new Date().toISOString().split("T")[0]
        }.${format === "excel" ? "xlsx" : "csv"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting complaints:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UNRESOLVED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "BEING_RESOLVED":
        return "bg-orange-100 text-orange-800";
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
        return "قيد المعالجة";
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

  const getTypeIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      Building: <Building className="w-4 h-4" />,
      Wrench: <Wrench className="w-4 h-4" />,
      Shield: <Shield className="w-4 h-4" />,
      Lightbulb: <Lightbulb className="w-4 h-4" />,
      Wifi: <Wifi className="w-4 h-4" />,
      Tree: <Leaf className="w-4 h-4" />,
      Leaf: <Leaf className="w-4 h-4" />,
      MessageSquare: <MessageSquare className="w-4 h-4" />,
    };
    return iconMap[iconName] || <FileText className="w-4 h-4" />;
  };

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h1>
          <p className="text-gray-600">
            ليس لديك صلاحية للوصول إلى لوحة تحكم المدير
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                لوحة تحكم المدير
              </h1>
              <p className="text-gray-600">مرحباً، {user.fullName}</p>
            </div>

          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-reverse space-x-8">
              {[
                { id: "overview", label: "نظرة عامة", icon: BarChart3 },
                { id: "users", label: "إدارة المستخدمين", icon: Users },
                { id: "complaints", label: "إدارة الشكاوى", icon: FileText },
                { id: "types", label: "أنواع الشكاوى", icon: Settings },
                { id: "settings", label: "الإعدادات", icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-reverse space-x-2 ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Welcome Message */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    مرحباً بك في لوحة تحكم المدير
                  </h3>
                  <p className="text-gray-600">
                    يمكنك إدارة الشكاوى والمستخدمين وأنواع الشكاوى من خلال التبويبات أدناه.
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                    <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      إدارة الشكاوى
                    </h4>
                    <p className="text-gray-600 mb-4">
                      عرض وإدارة جميع الشكاوى المقدمة
                    </p>
                    <button
                      onClick={() => setActiveTab("complaints")}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      عرض الشكاوى
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                    <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      إدارة المستخدمين
                    </h4>
                    <p className="text-gray-600 mb-4">
                      إضافة وتعديل حسابات الموظفين
                    </p>
                    <button
                      onClick={() => setActiveTab("users")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      إدارة المستخدمين
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
                    <Settings className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      أنواع الشكاوى
                    </h4>
                    <p className="text-gray-600 mb-4">
                      إدارة أنواع الشكاوى المتاحة
                    </p>
                    <button
                      onClick={() => setActiveTab("types")}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                    >
                      إدارة الأنواع
                    </button>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    تصدير التقارير
                  </h3>
                  <div className="flex space-x-reverse space-x-4">
                    <button
                      onClick={() => exportComplaints("excel")}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تصدير Excel
                    </button>
                    <button
                      onClick={() => exportComplaints("csv")}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تصدير CSV
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "complaints" && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    فلاتر البحث
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الحالة
                      </label>
                      <select
                        value={complaintFilters.status}
                        onChange={(e) =>
                          setComplaintFilters({
                            ...complaintFilters,
                            status: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">جميع الحالات</option>
                        <option value="UNRESOLVED">غير محلولة</option>
                        <option value="IN_PROGRESS">قيد المعالجة</option>
                        <option value="BEING_RESOLVED">يتم حلها الآن</option>
                        <option value="OVERDUE">متأخرة</option>
                        <option value="RESOLVED">تم الحل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        النوع
                      </label>
                      <select
                        value={complaintFilters.type}
                        onChange={(e) =>
                          setComplaintFilters({
                            ...complaintFilters,
                            type: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">جميع الأنواع</option>
                        {complaintTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        من تاريخ
                      </label>
                      <input
                        type="date"
                        value={complaintFilters.dateFrom}
                        onChange={(e) =>
                          setComplaintFilters({
                            ...complaintFilters,
                            dateFrom: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        إلى تاريخ
                      </label>
                      <input
                        type="date"
                        value={complaintFilters.dateTo}
                        onChange={(e) =>
                          setComplaintFilters({
                            ...complaintFilters,
                            dateTo: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-reverse space-x-4">
                    <button
                      onClick={applyFilters}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Filter className="w-4 h-4 ml-2" />
                      تطبيق الفلاتر
                    </button>
                    <button
                      onClick={() =>
                        setComplaintFilters({
                          status: "",
                          type: "",
                          dateFrom: "",
                          dateTo: "",
                        })
                      }
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      إعادة تعيين
                    </button>
                  </div>
                </div>

                {/* Complaints Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        قائمة الشكاوى
                      </h3>
                      <div className="flex items-center space-x-reverse space-x-4">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="البحث في الشكاوى..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
                          />
                        </div>
                        <button
                          onClick={() => exportComplaints("excel")}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 ml-2" />
                          تصدير
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            رقم الشكوى
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            المواطن
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            النوع
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            العنوان
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الحالة
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            التاريخ
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الإجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {complaints.map((complaint) => (
                          <tr key={complaint.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{complaint.id.slice(-8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {complaint.complainant.fullName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {complaint.complainant.phone}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getTypeIcon(complaint.type.icon)}
                                <span className="text-sm text-gray-900 mr-2">
                                  {complaint.type.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {complaint.location}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                  complaint.status
                                )}`}
                              >
                                {getStatusLabel(complaint.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(complaint.createdAt).toLocaleDateString(
                                "ar-EG-u-ca-gregory"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() =>
                                  handleViewComplaintDetails(complaint)
                                }
                                className="text-blue-600 hover:text-blue-900"
                              >
                                عرض التفاصيل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      إدارة المستخدمين
                    </h3>
                    <button
                      onClick={() => setShowUserModal(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة مستخدم
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الاسم
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            البريد الإلكتروني
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الدور
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الحالة
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            تاريخ الإنشاء
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الإجراءات
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {user.fullName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.role === "ADMIN"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {user.role === "ADMIN" ? "مدير" : "موظف"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.isActive ? "نشط" : "غير نشط"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString(
                                "ar-EG-u-ca-gregory"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-reverse space-x-2">
                                <button className="text-blue-600 hover:text-blue-900">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "types" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      أنواع الشكاوى
                    </h3>
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة نوع
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {complaintTypes.map((type) => (
                      <div
                        key={type.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {getTypeIcon(type.icon)}
                            <span className="text-sm font-medium text-gray-900 mr-2">
                              {type.name}
                            </span>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              type.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {type.isActive ? "نشط" : "غير نشط"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {type.description}
                        </p>
                        <div className="flex space-x-reverse space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    إعدادات النظام
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        وقت الحل الافتراضي (أيام)
                      </label>
                      <input
                        type="number"
                        defaultValue={7}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عدد الشكاوى في الصفحة
                      </label>
                      <input
                        type="number"
                        defaultValue={20}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      حفظ الإعدادات
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complaint Details Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                إضافة مستخدم جديد
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل
                </label>
                <input
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm({ ...userForm, fullName: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الهاتف
                  </label>
                  <input
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm({ ...userForm, phone: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الرقم القومي
                  </label>
                  <input
                    value={userForm.nationalId}
                    onChange={(e) =>
                      setUserForm({ ...userForm, nationalId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الدور
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value as any })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="EMPLOYEE">موظف</option>
                    <option value="ADMIN">مدير</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-reverse space-x-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Details Modal */}
      {showComplaintModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  تفاصيل الشكوى #{selectedComplaint.id.slice(-8)}
                </h2>
                <button
                  onClick={() => setShowComplaintModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم المواطن
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedComplaint.complainant.fullName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedComplaint.complainant.phone}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedComplaint.complainant.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      نوع الشكوى
                    </label>
                    <div className="flex items-center">
                      {getTypeIcon(selectedComplaint.type.icon)}
                      <span className="text-sm text-gray-900 mr-2">
                        {selectedComplaint.type.name}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الحالة
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        selectedComplaint.status
                      )}`}
                    >
                      {getStatusLabel(selectedComplaint.status)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      تاريخ الإنشاء
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedComplaint.createdAt).toLocaleDateString(
                        "ar-EG-u-ca-gregory"
                      )}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    العنوان
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedComplaint.location}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    وصف الشكوى
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedComplaint.description || "لا يوجد وصف للشكوى"}
                  </p>
                </div>

                {/* Attachments */}
                {selectedComplaint.attachments &&
                  selectedComplaint.attachments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المرفقات
                      </label>
                      <div className="space-y-2">
                        {selectedComplaint.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center space-x-reverse space-x-2"
                          >
                            <Paperclip className="w-4 h-4 text-gray-400" />
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-900"
                            >
                              {attachment.filename}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Internal Notes */}
                {selectedComplaint.internalNotes &&
                  selectedComplaint.internalNotes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الملاحظات الداخلية
                      </label>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        {selectedComplaint.internalNotes.map((note, index) => (
                          <p key={index} className="text-sm text-gray-900 mb-1">
                            {note}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Status Update Section */}
                <div className="border-t pt-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    تحديث حالة الشكوى
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الحالة الجديدة
                      </label>
                      <select
                        value={statusUpdateForm.status}
                        onChange={(e) =>
                          setStatusUpdateForm({
                            ...statusUpdateForm,
                            status: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">اختر الحالة</option>
                        <option value="UNRESOLVED">غير محلولة</option>
                        <option value="IN_PROGRESS">قيد المعالجة</option>
                        <option value="BEING_RESOLVED">يتم حلها الآن</option>
                        <option value="OVERDUE">متأخرة</option>
                        <option value="RESOLVED">تم الحل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ملاحظات (اختياري)
                      </label>
                      <input
                        type="text"
                        value={statusUpdateForm.notes}
                        onChange={(e) =>
                          setStatusUpdateForm({
                            ...statusUpdateForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder="أضف ملاحظات حول التحديث..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleUpdateComplaintStatus}
                      disabled={!statusUpdateForm.status}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      تحديث الحالة
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

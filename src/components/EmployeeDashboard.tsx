import React, { useState, useEffect } from "react";
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Edit,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

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
  complainant: {
    fullName: string;
    phone: string;
  };
  assignedTo?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  location: string;
  internalNotes?: string[];
  updates?: Array<{
    id: string;
    message: string;
    createdAt: string;
    createdBy: string;
  }>;
}

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"new" | "in-progress">("new");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    priority: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "",
    message: "",
    internalNote: "",
  });

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user, activeTab]);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/complaints/employee?tab=${activeTab}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setComplaints(result.complaints);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "عالية";
      case "MEDIUM":
        return "متوسطة";
      case "LOW":
        return "منخفضة";
      default:
        return priority;
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.complainant.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesType = !filters.type || complaint.type.name === filters.type;
    const matchesStatus =
      !filters.status || complaint.status === filters.status;
    const matchesPriority =
      !filters.priority || complaint.priority === filters.priority;

    const matchesDate =
      (!filters.dateFrom ||
        new Date(complaint.createdAt) >= new Date(filters.dateFrom)) &&
      (!filters.dateTo ||
        new Date(complaint.createdAt) <= new Date(filters.dateTo));

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesPriority &&
      matchesDate
    );
  });

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint || !updateForm.status) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/complaints/${selectedComplaint.id}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: updateForm.status,
            message: updateForm.message,
            internalNote: updateForm.internalNote,
          }),
        }
      );

      if (response.ok) {
        setShowUpdateModal(false);
        setUpdateForm({ status: "", message: "", internalNote: "" });
        fetchComplaints();
      }
    } catch (error) {
      console.error("Error updating complaint:", error);
    }
  };

  const assignToSelf = async (complaintId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/complaints/${complaintId}/assign`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignedTo: user?.id,
          }),
        }
      );

      if (response.ok) {
        fetchComplaints();
      }
    } catch (error) {
      console.error("Error assigning complaint:", error);
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
                أهلاً بك، {user?.fullName}
              </h1>
              <p className="text-gray-600 mt-1">إدارة الشكاوى والمتابعة</p>
            </div>
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {complaints.filter((c) => c.status === "NEW").length}
                </div>
                <div className="text-sm text-gray-600">شكاوى جديدة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {complaints.filter((c) => c.status === "IN_PROGRESS").length}
                </div>
                <div className="text-sm text-gray-600">قيد المعالجة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {complaints.filter((c) => c.status === "RESOLVED").length}
                </div>
                <div className="text-sm text-gray-600">تم حلها</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-reverse space-x-8 px-6">
              <button
                onClick={() => setActiveTab("new")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "new"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                الشكاوى الجديدة (
                {complaints.filter((c) => c.status === "NEW").length})
              </button>
              <button
                onClick={() => setActiveTab("in-progress")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "in-progress"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                قيد المعالجة (
                {
                  complaints.filter((c) =>
                    ["UNRESOLVED", "IN_PROGRESS", "BEING_RESOLVED"].includes(c.status)
                  ).length
                }
                )
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البحث
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="البحث في الشكاوى..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع الشكوى
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">الكل</option>
                <option value="بناء مخالف">بناء مخالف</option>
                <option value="صرف صحي">صرف صحي</option>
                <option value="نظافة">نظافة</option>
                <option value="طرق">طرق</option>
                <option value="إنارة">إنارة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الأولوية
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">الكل</option>
                <option value="HIGH">عالية</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="LOW">منخفضة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    type: "",
                    status: "",
                    dateFrom: "",
                    dateTo: "",
                    priority: "",
                  })
                }
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              الشكاوى ({filteredComplaints.length})
            </h2>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لا توجد شكاوى
              </h3>
              <p className="text-gray-600">
                {activeTab === "new"
                  ? "لا توجد شكاوى جديدة"
                  : "لا توجد شكاوى قيد المعالجة"}
              </p>
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
                      مقدم الشكوى
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الأولوية
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
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {complaint.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {complaint.description}
                          </div>
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <MapPin className="w-3 h-3 ml-1" />
                            {complaint.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {complaint.complainant.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {complaint.complainant.phone}
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            complaint.priority
                          )}`}
                        >
                          {getPriorityLabel(complaint.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            complaint.status
                          )}`}
                        >
                          {getStatusLabel(complaint.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(complaint.createdAt).toLocaleDateString(
                          "ar-EG"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center space-x-reverse space-x-2">
                          <button
                            onClick={() => setSelectedComplaint(complaint)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Eye className="w-4 h-4 ml-1" />
                            عرض
                          </button>
                          {complaint.status === "NEW" && (
                            <button
                              onClick={() => assignToSelf(complaint.id)}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              <User className="w-4 h-4 ml-1" />
                              تعيين
                            </button>
                          )}
                          {complaint.status !== "RESOLVED" &&
                            complaint.status !== "REJECTED" && (
                              <button
                                onClick={() => {
                                  setSelectedComplaint(complaint);
                                  setUpdateForm({
                                    ...updateForm,
                                    status: complaint.status,
                                  });
                                  setShowUpdateModal(true);
                                }}
                                className="text-purple-600 hover:text-purple-900 flex items-center"
                              >
                                <Edit className="w-4 h-4 ml-1" />
                                تحديث
                              </button>
                            )}
                        </div>
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
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedComplaint.title}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-reverse space-x-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            selectedComplaint.status
                          )}`}
                        >
                          {getStatusLabel(selectedComplaint.status)}
                        </span>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                            selectedComplaint.priority
                          )}`}
                        >
                          {getPriorityLabel(selectedComplaint.priority)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="text-lg ml-2">
                          {selectedComplaint.type.icon}
                        </span>
                        {selectedComplaint.type.name}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">
                        مقدم الشكوى:
                      </h5>
                      <p className="text-gray-900">
                        {selectedComplaint.complainant.fullName}
                      </p>
                      <p className="text-gray-600">
                        {selectedComplaint.complainant.phone}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">
                        الموقع:
                      </h5>
                      <p className="text-gray-900">
                        {selectedComplaint.location}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">
                        تاريخ التقديم:
                      </h5>
                      <p className="text-gray-900">
                        {new Date(
                          selectedComplaint.createdAt
                        ).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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

                {selectedComplaint.updates &&
                  selectedComplaint.updates.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        التحديثات:
                      </h5>
                      <div className="space-y-3">
                        {selectedComplaint.updates.map((update) => (
                          <div
                            key={update.id}
                            className="bg-gray-50 p-3 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {update.createdBy}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(update.createdAt).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {update.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedComplaint.internalNotes &&
                  selectedComplaint.internalNotes.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        الملاحظات الداخلية:
                      </h5>
                      <div className="space-y-2">
                        {selectedComplaint.internalNotes.map((note, index) => (
                          <div
                            key={index}
                            className="bg-yellow-50 p-3 rounded-lg border-r-4 border-yellow-400"
                          >
                            <p className="text-sm text-gray-700">{note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

        {/* Update Complaint Modal */}
        {showUpdateModal && selectedComplaint && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  تحديث حالة الشكوى
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الحالة الجديدة
                  </label>
                  <select
                    value={updateForm.status}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">اختر الحالة</option>
                    <option value="UNRESOLVED">غير محلولة</option>
                    <option value="IN_PROGRESS">قيد التنفيذ</option>
                    <option value="BEING_RESOLVED">يتم حلها الآن</option>
                    <option value="OVERDUE">متأخرة</option>
                    <option value="RESOLVED">تم الحل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رسالة للمواطن
                  </label>
                  <textarea
                    value={updateForm.message}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, message: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="اكتب رسالة للمواطن..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظة داخلية
                  </label>
                  <textarea
                    value={updateForm.internalNote}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        internalNote: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ملاحظة داخلية (اختياري)..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex space-x-reverse space-x-3">
                <button
                  onClick={handleUpdateComplaint}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  تحديث الشكوى
                </button>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdateForm({
                      status: "",
                      message: "",
                      internalNote: "",
                    });
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

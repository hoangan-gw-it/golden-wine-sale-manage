"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  getAllSalesRecords,
  getSalesRecordsByDate,
  getSalesRecordsForWeek,
  getSalesRecordsByDateRange,
  getSalesRecordsBySalesPerson,
} from "@/lib/firebase/sales";
import { getAllUsers } from "@/lib/firebase/users";
import { SalesRecord } from "@/lib/types";
import { User } from "@/lib/types";
import * as XLSX from "xlsx";

export default function AdminPage() {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "custom">(
    "all"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [employees, setEmployees] = useState<User[]>([]);

  // Helper function to get date string from record (handles both date field and createdAt)
  const getRecordDateString = (record: SalesRecord): string => {
    // If date field exists, use it
    if (record.date) {
      return record.date.trim();
    }
    // Otherwise, extract from createdAt
    if (record.createdAt) {
      const createdAt = record.createdAt as Date | { toDate: () => Date };
      const date = (createdAt as { toDate?: () => Date }).toDate
        ? (createdAt as { toDate: () => Date }).toDate()
        : new Date(createdAt as Date);
      // Get local date string
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    return "";
  };

  // Helper function to get today's date string in local timezone
  const getTodayDateString = (): string => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };

  useEffect(() => {
    loadEmployees();
    loadSalesRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    const { data, error } = await getAllUsers();
    if (!error && data) {
      // Filter only active users with role "sale"
      const saleUsers = data.filter(
        (user) => user.isActive && user.role === "sale"
      );
      setEmployees(saleUsers);
    }
  };

  const loadSalesRecords = async () => {
    setLoading(true);
    try {
      let result;

      // If employee filter is selected, filter by employee first
      if (selectedEmployee) {
        const employeeRecords = await getSalesRecordsBySalesPerson(
          selectedEmployee
        );
        if (employeeRecords.error || !employeeRecords.data) {
          setSalesRecords([]);
          setLoading(false);
          return;
        }

        // Then apply date filter if any
        let filteredData = employeeRecords.data;

        switch (filter) {
          case "today":
            const todayStr = getTodayDateString();
            const todayUTC = new Date().toISOString().split("T")[0];
            filteredData = filteredData.filter((record) => {
              const recordDate = getRecordDateString(record);
              // Check both local date and UTC date for backward compatibility
              return recordDate === todayStr || recordDate === todayUTC;
            });
            break;
          case "week":
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
            const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
            filteredData = filteredData.filter(
              (record) =>
                record.date >= weekStartStr && record.date <= weekEndStr
            );
            break;
          case "custom":
            if (startDate && endDate) {
              filteredData = filteredData.filter(
                (record) => record.date >= startDate && record.date <= endDate
              );
            }
            break;
        }

        setSalesRecords(filteredData);
      } else {
        // No employee filter, use existing logic
        switch (filter) {
          case "today":
            // Get all records and filter on client side to ensure accuracy
            const allRecordsResult = await getAllSalesRecords();
            if (allRecordsResult.error || !allRecordsResult.data) {
              result = allRecordsResult;
              break;
            }
            
            const todayStr2 = getTodayDateString();
            const todayUTC2 = new Date().toISOString().split("T")[0];
            
            // Filter records by date (check both local and UTC dates)
            const filteredToday = allRecordsResult.data.filter((record) => {
              const recordDate = getRecordDateString(record);
              // Check both local date and UTC date for backward compatibility
              return recordDate === todayStr2 || recordDate === todayUTC2;
            });
            
            result = {
              data: filteredToday,
              error: null
            };
            break;
          case "week":
            result = await getSalesRecordsForWeek();
            break;
          case "custom":
            if (startDate && endDate) {
              result = await getSalesRecordsByDateRange(startDate, endDate);
            } else {
              result = await getAllSalesRecords();
            }
            break;
          default:
            result = await getAllSalesRecords();
        }

        if (!result.error && result.data) {
          setSalesRecords(result.data);
        }
      }
    } catch (err) {
      console.error("Error loading sales records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedEmployee]);

  const handleDateFilter = async () => {
    if (!dateFilter) {
      loadSalesRecords();
      return;
    }

    setLoading(true);
    const result = await getSalesRecordsByDate(dateFilter);
    if (!result.error && result.data) {
      setSalesRecords(result.data);
    }
    setLoading(false);
  };

  const exportToExcel = () => {
    // Prepare data for Excel
    const excelData = salesRecords.map((record) => {
      let dateStr = record.date || "";
      let timeStr = "";

      // Handle createdAt which might be Date or Firestore Timestamp
      if (record.createdAt) {
        const createdAt = record.createdAt as Date | { toDate: () => Date };
        const date = (createdAt as { toDate?: () => Date }).toDate
          ? (createdAt as { toDate: () => Date }).toDate()
          : new Date(createdAt as Date);
        dateStr = date.toLocaleDateString("vi-VN");
        timeStr = date.toLocaleTimeString("vi-VN");
      }

      return {
        Ngày: dateStr,
        "Thời gian": timeStr,
        "Nhân viên": record.salesPersonName || "",
        Email: record.salesPersonId,
        "Sản phẩm": record.productName,
        "Số lượng": record.quantity,
        "Giá (VNĐ)": record.price,
        "Tổng tiền (VNĐ)": record.totalAmount,
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo cáo bán hàng");

    // Auto-size columns
    const maxWidth = excelData.reduce(
      (w, r) => Math.max(w, Object.values(r).join("").length),
      10
    );
    ws["!cols"] = [{ wch: maxWidth }];

    // Generate filename with date range
    let filename = "bao_cao_ban_hang";
    if (filter === "today") {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      filename += `_${todayStr}`;
    } else if (filter === "week") {
      filename += "_tuan_nay";
    } else if (filter === "custom" && startDate && endDate) {
      filename += `_${startDate}_${endDate}`;
    } else {
      filename += "_tat_ca";
    }
    filename += `.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: Date | { toDate?: () => Date } | undefined) => {
    if (!date) return "";
    const d = (date as { toDate?: () => Date }).toDate
      ? (date as { toDate: () => Date }).toDate()
      : new Date(date as Date);
    return d.toLocaleString("vi-VN");
  };

  const totalRevenue = salesRecords.reduce(
    (sum, record) => sum + (record.totalAmount || 0),
    0
  );
  const totalQuantity = salesRecords.reduce(
    (sum, record) => sum + (record.quantity || 0),
    0
  );

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Quản lý bán hàng
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Xem báo cáo và xuất dữ liệu ra Excel
            </p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={salesRecords.length === 0}
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            Xuất Excel
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Tổng đơn hàng</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {salesRecords.length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Tổng doanh thu</div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Tổng số lượng</div>
            <div className="mt-2 text-2xl font-bold text-blue-600">
              {totalQuantity}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Trung bình/đơn</div>
            <div className="mt-2 text-2xl font-bold text-purple-600">
              {salesRecords.length > 0
                ? formatCurrency(totalRevenue / salesRecords.length)
                : formatCurrency(0)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            {/* Employee Filter */}
            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[200px]">
              <label className="text-sm font-medium text-gray-700">
                Nhân viên
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full sm:min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              >
                <option value="">Tất cả nhân viên</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.displayName || employee.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter("today")}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                  filter === "today"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setFilter("week")}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                  filter === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tuần này
              </button>
              <button
                onClick={() => setFilter("custom")}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                  filter === "custom"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tùy chọn
              </button>
            </div>

            {filter === "custom" && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base flex-1 sm:flex-none"
                />
                <span className="self-center hidden sm:inline">đến</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base flex-1 sm:flex-none"
                />
                <button
                  onClick={loadSalesRecords}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
                >
                  Lọc
                </button>
              </div>
            )}

            {/* Hide "Lọc theo ngày" when "Tùy chọn" is selected */}
            {filter !== "custom" && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base flex-1 sm:flex-none"
                  placeholder="Chọn ngày"
                />
                <button
                  onClick={handleDateFilter}
                  className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-gray-700 text-sm sm:text-base whitespace-nowrap"
                >
                  Lọc theo ngày
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">
              Danh sách bán hàng ({salesRecords.length} đơn)
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Đang tải...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày/giờ
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sản phẩm
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giá
                      </th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tổng tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salesRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 lg:px-6 py-4 text-center text-gray-500"
                        >
                          Chưa có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      salesRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(record.createdAt)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.salesPersonName}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.productName}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.quantity}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(record.price)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {formatCurrency(record.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {salesRecords.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  salesRecords.map((record) => (
                    <div key={record.id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {record.productName}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(record.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {formatCurrency(record.totalAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Nhân viên:</span>{" "}
                          {record.salesPersonName}
                        </div>
                        <div>
                          <span className="font-medium">Số lượng:</span>{" "}
                          {record.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Giá:</span>{" "}
                          {formatCurrency(record.price)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

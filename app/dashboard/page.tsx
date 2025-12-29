"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { createSalesRecord, getSalesRecordsBySalesPerson } from "@/lib/firebase/sales";
import { useAuth } from "@/lib/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [salesRecords, setSalesRecords] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadSalesRecords();
    }
  }, [user]);

  const loadSalesRecords = async () => {
    if (!user) return;
    
    console.log("Loading sales records for user:", user.id);
    const { data, error } = await getSalesRecordsBySalesPerson(user.id);
    console.log("Sales records result:", { data, error });
    if (!error && data) {
      setSalesRecords(data);
    } else if (error) {
      console.error("Error loading sales records:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!productName.trim() || !quantity || !price) {
      setMessage({ type: "error", text: "Vui lòng điền đầy đủ thông tin" });
      return;
    }

    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (quantityNum <= 0 || priceNum <= 0) {
      setMessage({ type: "error", text: "Số lượng và giá phải lớn hơn 0" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { id, error } = await createSalesRecord(
        productName.trim(),
        quantityNum,
        priceNum,
        user.id,
        user.displayName || user.email
      );

      if (error) {
        setMessage({ type: "error", text: error });
      } else {
        setMessage({ type: "success", text: "Thêm sản phẩm thành công!" });
        setProductName("");
        setQuantity("");
        setPrice("");
        // Wait a bit before reloading to ensure data is written
        setTimeout(() => {
          loadSalesRecords();
        }, 500);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Đã xảy ra lỗi" });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString("vi-VN");
  };

  // Helper to get local date string
  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const totalToday = salesRecords
    .filter((record) => {
      // Use record.date if available, otherwise extract from createdAt
      let recordDate = record.date;
      if (!recordDate && record.createdAt) {
        const createdAt = record.createdAt as Date | { toDate: () => Date };
        const date = (createdAt as { toDate?: () => Date }).toDate
          ? (createdAt as { toDate: () => Date }).toDate()
          : new Date(createdAt as Date);
        recordDate = getLocalDateString(date);
      }
      const today = getLocalDateString();
      return recordDate === today;
    })
    .reduce((sum, record) => sum + (record.totalAmount || 0), 0);

  return (
    <Layout role="sale">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhập sản phẩm bán hàng</h1>
          <p className="mt-1 text-sm text-gray-500">
            Thêm sản phẩm, số lượng và giá để ghi nhận vào hệ thống
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Tổng đơn hôm nay</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {salesRecords.filter((r) => {
                let recordDate = r.date;
                if (!recordDate && r.createdAt) {
                  const createdAt = r.createdAt as Date | { toDate: () => Date };
                  const date = (createdAt as { toDate?: () => Date }).toDate
                    ? (createdAt as { toDate: () => Date }).toDate()
                    : new Date(createdAt as Date);
                  recordDate = getLocalDateString(date);
                }
                return recordDate === getLocalDateString();
              }).length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Doanh thu hôm nay</div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totalToday)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Tổng đơn đã ghi</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{salesRecords.length}</div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700">
                Tên sản phẩm *
              </label>
              <input
                type="text"
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                placeholder="Nhập tên sản phẩm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Số lượng *
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Giá tiền (VNĐ) *
                </label>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            {message && (
              <div
                className={`p-4 rounded ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang thêm..." : "Thêm sản phẩm"}
            </button>
          </form>
        </div>

        {/* Recent Records */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Lịch sử bán hàng</h2>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày/giờ
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
                    <td colSpan={5} className="px-4 lg:px-6 py-4 text-center text-gray-500">
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
                      <span className="font-medium">Số lượng:</span> {record.quantity}
                    </div>
                    <div>
                      <span className="font-medium">Giá:</span> {formatCurrency(record.price)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


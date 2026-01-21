"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  createSalesRecord,
  getSalesRecordsBySalesPerson,
} from "@/lib/firebase/sales";
import { useAuth } from "@/lib/hooks/useAuth";

interface ShopifyProduct {
  id: string;
  title: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [salesRecords, setSalesRecords] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (user) {
      loadSalesRecords();
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      let allProducts: ShopifyProduct[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      // Load all products with pagination
      while (hasNextPage) {
        const response: Response = await fetch(
          `/api/shopify/products?first=250${after ? `&after=${after}` : ""}`
        );
        if (!response.ok) {
          throw new Error("Failed to load products");
        }
        const data = await response.json();
        allProducts = [...allProducts, ...(data.products || [])];
        hasNextPage = data.pageInfo?.hasNextPage || false;
        after = data.pageInfo?.endCursor;
      }

      setProducts(allProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      setMessage({
        type: "error",
        text: "Không thể tải danh sách sản phẩm từ Shopify",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (product: ShopifyProduct) => {
    setSelectedProductId(product.id);
    setProductName(product.title);
    setProductSearch(product.title);
    setShowProductDropdown(false);

    // Get price from Shopify
    const shopifyPrice = parseFloat(product.priceRange.minVariantPrice.amount);
    const currencyCode = product.priceRange.minVariantPrice.currencyCode;

    // Convert to VND based on currency code
    let priceInVND: number;
    if (currencyCode === "VND") {
      // Already in VND, use directly
      priceInVND = Math.round(shopifyPrice);
    } else if (currencyCode === "USD") {
      // Convert USD to VND (adjust rate as needed)
      priceInVND = Math.round(shopifyPrice * 25000);
    } else {
      // For other currencies, assume already in VND or use a default conversion
      // You can add more currency conversions here if needed
      priceInVND = Math.round(shopifyPrice);
    }

    setOriginalPrice(priceInVND);
    setPrice(priceInVND.toString());
  };

  const handleProductSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const searchValue = e.target.value;
    setProductSearch(searchValue);
    setShowProductDropdown(true);

    // Clear selection if search is cleared
    if (!searchValue) {
      setSelectedProductId("");
      setProductName("");
      setPrice("");
      setOriginalPrice(undefined);
    }
  };

  // Filter products based on search
  const filteredProducts = productSearch
    ? products.filter((product) =>
        product.title.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products; // Show all products if no search term

  const loadSalesRecords = async () => {
    if (!user) return;

    console.log("Loading sales records for user:", user.id);
    const { data, error } = await getSalesRecordsBySalesPerson(user.id);
    console.log("Sales records result:", { data, error });
    if (!error && data) {
      setSalesRecords(data);
      setPage(1); // Reset to first page when loading new data
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
        user.displayName || user.email,
        originalPrice
      );

      if (error) {
        setMessage({ type: "error", text: error });
      } else {
        setMessage({ type: "success", text: "Thêm sản phẩm thành công!" });
        setSelectedProductId("");
        setProductName("");
        setProductSearch("");
        setQuantity("");
        setPrice("");
        setOriginalPrice(undefined);
        setShowProductDropdown(false);
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

  const getApprovalLabel = (record: any) => {
    const status = record.approvalStatus || "approved";
    switch (status) {
      case "pending":
        return { text: "Chờ admin duyệt", color: "text-yellow-600" };
      case "rejected":
        return { text: "Đã từ chối", color: "text-red-600" };
      case "approved":
      default:
        return { text: "Đã duyệt", color: "text-green-600" };
    }
  };

  const totalPages = Math.max(1, Math.ceil(salesRecords.length / pageSize));
  const paginatedRecords = salesRecords.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showProductDropdown]);

  return (
    <Layout role="sale">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nhập sản phẩm bán hàng
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Thêm sản phẩm, số lượng và giá để ghi nhận vào hệ thống
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500">Tổng đơn hôm nay</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {
                salesRecords.filter((r) => {
                  let recordDate = r.date;
                  if (!recordDate && r.createdAt) {
                    const createdAt = r.createdAt as
                      | Date
                      | { toDate: () => Date };
                    const date = (createdAt as { toDate?: () => Date }).toDate
                      ? (createdAt as { toDate: () => Date }).toDate()
                      : new Date(createdAt as Date);
                    recordDate = getLocalDateString(date);
                  }
                  return recordDate === getLocalDateString();
                }).length
              }
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
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {salesRecords.length}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label
                htmlFor="productSearch"
                className="block text-sm font-medium text-gray-700"
              >
                Chọn sản phẩm từ Shopify
              </label>
              <input
                type="text"
                id="productSearch"
                value={productSearch}
                onChange={handleProductSearchChange}
                onFocus={() => setShowProductDropdown(true)}
                disabled={loadingProducts}
                placeholder="Nhập tên sản phẩm để tìm kiếm..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              {loadingProducts && (
                <p className="mt-1 text-xs text-gray-500">
                  Đang tải danh sách sản phẩm...
                </p>
              )}

              {/* Dropdown list */}
              {showProductDropdown && !loadingProducts && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      // Calculate price based on currency
                      const shopifyPrice = parseFloat(
                        product.priceRange.minVariantPrice.amount
                      );
                      const currencyCode =
                        product.priceRange.minVariantPrice.currencyCode;
                      let productPrice: number;

                      if (currencyCode === "VND") {
                        productPrice = Math.round(shopifyPrice);
                      } else if (currencyCode === "USD") {
                        productPrice = Math.round(shopifyPrice * 25000);
                      } else {
                        productPrice = Math.round(shopifyPrice);
                      }

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-900">
                            {product.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(productPrice)}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      {productSearch
                        ? "Không tìm thấy sản phẩm nào"
                        : "Nhập tên sản phẩm để tìm kiếm"}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="productName"
                className="block text-sm font-medium text-gray-700"
              >
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="productName"
                value={productName}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 cursor-not-allowed sm:text-sm px-3 py-2 border"
                placeholder="Chọn sản phẩm từ danh sách trên"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="quantity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Số lượng <span className="text-red-500">*</span>
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
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700"
                >
                  Giá tiền (VNĐ) <span className="text-red-500">*</span>
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
                {originalPrice && (
                  <p className="mt-1 text-xs text-gray-500">
                    Giá gốc: {formatCurrency(originalPrice)}
                  </p>
                )}
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
            <h2 className="text-base sm:text-lg font-medium text-gray-900">
              Lịch sử bán hàng
            </h2>
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
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 lg:px-6 py-4 text-center text-gray-500"
                    >
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
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
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const { text, color } = getApprovalLabel(record);
                          return (
                            <span className={`font-medium ${color}`}>
                              {text}
                              {record.approvalStatus === "rejected" &&
                                record.approvalNote && (
                                  <span className="block text-xs text-gray-500 mt-1">
                                    Lý do: {record.approvalNote}
                                  </span>
                                )}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {paginatedRecords.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Chưa có dữ liệu
              </div>
            ) : (
              paginatedRecords.map((record) => (
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
                      <span className="font-medium">Số lượng:</span>{" "}
                      {record.quantity}
                    </div>
                    <div>
                      <span className="font-medium">Giá:</span>{" "}
                      {formatCurrency(record.price)}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Trạng thái:</span>{" "}
                      {(() => {
                        const { text, color } = getApprovalLabel(record);
                        return (
                          <span className={`font-medium ${color}`}>
                            {text}
                          </span>
                        );
                      })()}
                    </div>
                    {record.approvalStatus === "rejected" &&
                      record.approvalNote && (
                        <div className="col-span-2 text-red-600">
                          <span className="font-medium">Lý do:</span>{" "}
                          {record.approvalNote}
                        </div>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Pagination */}
          {salesRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white">
              <div className="text-sm text-gray-600">
                Trang {page}/{totalPages} · {salesRecords.length} đơn
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Trang:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value);
                      if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                        setPage(newPage);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">/ {totalPages}</span>
                </div>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

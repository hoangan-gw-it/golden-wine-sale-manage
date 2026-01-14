"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/lib/hooks/useAuth";
import { createSalesRecord } from "@/lib/firebase/sales";

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  images?: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText?: string;
        width?: number;
        height?: number;
      };
    }>;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: {
          amount: string;
          currencyCode: string;
        };
        sku?: string;
        availableForSale: boolean;
      };
    }>;
  };
}

interface CartItem {
  id: string;
  productId: string;
  productTitle: string;
  variantId?: string;
  sku?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
}

interface ShopifyCustomer {
  id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  total_spent?: string;
  orders_count?: number;
  tags?: string;
  note?: string;
  addresses?: Array<{
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
  }>;
}

export default function IPOSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<ShopifyCustomer | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInvoiceReview, setShowInvoiceReview] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [newCustomer, setNewCustomer] = useState({
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    company: "",
    tax_id: "",
    birthday: "",
    gender: "",
    address: "",
    address2: "",
    city: "",
    province: "",
    country: "Vietnam",
    zip: "",
    note: "",
  });
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed" | null
  >(null);
  const [discountError, setDiscountError] = useState("");
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>(
    {}
  );
  const [originalCustomerData, setOriginalCustomerData] = useState<
    typeof newCustomer | null
  >(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastBarcodeRef = useRef<string>("");
  const phoneSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  // Focus barcode input on mount
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      let allProducts: ShopifyProduct[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      while (hasNextPage) {
        const response: Response = await fetch(
          `/api/shopify/products?first=250${after ? `&after=${after}` : ""}`
        );
        if (!response.ok) {
          throw new Error("Failed to load products");
        }
        const data: {
          products?: ShopifyProduct[];
          pageInfo?: { hasNextPage: boolean; endCursor?: string };
        } = await response.json();
        allProducts = [...allProducts, ...(data.products || [])];
        hasNextPage = data.pageInfo?.hasNextPage || false;
        after = data.pageInfo?.endCursor;
      }

      setProducts(allProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Không thể tải danh sách sản phẩm từ Shopify");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Normalize customer data from Shopify API response
  const normalizeCustomerData = (customer: any): ShopifyCustomer => {
    // Handle both direct customer object and nested customer.customer structure
    const customerData = customer.customer || customer;

    // Debug: Log raw customer data structure if essential fields are missing
    if (
      !customerData.email &&
      !customerData.phone &&
      !customerData.first_name &&
      !customerData.last_name
    ) {
      // Check addresses for missing info
      const firstAddress =
        customerData.addresses?.[0] || customerData.default_address || {};
      console.log("⚠️ Customer data missing essential fields. Structure:", {
        hasEmail: !!customerData.email,
        hasPhone: !!customerData.phone,
        hasFirstName: !!customerData.first_name,
        hasLastName: !!customerData.last_name,
        hasAddresses: !!customerData.addresses?.length,
        hasDefaultAddress: !!customerData.default_address,
        state: customerData.state,
        availableKeys: Object.keys(customerData),
        // Check if info is in addresses
        addressHasEmail: !!firstAddress.email,
        addressHasPhone: !!firstAddress.phone,
        addressHasFirstName: !!firstAddress.first_name,
        addressHasLastName: !!firstAddress.last_name,
        addressKeys: firstAddress ? Object.keys(firstAddress) : [],
        // Log full address for debugging
        firstAddressData: firstAddress,
      });
    }

    // Get address data (from addresses array or default_address)
    const defaultAddress =
      customerData.default_address || customerData.addresses?.[0] || {};
    const addresses =
      customerData.addresses ||
      (customerData.default_address ? [customerData.default_address] : []);

    // Extract customer info - Shopify REST API may not return email/phone in search results
    // but should return them in getCustomerById. If still missing, customer might not have this data.
    const normalized: ShopifyCustomer = {
      id:
        customerData.id?.toString() || customerData.admin_graphql_api_id || "",
      email: customerData.email || defaultAddress.email || "",
      phone: customerData.phone || defaultAddress.phone || "",
      first_name:
        customerData.first_name ||
        customerData.firstName ||
        defaultAddress.first_name ||
        defaultAddress.firstName ||
        "",
      last_name:
        customerData.last_name ||
        customerData.lastName ||
        defaultAddress.last_name ||
        defaultAddress.lastName ||
        "",
      company: customerData.company || defaultAddress.company || "",
      total_spent: customerData.total_spent || customerData.totalSpent || "0",
      orders_count: customerData.orders_count || customerData.ordersCount || 0,
      tags: customerData.tags || "",
      note: customerData.note || "",
      addresses: addresses.map((addr: any) => ({
        address1: addr.address1 || "",
        address2: addr.address2 || "",
        city: addr.city || "",
        province: addr.province || "",
        country: addr.country || "",
        zip: addr.zip || "",
        phone: addr.phone || "",
      })),
    };

    return normalized;
  };

  const searchCustomers = async (query: string) => {
    if (!query.trim()) {
      setCustomers([]);
      return;
    }

    setLoadingCustomers(true);
    try {
      const response = await fetch(
        `/api/shopify/customers/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("Failed to search customers");
      }
      const data = await response.json();
      const rawCustomers = data.customers || [];

      // Only normalize from search result (don't fetch full details yet)
      const normalizedCustomers = rawCustomers.map((customer: any) =>
        normalizeCustomerData(customer)
      );

      setCustomers(normalizedCustomers);

      // Thông báo nếu không tìm thấy
      if (normalizedCustomers.length === 0) {
        toast.info("Không tìm thấy khách hàng với số điện thoại này");
      }
    } catch (error) {
      console.error("Error searching customers:", error);
      toast.error("Không thể tìm kiếm khách hàng");
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    // Clear dropdown when typing (only show after search)
    setShowCustomerDropdown(false);
    setCustomers([]);
  };

  // Fetch full customer details and select customer
  const fetchAndSelectCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shopify/customers/${customerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customer details");
      }
      const data = await response.json();

      // Debug: Log raw data to see what Shopify returns
      console.log("Raw customer data from getCustomerById API:", data.customer);
      console.log("Raw customer data details:", {
        email: data.customer?.email,
        phone: data.customer?.phone,
        first_name: data.customer?.first_name,
        last_name: data.customer?.last_name,
        state: data.customer?.state,
        addresses: data.customer?.addresses,
        default_address: data.customer?.default_address,
        // Check if addresses have the info
        firstAddress: data.customer?.addresses?.[0],
        defaultAddressKeys: data.customer?.default_address
          ? Object.keys(data.customer.default_address)
          : [],
      });

      const fullCustomer = normalizeCustomerData(data.customer);

      // Debug: Log normalized data
      console.log("Normalized customer data:", fullCustomer);

      // Check if essential fields are missing
      if (
        !fullCustomer.email &&
        !fullCustomer.phone &&
        !fullCustomer.first_name &&
        !fullCustomer.last_name
      ) {
        console.warn(
          "⚠️ Customer data appears to be missing essential fields. This might be due to:"
        );
        console.warn(
          "1. Customer doesn't have this information in Shopify (guest checkout, state: disabled)"
        );
        console.warn(
          "2. API token doesn't have permission to read PII (Personal Identifiable Information)"
        );
        console.warn("3. Customer was created as 'disabled' (guest checkout)");
        console.warn(
          "4. Customer information needs to be updated in Shopify Admin"
        );

        // Show user-friendly message
        toast.warning(
          "Khách hàng này không có thông tin đầy đủ. Vui lòng điền thông tin thủ công hoặc cập nhật trong Shopify Admin."
        );
      }

      handleSelectCustomer(fullCustomer);
    } catch (error) {
      console.error("Error fetching customer details:", error);
      toast.error("Không thể tải thông tin khách hàng");
    } finally {
      setLoading(false);
    }
  };

  // Handle search with Enter key or search button
  const handleCustomerSearchSubmit = async () => {
    if (!customerSearch.trim() || customerSearch.trim().length < 7) {
      toast.error("Vui lòng nhập ít nhất 7 chữ số");
      return;
    }

    setLoadingCustomers(true);
    try {
      // Search for customers
      const response = await fetch(
        `/api/shopify/customers/search?q=${encodeURIComponent(customerSearch)}`
      );
      if (!response.ok) {
        throw new Error("Failed to search customers");
      }
      const data = await response.json();
      const rawCustomers = data.customers || [];

      if (rawCustomers.length === 0) {
        toast.info("Không tìm thấy khách hàng với số điện thoại này");
        setShowCustomerDropdown(false);
        setCustomers([]);
        return;
      }

      // Only normalize from search result (don't fetch full details for all)
      // Full details will be fetched when customer is selected
      const normalizedCustomers = rawCustomers.map((customer: any) =>
        normalizeCustomerData(customer)
      );

      setCustomers(normalizedCustomers);
      setShowCustomerDropdown(true);

      // Auto-select first customer (fetch full details when selecting)
      if (normalizedCustomers.length > 0) {
        const firstCustomer = normalizedCustomers[0];
        // Extract customer ID and fetch full details
        let customerId = firstCustomer.id;
        if (customerId.includes("/")) {
          const parts = customerId.split("/");
          customerId = parts[parts.length - 1];
        }
        if (customerId) {
          await fetchAndSelectCustomer(customerId);
        }
      }
    } catch (error) {
      console.error("Error searching customers:", error);
      toast.error("Không thể tìm kiếm khách hàng");
      setShowCustomerDropdown(false);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Auto search customer by phone when typing in create form
  const handlePhoneInputChange = (phone: string) => {
    setNewCustomer((prev) => ({ ...prev, phone }));

    // Clear previous timeout
    if (phoneSearchTimeoutRef.current) {
      clearTimeout(phoneSearchTimeoutRef.current);
    }

    // Auto search if phone number is valid (at least 7 digits)
    // Debounce: wait 800ms after user stops typing
    if (phone.trim().length >= 7) {
      phoneSearchTimeoutRef.current = setTimeout(async () => {
        try {
          const response: Response = await fetch(
            `/api/shopify/customers/search?q=${encodeURIComponent(phone)}`
          );
          if (response.ok) {
            const data: { customers?: any[] } = await response.json();
            if (data.customers && data.customers.length > 0) {
              // Found existing customer, normalize and auto-fill the form
              const rawCustomer = data.customers[0];
              const existingCustomer = normalizeCustomerData(rawCustomer);

              setNewCustomer({
                email: existingCustomer.email || "",
                phone: existingCustomer.phone || phone,
                first_name: existingCustomer.first_name || "",
                last_name: existingCustomer.last_name || "",
                company: existingCustomer.company || "",
                tax_id: "",
                birthday: "",
                gender: "",
                address: existingCustomer.addresses?.[0]?.address1 || "",
                address2: existingCustomer.addresses?.[0]?.address2 || "",
                city: existingCustomer.addresses?.[0]?.city || "",
                province: existingCustomer.addresses?.[0]?.province || "",
                country: existingCustomer.addresses?.[0]?.country || "Vietnam",
                zip: existingCustomer.addresses?.[0]?.zip || "",
                note: existingCustomer.note || "",
              });

              const customerName =
                `${existingCustomer.first_name || ""} ${
                  existingCustomer.last_name || ""
                }`.trim() || "Khách hàng";
              toast.success(`Đã tìm thấy khách hàng: ${customerName}`);
            } else {
              // Không tìm thấy khách hàng
              toast.info("Không tìm thấy khách hàng với số điện thoại này");
            }
          }
        } catch (error) {
          // Silently fail, user can still create new customer
          console.error("Error searching customer by phone:", error);
        }
      }, 800);
    }
  };

  const handleSelectCustomer = (customer: ShopifyCustomer) => {
    // Normalize customer data to ensure correct format
    const normalizedCustomer = normalizeCustomerData(customer);

    setSelectedCustomer(normalizedCustomer);
    setCustomerSearch(normalizedCustomer.phone || "");
    setShowCustomerDropdown(false);

    // Auto-fill form with customer data
    const customerFormData = {
      email: normalizedCustomer.email || "",
      phone: normalizedCustomer.phone || "",
      first_name: normalizedCustomer.first_name || "",
      last_name: normalizedCustomer.last_name || "",
      company: normalizedCustomer.company || "",
      tax_id: "",
      birthday: "",
      gender: "",
      address: normalizedCustomer.addresses?.[0]?.address1 || "",
      address2: normalizedCustomer.addresses?.[0]?.address2 || "",
      city: normalizedCustomer.addresses?.[0]?.city || "",
      province: normalizedCustomer.addresses?.[0]?.province || "",
      country: normalizedCustomer.addresses?.[0]?.country || "Vietnam",
      zip: normalizedCustomer.addresses?.[0]?.zip || "",
      note: normalizedCustomer.note || "",
    };
    setNewCustomer(customerFormData);
    // Store original data for comparison
    setOriginalCustomerData(customerFormData);

    // Show info message if customer has no essential info
    if (
      !normalizedCustomer.email &&
      !normalizedCustomer.phone &&
      !normalizedCustomer.first_name &&
      !normalizedCustomer.last_name
    ) {
      toast.info(
        "Khách hàng này không có thông tin đầy đủ. Vui lòng điền thông tin và cập nhật."
      );
    }
  };

  // Check if customer data has changed
  const hasCustomerChanges = () => {
    if (!selectedCustomer || !originalCustomerData) return false;

    return (
      newCustomer.first_name !== originalCustomerData.first_name ||
      newCustomer.last_name !== originalCustomerData.last_name ||
      newCustomer.email !== originalCustomerData.email ||
      newCustomer.company !== originalCustomerData.company ||
      newCustomer.address !== originalCustomerData.address ||
      newCustomer.address2 !== originalCustomerData.address2 ||
      newCustomer.city !== originalCustomerData.city ||
      newCustomer.province !== originalCustomerData.province ||
      newCustomer.country !== originalCustomerData.country ||
      newCustomer.zip !== originalCustomerData.zip ||
      newCustomer.note !== originalCustomerData.note
    );
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    setLoading(true);
    try {
      // Extract customer ID from Shopify GID format
      const parts = selectedCustomer.id.split("/");
      const customerId = parts[parts.length - 1];

      const response = await fetch(`/api/shopify/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: newCustomer.first_name || undefined,
          last_name: newCustomer.last_name || undefined,
          email: newCustomer.email || undefined,
          company: newCustomer.company || undefined,
          addresses:
            newCustomer.address || newCustomer.city
              ? [
                  {
                    address1: newCustomer.address,
                    address2: newCustomer.address2 || undefined,
                    city: newCustomer.city,
                    province: newCustomer.province,
                    country: newCustomer.country,
                    zip: newCustomer.zip,
                    phone: newCustomer.phone,
                  },
                ]
              : undefined,
          note: newCustomer.note || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer");
      }

      const data = await response.json();
      setSelectedCustomer(data.customer);
      // Update original data
      const updatedFormData = {
        email: data.customer.email || "",
        phone: data.customer.phone || "",
        first_name: data.customer.first_name || "",
        last_name: data.customer.last_name || "",
        company: data.customer.company || "",
        tax_id: "",
        birthday: "",
        gender: "",
        address: data.customer.addresses?.[0]?.address1 || "",
        address2: data.customer.addresses?.[0]?.address2 || "",
        city: data.customer.addresses?.[0]?.city || "",
        province: data.customer.addresses?.[0]?.province || "",
        country: data.customer.addresses?.[0]?.country || "Vietnam",
        zip: data.customer.addresses?.[0]?.zip || "",
        note: data.customer.note || "",
      };
      setNewCustomer(updatedFormData);
      setOriginalCustomerData(updatedFormData);
      toast.success("Cập nhật khách hàng thành công!");
    } catch (error: any) {
      toast.error(error.message || "Không thể cập nhật khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (
      !newCustomer.first_name &&
      !newCustomer.last_name &&
      !newCustomer.phone
    ) {
      toast.error("Vui lòng nhập ít nhất tên hoặc số điện thoại");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/shopify/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newCustomer.email || undefined,
          phone: newCustomer.phone || undefined,
          first_name: newCustomer.first_name || undefined,
          last_name: newCustomer.last_name || undefined,
          company: newCustomer.company || undefined,
          addresses:
            newCustomer.address || newCustomer.city
              ? [
                  {
                    address1: newCustomer.address,
                    address2: newCustomer.address2 || undefined,
                    city: newCustomer.city,
                    province: newCustomer.province,
                    country: newCustomer.country,
                    zip: newCustomer.zip,
                    phone: newCustomer.phone,
                  },
                ]
              : undefined,
          note: newCustomer.note || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer");
      }

      const data = await response.json();
      setSelectedCustomer(data.customer);
      setCustomerSearch(data.customer.phone || "");

      // Update form with created customer data
      const createdFormData = {
        email: data.customer.email || "",
        phone: data.customer.phone || "",
        first_name: data.customer.first_name || "",
        last_name: data.customer.last_name || "",
        company: data.customer.company || "",
        tax_id: "",
        birthday: "",
        gender: "",
        address: data.customer.addresses?.[0]?.address1 || "",
        address2: data.customer.addresses?.[0]?.address2 || "",
        city: data.customer.addresses?.[0]?.city || "",
        province: data.customer.addresses?.[0]?.province || "",
        country: data.customer.addresses?.[0]?.country || "Vietnam",
        zip: data.customer.addresses?.[0]?.zip || "",
        note: data.customer.note || "",
      };
      setNewCustomer(createdFormData);
      setOriginalCustomerData(createdFormData);

      setShowCustomerModal(false);
      toast.success("Tạo khách hàng thành công!");
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim() || barcode === lastBarcodeRef.current) return;
    lastBarcodeRef.current = barcode;

    // Search for product by SKU or barcode
    const foundProduct = products.find((product) =>
      product.variants.edges.some(
        (edge) => edge.node.sku === barcode || edge.node.id.includes(barcode)
      )
    );

    if (foundProduct) {
      const variant = foundProduct.variants.edges[0]?.node;
      if (variant) {
        const price = parseFloat(variant.price.amount);
        const priceInVND =
          variant.price.currencyCode === "VND"
            ? Math.round(price)
            : Math.round(price * 25000);

        const imageUrl = foundProduct.images?.edges[0]?.node?.url;

        addToCart({
          productId: foundProduct.id,
          productTitle: foundProduct.title,
          variantId: variant.id,
          sku: variant.sku,
          price: priceInVND,
          originalPrice: priceInVND,
          imageUrl,
        });
        setBarcodeInput("");
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }
    } else {
      toast.error("Không tìm thấy sản phẩm với barcode này");
    }
  };

  const handleBarcodeChange = (value: string) => {
    setBarcodeInput(value);
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  // Auto-scan barcode after typing stops (for barcode scanners that send data quickly)
  useEffect(() => {
    if (!barcodeInput.trim()) {
      lastBarcodeRef.current = "";
      return;
    }

    // Only auto-scan if the barcode is longer (likely a real barcode, not manual typing)
    // and hasn't been scanned recently
    const timer = setTimeout(() => {
      if (
        barcodeInput.trim() &&
        barcodeInput !== lastBarcodeRef.current &&
        barcodeInput.length >= 3
      ) {
        handleBarcodeScan(barcodeInput);
      }
    }, 500); // Wait 500ms after typing stops

    return () => clearTimeout(timer);
  }, [barcodeInput]);

  const filteredProducts = productSearch
    ? products.filter(
        (product) =>
          product.title.toLowerCase().includes(productSearch.toLowerCase()) ||
          product.variants.edges.some((edge) =>
            edge.node.sku?.toLowerCase().includes(productSearch.toLowerCase())
          )
      )
    : [];

  const addToCart = (
    item: Omit<CartItem, "id" | "quantity">,
    quantity: number = 1
  ) => {
    const existingItem = cart.find(
      (cartItem) =>
        cartItem.variantId === item.variantId ||
        (cartItem.productId === item.productId && !item.variantId)
    );

    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === existingItem.id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...item,
          id: Date.now().toString(),
          quantity,
        },
      ]);
    }
  };

  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(
      cart.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
    // Clear input value when quantity is set
    setQuantityInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[itemId];
      return newInputs;
    });
  };

  const handleQuantityInputChange = (itemId: string, value: string) => {
    // Store the raw input value
    setQuantityInputs((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleQuantityInputBlur = (itemId: string) => {
    const inputValue = quantityInputs[itemId] || "";
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    if (inputValue.trim() === "" || inputValue === "0") {
      // If empty or 0, set to 1
      updateCartItemQuantity(itemId, 1);
    } else {
      const qty = parseInt(inputValue) || 1;
      updateCartItemQuantity(itemId, qty);
    }
  };

  const handleQuantityInputKeyPress = (
    itemId: string,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuantityInputBlur(itemId);
    }
  };

  const handleDecreaseQuantity = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    // Stop at 1, don't decrease further
    if (item.quantity > 1) {
      updateCartItemQuantity(itemId, item.quantity - 1);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
    // Clear input value
    setQuantityInputs((prev) => {
      const newInputs = { ...prev };
      delete newInputs[itemId];
      return newInputs;
    });
  };

  const handleProductSelect = (product: ShopifyProduct) => {
    const variant = product.variants.edges[0]?.node;
    if (variant) {
      const price = parseFloat(variant.price.amount);
      const priceInVND =
        variant.price.currencyCode === "VND"
          ? Math.round(price)
          : Math.round(price * 25000);

      const imageUrl = product.images?.edges[0]?.node?.url;

      addToCart({
        productId: product.id,
        productTitle: product.title,
        variantId: variant.id,
        sku: variant.sku,
        price: priceInVND,
        originalPrice: priceInVND,
        imageUrl,
      });
      setProductSearch("");
      setShowProductDropdown(false);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("");
      setDiscountAmount(0);
      setDiscountType(null);
      return;
    }

    try {
      const response = await fetch("/api/shopify/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode }),
      });

      const data = await response.json();

      if (data.valid && data.discount) {
        setDiscountError("");
        const priceRule = data.discount.price_rule;
        if (priceRule) {
          if (priceRule.value_type === "percentage") {
            setDiscountType("percentage");
            setDiscountAmount(parseFloat(priceRule.value || "0"));
          } else {
            setDiscountType("fixed");
            setDiscountAmount(parseFloat(priceRule.value || "0"));
          }
        }
      } else {
        setDiscountError("Mã giảm giá không hợp lệ");
        setDiscountAmount(0);
        setDiscountType(null);
      }
    } catch (error) {
      setDiscountError("Không thể kiểm tra mã giảm giá");
      setDiscountAmount(0);
      setDiscountType(null);
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateDiscount = () => {
    if (!discountAmount || !discountType) return 0;
    const subtotal = calculateSubtotal();
    if (discountType === "percentage") {
      return Math.round(subtotal * (discountAmount / 100));
    } else {
      return discountAmount;
    }
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  };

  // Generate VietQR code URL
  const generateQRCodeUrl = (amount: number, description: string) => {
    const bankId = process.env.NEXT_PUBLIC_VIETQR_BANK_ID || "vietinbank";
    const accountNo = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO || "";
    const template = process.env.NEXT_PUBLIC_VIETQR_TEMPLATE || "compact2";
    const accountName = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME || "";

    if (!accountNo) {
      console.warn("VietQR account number not configured");
      return "";
    }

    const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.jpg`;
    const params = new URLSearchParams({
      amount: amount.toString(),
      addInfo: description,
      accountName: accountName,
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    if (!selectedCustomer) {
      toast.error("Vui lòng chọn hoặc tạo khách hàng");
      return;
    }

    setLoading(true);

    try {
      // Create order in Shopify
      const lineItems = cart.map((item) => {
        // Extract numeric ID from Shopify GID format (gid://shopify/ProductVariant/123456)
        let variantId: number | undefined;
        if (item.variantId) {
          const parts = item.variantId.split("/");
          const idPart = parts[parts.length - 1];
          variantId = parseInt(idPart) || undefined;
        }

        return {
          title: item.productTitle,
          quantity: item.quantity,
          price: (item.price / 100).toFixed(2), // Convert to decimal
          sku: item.sku,
          variant_id: variantId,
        };
      });

      // Extract customer ID from Shopify GID format
      let customerId: number | undefined;
      if (selectedCustomer.id) {
        const parts = selectedCustomer.id.split("/");
        const idPart = parts[parts.length - 1];
        customerId = parseInt(idPart) || undefined;
      }

      const orderResponse = await fetch("/api/shopify/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_items: lineItems,
          customer: {
            id: customerId,
            email: selectedCustomer.email,
            first_name: selectedCustomer.first_name,
            last_name: selectedCustomer.last_name,
            phone: selectedCustomer.phone,
          },
          financial_status: "pending", // Changed to pending, will be paid after QR payment
          note: `IPOS Order - ${user?.displayName || user?.email}`,
          discount_codes:
            discountCode && discountAmount > 0
              ? [
                  {
                    code: discountCode,
                    amount:
                      discountType === "percentage"
                        ? `${discountAmount}%`
                        : calculateDiscount().toString(),
                    type:
                      discountType === "percentage"
                        ? "percentage"
                        : "fixed_amount",
                  },
                ]
              : undefined,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || "Failed to create order in Shopify");
      }

      const orderData = await orderResponse.json();
      setCurrentOrder(orderData.order);

      // Save to Firestore
      for (const item of cart) {
        await createSalesRecord(
          item.productTitle,
          item.quantity,
          item.price,
          user!.id,
          user!.displayName || user!.email,
          item.originalPrice
        );
      }

      // Generate QR code
      const total = calculateTotal();
      const orderNumber = orderData.order.order_number || orderData.order.id;
      const description = `Don hang ${orderNumber}`;
      const qrUrl = generateQRCodeUrl(total, description);
      setQrCodeUrl(qrUrl);

      // Show QR modal
      setShowQRModal(true);

      toast.success("Đơn hàng đã được tạo! Vui lòng quét QR để thanh toán.");
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Không thể tạo đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQRModal = () => {
    // Clear cart and reset after payment
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setDiscountCode("");
    setDiscountAmount(0);
    setDiscountType(null);
    setDiscountError("");
    setShowQRModal(false);
    setCurrentOrder(null);
    setQrCodeUrl("");
  };

  const handlePrintInvoice = () => {
    if (!currentOrder) {
      toast.error("Không có đơn hàng để in");
      return;
    }
    setShowInvoiceReview(true);
  };

  const handleConfirmPrint = async () => {
    if (!currentOrder) return;

    setLoading(true);
    try {
      // Extract order ID from Shopify
      // Order ID can be in GID format (gid://shopify/Order/123456) or numeric
      let orderId: string = "";
      if (currentOrder.id) {
        if (
          typeof currentOrder.id === "string" &&
          currentOrder.id.includes("/")
        ) {
          // GID format: gid://shopify/Order/123456
          const parts = currentOrder.id.split("/");
          orderId = parts[parts.length - 1];
        } else {
          // Numeric ID
          orderId = currentOrder.id.toString();
        }
      }

      if (!orderId) {
        throw new Error("Không tìm thấy ID đơn hàng");
      }

      // Update order status to paid in Shopify
      const updateResponse = await fetch(`/api/shopify/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_status: "paid",
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(
          error.error || "Không thể cập nhật trạng thái đơn hàng"
        );
      }

      const updatedOrderData = await updateResponse.json();
      setCurrentOrder(updatedOrderData.order);

      // Print invoice
      printInvoice(updatedOrderData.order);

      // Close review modal
      setShowInvoiceReview(false);

      toast.success(
        "Đã cập nhật đơn hàng thành 'Đã thanh toán' và in hóa đơn!"
      );
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error(error.message || "Không thể cập nhật đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const printInvoice = (order: any) => {
    if (!order) {
      toast.error("Không có đơn hàng để in");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Không thể mở cửa sổ in. Vui lòng cho phép popup.");
      return;
    }

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hóa đơn</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
            }
            .info {
              margin: 10px 0;
              font-size: 12px;
            }
            .info p {
              margin: 5px 0;
            }
            .items {
              margin: 10px 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 10px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .total {
              margin-top: 10px;
              text-align: right;
              font-weight: bold;
              font-size: 14px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body {
                margin: 0;
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HÓA ĐƠN BÁN HÀNG</h1>
          </div>
          <div class="info">
            <p><strong>Mã đơn:</strong> ${
              order.order_number || order.id || "N/A"
            }</p>
            <p><strong>Ngày:</strong> ${new Date().toLocaleString("vi-VN")}</p>
            <p><strong>Khách hàng:</strong> ${
              selectedCustomer?.first_name || ""
            } ${selectedCustomer?.last_name || ""} ${
      selectedCustomer?.email || selectedCustomer?.phone || ""
    }</p>
            <p><strong>Nhân viên:</strong> ${
              user?.displayName || user?.email || ""
            }</p>
          </div>
          <div class="items">
            ${cart
              .map(
                (item) => `
              <div class="item">
                <span>${item.productTitle} x${item.quantity}</span>
                <span>${formatCurrency(item.price * item.quantity)}</span>
              </div>
            `
              )
              .join("")}
          </div>
          <div class="total">
            ${
              discountAmount > 0
                ? `
            <p>Tạm tính: ${formatCurrency(calculateSubtotal())}</p>
            <p>Giảm giá: -${formatCurrency(calculateDiscount())}</p>
            `
                : ""
            }
            <p>Tổng cộng: ${formatCurrency(calculateTotal())}</p>
          </div>
          <div class="footer">
            <p>Cảm ơn quý khách!</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setShowProductDropdown(false);
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (phoneSearchTimeoutRef.current) {
        clearTimeout(phoneSearchTimeoutRef.current);
      }
      if (customerSearchTimeoutRef.current) {
        clearTimeout(customerSearchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Layout role="ipos">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          IPOS - Hệ thống bán hàng
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Side - Customer Information */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Thông tin khách hàng</h2>

            {/* Customer Search */}
            <div className="relative mb-4">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCustomerSearchSubmit();
                    }
                  }}
                  onFocus={() => {
                    if (customers.length > 0) setShowCustomerDropdown(true);
                  }}
                  placeholder="Tìm kiếm bằng số điện thoại..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleCustomerSearchSubmit}
                  disabled={
                    loading ||
                    !customerSearch.trim() ||
                    customerSearch.trim().length < 7
                  }
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  {loading ? "..." : "Tìm"}
                </button>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm whitespace-nowrap"
                >
                  Tạo mới
                </button>
              </div>
              {showCustomerDropdown && customers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {customers.map((customer) => {
                    const customerName =
                      `${customer.first_name || ""} ${
                        customer.last_name || ""
                      }`.trim() || "Khách hàng";
                    return (
                      <div
                        key={customer.id}
                        onClick={async () => {
                          // Extract customer ID and fetch full details
                          let customerId = customer.id;
                          if (customerId.includes("/")) {
                            const parts = customerId.split("/");
                            customerId = parts[parts.length - 1];
                          }
                          if (customerId) {
                            await fetchAndSelectCustomer(customerId);
                          }
                        }}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                      >
                        <div className="font-medium text-sm">
                          {customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && (
                            <span className="ml-2">{customer.phone}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Form - Always visible */}
            <div className="space-y-3 border-t pt-3">
              {/* Warning message if customer has no info */}
              {selectedCustomer &&
                !selectedCustomer.email &&
                !selectedCustomer.phone &&
                !selectedCustomer.first_name &&
                !selectedCustomer.last_name && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-3">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Khách hàng này không có thông tin đầy đủ trong Shopify
                      (guest checkout). Vui lòng điền thông tin bên dưới và nhấn
                      &quot;Cập nhật&quot; để lưu vào Shopify.
                    </p>
                  </div>
                )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Họ *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        first_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Tên *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        last_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  disabled={!!selectedCustomer}
                  className={`mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    selectedCustomer ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  placeholder={selectedCustomer ? "Không thể thay đổi" : ""}
                />
                {selectedCustomer && (
                  <p className="mt-1 text-xs text-gray-400">
                    Số điện thoại không thể thay đổi
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Công ty
                </label>
                <input
                  type="text"
                  value={newCustomer.company}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      company: e.target.value,
                    })
                  }
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      address: e.target.value,
                    })
                  }
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Địa chỉ 1"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newCustomer.address2}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      address2: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Địa chỉ 2 (tùy chọn)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Thành phố
                  </label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, city: e.target.value })
                    }
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Tỉnh/Thành phố
                  </label>
                  <input
                    type="text"
                    value={newCustomer.province}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        province: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Mã bưu điện
                  </label>
                  <input
                    type="text"
                    value={newCustomer.zip}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, zip: e.target.value })
                    }
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">
                    Quốc gia
                  </label>
                  <input
                    type="text"
                    value={newCustomer.country}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        country: e.target.value,
                      })
                    }
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">
                  Ghi chú
                </label>
                <textarea
                  value={newCustomer.note}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, note: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ghi chú về khách hàng..."
                />
              </div>

              {/* Update button - only show when customer is selected and data changed */}
              {selectedCustomer && hasCustomerChanges() && (
                <button
                  onClick={handleUpdateCustomer}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 text-sm font-medium"
                >
                  {loading ? "Đang cập nhật..." : "Cập nhật khách hàng"}
                </button>
              )}

              {selectedCustomer && (
                <div className="pt-2 border-t space-y-1">
                  {selectedCustomer.orders_count !== undefined && (
                    <div className="text-xs text-gray-500">
                      Đã mua: {selectedCustomer.orders_count} đơn
                    </div>
                  )}
                  {selectedCustomer.total_spent && (
                    <div className="text-xs text-gray-500">
                      Tổng chi tiêu:{" "}
                      {formatCurrency(
                        parseFloat(selectedCustomer.total_spent) * 100
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                      setOriginalCustomerData(null);
                      setNewCustomer({
                        email: "",
                        phone: "",
                        first_name: "",
                        last_name: "",
                        company: "",
                        tax_id: "",
                        birthday: "",
                        gender: "",
                        address: "",
                        address2: "",
                        city: "",
                        province: "",
                        country: "Vietnam",
                        zip: "",
                        note: "",
                      });
                    }}
                    className="w-full mt-2 px-2 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Xóa khách hàng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Products and Cart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hidden Barcode Scanner - Auto detect from barcode scanner device */}
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            onKeyPress={handleBarcodeKeyPress}
            className="sr-only"
            autoFocus
            tabIndex={-1}
          />

          {/* Product Search */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Tìm kiếm sản phẩm</h2>
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => {
                  if (filteredProducts.length > 0) setShowProductDropdown(true);
                }}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.slice(0, 10).map((product) => {
                    const variant = product.variants.edges[0]?.node;
                    const price = variant
                      ? parseFloat(variant.price.amount)
                      : 0;
                    const priceInVND =
                      variant?.price.currencyCode === "VND"
                        ? Math.round(price)
                        : Math.round(price * 25000);
                    const imageUrl = product.images?.edges[0]?.node?.url;
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 border-b border-gray-100"
                      >
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{product.title}</div>
                          <div className="text-sm text-gray-500">
                            {variant?.sku && `SKU: ${variant.sku} - `}
                            {formatCurrency(priceInVND)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Giỏ hàng</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Giỏ hàng trống</p>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.productTitle}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{item.productTitle}</div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(item.price)} x {item.quantity} ={" "}
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecreaseQuantity(item.id)}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={
                          quantityInputs[item.id] !== undefined
                            ? quantityInputs[item.id]
                            : item.quantity
                        }
                        onChange={(e) =>
                          handleQuantityInputChange(item.id, e.target.value)
                        }
                        onBlur={() => handleQuantityInputBlur(item.id)}
                        onKeyPress={(e) =>
                          handleQuantityInputKeyPress(item.id, e)
                        }
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() =>
                          updateCartItemQuantity(item.id, item.quantity + 1)
                        }
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {/* Discount Code */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value);
                        if (e.target.value.trim() === "") {
                          setDiscountAmount(0);
                          setDiscountType(null);
                          setDiscountError("");
                        }
                      }}
                      onBlur={handleValidateDiscount}
                      placeholder="Nhập mã giảm giá..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleValidateDiscount}
                      className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {discountError && (
                    <div className="text-sm text-red-600 mb-2">
                      {discountError}
                    </div>
                  )}
                  {discountAmount > 0 && discountType && (
                    <div className="text-sm text-green-600 mb-2">
                      Đã áp dụng giảm giá:{" "}
                      {discountType === "percentage"
                        ? `${discountAmount}%`
                        : formatCurrency(discountAmount)}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tạm tính:</span>
                    <span className="text-sm">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Giảm giá:</span>
                      <span className="text-sm text-red-600">
                        -{formatCurrency(calculateDiscount())}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-lg font-semibold">Tổng cộng:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment and Print Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handlePayment}
              disabled={loading || cart.length === 0 || !selectedCustomer}
              className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {loading ? "Đang xử lý..." : "Thanh toán"}
            </button>
            <button
              onClick={handlePrintInvoice}
              disabled={!currentOrder}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
            >
              In hóa đơn
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRModal && currentOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4 text-center">
                Quét mã QR để thanh toán
              </h2>
              {qrCodeUrl ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">
                      Số tiền: {formatCurrency(calculateTotal())}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mã đơn: {currentOrder.order_number || currentOrder.id}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseQRModal}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                  >
                    Đã thanh toán
                  </button>
                </div>
              ) : (
                <div className="text-center text-red-500">
                  <p>Không thể tạo mã QR. Vui lòng kiểm tra cấu hình.</p>
                  <button
                    onClick={handleCloseQRModal}
                    className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice Review Modal */}
        {showInvoiceReview && currentOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
              <h2 className="text-xl font-bold mb-4 text-center">
                Xem lại hóa đơn trước khi in
              </h2>
              <div className="border rounded-lg p-4 mb-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-semibold text-lg">
                      Thông tin đơn hàng
                    </h3>
                    <p>
                      <strong>Mã đơn:</strong>{" "}
                      {currentOrder.order_number || currentOrder.id}
                    </p>
                    <p>
                      <strong>Ngày:</strong>{" "}
                      {new Date().toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="border-b pb-2">
                    <h3 className="font-semibold text-lg">Khách hàng</h3>
                    <p>
                      <strong>Tên:</strong> {selectedCustomer?.first_name || ""}{" "}
                      {selectedCustomer?.last_name || ""}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedCustomer?.email || "N/A"}
                    </p>
                    <p>
                      <strong>SĐT:</strong> {selectedCustomer?.phone || "N/A"}
                    </p>
                  </div>
                  <div className="border-b pb-2">
                    <h3 className="font-semibold text-lg">Sản phẩm</h3>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {item.productTitle} x {item.quantity}
                          </span>
                          <span>
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tạm tính:</span>
                      <span>{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm mb-1 text-red-600">
                        <span>Giảm giá:</span>
                        <span>-{formatCurrency(calculateDiscount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                      <span>Tổng cộng:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInvoiceReview(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmPrint}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Đang xử lý..." : "Xác nhận và In"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Tạo khách hàng mới</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thông tin cơ bản */}
                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-2 text-gray-700">
                    Thông tin cơ bản
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Họ</label>
                  <input
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        first_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tên</label>
                  <input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        last_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    placeholder="Nhập SĐT để tự động tìm..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Công ty
                  </label>
                  <input
                    type="text"
                    value={newCustomer.company}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        company: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mã số thuế
                  </label>
                  <input
                    type="text"
                    value={newCustomer.tax_id}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, tax_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={newCustomer.birthday}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        birthday: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Giới tính
                  </label>
                  <select
                    value={newCustomer.gender}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn...</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                {/* Địa chỉ */}
                <div className="md:col-span-2 mt-2">
                  <h3 className="font-semibold mb-2 text-gray-700">Địa chỉ</h3>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Địa chỉ 1
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        address: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Địa chỉ 2
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address2}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        address2: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Thành phố
                  </label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tỉnh/Thành phố
                  </label>
                  <input
                    type="text"
                    value={newCustomer.province}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        province: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mã bưu điện
                  </label>
                  <input
                    type="text"
                    value={newCustomer.zip}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, zip: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quốc gia
                  </label>
                  <input
                    type="text"
                    value={newCustomer.country}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        country: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={newCustomer.note}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, note: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ghi chú về khách hàng..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setNewCustomer({
                      email: "",
                      phone: "",
                      first_name: "",
                      last_name: "",
                      company: "",
                      tax_id: "",
                      birthday: "",
                      gender: "",
                      address: "",
                      address2: "",
                      city: "",
                      province: "",
                      country: "Vietnam",
                      zip: "",
                      note: "",
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {loading ? "Đang tạo..." : "Tạo khách hàng"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

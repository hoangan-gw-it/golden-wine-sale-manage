import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/firebase/orders";
import nodemailer from "nodemailer";

// POST /api/orders/[id]/send-invoice - Gửi hóa đơn về email admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { orderData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get admin email from environment variable
    const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_TO_EMAIL;

    if (!adminEmail) {
      return NextResponse.json(
        {
          error:
            "Admin email not configured. Please set ADMIN_EMAIL in environment variables.",
        },
        { status: 400 }
      );
    }

    // Get order details if not provided
    const order = orderData || (await getOrderById(id));

    if (!order || order.error) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(order);

    // Send email to admin email
    const emailResult = await sendInvoiceEmail(adminEmail, invoiceHTML, order);

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "Invoice email sent to admin successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error sending invoice email:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to send invoice email";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Generate invoice HTML from order data (for admin summary)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateInvoiceHTML(order: any): string {
  const orderNumber = order.order_number || order.id || "";
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("vi-VN")
    : new Date().toLocaleString("vi-VN");
  const paidDate = order.updatedAt
    ? new Date(order.updatedAt).toLocaleString("vi-VN")
    : new Date().toLocaleString("vi-VN");

  const lineItems = order.line_items || [];
  const totalPrice = parseFloat(order.total_price || "0") / 100; // Convert cents to VND
  const subtotalPrice =
    parseFloat(order.subtotal_price || order.total_price || "0") / 100;

  // Calculate total quantity
  const totalQuantity = lineItems.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, item: any) => sum + parseInt(item.quantity || "0"),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .invoice-container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .shop-info {
            text-align: center;
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
          }
          .order-info {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 4px;
          }
          .order-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th {
            background-color: #333;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 12px;
          }
          .items-table td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .total-section {
            margin-top: 20px;
            text-align: right;
          }
          .total-row {
            margin: 5px 0;
            font-size: 14px;
          }
          .total-row.grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #28a745;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px dashed #ddd;
            font-size: 12px;
            color: #666;
            text-align: justify;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>THÔNG BÁO ĐƠN HÀNG MỚI - IPOS</h1>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">Email tổng hợp đơn hàng đã thanh toán</p>
          </div>
          
          <div class="order-info" style="background-color: #e3f2fd; border-left: 4px solid #2196f3;">
            <h2 style="margin-top: 0; color: #1976d2;">Thông tin đơn hàng</h2>
            <p><strong>Mã đơn hàng:</strong> ${String(orderNumber).padStart(4, "0")}</p>
            <p><strong>Ngày tạo đơn:</strong> ${orderDate}</p>
            <p><strong>Ngày thanh toán:</strong> ${paidDate}</p>
            <p><strong>Trạng thái:</strong> <span style="color: #28a745; font-weight: bold;">ĐÃ THANH TOÁN</span></p>
            ${
              order.created_by_name
                ? `<p><strong>Người tạo đơn:</strong> ${order.created_by_name}</p>`
                : ""
            }
            ${order.note ? `<p><strong>Ghi chú:</strong> ${order.note}</p>` : ""}
          </div>

          ${
            order.customer &&
            (order.customer.email ||
              order.customer.first_name ||
              order.customer.phone)
              ? `
          <div class="order-info" style="background-color: #f3e5f5; border-left: 4px solid #9c27b0;">
            <h2 style="margin-top: 0; color: #7b1fa2;">Thông tin khách hàng</h2>
            ${
              order.customer.first_name || order.customer.last_name
                ? `<p><strong>Tên:</strong> ${order.customer.first_name || ""} ${order.customer.last_name || ""}</p>`
                : ""
            }
            ${order.customer.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ""}
            ${order.customer.phone ? `<p><strong>SĐT:</strong> ${order.customer.phone}</p>` : ""}
          </div>
          `
              : ""
          }
          <table class="items-table">
            <thead>
              <tr>
                <th>SẢN PHẨM</th>
                <th style="text-align: center;">SL</th>
                <th style="text-align: right;">Đơn Giá</th>
                <th style="text-align: right;">T. TIỀN</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems
                .map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (item: any, index: number) => `
                <tr>
                  <td>${index + 1}) ${item.title || "Sản phẩm"}</td>
                  <td style="text-align: center;">${item.quantity || 1}</td>
                  <td style="text-align: right;">${formatCurrency(
                    parseFloat(item.price || "0")
                  )}</td>
                  <td style="text-align: right;">${formatCurrency(
                    parseFloat(item.price || "0") * (item.quantity || 1)
                  )}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="total-section" style="background-color: #fff9e6; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <div class="total-row">
              <strong>Tổng số lượng sản phẩm:</strong> ${totalQuantity} sản phẩm
            </div>
            <div class="total-row" style="margin-top: 10px;">
              <span>Tạm tính: ${formatCurrency(subtotalPrice)}</span>
            </div>
            ${
              order.discount_codes && order.discount_codes.length > 0
                ? `
            <div class="total-row" style="color: #dc3545;">
              <span>Giảm giá: -${formatCurrency(
                calculateDiscount(order)
              )}</span>
            </div>
            `
                : ""
            }
            <div class="total-row grand-total" style="margin-top: 15px;">
              <span style="font-size: 20px;">TỔNG TIỀN: ${formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
            <p><strong>Ghi chú:</strong> Đây là email tự động từ hệ thống IPOS. Vui lòng kiểm tra và tổng hợp đơn hàng vào hệ thống quản lý.</p>
            <p style="margin-top: 10px;"><strong>Thời gian:</strong> ${new Date().toLocaleString("vi-VN")}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateDiscount(order: any): number {
  if (!order.discount_codes || order.discount_codes.length === 0) return 0;
  // Implement discount calculation if needed
  return 0;
}

// Send invoice email using Nodemailer
async function sendInvoiceEmail(
  to: string,
  html: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any
): Promise<{ error: string | null }> {
  try {
    // Create transporter based on environment variables
    // Support both SMTP and Gmail OAuth2
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
      },
      // Gmail specific: if using App Password
      ...(process.env.EMAIL_USE_APP_PASSWORD && {
        service: "gmail",
      }),
    });

    // Send mail
    const info = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        process.env.SMTP_USER ||
        "noreply@goldenwine.vn",
      to: to,
      subject: `[IPOS - Đã thanh toán] Đơn hàng #${String(order.order_number || order.id).padStart(4, "0")} - ${new Date().toLocaleDateString("vi-VN")}`,
      html: html,
    });

    console.log("Invoice email sent:", info.messageId);
    return { error: null };
  } catch (error: unknown) {
    console.error("Nodemailer error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    return { error: errorMessage };
  }
}

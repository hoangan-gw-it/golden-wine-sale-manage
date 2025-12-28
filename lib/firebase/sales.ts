import { addDocument, getDocuments, getDocument, updateDocument, deleteDocument, where, orderBy, Timestamp } from "./firestore";
import { SalesRecord } from "../types";

const SALES_RECORDS_COLLECTION = "sales_records";

// Create a new sales record
export const createSalesRecord = async (
  productName: string,
  quantity: number,
  price: number,
  salesPersonId: string,
  salesPersonName: string
) => {
  const totalAmount = quantity * price;
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  const salesRecord: Omit<SalesRecord, "id"> = {
    productName,
    quantity,
    price,
    totalAmount,
    salesPersonId,
    salesPersonName,
    date,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return await addDocument<Omit<SalesRecord, "id">>(SALES_RECORDS_COLLECTION, salesRecord);
};

// Get sales records by sales person
export const getSalesRecordsBySalesPerson = async (salesPersonId: string) => {
  try {
    // First try with orderBy (may need index)
    const result = await getDocuments<SalesRecord>(SALES_RECORDS_COLLECTION, [
      where("salesPersonId", "==", salesPersonId),
      orderBy("createdAt", "desc"),
    ]);
    
    // If error contains index, try without orderBy
    if (result.error && result.error.includes("index")) {
      console.warn("Index required, trying without orderBy");
      return await getDocuments<SalesRecord>(SALES_RECORDS_COLLECTION, [
        where("salesPersonId", "==", salesPersonId),
      ]);
    }
    
    return result;
  } catch (error: any) {
    // Fallback: try without orderBy
    console.warn("Error with orderBy, trying without:", error);
    return await getDocuments<SalesRecord>(SALES_RECORDS_COLLECTION, [
      where("salesPersonId", "==", salesPersonId),
    ]);
  }
};

// Get all sales records (for admin)
export const getAllSalesRecords = async () => {
  return await getDocuments<SalesRecord>(SALES_RECORDS_COLLECTION, [
    orderBy("createdAt", "desc"),
  ]);
};

// Get sales records by date range
export const getSalesRecordsByDateRange = async (startDate: string, endDate: string) => {
  return await getDocuments<SalesRecord>(SALES_RECORDS_COLLECTION, [
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc"),
  ]);
};

// Get sales records by date
export const getSalesRecordsByDate = async (date: string) => {
  return await getDocuments<SalesRecord>(SALES_RECORDS_COLLECTION, [
    where("date", "==", date),
    orderBy("createdAt", "desc"),
  ]);
};

// Get sales records for current week
export const getSalesRecordsForWeek = async () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);
  
  const startDate = startOfWeek.toISOString().split("T")[0];
  const endDate = endOfWeek.toISOString().split("T")[0];
  
  return await getSalesRecordsByDateRange(startDate, endDate);
};

// Update sales record
export const updateSalesRecord = async (
  recordId: string,
  data: Partial<Pick<SalesRecord, "productName" | "quantity" | "price">>
) => {
  const updates: any = { ...data, updatedAt: new Date() };
  
  // Recalculate total if quantity or price changed
  if (data.quantity !== undefined || data.price !== undefined) {
    const { data: record } = await getDocument<SalesRecord>(SALES_RECORDS_COLLECTION, recordId);
    if (record) {
      const quantity = data.quantity ?? record.quantity;
      const price = data.price ?? record.price;
      updates.totalAmount = quantity * price;
    }
  }
  
  return await updateDocument(SALES_RECORDS_COLLECTION, recordId, updates);
};

// Delete sales record
export const deleteSalesRecord = async (recordId: string) => {
  return await deleteDocument(SALES_RECORDS_COLLECTION, recordId);
};


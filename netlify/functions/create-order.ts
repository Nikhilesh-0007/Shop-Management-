import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createOrderSchema } from "../../shared/schema";
import { fromZodError } from "zod-validation-error";
import type { Customer, Order, OrderItemRecord, CreateOrderInput } from "../../shared/schema";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function findOrCreateCustomer(name: string, phone: string): Promise<Customer> {
  const { data: existing } = await supabase.from("customers").select("*").eq("phone", phone).single();
  if (existing) return { id: existing.id, name: existing.name, phone: existing.phone, createdAt: existing.created_at };

  const { data, error } = await supabase.from("customers").insert({ name, phone }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, phone: data.phone, createdAt: data.created_at };
}

async function createOrder(input: CreateOrderInput): Promise<{ order: Order; customer: Customer; items: OrderItemRecord[] }> {
  const customer = await findOrCreateCustomer(input.customerName, input.phoneNumber);
  const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({ customer_id: customer.id, order_date: input.orderDate, total_amount: totalAmount })
    .select().single();
  if (orderError) throw orderError;

  const orderItems = input.items.map((item) => {
    const { itemType, quantity, price, ...itemData } = item;
    return { order_id: orderData.id, item_type: itemType, item_data: JSON.stringify(itemData), quantity, price };
  });

  const { data: insertedItems, error: itemsError } = await supabase.from("order_items").insert(orderItems).select();
  if (itemsError) throw itemsError;

  const order: Order = {
    id: orderData.id, customerId: orderData.customer_id, orderDate: orderData.order_date,
    totalAmount: orderData.total_amount, pdfPath: null, createdAt: orderData.created_at,
  };

  const items: OrderItemRecord[] = insertedItems.map((row) => ({
    id: row.id, orderId: row.order_id, itemType: row.item_type,
    itemData: row.item_data, quantity: row.quantity, price: row.price,
  }));

  return { order, customer, items };
}

async function generatePdf(order: Order, customer: Customer, items: OrderItemRecord[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const margin = 50;
  let y = height - margin - 50;

  page.drawText("PRODUCTION ORDER", { x: margin, y, size: 16, font: bold, color: rgb(0, 0, 0) });
  y -= 30;
  page.drawText(`Order #: ${order.id}`, { x: margin, y, size: 12, font: regular, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText(`Date: ${order.orderDate}`, { x: margin, y, size: 12, font: regular, color: rgb(0, 0, 0) });
  y -= 30;
  page.drawText("CUSTOMER:", { x: margin, y, size: 12, font: bold, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText(`${customer.name} - ${customer.phone}`, { x: margin, y, size: 12, font: regular, color: rgb(0, 0, 0) });
  y -= 40;
  page.drawText("PRODUCTION SPECIFICATIONS", { x: margin, y, size: 12, font: bold, color: rgb(0, 0, 0) });
  y -= 30;

  let totalAmount = 0;
  items.forEach((item, idx) => {
    let data: any = {};
    try { data = JSON.parse(item.itemData); } catch {}
    totalAmount += item.quantity * item.price;

    page.drawText(`ITEM ${idx + 1}: ${item.itemType.toUpperCase()}`, { x: margin, y, size: 11, font: bold, color: rgb(0, 0, 0) });
    y -= 18;

    const lines: string[] = [];
    if (item.itemType === "box") {
      lines.push(`Box Type: ${data.boxType || "N/A"}`, `Dimensions: ${data.length || 0} x ${data.breadth || 0} x ${data.height || 0} cm`, `Print Type: ${data.printType || "N/A"}`);
      if (data.color) lines.push(`Color: ${data.color}`);
      if (data.details) lines.push(`Details: ${data.details}`);
    } else if (item.itemType === "envelope") {
      lines.push(`Size: ${data.envelopeSize || "N/A"}`, `Print Type: ${data.envelopePrintType || "N/A"}`);
      if (data.envelopePrintMethod) lines.push(`Print Method: ${data.envelopePrintMethod}`);
    } else if (item.itemType === "bag") {
      lines.push(`Bag Size: ${data.bagSize || "N/A"}`, `Handle: ${data.doreType || "N/A"}`, `Print Type: ${data.bagPrintType || "N/A"}`);
      if (data.laminationType) lines.push(`Lamination: ${data.laminationType}`);
    }
    lines.push(`Quantity: ${item.quantity}`, `Unit Price: Rs${item.price.toFixed(2)}`);

    lines.forEach((line) => {
      page.drawText(`• ${line}`, { x: margin, y, size: 10, font: regular, color: rgb(0, 0, 0) });
      y -= 15;
    });
    y -= 10;
  });

  page.drawText(`TOTAL ORDER VALUE: Rs${totalAmount.toFixed(2)}`, { x: margin, y, size: 12, font: bold, color: rgb(0, 0, 0) });
  return pdfDoc.save();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body || "{}");
    const result = createOrderSchema.safeParse(body);
    if (!result.success) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: fromZodError(result.error).message }) };
    }

    const { order, customer, items } = await createOrder(result.data);
    const pdfBytes = await generatePdf(order, customer, items);
    const filename = `production_order_${order.id}_${customer.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}.pdf`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"` },
      body: Buffer.from(pdfBytes).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }) };
  }
};

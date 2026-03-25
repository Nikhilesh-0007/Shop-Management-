import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createOrderSchema } from "../shared/schema";
import { fromZodError } from "zod-validation-error";

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

// ── PDF Generator ──────────────────────────────────────────
const W = 595.28, H = 841.89, ML = 50, MR = 50;
const CONTENT_W = W - ML - MR;
const COL = {
  num:     { x: ML,       w: 40 },
  type:    { x: ML + 40,  w: 80 },
  details: { x: ML + 120, w: 180 },
  qty:     { x: ML + 300, w: 45 },
  price:   { x: ML + 345, w: 75 },
  total:   { x: ML + 420, w: 75 },
};

function drawHRule(page: any, y: number, thickness = 1) {
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness, color: rgb(0,0,0) });
}

function buildDetails(itemType: string, data: any): string[] {
  const lines: string[] = [];
  if (itemType === "box") {
    if (data.boxType) lines.push(`Box Type: ${data.boxType}`);
    if (data.length || data.breadth || data.height) lines.push(`Dimensions: ${data.length||0} x ${data.breadth||0} x ${data.height||0} in`);
    if (data.printType) lines.push(`Print Type: ${data.printType}`);
    if (data.color) lines.push(`Color: ${data.color}`);
    if (data.details) lines.push(`Details: ${data.details}`);
  } else if (itemType === "envelope") {
    if (data.envelopeSize) lines.push(`Size: ${data.envelopeSize}`);
    if (data.envelopeSize === "Other" && (data.envelopeHeight || data.envelopeWidth)) lines.push(`Dimensions: ${data.envelopeHeight||0} x ${data.envelopeWidth||0} in`);
    if (data.envelopePrintType) lines.push(`Print Type: ${data.envelopePrintType}`);
    if (data.envelopeColor) lines.push(`Color: ${data.envelopeColor}`);
    if (data.envelopePrintMethod) lines.push(`Print Method: ${data.envelopePrintMethod}`);
  } else if (itemType === "bag") {
    if (data.bagSize) lines.push(`Bag Size: ${data.bagSize}`);
    if (data.bagSize === "Other" && (data.bagHeight || data.bagWidth)) lines.push(`Dimensions: ${data.bagWidth||0} x ${data.bagHeight||0} x ${data.bagGusset||0} in`);
    if (data.doreType) lines.push(`Handle: ${data.doreType}`);
    if (data.handleColor) lines.push(`Handle Color: ${data.handleColor}`);
    if (data.bagPrintType) lines.push(`Print Type: ${data.bagPrintType}`);
    if (data.printMethod) lines.push(`Print Method: ${data.printMethod}`);
    if (data.laminationType) lines.push(`Lamination: ${data.laminationType}`);
  }
  return lines;
}

async function generatePdf(order: any, customer: any, items: any[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([W, H]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = H - 50;

  const title = "ORDER FORM";
  const titleW = bold.widthOfTextAtSize(title, 28);
  page.drawText(title, { x: (W - titleW) / 2, y, size: 28, font: bold, color: rgb(0,0,0) });
  y -= 14; drawHRule(page, y, 1.2); y -= 20;

  page.drawText("Customer DETAILS", { x: ML, y, size: 14, font: bold, color: rgb(0,0,0) });
  y -= 20;

  const rightX = ML + CONTENT_W / 2 + 10;
  page.drawText("Customer Name:", { x: ML, y, size: 11, font: bold, color: rgb(0,0,0) });
  page.drawText("Date:", { x: rightX, y, size: 11, font: bold, color: rgb(0,0,0) });
  y -= 16;
  page.drawText(customer.name, { x: ML, y, size: 11, font: regular, color: rgb(0,0,0) });
  page.drawText(order.order_date || order.orderDate, { x: rightX, y, size: 11, font: regular, color: rgb(0,0,0) });
  y -= 20;
  page.drawText("Phone Number:", { x: ML, y, size: 11, font: bold, color: rgb(0,0,0) });
  y -= 16;
  page.drawText(customer.phone, { x: ML, y, size: 11, font: regular, color: rgb(0,0,0) });
  y -= 20;

  drawHRule(page, y, 0.8); y -= 18;
  page.drawText("ORDER ITEMS", { x: ML, y, size: 14, font: bold, color: rgb(0,0,0) });
  y -= 16;

  const rowH = 18;
  const headers = [
    { label: "S.No", col: COL.num }, { label: "Type", col: COL.type },
    { label: "Details", col: COL.details }, { label: "Qty", col: COL.qty },
    { label: "Price", col: COL.price }, { label: "Total", col: COL.total },
  ];
  headers.forEach(({ label, col }) => {
    page.drawText(label, { x: col.x + 3, y: y - 10, size: 10, font: bold, color: rgb(0,0,0) });
  });
  y -= rowH + 4;

  let totalAmount = 0;
  const detailLineH = 13;

  items.forEach((item: any, idx: number) => {
    let data: any = {};
    try { data = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.itemData ? JSON.parse(item.itemData) : {}); } catch {}

    const itemType = item.item_type || item.itemType;
    const qty = item.quantity;
    const price = item.price;
    const itemTotal = qty * price;
    totalAmount += itemTotal;

    const detailLines = buildDetails(itemType, data);
    const cellH = Math.max(rowH, detailLines.length * detailLineH + 6);
    const rowY = y - 10;
    const label = itemType.charAt(0).toUpperCase() + itemType.slice(1);

    page.drawText(`${idx + 1}`, { x: COL.num.x + 3, y: rowY, size: 10, font: regular, color: rgb(0,0,0) });
    page.drawText(label, { x: COL.type.x + 3, y: rowY, size: 10, font: bold, color: rgb(0,0,0) });
    detailLines.forEach((line, li) => {
      page.drawText(line, { x: COL.details.x + 3, y: rowY - li * detailLineH, size: 9, font: regular, color: rgb(0,0,0) });
    });
    page.drawText(`${qty}`, { x: COL.qty.x + 3, y: rowY, size: 10, font: regular, color: rgb(0,0,0) });
    page.drawText(`Rs. ${price.toFixed(2)}`, { x: COL.price.x + 3, y: rowY, size: 10, font: regular, color: rgb(0,0,0) });
    page.drawText(`Rs. ${itemTotal.toFixed(2)}`, { x: COL.total.x + 3, y: rowY, size: 10, font: bold, color: rgb(0,0,0) });
    y -= cellH + 4;
  });

  y -= 6; drawHRule(page, y, 0.8); y -= 20;
  const totalText = `TOTAL:   Rs. ${totalAmount.toFixed(2)}`;
  const totalW = bold.widthOfTextAtSize(totalText, 13);
  page.drawText(totalText, { x: W - MR - totalW, y, size: 13, font: bold, color: rgb(0,0,0) });

  return await pdfDoc.save();
}

// ── DB helpers ─────────────────────────────────────────────
async function findOrCreateCustomer(name: string, phone: string) {
  const { data } = await supabase.from('customers').select('*').eq('phone', phone).single();
  if (data) return data;
  const { data: newCustomer, error } = await supabase.from('customers').insert({ name, phone }).select().single();
  if (error) throw error;
  return newCustomer;
}

// ── Routes ─────────────────────────────────────────────────
app.post("/api/create-order", async (req, res) => {
  try {
    const validationResult = createOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, message: fromZodError(validationResult.error).message });
    }
    const input = validationResult.data;
    const customer = await findOrCreateCustomer(input.customerName, input.phoneNumber);
    const totalAmount = input.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    const { data: order, error: orderError } = await supabase.from('orders')
      .insert({ customer_id: customer.id, order_date: input.orderDate, total_amount: totalAmount })
      .select().single();
    if (orderError) throw orderError;

    const orderItems = input.items.map((item: any) => {
      const { itemType, quantity, price, ...itemData } = item;
      return { order_id: order.id, item_type: itemType, item_data: JSON.stringify(itemData), quantity, price };
    });
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    const { data: itemsData } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    const pdfBytes = await generatePdf(order, customer, itemsData || []);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="order_${order.id}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/orders/:id/print", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return res.status(404).json({ message: "Order not found" });
    const { data: customer } = await supabase.from('customers').select('*').eq('id', order.customer_id).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id);
    const pdfBytes = await generatePdf(order, customer, items || []);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="order_${id}.pdf"`);
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { items, orderDate } = req.body;
    const totalAmount = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    await supabase.from('orders').update({ order_date: orderDate, total_amount: totalAmount }).eq('id', id);
    await supabase.from('order_items').delete().eq('order_id', id);
    const orderItems = items.map((item: any) => {
      const { itemType, quantity, price, ...itemData } = item;
      return { order_id: id, item_type: itemType, item_data: JSON.stringify(itemData), quantity, price };
    });
    await supabase.from('order_items').insert(orderItems);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await supabase.from('order_items').delete().eq('order_id', id);
    await supabase.from('orders').delete().eq('id', id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return res.status(404).json({ message: "Order not found" });
    const { data: customer } = await supabase.from('customers').select('*').eq('id', order.customer_id).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id);
    const mappedItems = (items || []).map((row: any) => ({
      id: row.id, orderId: row.order_id, itemType: row.item_type, itemData: row.item_data, quantity: row.quantity, price: row.price,
    }));
    return res.json({ success: true, order, customer, items: mappedItems });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, orders: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/customers", async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, customers: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone } = req.body;
    await supabase.from('customers').update({ name, phone }).eq('id', id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/customers/:id/orders", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data, error } = await supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ success: true, orders: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};

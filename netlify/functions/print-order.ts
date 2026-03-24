import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function generatePdf(order: any, customer: any, items: any[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const margin = 50;
  let y = height - margin - 50;

  page.drawText("Sri Padmavathi Sales", { x: margin, y, size: 20, font: bold, color: rgb(0, 0, 0) });
  page.drawText("\u2122", { x: margin + 178, y: y + 6, size: 10, font: bold, color: rgb(0, 0, 0) });
  y -= 28;

  page.drawText("PRODUCTION ORDER", { x: margin, y, size: 16, font: bold, color: rgb(0, 0, 0) });
  y -= 30;
  page.drawText(`Order #: ${order.id}`, { x: margin, y, size: 12, font: regular, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText(`Date: ${order.orderDate || order.order_date}`, { x: margin, y, size: 12, font: regular, color: rgb(0, 0, 0) });
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
    try { data = typeof item.itemData === "string" ? JSON.parse(item.itemData) : (item.item_data ? JSON.parse(item.item_data) : {}); } catch {}
    const itemType = item.itemType || item.item_type;
    totalAmount += item.quantity * item.price;

    page.drawText(`ITEM ${idx + 1}: ${itemType.toUpperCase()}`, { x: margin, y, size: 11, font: bold, color: rgb(0, 0, 0) });
    y -= 18;

    const lines: string[] = [];
    if (itemType === "box") {
      lines.push(`Box Type: ${data.boxType || "N/A"}`, `Dimensions: ${data.length || 0} x ${data.breadth || 0} x ${data.height || 0} cm`, `Print Type: ${data.printType || "N/A"}`);
      if (data.color) lines.push(`Color: ${data.color}`);
      if (data.details) lines.push(`Details: ${data.details}`);
    } else if (itemType === "envelope") {
      lines.push(`Size: ${data.envelopeSize || "N/A"}`, `Print Type: ${data.envelopePrintType || "N/A"}`);
      if (data.envelopePrintMethod) lines.push(`Print Method: ${data.envelopePrintMethod}`);
    } else if (itemType === "bag") {
      lines.push(`Bag Size: ${data.bagSize || "N/A"}`, `Handle: ${data.doreType || "N/A"}`, `Print Type: ${data.bagPrintType || "N/A"}`);
      if (data.laminationType) lines.push(`Lamination: ${data.laminationType}`);
    }
    lines.push(`Quantity: ${item.quantity}`, `Unit Price: Rs${Number(item.price).toFixed(2)}`);
    lines.forEach((line) => { page.drawText(`• ${line}`, { x: margin, y, size: 10, font: regular, color: rgb(0, 0, 0) }); y -= 15; });
    y -= 10;
  });

  page.drawText(`TOTAL ORDER VALUE: Rs${totalAmount.toFixed(2)}`, { x: margin, y, size: 12, font: bold, color: rgb(0, 0, 0) });
  return pdfDoc.save();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  let id = parseInt(event.queryStringParameters?.id || "");
  if (isNaN(id)) {
    const match = event.path.match(/\/api\/orders\/(\d+)/);
    if (match) id = parseInt(match[1]);
  }
  if (isNaN(id)) return { statusCode: 400, body: JSON.stringify({ message: "Invalid order ID" }) };

  try {
    const { data: orderData, error: orderError } = await supabase.from("orders").select("*").eq("id", id).single();
    if (orderError || !orderData) return { statusCode: 404, body: JSON.stringify({ message: "Order not found" }) };

    const { data: customerData } = await supabase.from("customers").select("*").eq("id", orderData.customer_id).single();
    const { data: itemsData, error: itemsError } = await supabase.from("order_items").select("*").eq("order_id", id);
    if (itemsError) throw itemsError;

    const pdfBytes = await generatePdf(
      { id: orderData.id, orderDate: orderData.order_date },
      { name: customerData?.name || "", phone: customerData?.phone || "" },
      itemsData
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="order_${id}.pdf"` },
      body: Buffer.from(pdfBytes).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }) };
  }
};

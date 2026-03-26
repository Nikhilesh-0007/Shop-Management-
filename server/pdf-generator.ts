import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Customer, Order, OrderItemRecord } from "../shared/schema";

const W = 595.28;
const H = 841.89;
const ML = 50;
const MR = 50;
const CONTENT_W = W - ML - MR;

// Column X positions and widths for table
const COL = {
  num:     { x: ML,       w: 40 },
  type:    { x: ML + 40,  w: 80 },
  details: { x: ML + 120, w: 180 },
  qty:     { x: ML + 300, w: 45 },
  price:   { x: ML + 345, w: 75 },
  total:   { x: ML + 420, w: 75 },
};

function fmt(v: number): string {
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
}

function calcBoxSizes(L: number, B: number, H: number, boxType: string) {
  if (boxType === 'Top-Bottom') {
    return {
      type: 'Top/Bottom',
      sections: [
        { label: 'Board Size', values: [`${fmt(L + H*2)} x ${fmt(B + H*2)}`, `${fmt(L + 2.25)} x ${fmt(B + 2.25)}`] },
        { label: 'Inner Paper', values: [`${fmt(L + H*2 - 0.5)} x ${fmt(B + H*2 - 0.5)}`, `${fmt(L + 2.25 - 0.5)} x ${fmt(B + 2.25 - 0.5)}`] },
        { label: 'Output Paper', values: [`${fmt(H + 2)} x ${fmt(L + B + 2)}`, `${fmt(H + 2)} x ${fmt(L + B)}`] },
        { label: 'Bottom Paper', values: [`${fmt(L - 0.25)} x ${fmt(B - 0.25)}`] },
        { label: 'Top Paper', values: [`${fmt(L + 2.25 + 1.75)} x ${fmt(B + 2.25 + 1.75)}`] },
      ]
    };
  } else {
    return {
      type: 'Magnet/Rope',
      sections: [
        { label: 'Board Size', values: [`${fmt(L + H*2)} x ${fmt(B + H*2)}`, `${fmt(L + 0.5)} x ${fmt(B)}`, `${fmt(L + 0.5)} x ${fmt(H)}`, `${fmt(L + 0.5)} x ${fmt(H - 0.2)}`] },
        { label: 'Outer Paper', values: [`${fmt(H + 2)} x ${fmt(L + B + 2)}`, `${fmt(H + 2)} x ${fmt(L + B)}`] },
        { label: 'Inner Paper', values: [`${fmt(L + H*2 - 0.5)} x ${fmt(B + H*2 - 0.5)}`] },
        { label: 'Pad Paper', values: [`${fmt(L + 2.5)} x ${fmt(B*2 + H*2 + 3)}`, `${fmt(L + 0.3)} x ${fmt(B + H + 1.5)}`] },
      ]
    };
  }
}

function drawHRule(page: any, y: number, thickness = 1) {
  page.drawLine({
    start: { x: ML, y },
    end: { x: W - MR, y },
    thickness,
    color: rgb(0, 0, 0),
  });
}

function buildDetails(item: OrderItemRecord, data: any): string[] {
  const lines: string[] = [];
  if (item.itemType === "box") {
    if (data.boxType) lines.push(`Box Type: ${data.boxType}`);
    if (data.length || data.breadth || data.height)
      lines.push(`Dimensions: ${data.length || 0} x ${data.breadth || 0} x ${data.height || 0} in`);
    if (data.printType) lines.push(`Print Type: ${data.printType}`);
    if (data.color) lines.push(`Color: ${data.color}`);
    if (data.details) lines.push(`Details: ${data.details}`);
  } else if (item.itemType === "envelope") {
    if (data.envelopeSize) lines.push(`Size: ${data.envelopeSize}`);
    if (data.envelopeSize === "Other" && (data.envelopeHeight || data.envelopeWidth))
      lines.push(`Dimensions: ${data.envelopeHeight || 0} x ${data.envelopeWidth || 0} in`);
    if (data.envelopePrintType) lines.push(`Print Type: ${data.envelopePrintType}`);
    if (data.envelopeColor) lines.push(`Color: ${data.envelopeColor}`);
    if (data.envelopePrintMethod) lines.push(`Print Method: ${data.envelopePrintMethod}`);
    if (data.envelopeCustomPrint) lines.push(`Custom Print: ${data.envelopeCustomPrint}`);
  } else if (item.itemType === "bag") {
    if (data.bagSize) lines.push(`Bag Size: ${data.bagSize}`);
    if (data.bagSize === "Other" && (data.bagHeight || data.bagWidth))
      lines.push(`Dimensions: ${data.bagWidth || 0} x ${data.bagHeight || 0} x ${data.bagGusset || 0} in`);
    if (data.doreType) lines.push(`Handle: ${data.doreType}`);
    if (data.handleColor) lines.push(`Handle Color: ${data.handleColor}`);
    if (data.customHandleColor) lines.push(`Custom Color: ${data.customHandleColor}`);
    if (data.bagPrintType) lines.push(`Print Type: ${data.bagPrintType}`);
    if (data.printMethod) lines.push(`Print Method: ${data.printMethod}`);
    if (data.laminationType) lines.push(`Lamination: ${data.laminationType}`);
  }
  return lines;
}

async function generateUnifiedProductionPdf(
  order: Order,
  customer: Customer,
  items: OrderItemRecord[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([W, H]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = H - 50;

  // ── Title ──────────────────────────────────────────────
  const title = "ORDER FORM";
  const titleSize = 28;
  const titleW = bold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, { x: (W - titleW) / 2, y, size: titleSize, font: bold, color: rgb(0, 0, 0) });
  y -= 14;
  drawHRule(page, y, 1.2);
  y -= 20;

  // ── CUSTOMER DETAILS heading ───────────────────────────
  page.drawText("Customer DETAILS", { x: ML, y, size: 14, font: bold, color: rgb(0, 0, 0) });
  y -= 20;

  // Two-column customer info
  const leftX = ML;
  const rightX = ML + CONTENT_W / 2 + 10;

  page.drawText("Customer Name:", { x: leftX, y, size: 11, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Date:", { x: rightX, y, size: 11, font: bold, color: rgb(0, 0, 0) });
  y -= 16;

  page.drawText(customer.name, { x: leftX, y, size: 11, font: regular, color: rgb(0, 0, 0) });
  page.drawText(order.orderDate, { x: rightX, y, size: 11, font: regular, color: rgb(0, 0, 0) });
  y -= 20;

  page.drawText("Phone Number:", { x: leftX, y, size: 11, font: bold, color: rgb(0, 0, 0) });
  y -= 16;
  page.drawText(customer.phone, { x: leftX, y, size: 11, font: regular, color: rgb(0, 0, 0) });
  y -= 20;

  drawHRule(page, y, 0.8);
  y -= 18;

  // ── ORDER ITEMS heading ────────────────────────────────
  page.drawText("ORDER ITEMS", { x: ML, y, size: 14, font: bold, color: rgb(0, 0, 0) });
  y -= 16;

  // ── Table header row ──────────────────────────────────
  const rowH = 18;

  const headers = [
    { label: "S.No",    col: COL.num },
    { label: "Type",    col: COL.type },
    { label: "Details", col: COL.details },
    { label: "Qty",     col: COL.qty },
    { label: "Price",   col: COL.price },
    { label: "Total",   col: COL.total },
  ];
  headers.forEach(({ label, col }) => {
    page.drawText(label, { x: col.x + 3, y: y - 10, size: 10, font: bold, color: rgb(0, 0, 0) });
  });
  y -= rowH + 4;

  // ── Table rows ─────────────────────────────────────────
  let totalAmount = 0;
  const detailLineH = 13;

  items.forEach((item, idx) => {
    let data: any = {};
    try { data = JSON.parse(item.itemData); } catch {}

    const itemTotal = item.quantity * item.price;
    totalAmount += itemTotal;

    const detailLines = buildDetails(item, data);
    const cellH = Math.max(rowH, detailLines.length * detailLineH + 6);

    const rowY = y - 10;
    const itemTypeLabel = item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1);

    page.drawText(`${idx + 1}`, { x: COL.num.x + 3, y: rowY, size: 10, font: regular, color: rgb(0, 0, 0) });
    page.drawText(itemTypeLabel, { x: COL.type.x + 3, y: rowY, size: 10, font: bold, color: rgb(0, 0, 0) });

    // Detail lines
    detailLines.forEach((line, li) => {
      page.drawText(line, {
        x: COL.details.x + 3,
        y: rowY - li * detailLineH,
        size: 9,
        font: regular,
        color: rgb(0, 0, 0),
      });
    });

    page.drawText(`${item.quantity}`, { x: COL.qty.x + 3, y: rowY, size: 10, font: regular, color: rgb(0, 0, 0) });
    page.drawText(`Rs. ${item.price.toFixed(2)}`, { x: COL.price.x + 3, y: rowY, size: 10, font: regular, color: rgb(0, 0, 0) });
    page.drawText(`Rs. ${itemTotal.toFixed(2)}`, { x: COL.total.x + 3, y: rowY, size: 10, font: bold, color: rgb(0, 0, 0) });

    y -= cellH + 4;
  });

  // ── Rule before total ──────────────────────────────────
  y -= 6;
  drawHRule(page, y, 0.8);
  y -= 20;

  // ── Total (right aligned) ──────────────────────────────
  const totalText = `TOTAL:   Rs. ${totalAmount.toFixed(2)}`;
  const totalW = bold.widthOfTextAtSize(totalText, 13);
  page.drawText(totalText, { x: W - MR - totalW, y, size: 13, font: bold, color: rgb(0, 0, 0) });

  // ── Cutting Sizes for Box items ────────────────────────
  const boxItems = items.filter(i => i.itemType === 'box');
  if (boxItems.length > 0) {
    y -= 30;
    drawHRule(page, y, 1);
    y -= 18;
    page.drawText("CUTTING SIZES", { x: ML, y, size: 14, font: bold, color: rgb(0, 0, 0) });
    y -= 18;

    boxItems.forEach((item, idx) => {
      let data: any = {};
      try { data = JSON.parse(item.itemData); } catch {}
      const L = parseFloat(data.length) || 0;
      const B = parseFloat(data.breadth) || 0;
      const Ht = parseFloat(data.height) || 0;
      const boxType = data.boxType || 'Top-Bottom';

      if (!L || !B || !Ht) return;

      const calc = calcBoxSizes(L, B, Ht, boxType);

      page.drawText(`Box #${idx + 1} (${calc.type}) — L:${L} x B:${B} x H:${Ht}`, {
        x: ML, y, size: 10, font: bold, color: rgb(0, 0, 0)
      });
      y -= 14;

      calc.sections.forEach(section => {
        page.drawText(`${section.label}:`, { x: ML + 10, y, size: 9, font: bold, color: rgb(0, 0, 0) });
        const valText = section.values.join('   |   ');
        page.drawText(valText, { x: ML + 100, y, size: 9, font: regular, color: rgb(0, 0, 0) });
        y -= 13;
      });
      y -= 6;
    });
  }

  return await pdfDoc.save();
}

export async function generateOrderPdfBytes(
  order: Order,
  customer: Customer,
  items: OrderItemRecord[]
): Promise<Uint8Array> {
  return generateUnifiedProductionPdf(order, customer, items);
}

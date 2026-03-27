import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Customer, Order, OrderItemRecord } from "../shared/schema";

const W = 595.28;
const H = 841.89;
const ML = 50;
const MR = 50;
const CONTENT_W = W - ML - MR;

const COL = {
  num:     { x: ML },
  type:    { x: ML + 40 },
  details: { x: ML + 120 },
  qty:     { x: ML + 360 },
  price:   { x: ML + 410 },
};

function fmt(v: number): string {
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
}

function calcBoxSizes(L: number, B: number, H: number, boxType: string) {
  if (boxType === 'Top-Bottom') {
    return {
      type: 'Top/Bottom',
      sections: [
        { label: 'Board Size',   values: [`${fmt(L + H*2)} x ${fmt(B + H*2)}`, `${fmt(L + 2.25)} x ${fmt(B + 2.25)}`] },
        { label: 'Inner Paper',  values: [`${fmt(L + H*2 - 0.5)} x ${fmt(B + H*2 - 0.5)}`, `${fmt(L + 2.25 - 0.5)} x ${fmt(B + 2.25 - 0.5)}`] },
        { label: 'Output Paper', values: [`${fmt(H + 2)} x ${fmt(L + B + 2)}`, `${fmt(H + 2)} x ${fmt(L + B)}`] },
        { label: 'Bottom Paper', values: [`${fmt(L - 0.25)} x ${fmt(B - 0.25)}`] },
        { label: 'Top Paper',    values: [`${fmt(L + 2.25 + 1.75)} x ${fmt(B + 2.25 + 1.75)}`] },
      ]
    };
  } else {
    return {
      type: 'Magnet/Rope',
      sections: [
        { label: 'Board Size',  values: [`${fmt(L + H*2)} x ${fmt(B + H*2)}`, `${fmt(L + 0.5)} x ${fmt(B)}`, `${fmt(L + 0.5)} x ${fmt(H)}`, `${fmt(L + 0.5)} x ${fmt(H - 0.2)}`] },
        { label: 'Outer Paper', values: [`${fmt(H + 2)} x ${fmt(L + B + 2)}`, `${fmt(H + 2)} x ${fmt(L + B)}`] },
        { label: 'Inner Paper', values: [`${fmt(L + H*2 - 0.5)} x ${fmt(B + H*2 - 0.5)}`] },
        { label: 'Pad Paper',   values: [`${fmt(L + 2.5)} x ${fmt(B*2 + H*2 + 3)}`, `${fmt(L + 0.3)} x ${fmt(B + H + 1.5)}`] },
      ]
    };
  }
}

function drawHRule(page: any, y: number, thickness = 1) {
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness, color: rgb(0, 0, 0) });
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

function drawTableCell(page: any, x: number, y: number, w: number, h: number, text: string, font: any, size: number, isHeader: boolean) {
  page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: rgb(0, 0, 0), borderWidth: 0.5, color: rgb(1, 1, 1) });
  if (text) page.drawText(text, { x: x + 4, y: y - h + 5, size, font, color: rgb(0, 0, 0), maxWidth: w - 8 });
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

  // Title
  const title = "ORDER FORM";
  const titleW = bold.widthOfTextAtSize(title, 28);
  page.drawText(title, { x: (W - titleW) / 2, y, size: 28, font: bold, color: rgb(0, 0, 0) });
  y -= 14; drawHRule(page, y, 1.2); y -= 20;

  // Customer Details
  page.drawText("Customer DETAILS", { x: ML, y, size: 14, font: bold, color: rgb(0, 0, 0) });
  y -= 20;

  const rightX = ML + CONTENT_W / 2 + 10;
  page.drawText("Customer Name:", { x: ML, y, size: 11, font: bold, color: rgb(0, 0, 0) });
  page.drawText("Date:", { x: rightX, y, size: 11, font: bold, color: rgb(0, 0, 0) });
  y -= 16;
  page.drawText(customer.name, { x: ML, y, size: 11, font: regular, color: rgb(0, 0, 0) });
  page.drawText(order.orderDate, { x: rightX, y, size: 11, font: regular, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText("Phone Number:", { x: ML, y, size: 11, font: bold, color: rgb(0, 0, 0) });
  y -= 16;
  page.drawText(customer.phone, { x: ML, y, size: 11, font: regular, color: rgb(0, 0, 0) });
  y -= 20;

  drawHRule(page, y, 0.8); y -= 18;

  // Order Items
  page.drawText("ORDER ITEMS", { x: ML, y, size: 14, font: bold, color: rgb(0, 0, 0) });
  y -= 16;

  const rowH = 18;
  const headers = [
    { label: "S.No",    x: COL.num.x },
    { label: "Type",    x: COL.type.x },
    { label: "Details", x: COL.details.x },
    { label: "Qty",     x: COL.qty.x },
    { label: "Price",   x: COL.price.x },
  ];
  headers.forEach(({ label, x }) => {
    page.drawText(label, { x: x + 3, y: y - 10, size: 10, font: bold, color: rgb(0, 0, 0) });
  });
  y -= rowH + 4;

  const detailLineH = 13;
  items.forEach((item, idx) => {
    let data: any = {};
    try { data = JSON.parse(item.itemData); } catch {}

    const detailLines = buildDetails(item, data);
    const cellH = Math.max(rowH, detailLines.length * detailLineH + 6);
    const rowY = y - 10;

    page.drawText(`${idx + 1}`, { x: COL.num.x + 3, y: rowY, size: 10, font: regular, color: rgb(0, 0, 0) });
    page.drawText(item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1), { x: COL.type.x + 3, y: rowY, size: 10, font: bold, color: rgb(0, 0, 0) });
    detailLines.forEach((line, li) => {
      page.drawText(line, { x: COL.details.x + 3, y: rowY - li * detailLineH, size: 9, font: regular, color: rgb(0, 0, 0) });
    });
    page.drawText(`${item.quantity}`, { x: COL.qty.x + 3, y: rowY, size: 10, font: regular, color: rgb(0, 0, 0) });
    page.drawText(`Rs. ${item.price.toFixed(2)}`, { x: COL.price.x + 3, y: rowY, size: 10, font: regular, color: rgb(0, 0, 0) });

    y -= cellH + 4;
  });

  // Cutting Sizes — two tables per box: Board Sizes + Paper Sizes
  const boxItems = items.filter(i => i.itemType === 'box');
  if (boxItems.length > 0) {
    y -= 10;
    drawHRule(page, y, 1); y -= 18;
    page.drawText("CUTTING SIZES", { x: ML, y, size: 14, font: bold, color: rgb(0, 0, 0) });
    y -= 18;

    boxItems.forEach((item, idx) => {
      let data: any = {};
      try { data = JSON.parse(item.itemData); } catch {}
      const L = parseFloat(data.length) || 0;
      const B = parseFloat(data.breadth) || 0;
      const Ht = parseFloat(data.height) || 0;
      if (!L || !B || !Ht) return;

      const calc = calcBoxSizes(L, B, Ht, data.boxType || 'Top-Bottom');
      page.drawText(`Box #${idx + 1} (${calc.type}) — L:${L} x B:${B} x H:${Ht}`, { x: ML, y, size: 10, font: bold, color: rgb(0, 0, 0) });
      y -= 16;

      const boardSection = calc.sections.find(s => s.label === 'Board Size')!;
      const paperSections = calc.sections.filter(s => s.label !== 'Board Size');
      const boxW = CONTENT_W;
      const rH = 16;
      const pad = 5;

      // ── Box 1: Board Size ──
      const boardBoxH = rH + boardSection.values.length * rH;
      // header
      page.drawRectangle({ x: ML, y: y - rH, width: boxW, height: rH, borderColor: rgb(0,0,0), borderWidth: 0.5, color: rgb(1,1,1) });
      page.drawText("Board Size", { x: ML + 4, y: y - rH + pad, size: 9, font: bold, color: rgb(0,0,0) });
      // values area border
      page.drawRectangle({ x: ML, y: y - boardBoxH, width: boxW, height: boardSection.values.length * rH, borderColor: rgb(0,0,0), borderWidth: 0.5, color: rgb(1,1,1) });
      boardSection.values.forEach((val, ri) => {
        page.drawText(val, { x: ML + 4, y: y - rH - ri * rH - rH + pad, size: 9, font: regular, color: rgb(0,0,0) });
      });
      y -= boardBoxH + 12;

      // ── Box 2: Paper Sizes — title + col headers with hline, data rows no lines ──
      const col1W = boxW * 0.45;
      const col2W = boxW - col1W;
      const paperBoxH = rH * 2 + paperSections.length * rH;
      page.drawRectangle({ x: ML, y: y - paperBoxH, width: boxW, height: paperBoxH, borderColor: rgb(0,0,0), borderWidth: 0.5, color: rgb(1,1,1) });
      // title row
      drawTableCell(page, ML, y, boxW, rH, "Paper Sizes", bold, 9, true);
      y -= rH;
      // column headers
      drawTableCell(page, ML, y, col1W, rH, "Paper Category", bold, 9, true);
      drawTableCell(page, ML + col1W, y, col2W, rH, "Value", bold, 9, true);
      y -= rH;
      // vertical divider for data rows
      page.drawLine({ start: { x: ML + col1W, y }, end: { x: ML + col1W, y: y - paperSections.length * rH }, thickness: 0.5, color: rgb(0,0,0) });
      // data rows — text only, no horizontal lines
      paperSections.forEach(sec => {
        page.drawText(sec.label, { x: ML + 4, y: y - rH + pad, size: 9, font: regular, color: rgb(0,0,0), maxWidth: col1W - 8 });
        page.drawText(sec.values.join('  |  '), { x: ML + col1W + 4, y: y - rH + pad, size: 9, font: regular, color: rgb(0,0,0), maxWidth: col2W - 8 });
        y -= rH;
      });
      y -= 12;
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

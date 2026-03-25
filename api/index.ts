import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { database } from "../server/supabase-database";
import { generateOrderPdfBytes } from "../server/pdf-generator";
import { createOrderSchema } from "../shared/schema";
import { fromZodError } from "zod-validation-error";

const app = express();
app.use(express.json());

app.post("/api/create-order", async (req, res) => {
  try {
    const validationResult = createOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      const validationError = fromZodError(validationResult.error);
      return res.status(400).json({ success: false, message: validationError.message });
    }
    const input = validationResult.data;
    const { order, customer } = await database.createOrder(input);
    const orderWithItems = await database.getOrderWithItems(order.id);
    if (!orderWithItems) throw new Error("Failed to retrieve order after creation");
    const pdfBytes = await generateOrderPdfBytes(orderWithItems.order, orderWithItems.customer, orderWithItems.items);
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
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const orderData = await database.getOrderWithItems(id);
    if (!orderData) return res.status(404).json({ message: "Order not found" });
    const pdfBytes = await generateOrderPdfBytes(orderData.order, orderData.customer, orderData.items);
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
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    await database.updateOrder(id, req.body);
    return res.json({ success: true, orderId: id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    await database.deleteOrder(id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const orderData = await database.getOrderWithItems(id);
    if (!orderData) return res.status(404).json({ message: "Order not found" });
    return res.json({ success: true, ...orderData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await database.getAllOrders();
    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/customers", async (req, res) => {
  try {
    const customers = await database.getAllCustomers();
    return res.json({ success: true, customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ message: "Name and phone required" });
    await database.updateCustomer(id, name, phone);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/customers/:id/orders", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const orders = await database.getOrdersByCustomerId(id);
    return res.json({ success: true, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { database } from "./supabase-database";
import { generateOrderPdfBytes } from "./pdf-generator";
import { createOrderSchema } from "../shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/create-order", async (req: Request, res: Response) => {
    try {
      const validationResult = createOrderSchema.safeParse(req.body);

      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({
          success: false,
          message: validationError.message,
        });
      }

      const input = validationResult.data;
      const { order, customer } = await database.createOrder(input);
      const orderWithItems = await database.getOrderWithItems(order.id);
      if (!orderWithItems) throw new Error("Failed to retrieve order after creation");

      const pdfBytes = await generateOrderPdfBytes(
        orderWithItems.order,
        orderWithItems.customer,
        orderWithItems.items
      );

      const filename = `order_${order.id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      return res.send(Buffer.from(pdfBytes));
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      });
    }
  });

  app.get("/api/orders/:id/print", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });

      const orderData = await database.getOrderWithItems(id);
      if (!orderData) return res.status(404).json({ message: "Order not found" });

      const pdfBytes = await generateOrderPdfBytes(orderData.order, orderData.customer, orderData.items);
      const filename = `order_${id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      return res.send(Buffer.from(pdfBytes));
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.put("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });

      await database.updateOrder(id, req.body);
      return res.json({ success: true, orderId: id });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.delete("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
      await database.deleteOrder(id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.get("/api/customers", async (req: Request, res: Response) => {
    try {
      const customers = await database.getAllCustomers();
      return res.json({ success: true, customers });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.put("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const { name, phone } = req.body;
      if (!name || !phone) return res.status(400).json({ message: "Name and phone required" });
      await database.updateCustomer(id, name, phone);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.delete("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await database.deleteCustomer(id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.get("/api/customers/:id/orders", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const orders = await database.getOrdersByCustomerId(id);
      return res.json({ success: true, orders });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const orders = await database.getAllOrders();
      return res.json({ success: true, orders });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const orderData = await database.getOrderWithItems(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }

      return res.json({
        success: true,
        ...orderData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      });
    }
  });

  return httpServer;
}

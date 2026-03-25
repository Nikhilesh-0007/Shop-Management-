import { z } from "zod";

export const ItemType = {
  BOX: "box",
  ENVELOPE: "envelope",
  BAG: "bag",
} as const;

export type ItemTypeValue = typeof ItemType[keyof typeof ItemType];

export const boxItemSchema = z.object({
  itemType: z.literal(ItemType.BOX),
  boxType: z.string().min(1, "Box type is required"),
  length: z.number().min(0.1, "Length must be at least 0.1"),
  breadth: z.number().min(0.1, "Breadth must be at least 0.1"),
  height: z.number().min(0.1, "Height must be at least 0.1"),
  printType: z.string().min(1, "Print type is required"),
  color: z.string().optional(),
  details: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().nonnegative("Price must be non-negative"),
});

export const envelopeItemSchema = z.object({
  itemType: z.literal(ItemType.ENVELOPE),
  envelopeSize: z.string().min(1, "Envelope size is required"),
  envelopeHeight: z.number().optional(),
  envelopeWidth: z.number().optional(),
  envelopePrintType: z.string().min(1, "Print type is required"),
  envelopeColor: z.string().optional(),
  envelopePrintMethod: z.string().optional(),
  envelopeCustomPrint: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().nonnegative("Price must be non-negative"),
});

export const bagItemSchema = z.object({
  itemType: z.literal(ItemType.BAG),
  bagSize: z.string().min(1, "Bag size is required"),
  bagHeight: z.number().optional(),
  bagWidth: z.number().optional(),
  bagGusset: z.number().optional(),
  doreType: z.string().min(1, "Handle specification is required"),
  handleColor: z.string().optional(),
  customHandleColor: z.string().optional(),
  bagPrintType: z.string().min(1, "Print type is required"),
  printMethod: z.string().optional(),
  laminationType: z.string().optional(),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().nonnegative("Price must be non-negative"),
});

export const orderItemSchema = z.union([
  boxItemSchema.passthrough(),
  envelopeItemSchema.passthrough(),
  bagItemSchema.passthrough(),
]);

export const createOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  orderDate: z.string().min(1, "Order date is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export type BoxItem = z.infer<typeof boxItemSchema>;
export type EnvelopeItem = z.infer<typeof envelopeItemSchema>;
export type BagItem = z.infer<typeof bagItemSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export interface Customer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Order {
  id: number;
  customerId: number;
  orderDate: string;
  totalAmount: number;
  pdfPath: string | null;
  createdAt: string;
}

export interface OrderItemRecord {
  id: number;
  orderId: number;
  itemType: ItemTypeValue;
  itemData: string;
  quantity: number;
  price: number;
}

export interface PdfInfo {
  type: string;
  url: string;
  filename: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId: number;
  pdfUrls: PdfInfo[];
  message: string;
}

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const id = parseInt(event.queryStringParameters?.id || "");
  if (isNaN(id)) return { statusCode: 400, body: JSON.stringify({ message: "Invalid order ID" }) };

  try {
    const { data: orderData, error: orderError } = await supabase.from("orders").select("*").eq("id", id).single();
    if (orderError || !orderData) return { statusCode: 404, body: JSON.stringify({ message: "Order not found" }) };

    const { data: customerData } = await supabase.from("customers").select("*").eq("id", orderData.customer_id).single();
    const { data: itemsData, error: itemsError } = await supabase.from("order_items").select("*").eq("order_id", id);
    if (itemsError) throw itemsError;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        order: { id: orderData.id, customerId: orderData.customer_id, orderDate: orderData.order_date, totalAmount: orderData.total_amount, pdfPath: null, createdAt: orderData.created_at },
        customer: customerData ? { id: customerData.id, name: customerData.name, phone: customerData.phone, createdAt: customerData.created_at } : null,
        items: itemsData.map((row) => ({ id: row.id, orderId: row.order_id, itemType: row.item_type, itemData: row.item_data, quantity: row.quantity, price: row.price })),
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }) };
  }
};

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  // Extract id from query string or from path /api/customers/28/orders
  let id = parseInt(event.queryStringParameters?.id || "");
  if (isNaN(id)) {
    const match = event.path.match(/\/api\/customers\/(\d+)\/orders/);
    if (match) id = parseInt(match[1]);
  }
  if (isNaN(id)) return { statusCode: 400, body: JSON.stringify({ message: "Invalid customer ID" }) };

  try {
    const { data, error } = await supabase.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    const orders = data.map((row) => ({ id: row.id, customerId: row.customer_id, orderDate: row.order_date, totalAmount: row.total_amount, createdAt: row.created_at }));
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true, orders }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }) };
  }
};

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

export const handler: Handler = async (event) => {
  let id = parseInt(event.queryStringParameters?.id || "");
  if (isNaN(id)) {
    const match = event.path.match(/\/api\/customers\/(\d+)/);
    if (match) id = parseInt(match[1]);
  }
  if (isNaN(id)) return { statusCode: 400, body: JSON.stringify({ message: "Invalid customer ID" }) };

  if (event.httpMethod === "PUT") {
    try {
      const { name, phone } = JSON.parse(event.body || "{}");
      if (!name || !phone) return { statusCode: 400, body: JSON.stringify({ message: "Name and phone required" }) };
      const { error } = await supabase.from("customers").update({ name, phone }).eq("id", id);
      if (error) throw error;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }) };
    }
  }

  if (event.httpMethod === "DELETE") {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Internal server error" }) };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};

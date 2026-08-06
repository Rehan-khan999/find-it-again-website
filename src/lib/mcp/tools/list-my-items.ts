import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_items",
  title: "List my reports",
  description: "List the lost and found item reports created by the signed-in user.",
  inputSchema: {
    status: z.enum(["active", "resolved", "closed"]).optional().describe("Filter by report status."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum number of results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("items")
      .select("id,title,category,item_type,status,location,date_lost_found,created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { items: data ?? [], count: data?.length ?? 0 },
    };
  },
});

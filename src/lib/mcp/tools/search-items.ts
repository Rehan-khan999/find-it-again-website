import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_items",
  title: "Search lost & found items",
  description: "Search active lost or found item reports by keyword, category, location, or type.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Keyword to match in title or description."),
    item_type: z.enum(["lost", "found"]).optional().describe("Restrict to lost or found reports."),
    category: z.string().trim().min(1).optional().describe("Item category, e.g. Electronics."),
    location: z.string().trim().min(1).optional().describe("Partial location text to match."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum number of results."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, item_type, category, location, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("items")
      .select("id,title,description,category,item_type,status,location,date_lost_found,reward,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);

    if (item_type) q = q.eq("item_type", item_type);
    if (category) q = q.ilike("category", `%${category}%`);
    if (location) q = q.ilike("location", `%${location}%`);
    if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { items: data ?? [], count: data?.length ?? 0 },
    };
  },
});

import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "report_item",
  title: "Report a lost or found item",
  description: "Create a new lost or found item report for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Short title of the item."),
    description: z.string().trim().min(1).describe("Detailed description of the item."),
    category: z.string().trim().min(1).describe("Item category, e.g. Electronics."),
    item_type: z.enum(["lost", "found"]).describe("Whether the item was lost or found."),
    location: z.string().trim().min(1).describe("Where the item was lost or found."),
    date_lost_found: z.string().trim().min(1).describe("Date it was lost or found (YYYY-MM-DD)."),
    contact_name: z.string().trim().min(1).describe("Contact name for this report."),
    contact_email: z.string().email().describe("Contact email for this report."),
    contact_phone: z.string().trim().min(1).describe("Contact phone for this report."),
    reward: z.string().trim().min(1).optional().describe("Optional reward offered."),
    additional_info: z.string().trim().min(1).optional().describe("Any extra details."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("items")
      .insert({ ...input, user_id: ctx.getUserId(), status: "active" })
      .select()
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text", text: `Created report ${data?.id}: ${data?.title}` }],
      structuredContent: { item: data },
    };
  },
});

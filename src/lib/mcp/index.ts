import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchItemsTool from "./tools/search-items";
import getItemTool from "./tools/get-item";
import listMyItemsTool from "./tools/list-my-items";
import reportItemTool from "./tools/report-item";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lost-and-find",
  title: "lost-and-find",
  version: "0.1.0",
  instructions:
    "Tools for the FindIt lost & found app. Search active lost/found reports, read a report's full details, list the signed-in user's own reports, and file a new lost or found report on their behalf.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchItemsTool, getItemTool, listMyItemsTool, reportItemTool],
});

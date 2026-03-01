import { createClient } from "@supabase/supabase-js";
import { fetchMetadata } from "./metadata-extractor.ts";

const DELAY_MS = 100;

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  console.log(`[request] ${req.method} ${req.url}`);

  // Only allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse query params
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const linkIdParam = url.searchParams.get("link_id");

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  console.log("[params] limit=%d, link_id=%s", limit, linkIdParam ?? "none");

  // Init Supabase client with secret key (bypasses RLS)
  // SUPABASE_URL is auto-injected by the runtime.
  // SB_PUBLISHABLE_KEY (sb_secret_*) replaces the legacy service_role JWT key.
  // Not yet auto-injected — must be set via .env.local (local) or supabase secrets set (hosted).
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SB_PUBLISHABLE_KEY");

  console.log("[env] SUPABASE_URL present:", !!supabaseUrl);
  console.log("[env] SB_PUBLISHABLE_KEY present:", !!secretKey);

  if (!supabaseUrl || !secretKey) {
    return new Response(
      JSON.stringify({
        error: "SUPABASE_URL or SB_PUBLISHABLE_KEY not configured",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, secretKey);

  // Build query for links with missing titles
  let query = supabase
    .from("links")
    .select("*")
    .order("created_at", { ascending: false });

  if (linkIdParam) {
    const linkId = parseInt(linkIdParam, 10);
    query = query.eq("id", linkId);
  } else {
    // PostgREST: "title.is.null" matches NULL, "title.eq." (no value) matches empty string
    // Whitespace-only titles are caught by the isBlank() filter after the query
    query = query.or("title.is.null,title.eq.");
    query = query.limit(limit);
  }

  const { data: links, error: queryError } = await query;

  if (queryError) {
    console.log("[db] query error:", queryError.message);
    return new Response(
      JSON.stringify({
        error: "Failed to query links",
        details: queryError.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Filter in code as well to catch whitespace-only titles
  const linksToProcess = (links ?? []).filter(
    (link: { title?: string | null }) => isBlank(link.title),
  );

  console.log(
    "[db] found %d links from query, %d after blank filter",
    links?.length ?? 0,
    linksToProcess.length,
  );

  if (linksToProcess.length === 0) {
    return new Response(
      JSON.stringify({
        processed: 0,
        updated: 0,
        errors: [],
        message: "All links have set values",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const errors: { id: number; url: string; error: string }[] = [];
  const details: {
    id: number;
    url: string;
    title: string | null;
    summary: string | null;
  }[] = [];
  let updated = 0;

  for (const link of linksToProcess) {
    console.log("[fetch] processing link #%d: %s", link.id, link.url);
    try {
      const metadata = await fetchMetadata(link.url);
      console.log(
        "[fetch] link #%d metadata: title=%s, desc=%s",
        link.id,
        metadata.title ? metadata.title.slice(0, 60) : "null",
        metadata.description ? metadata.description.slice(0, 60) : "null",
      );

      // Build update payload — only set fields that are currently blank
      const updatePayload: Record<string, string> = {};

      if (metadata.title) {
        updatePayload.title = metadata.title;
      }

      // Only update summary if the existing value is also NULL/empty
      if (metadata.description && isBlank(link.summary)) {
        updatePayload.summary = metadata.description;
      }

      if (Object.keys(updatePayload).length > 0) {
        updatePayload.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("links")
          .update(updatePayload)
          .eq("id", link.id);

        if (updateError) {
          console.log(
            "[db] update error for link #%d: %s",
            link.id,
            updateError.message,
          );
          errors.push({
            id: link.id,
            url: link.url,
            error: updateError.message,
          });
        } else {
          console.log("[db] updated link #%d", link.id);
          updated++;
          details.push({
            id: link.id,
            url: link.url,
            title: updatePayload.title ?? null,
            summary: updatePayload.summary ?? null,
          });
        }
      } else {
        console.log("[fetch] link #%d: no metadata to update", link.id);
        details.push({
          id: link.id,
          url: link.url,
          title: null,
          summary: null,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("[fetch] error for link #%d: %s", link.id, message);
      errors.push({ id: link.id, url: link.url, error: message });
    }

    // Rate limiting delay between fetches
    if (linksToProcess.indexOf(link) < linksToProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(
    "[done] processed=%d, updated=%d, errors=%d",
    linksToProcess.length,
    updated,
    errors.length,
  );

  return new Response(
    JSON.stringify({
      processed: linksToProcess.length,
      updated,
      errors,
      details,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

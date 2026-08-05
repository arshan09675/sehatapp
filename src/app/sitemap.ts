import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import type { Database } from "@/lib/supabase/database.types";

/** Rebuilt daily, so a newly verified doctor gets indexed without a redeploy. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/doctors`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/signup`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.1 },
  ];

  // A bare anon client rather than the cookie-bound one from
  // @/lib/supabase/server: that reads cookies(), which would force this route
  // to re-render per request. The doctors_public_read policy already limits
  // anonymous reads to verified doctors — the filter below is belt and braces.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase
    .from("doctors")
    .select("id, updated_at")
    .eq("is_verified", true);

  // On a failed query this falls back to the static entries rather than
  // failing the build.
  const doctorEntries: MetadataRoute.Sitemap = (data ?? []).map((doctor) => ({
    url: `${SITE_URL}/doctors/${doctor.id}`,
    lastModified: new Date(doctor.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...doctorEntries];
}

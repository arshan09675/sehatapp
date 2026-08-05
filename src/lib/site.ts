/**
 * Canonical origin, used for metadataBase, robots.txt and the sitemap.
 *
 * Next needs an absolute URL to resolve the relative ones in metadata, and it
 * errors at build time without one — hence the fallback rather than a throw.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sehatbook.pk";

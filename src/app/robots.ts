import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The signed-in areas, mirroring the prefixes in src/lib/auth/routes.ts.
      //
      // "/doctor/" keeps its trailing slash deliberately: a bare "/doctor"
      // is a prefix match and would also hide the public "/doctors" pages.
      // "/doctor$" end-anchors the dashboard index for the crawlers that
      // support it; the rest read it as a literal path that matches nothing,
      // which costs nothing since the proxy sends anonymous visitors to
      // /login anyway.
      disallow: [
        "/admin",
        "/dashboard",
        "/doctor/",
        "/doctor$",
        "/complete-profile",
        "/api/",
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

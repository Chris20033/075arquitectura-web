import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/public/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/auth/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}

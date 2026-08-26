import type { MetadataRoute } from "next";
import { isProduction } from "@/lib/environment";

/**
 * Test deployments disallow everything. They serve the same pages as
 * Production, so letting them be crawled would both leak the test site and
 * split ranking with duplicate content.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind a login is useful to a crawler.
        disallow: ["/api/", "/admin", "/profile", "/schedule", "/studio", "/teach", "/payouts"],
      },
    ],
  };
}

import type { MetadataRoute } from "next";
import {
  getCollections,
  getRegions,
  getRestaurants,
} from "@/lib/api/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, priority: 1.0 },
    { url: `${siteUrl}/regions`, lastModified: now, priority: 0.9 },
    { url: `${siteUrl}/restaurants`, lastModified: now, priority: 0.9 },
    { url: `${siteUrl}/collections`, lastModified: now, priority: 0.8 },
    { url: `${siteUrl}/map`, lastModified: now, priority: 0.8 },
    { url: `${siteUrl}/concierge`, lastModified: now, priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: now, priority: 0.5 },
    { url: `${siteUrl}/feedback`, lastModified: now, priority: 0.4 },
  ];

  try {
    const [regions, collections, restaurants] = await Promise.all([
      getRegions(),
      getCollections(),
      getRestaurants({ page_size: 50 }),
    ]);

    const dynamicRoutes: MetadataRoute.Sitemap = [
      ...regions.map((r) => ({
        url: `${siteUrl}/regions/${r.slug}`,
        lastModified: now,
        priority: 0.85,
      })),
      ...collections.map((c) => ({
        url: `${siteUrl}/collections/${c.slug}`,
        lastModified: now,
        priority: 0.75,
      })),
      ...restaurants.items.map((r) => ({
        url: `${siteUrl}/restaurants/${r.slug}`,
        lastModified: now,
        priority: 0.8,
      })),
    ];

    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}


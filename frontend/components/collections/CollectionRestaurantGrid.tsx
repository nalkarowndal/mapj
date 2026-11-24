"use client";
import React from "react";
import { RestaurantSummary } from "@/lib/types/gourmet";
import { RestaurantCard } from "../restaurants/RestaurantCard";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

interface CollectionRestaurantGridProps {
  restaurants: RestaurantSummary[];
}

export const CollectionRestaurantGrid: React.FC<CollectionRestaurantGridProps> = ({
  restaurants,
}) => {
  const { isSaved, toggle, hydrated } = useBookmarks();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {restaurants.map((r) => (
        <RestaurantCard
          key={r.id}
          restaurant={{
            id: r.id,
            slug: r.slug,
            name: r.name,
            regionName: r.region_name,
            neighborhood: r.neighborhood,
            category: r.primary_category,
            oneLineIntro: r.one_line_intro,
            priceRange: r.price_range_label,
            imageUrl: r.primary_image?.url || null,
            images: r.images,
            highlights: r.highlights,
          }}
          isSaved={hydrated ? isSaved(r.id) : false}
          onToggleSave={toggle}
        />
      ))}
    </div>
  );
};


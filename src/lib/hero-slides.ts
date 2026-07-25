import { query } from "@/lib/db";

export interface HeroSlide {
  id: number;
  image: string;
  alt: string;
}

const fallbackSlides: HeroSlide[] = [
  { id: -1, image: "/images/hero-images/hero1.webp", alt: "Beyos Clothing collection" },
  { id: -2, image: "/images/hero-images/hero2.webp", alt: "Beyos Clothing fashion" },
  { id: -3, image: "/images/hero-images/hero3.webp", alt: "Beyos Clothing style" },
];

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const rows = await query<{
      id: number;
      alt_text: string | null;
      image_version: number;
    }>(
      `SELECT id, alt_text, UNIX_TIMESTAMP(updated_at) AS image_version
       FROM hero_slides
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );
    if (!rows.length) return fallbackSlides;
    return rows.map((row) => ({
      id: row.id,
      image: `/api/hero-slides/${row.id}/image?v=${row.image_version || 0}`,
      alt: row.alt_text || "Beyos Clothing collection",
    }));
  } catch {
    return fallbackSlides;
  }
}

# SOLEVERSE catalogue relevance audit

This audit covers the local 42-product sample catalogue, its configured images,
the customer-facing category filters, and the active products visible through the
existing public Supabase catalogue query. Product rows, variants, inventory, and
order history have not been deleted or changed by this code work. The follow-up
database migration is pending and must be applied by the project owner.

## Catalogue flow and category rules

The connected storefront loads active records from `public.products`, including
their variants and any admin-managed `product_images` gallery. When Supabase is
not configured, it uses a curated subset of the local sample data. The Shop page
filters canonical categories exactly; `?category=cricket`, `football`, or
`basketball` resolves to canonical `sports` plus that exact sport filter. Search
continues to include product name, ID, and slug.

Category values in the database are canonical (`sports` for specialist sports
shoes); cricket, football, and basketball are stored in the separate `sport`
field. No customer-side stock or required-image filter should silently turn an
unverified specialist listing into a different product. Existing product gallery
images take precedence over sample image corrections.

## Findings and actions

| Category / products | Finding | Safe action |
|---|---|---|
| Cricket `sv-039`–`sv-042` | Images show general trainers/runners, not identifiable cricket shoes or spikes. The `Powerplay Stud` image does not verify the name's implied studs. | Hide the four sample listings from customer results until a matching product and image can be verified. |
| Skate `sv-022`–`sv-025` | All four reused the same canvas low-top image. It does not verify the suede or mid-top descriptions, nor prove four distinct products. | Hide the four listings pending review; retain `sv-021`, whose image and skate-style description are consistent. |
| Formal `sv-031`–`sv-034` | Four different views of one formal-shoe model were presented as four distinct product listings. | Hide all four pending proof of distinct products. Do not remove their records or order references. |
| Sports / basketball `sv-013`–`sv-015` | Sample metadata and images did not reliably establish the distinct product identities/styles. | Hide these three sample listings pending review. Keep other basketball entries whose footwear type is evident. |
| Trail `sv-030` | Reuses the Altra trail-runner image already used by another listing, so its distinct product identity is not established. | Hide pending review. The other trail images show relevant outdoor/trail footwear. |
| Casual `sv-018` | The canvas/court-style photo does not verify the suede product description. | Hide pending review. |
| `sv-003` and `sv-019` | Their earlier local image assignments were less category-appropriate than available alternatives. | Use `/products/skate-low-top.jpg` for the basketball high-top and `/products/retro-court-sneaker.jpg` for the casual low-top, guarded by matching known IDs/paths and absent admin galleries. |
| Generated sample brands | Brand labels were assigned independently from photo evidence. | Clear only unchanged, known seed brand values; leave admin-corrected values intact. |
| `sv-038` | This record was not returned by the active public catalogue query. | Keep it excluded from the local public sample fallback; the review migration does not change its database status. |

The review migration targets 17 records for conditional deactivation:
`sv-013`, `sv-014`, `sv-015`, `sv-018`, `sv-022`–`sv-025`, `sv-030`,
`sv-031`–`sv-034`, and `sv-039`–`sv-042`. It only acts when each record still
matches the known seed ID, slug, category/style/sport and image, and has no
admin-managed gallery. It does not delete products, variants, images, inventory,
or historical orders. Replace and verify the product details/images in Admin
before republishing.

## Resulting sample catalogue

The 24 customer-facing local samples are:

| Category | Visible sample count |
|---|---:|
| Lifestyle | 5 |
| Running | 5 |
| Sports | 5 (2 basketball, 3 football) |
| Casual | 4 |
| Skate | 1 |
| Trail | 4 |
| Formal | 0 |
| **Total** | **24** |

The source `products` list remains available for seed and administrative
workflows; only the customer-facing fallback excludes entries marked for review.
Sample galleries now contain one real source image rather than repeated crops
presented as different views. Add actual alternate product views through the
existing admin gallery.

The earlier guarded image correction migration,
`20261024000300_correct_catalogue_product_images.sql`, is already reflected in
the live catalogue observed during this audit. The new follow-up migration is
`supabase/migrations/20261026000300_review_unverified_catalogue_products.sql`;
apply it after `20261026000200_product_image_gallery.sql` to apply the safe
database-side review actions. No RLS policy or permission changes are required.

`Match` in the original source-photo review referred to category/type fit, not
proof that a photo is the exact colorway or SKU represented by sample metadata.
Photo source credits and licensing references are listed in
[public/products/SOURCES.txt](./public/products/SOURCES.txt).

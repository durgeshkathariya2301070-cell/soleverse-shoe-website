# SOLEVERSE — Phases 1 to 7

A premium sneaker shopping website concept built with React, Vite, Tailwind CSS v4, React Router and Lucide icons,
with an interactive 3D sneaker viewer (Three.js through React Three Fiber and Drei) and customer accounts (Supabase).

- **Phase 1:** project setup
- **Phase 2:** design system, homepage, Our Story, Collections
- **Phase 3:** working catalogue (search, category filter, price sorting) and product detail pages
  (image gallery, colour and size selection, size guide, sample availability)
- **Phase 4:** 3D viewer on product pages (rotate, zoom, reset, colour preview), with photo fallbacks
- **Phase 5:** accounts with Supabase: sign up, log in, protected account page, profile name, log out
- **Phase 6:** shopping bag (saved in the browser and, when logged in, in your account), checkout for logged-in customers,
  Cash on Delivery or a clearly labelled **demo-only** UPI QR/card simulation, orders saved in Supabase, order confirmation
- **Phase 7:** RLS-protected administrator dashboard, catalogue and inventory management, order fulfilment and live overview

All products, prices and stock numbers are **sample data**. **No real payment is ever taken** and no real shoes are shipped. The newsletter is not built yet. Accounts only store a name, an email and a password (the password is kept by Supabase, never by this site).

> **No 3D model file is included.** Add your own licensed `.glb` file first: see `public/models/README.md`.
> Until then, product pages show their photo gallery and say that 3D is not available.

## Run it

```bash
npm ci
npm run dev      # then open the URL it prints (usually http://localhost:5173)
npm run build    # production build into /dist
npm run preview  # serve the production build locally
npm test         # unit and static SQL security checks (Node's built-in test runner)
```

`@react-three/fiber` version 9 and `@react-three/drei` version 10 are the versions for React 19, which `npm install react`
gives you today. (If you ever use React 18, install `@react-three/fiber@8` and `@react-three/drei@9` instead.)

## Phase 5: accounts with Supabase (set-up steps)

The website works **without** Supabase: the shop, product pages and 3D viewer do not need it. Only the account pages do.
Until you finish the steps below, Log in / Create account show a notice ("Accounts are not connected yet") and their buttons stay disabled.

**1. Make a free Supabase project.** Go to https://supabase.com, sign in, click *New project*, pick a name, a database password (keep it safe) and a region.

**2. Create the profiles table.** In your project open **SQL Editor -> New query**, paste the whole of
`supabase/migrations/20261011000000_create_profiles.sql`, and click **Run**. It is safe to run twice. It creates:
- the `profiles` table (`id` linked to the login, `full_name`, `created_at`, `updated_at`),
- security rules (Row Level Security) so a logged-in person can read and change **only their own row**, and logged-out visitors get nothing,
- a trigger that fills in `updated_at` when a row is edited,
- a trigger that makes a profile row automatically when someone signs up (it copies the full name, never overwrites, never duplicates).

**3. Copy your two public values.** Open **Project Settings -> API** (it may be called "API Keys"). Copy:
- the **Project URL** (looks like `https://abcdefgh.supabase.co`)
- the **anon public** key (newer projects call it the **publishable** key)

Do **not** use the `service_role` / `secret` key. The site refuses to start accounts if it looks like one.

**4. Make your `.env` file.** Copy `.env.example` to a new file named `.env` (same folder as `package.json`) and fill in the two values:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`.env` is already ignored by Git, so it will not be uploaded. Stop `npm run dev` (Ctrl+C) and start it again, because it only reads `.env` when it starts.

**5. Tell Supabase about your site address.** Open **Authentication -> URL Configuration**. Set **Site URL** to `http://localhost:5173`
and add `http://localhost:5173/**` under **Redirect URLs**. (When you publish the site, add your real address too.)
This is what lets the link in the confirmation email bring people back to your site.

**6. Choose how email confirmation works.** **Authentication -> Providers -> Email** has a **Confirm email** switch.
- **On** (the default): after sign-up a person must click the link in an email before they can log in. The site shows a "Check your inbox" screen.
  Supabase's built-in email sender is limited to a few emails per hour, which is fine for testing but not for a real shop.
- **Off**: sign-up logs the person in straight away. Handy while you are testing.

### Testing accounts yourself (needs your Supabase project)

1. `npm run dev`, open http://localhost:5173/account. You should land on the **Log in** page with "Please log in to see your account." (logged-out visitors are protected).
2. Click **Create an account**. Try pressing the button with empty fields: each problem is explained and nothing is sent.
3. Fill in name, email, a password of 8+ characters (twice) and submit.
   - Confirmation **On**: you see "Check your inbox". Click the link in the email, then log in.
   - Confirmation **Off**: you arrive on **My account** straight away.
4. **Check the database:** Supabase **Table Editor -> profiles** should show one row with your name. **Authentication -> Users** shows your email (never your password).
5. **Refresh** the account page (F5). You must still be logged in.
6. Change your name, press **Save changes**: "Profile saved." appears. Refresh: the new name is still there. The Table Editor row's `updated_at` has changed.
7. Press **Log out**. You go to the homepage and the navbar says **Log in** again. Open /account: you are sent to the log-in page.
8. Log in with a wrong password: you see "That email and password don't match." Sign up again with the same email: "An account with this email already exists."
9. On a phone-sized window, open the menu: it shows Log in / Create account, or your email, My account and Log out.

If something goes wrong on the account page, the message names the likely cause (for example the SQL step was skipped).

### What has and has not been tested

- **Tested in this project (no Supabase needed):** the form checks, the friendly error messages, the safe-redirect rule and the `.env` checks run as unit tests (`npm test`).
  The pages were also run in a real browser against a **pretend** Supabase that copies the shapes the real library returns:
  sign-up, log-in, protected route, session restore after refresh, name update, log-out, duplicate accounts, offline errors, missing table, mobile layout.
- **NOT tested:** the real Supabase service, the SQL file, the Row Level Security rules and real confirmation emails. These can only be checked with
  your own project, using the steps above. Treat them as unverified until you have done that.

## Phase 6: bag, checkout and orders (set-up steps)

### 1. Fix your `.env` (important)
`VITE_SUPABASE_URL` must be the **project address only**, for example `https://abcdefgh.supabase.co`.
If you copied an address ending in `/rest/v1/`, the site now trims it for you, but please tidy your `.env` anyway.
After editing `.env`, stop the dev server (Ctrl+C) and run `npm run dev` again. Never put a `service_role` / secret key in the project.

### 2. Run the SQL (Supabase dashboard -> SQL Editor -> New query)
Run each file **in this order**: paste the whole file, press **Run**. Every file is safe to run again.

| Order | File | What it does |
| --- | --- | --- |
| 0 | `supabase/migrations/20261011000000_create_profiles.sql` | Phase 5 profiles. Skip if you already ran it |
| 1 | `supabase/migrations/20261013000000_create_catalogue.sql` | Creates the `products` and `product_variants` tables (prices and stock the server trusts) and fills them with the sample shoes |
| 2 | `supabase/migrations/20261013000100_create_cart_items.sql` | Saved bag per customer, with Row Level Security |
| 3 | `supabase/migrations/20261013000200_create_orders.sql` | `orders` and `order_items`, plus the functions `quote_order` and `place_order` |
| 4 | `supabase/migrations/20261019000000_phase7_admin.sql` | Admin allow-list, RLS policies, catalogue fields and protected dashboard/order RPCs |
| 5 | `supabase/migrations/20261022000000_admin_user_management.sql` | Admin-only search, list, grant and revoke functions |
| 6 | `supabase/migrations/20261023000000_profile_phone.sql` | Optional customer profile phone number |

How orders stay safe, in plain words:
- COD orders use the existing `place_order` flow. Demo online checkout first creates an owner-scoped, three-minute database session
  containing the selected items and delivery details; the database calculates the amount and expiry.
- A simulated success finishes that session through a security-definer RPC, which revalidates the stored items, prices, stock,
  expiry and owner before invoking `place_order`. Order items, stock changes and session completion commit atomically.
- Online orders use the existing valid `simulated_online` / `simulated` schema values and are presented as **Demo Paid**, never as a bank-confirmed payment.
- UPI displays a generated QR containing a clearly marked mock payload, not a UPI payment request. Scanning it cannot transfer money.
- Card simulation accepts only the documented test inputs `4242 4242 4242 4242` (success) and `4000 0000 0000 0002` (failure).
  Cardholder text, number, expiry and CVV stay in browser memory and are cleared before the result callback; none is sent to Supabase.
- The browser sends **what was chosen** (shoe, colour, size, quantity) and the address. It never sends a price.
- `place_order` looks up prices and stock in the database, adds the flat Rs 99 delivery, saves the order and reduces stock in **one
  all-or-nothing step**, and returns an order reference such as `SV-1A2B3C4D`.
- Customers can only **read** their own orders. Nobody can insert or edit an order directly from the website.
- Each checkout attempt has a one-time key, so double-clicking Place order, refreshing or retrying after a bad connection never creates two orders.
- A reference by itself is not proof of a saved order: the confirmation page shows success only after it reads the customer's order back from Supabase.
- If checkout reports a missing database function or table, apply Phase 6 SQL files 1, 2, and 3 below in order. The app does not apply database migrations automatically.
- The order-details query also reads `orders.delivered_at`, which is added by `supabase/migrations/20261026000400_customer_delivery_confirmation.sql`. Apply the full migration list near the end of this README, including Phase 7 first, to enable the planned delivery-confirmation feature and order details.
- Prices and stock are kept in the database. To change them later, edit the `products` / `product_variants` tables in Supabase.
  If you change `src/data/products.js`, run `npm run generate-seed` to refresh the seed block in the catalogue SQL.

### 3. Test checkout yourself (needs your Supabase project)
1. `npm run dev`, open the address shown. Open **Aero Runner 01**, choose a size (for example UK 8), press **Add to bag**. The bag icon shows 1.
2. Refresh the page: the bag is still there. Open `/cart`: change the quantity, check Subtotal + Rs 99 delivery = Total.
3. Press **Log in to check out**, log in (or sign up first). You return to checkout and the bag is kept.
4. In Supabase -> Table Editor -> `cart_items` you should see one row for your user (this proves the bag is saved to your account).
5. Fill in the delivery details. Try a wrong PIN (for example `012345`) to see the checks. Leave **Landmark** empty (it is optional).
6. Choose **Cash on Delivery** and press **Place order**. Press it twice quickly: you still get **one** order.
7. You land on the confirmation page with a reference. In Table Editor: `orders` has one row, `order_items` has your lines, and the
   stock for that shoe in `product_variants` went down. `cart_items` for you is empty.
8. For **UPI QR (Demo)** or **Credit/Debit Card (Demo)**, confirm the persistent “DEMO PAYMENT — No real money will be charged” notice.
   The QR is mock-only and expires after three minutes. To simulate a card result use only the test numbers above; no real card credentials.
   A successful simulation creates one order with payment status `simulated`; a failed simulation creates no order and changes no stock.
9. Log in on another browser: your bag follows you. Log out: the bag disappears from this browser.
10. Optional price-safety test: in Table Editor change a price in `products`, then open checkout: the page shows the new database price.
11. Open `/account` and choose **View my orders**. Your orders appear newest first at `/orders`; open **Track order** to see the saved items, delivery details, total, payment status, and current fulfilment status. Use **Refresh status** to load an admin's latest status update.

Order history and tracking reuse the Phase 6 `orders` / `order_items` tables and their owner-scoped Row Level Security policies. No additional migration is required. The Phase 6 orders migration (`20261013000200_create_orders.sql`) and Phase 7 status migration (`20261019000000_phase7_admin.sql`) must already be applied in Supabase. The database stores the current status, not a status-event history; cancelled orders therefore show a cancellation notice and do not infer completed delivery milestones. Courier GPS tracking and delivery estimates are not available.

### Testing notes (Phases 5–7)
- The existing Phase 6 project notes record earlier unit, throwaway PostgreSQL and fake-browser checks. Those checks do not
  substitute for testing the real Supabase project.
- Current automated tests run with `npm test`; they include client-side validation and static migration checks. `npm run build`
  verifies the Vite frontend only.
- The throwaway SQL harness is `supabase/local-test/run.sh`. It applies every migration twice and checks RLS, pricing, inventory,
  idempotency, constraints, concurrency, Phase 7 authorization/status, admin user-management, and customer delivery-confirmation
  ownership, Yes/No, duplicate-response, report, and retry behavior. It requires local PostgreSQL and Bash.
  **Never point it at your real Supabase project.**
- A successful frontend build does not prove that your new migration was applied or that live RLS policies and admin RPCs work.
  Apply the migrations and provision a test admin in a separate Supabase project before accepting real admin operations.

## Checking and adding assets (images and the 3D model)

```bash
npm run check-assets                    # checks every image address and the 3D model file (needs internet)
npm run fetch-model                     # shows the candidate 3D model and its licence; downloads nothing
npm run fetch-model -- --accept-license # downloads it AFTER you have read and accepted the licence
```

- `check-assets` reports each image as OK, BROKEN (the server answered but the image is wrong) or UNCHECKED
  (no connection, so nothing was verified), and tells you if the `.glb` is missing. It exits with an error unless everything is confirmed.
- `fetch-model` reads `scripts/model-source.json`. The model listed there is only a **candidate**: its licence is marked
  **NOT VERIFIED**. Read the licence on its page, make sure it allows use on a shop website, then accept it yourself.
  The script saves nothing unless the download is a genuine `.glb`, then lists the model's material names and suggests
  the `customizableMaterials` settings for `products.js`. To use a different model, edit `scripts/model-source.json`.

**About the sample photos:** the product, category and homepage images are stock photos from Unsplash (Unsplash licence:
free to use, including commercially, without asking). Two cautions: that licence does **not** cover trademarks, and a stock
photo may show another company's sneaker. Because SOLEVERSE products are described as the shop's own, replace these
placeholders with your own product photography (or check each photo) before a real launch. Each image already has a loading
state and a drawn fallback, so a broken address never breaks the page.

## Pages

| URL | Page |
| --- | --- |
| `/` | Homepage |
| `/shop` | Catalogue. URL options: `?q=aero&category=running&sort=price-asc` |
| `/product/aero-runner-01` | Product page (one page for every product slug). Shows 3D when the product has a model |
| `/collections` | Collections preview |
| `/about` | Our Story |
| `/login` | Log in (needs Supabase set up) |
| `/signup` | Create account (needs Supabase set up) |
| `/cart` | Your bag: quantities, remove, totals. Works logged out too |
| `/checkout` | Delivery details and payment choice. **Log in required** |
| `/order-confirmation/SV-XXXXXXXX` | Your saved order and its reference. Log in required |
| `/orders` | Your own saved orders, newest first. Log in required |
| `/orders/SV-XXXXXXXX` | Your saved order details and current status timeline. Log in required |
| `/account` | Your account: name, email, join date, edit name, log out. Logged-out visitors are sent to `/login` |
| `/admin` | Administrator-only live dashboard |
| `/admin/products` | Create, edit, publish, and unpublish products |
| `/admin/inventory` | Manage stock, sizes, and colours |
| `/admin/orders` | Review and fulfil orders (authorized admins only) |

## Folder guide

- `src/data/` — `products.js` (sample catalogue, stock and 3D fields), `categories.js`, `sizeGuide.js`, `customColors.js`, `siteImages.js`, `navigation.js`
- `src/lib/` — `supabaseClient.js` (the one Supabase connection) and `supabaseConfig.js` (checks the `.env` values)
- `src/context/AuthContext.jsx` — remembers who is logged in; gives every page `useAuth()`
- `src/services/profileService.js` — the only file that reads or writes the `profiles` table
- `src/services/adminService.js` and `src/services/catalogueService.js` — existing client-backed admin operations and live catalogue
- `src/pages/admin/` and `src/components/admin/` — protected Phase 7 dashboard and navigation
- `src/pages/` Login, Signup, Account; `src/components/ProtectedRoute.jsx` and `src/components/auth/` (form pieces)
- `supabase/migrations/` — the SQL to run once in your Supabase project
- `src/utils/` — `authValidation.js` and `authErrors.js` (form checks and friendly messages), `catalogue.js` (search / filter / sort), `modelMaterials.js` (reading and recolouring model materials), `webgl.js`, `formatPrice.js`, `images.js`, `cn.js` and the `*.test.js` files
- `src/hooks/` — `usePageTitle.js`, `useModelAvailability.js` (checks the model file exists before loading 3D code)
- `src/components/` — reusable pieces (Navbar, Footer, Button, ProductCard, CategoryCard, SmartImage, Breadcrumbs...)
- `src/components/Shoe3DViewer.jsx` — the reusable viewer (loading state, error state, buttons). Knows nothing about specific products
- `src/components/Shoe3DScene.jsx` — the Three.js scene; loaded on demand so 3D code only downloads when needed
- `src/components/product/` — ProductMedia (photos vs 3D), ProductGallery, ColorSelector, SizeSelector, SizeGuideDialog, CustomizePanel
- `src/components/home/` — homepage sections, one file each
- `src/pages/` — one file per route
- `public/models/` — put your `.glb` model here (see its README)

## How 3D works here

1. A product opts in with three optional fields in `src/data/products.js`: `supports3D`, `modelPath`, `customizableMaterials`
   (and optionally `modelRotation`). Products without them just show photos plus a short note.
2. `ProductMedia` checks, in this order: the product declares a model, the browser supports WebGL, and the model file really exists.
   Only then does a **Photos / 3D view** switch appear. Otherwise the gallery stays and a note explains why.
3. The viewer is loaded lazily. If anything fails (broken file, lost graphics context, missing library) the viewer shows
   "3D view unavailable" with a button back to the photos, and the rest of the page keeps working.
4. The colour customiser lists **only** the parts whose material name exists in the loaded model. Colours are a visual preview:
   they never change the product, price or an order.
5. Rotation: drag with mouse or one finger. Zoom: scroll, pinch, or the +/- buttons. The on-screen buttons also work from the keyboard.
   The scene only redraws when something changes, so an idle viewer uses almost no power.

## How a product is described (src/data/products.js)

Each product has: `id`, `slug`, `name`, `category`, `price`, `originalPrice` (or `null`), `badge`, `featured`,
`shortDescription`, `description`, `images`, `availableSizes`, `availableColors` and `stockByVariant`.
`stockByVariant` is `{ colourId: { size: units } }`; a size that is missing counts as sold out.

## Phase 7: admin setup and operation

### Database migration

In Supabase **SQL Editor**, run the existing migration files in this exact order (skip files already applied):

1. `supabase/migrations/20261011000000_create_profiles.sql`
2. `supabase/migrations/20261013000000_create_catalogue.sql`
3. `supabase/migrations/20261013000100_create_cart_items.sql`
4. `supabase/migrations/20261013000200_create_orders.sql`
5. `supabase/migrations/20261019000000_phase7_admin.sql`
6. `supabase/migrations/20261022000000_admin_user_management.sql` (admin user management)
7. `supabase/migrations/20261023000000_profile_phone.sql` (optional saved profile phone)
8. `supabase/migrations/20261024000000_profile_delivery_address.sql`
9. `supabase/migrations/20261024000100_expand_catalogue_to_30.sql`
10. `supabase/migrations/20261024000200_catalogue_brands_sports.sql`
11. `supabase/migrations/20261024000300_correct_catalogue_product_images.sql`
12. `supabase/migrations/20261026000100_grant_admin_catalogue_facets.sql`
13. `supabase/migrations/20261026000200_product_image_gallery.sql`
14. `supabase/migrations/20261026000300_review_unverified_catalogue_products.sql`
15. `supabase/migrations/20261026000400_customer_delivery_confirmation.sql`

The Phase 7 migration is additive: it extends the existing product tables, creates the admin allow-list,
and installs restrictive policies and admin-only RPCs. The admin user-management migration adds
separate admin-checked functions for the UI without exposing direct writes to the allow-list. These migrations
do not alter customer profiles, checkout pricing, or payment records. Running Phase 7 makes the new product details
available to the storefront while preserving existing 3D configuration for built-in demo products. New products use
the photo fallback unless a licensed model is configured in source.

The product gallery migration adds an ordered `product_images` table and a public
`product-images` Storage bucket for storefront photos. Gallery rows are readable only for
active products; uploads and object changes require the existing administrator authorization.
Uploaded product photos are public assets, so do not upload private images. The product
editor saves product fields, gallery order, and variants together through a checked RPC.
The current schema does not include SKU or compare-at price columns.

The catalogue review migration clears only generated sample-brand values that have not
been verified against their photos, corrects two known sample-image mismatches, and safely
unpublishes demo listings whose specialist type, material, or product identity cannot be
verified. It does not delete products, variants, galleries, inventory, or order history.
Review and replace those products in Admin → Products before publishing them again.

The delivery-confirmation migration adds persistent, owner-scoped in-site notifications
and response history. Admins move an order from Shipped to Out for Delivery; the customer
must answer “Yes” before the database changes the status to Delivered. A “No” response
keeps the order Out for Delivery, can include a problem report for admin review, and allows
an authorized admin to retry through Shipped and Out for Delivery. Admin status RPCs cannot
set Delivered or the legacy Completed status. Notifications appear in My Orders and are
refreshed when the site is opened, focused, or checked periodically; they do not send email,
SMS, or phone notifications.

### Demo payment migrations (manual Supabase SQL Editor steps)

Demo online checkout requires the existing Phase 6 order/catalogue migrations and Phase 7 admin migration, followed by the
customer-delivery migration above. Then apply these two new files **in order** (paste each complete file into Supabase SQL Editor
and press Run):

1. `supabase/migrations/20261027000100_demo_payment_methods.sql`
2. `supabase/migrations/20261027000200_demo_payment_sessions.sql`

They are additive and designed to be safe to run again. The first records which demo method was selected without changing
the existing payment constraints. The second adds owner-scoped session records, server-clock expiry, immutable checkout snapshots,
and authenticated RPCs for create/finish; it also blocks bypassing the validated session through direct online order RPC calls.
Neither SQL file is applied by the app or by this coding task. Review your Supabase project and run them manually; never use a
service-role key in the browser. COD continues to use the existing order flow.

### Admin dashboard analytics migration (manual Supabase SQL Editor step)

After the migrations above, apply `supabase/migrations/20261031000100_admin_dashboard_analytics.sql` in the Supabase SQL
Editor. It replaces only the existing `soleverse_admin_dashboard()` function. The function checks the existing administrator
allow-list, reads the existing orders, order items, products, variants, product images, and profiles, and returns aggregate
dashboard data. It does not change table grants, RLS policies, payment records, or existing rows. It is not applied
automatically by the website or by this task.

The dashboard uses an admin-authorized 30-second refresh with focus/visibility refreshes; this project has no configured
Supabase Realtime publication for the protected order tables. The low-stock display classifies a size/colour variant with
1–5 pairs remaining as low stock, zero as out of stock, and higher quantities as in stock.

The checkout delivery fee remains **₹99**, calculated by the existing database `delivery_fee_inr()` function.
Order placement still reads price from the database and locks/decrements stock transactionally. Cancelling an eligible
unshipped order restores its ordered quantities in the same transaction as the status change.

### Authorize the first administrator

1. Sign up using the normal SOLEVERSE signup flow for the account that should be the first administrator.
2. In Supabase Dashboard -> **Authentication -> Users**, copy that user's UUID (not their password or any key).
3. As the Supabase project owner/operator, open **SQL Editor -> New query** and run this after replacing the placeholder
   with that UUID:

   ```sql
   insert into public.soleverse_admins (user_id)
   values ('REPLACE-WITH-AUTH-USER-UUID'::uuid)
   on conflict (user_id) do nothing;
   ```

4. Sign in to SOLEVERSE with that account and open `/admin`.

Only the project owner/operator can provision an administrator using the Supabase SQL Editor. The admin allow-list has
RLS enabled and no grants for browser roles; customers cannot promote themselves through their profile, browser state,
or the website. Remove authorization by deleting the corresponding row from `public.soleverse_admins` as the project
owner. Keep all service-role/secret keys out of Vite and the browser.

### Manage administrators

After applying `20261022000000_admin_user_management.sql`, an authorized administrator can open
`/admin/users`, search existing accounts by email, grant admin access, and revoke access from another
administrator. The selected account keeps its existing Supabase login; do not create a duplicate account.
Every list/search/change operation is performed by a narrowly scoped database function that checks
`is_soleverse_admin()`. Browser roles receive no direct write access to `soleverse_admins`, and user
search returns only an account UUID and email to an authorized admin.

Grant and revoke actions require browser confirmation. An admin cannot revoke their own access, and
the last admin cannot be removed. Admin pages recheck authorization every 30 seconds and when a
previously backgrounded tab becomes visible. Database operations independently check authorization,
so a revoked admin's next protected request is denied even if a page was already open.

### Customer login and profile details

After login, authorized administrators go to `/admin`; ordinary customers go to the home page unless
they were sent to login from a protected destination, in which case that destination is reopened and
its route guard still applies. The account page at `/account` shows the user's name, email, membership
date, and optional phone number. To save the phone field, apply
`supabase/migrations/20261023000000_profile_phone.sql` after the existing migrations. The existing
profiles table RLS policies continue to limit profile reads and writes to the signed-in user's own row.

### Admin behavior and data definitions

- The admin route checks `is_soleverse_admin()` against Supabase for every fresh access; RLS and database functions
  independently check administrator authorization for protected operations.
- The shared header links to Admin Dashboard only after the current signed-in user is confirmed by that same
  administrator RPC. Inventory's Add Size and Colour product picker searches name, brand, product ID, and category,
  includes unpublished products, and uses the product's first gallery image or primary image when available.
- The overview reads real order and product tables. “Completed order value” is the sum of totals for orders marked
  completed. It is **not a payment-receipt figure**: COD remains due on delivery and simulated online payment never
  charges money. Payment fields and order totals are not editable in the admin website.
- Order statuses follow `placed -> processing -> shipped -> out_for_delivery -> customer-confirmed delivered`
  (`completed` is a legacy delivered value); cancellation is allowed before shipment. An Out for Delivery order
  can return to Shipped only after the customer reports non-receipt. Status changes are performed by a database
  function that checks the transition. Cancelling before shipment restores stock.
- Admin Orders can filter the existing statuses (Pending, Processing, Shipped/Out for Delivery, Delivered, Cancelled),
  search the latest 500 authorized order records, and paginate the matches. "Confirm Order" asks before moving a
  `placed` order to `processing`; the existing admin RPC locks and validates its current status. Confirmation never changes
  payment status. The database does not define a Returned status, so no Returned filter is shown.
- Product publishing toggles the existing `is_active` field. Published products load from the database into the shop;
  inactive products are hidden from public catalogue queries but remain visible to admins.
- The Products page is a searchable, category-filtered, paginated list with one thumbnail per product. Its shared
  create/edit form supports ordered gallery URLs and image uploads, product descriptions, and colour/UK-size variants.
  Uploaded images are public storefront assets; only admins can upload them. Existing variants cannot be deleted from
  the editor because cart/order references must remain intact; set stock to zero to make one unavailable.
- Inventory quantities are non-negative integers per database variant. Variants can be managed in the product editor
  or on the Inventory page. The checkout order function continues to lock stock rows, preventing overselling.
- Customer order rows remain private under the existing customer RLS policy. Only administrator order RPCs return fulfilment
  details, and they return those details only after checking the administrator allow-list.

### Run and verify in VS Code (PowerShell)

Open the project folder (the folder containing `package.json`) in VS Code, then run:

```powershell
npm ci
npm test
npm run build
npm run dev
```

Open the local URL printed by Vite. Sign in with the provisioned administrator and visit `/admin`, `/admin/products`,
`/admin/inventory`, and `/admin/orders`. A normal customer must see a restricted-access page at `/admin`; direct
database operations are also rejected by RLS/RPC authorization. To avoid replacing local credentials, only create `.env`
from `.env.example` if `.env` does not already exist. The ZIP distribution intentionally contains placeholders in
`.env.example` and excludes `.env`.

The automated Node tests include input validation and static security checks for the product-gallery migrations. A successful
`npm run build` only verifies the front-end build; it does not apply SQL or prove behavior against your Supabase project.
Real administrator, RLS, product, inventory and order workflows must be verified after applying the migration and
provisioning the administrator in your own project.

### Browser authentication session isolation

Supabase Auth uses its default browser storage with `persistSession: true`; SOLEVERSE does not copy tokens between
browsers or store passwords. Tabs in the same browser profile and site origin normally share that profile's session.
Chrome, a separate Edge profile, and Edge InPrivate use separate browser storage contexts. A browser autofilling the same
email and password can still independently log in to the same account; that is not a shared session.

Verify session isolation manually with two test customer accounts:

1. In Chrome Profile A, sign in as customer A and open `/account`.
2. Open another tab in the same Chrome profile and visit `/account`; seeing customer A there is expected.
3. In a separate Edge profile, sign in as customer B. Confirm `/account` shows customer B, not customer A.
4. Open an Edge InPrivate window and verify it starts signed out; sign in as a test account and verify its account.
5. Log out separately in Chrome Profile A, the Edge profile, and InPrivate. Confirm each context is signed out there;
   the other profiles should retain their own sessions.
6. While signed in as customer A, try customer B's known profile ID, cart row, order ID/reference, and delivery-notification
   ID using the app/API. Each cross-customer read or mutation must be denied or return no row. Repeat in reverse.

The automated SQL behavior checks in `supabase/local-test/10_checks.sql` cover ownership isolation for profiles, carts,
orders/order items, and delivery notifications. Automated tests cannot establish how your installed Chrome and Edge
profiles behave on your machine; perform the steps above against your own Supabase test project before treating
cross-profile behavior as verified.

## Using your own photos

Put image files in `public/products/` and add their actual paths in product data or the admin gallery.
Sample products show one real source image; add genuine alternate views through the admin gallery
instead of repeating or cropping one photo to imply additional views.

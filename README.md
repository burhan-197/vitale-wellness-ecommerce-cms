# Vitale CMS Lite

Vitale CMS Lite is the free/source-available starter edition of the Vitale ecommerce CMS. It intentionally contains only the core commerce flow so developers can evaluate the project structure before moving to the full commercial edition.

## Included

- First-time admin setup and basic admin login
- Product add, edit and delete
- Flat product categories
- One local image per product
- Basic price and stock quantity
- Responsive storefront
- Product search/category filtering
- Session cart
- Guest checkout (no customer accounts)
- Cash on Delivery/manual order creation
- Admin order list and status updates
- Automatically generated basic page title/description metadata

## Intentionally not included

The Lite edition does not contain the premium CMS systems such as advanced theme/homepage customization, customer accounts, online payment gateways, coupons, bundles/routines, blog CMS, CSV tools, backup/restore, cloud media storage, email/SMTP, Google login, advanced variants/inventory, advanced SEO controls, analytics, or extended settings.

## Quick start

1. Install Node.js and MongoDB.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` and a long random `SESSION_SECRET`.
4. Optional but recommended for a public first deployment: set `ADMIN_SETUP_TOKEN`.
5. Run:

```bash
npm install
npm start
```

Open `http://localhost:3000/admin`. On a fresh database you will be redirected to `/admin/setup` to create the one admin account.

## Product images

Lite stores product images locally in `public/uploads/products`. On hosts with an ephemeral filesystem, uploaded files can disappear after redeploy/restart. The full commercial edition is intended for richer media/storage workflows.

## Security notes

- Use HTTPS in production.
- Use a strong, unique `SESSION_SECRET`.
- Set `ADMIN_SETUP_TOKEN` before exposing a fresh installation publicly.
- Keep Node.js and dependencies updated.
- This starter does not replace a professional security review for a production business.

## Full version

The full Vitale CMS adds the advanced commerce, customization, content, integrations, automation and management features intentionally removed from this Lite repository. Add your Gumroad/Lemon Squeezy product link here before publishing the repository.

## License

See `LICENSE.txt`. This Lite repository is source-available and free to use under its own license; the paid/full Vitale CMS remains governed by its separate commercial license.

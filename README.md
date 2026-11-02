# SOLEVERSE 👟
### STEP INTO YOUR NEXT DIMENSION.

**SOLEVERSE** is a modern sneaker e-commerce web application designed to provide customers with a smooth, interactive, and convenient online shoe-shopping experience.

The platform allows customers to explore different shoe categories, view product details, manage their shopping cart, place orders, and track purchases. It also provides an administrative dashboard for managing products, inventory, customers, and orders.

SOLEVERSE is developed as an academic and portfolio project using modern web technologies, with Supabase providing backend services.

---

## 🚀 Project Overview

SOLEVERSE aims to create a premium digital shopping experience for sneaker enthusiasts through a modern interface, organized product catalogue, interactive product viewing, and streamlined ordering process.

### Key Highlights

- Modern and responsive sneaker-shopping interface.
- Multiple shoe categories and product filters.
- Product image galleries.
- Interactive 3D shoe viewing experience.
- Secure customer authentication.
- Shopping cart and checkout system.
- Demo-only payment simulation.
- Customer order management.
- Protected administrative dashboard.
- Product and inventory management.

---

## ✨ Features

### 🛍️ Customer Features

- **User Authentication:** Customer registration, login, and logout using Supabase Authentication.
- **Product Catalogue:** Browse shoes across different categories.
- **Product Search:** Search products using product names, IDs, and supported filters.
- **Product Details:** View descriptions, prices, available sizes, colours, and product images.
- **Product Gallery:** View multiple images of individual products.
- **3D Shoe Viewer:** Interactive 3D product viewing, where supported by the product assets.
- **Shopping Cart:** Add, update, and remove products from the cart.
- **Checkout:** Enter delivery information and place orders.
- **Customer Profiles:** Manage personal information and saved details.
- **Order History:** View previously placed orders.
- **Order Tracking:** View order progress where tracking functionality is enabled.

### 💳 Demo Payment System

SOLEVERSE includes a simulated payment experience for academic demonstration.

Supported payment methods:

- **UPI Demo:** QR-based simulated payment session with a three-minute expiry, if enabled.
- **Card Demo:** Simulated card-payment interface using test-only inputs.
- **Cash on Delivery:** Place orders using the COD option.

**Important:** All online payment transactions are simulations. No real money is charged, transferred, or received. SOLEVERSE is not connected to a live payment gateway.

Never enter actual banking credentials, UPI PINs, or real card security information into the demo payment interface.

### 🔐 Admin Features

SOLEVERSE includes a protected administrative dashboard for managing the store.

- **Admin Dashboard:** View store-management information and analytics where implemented.
- **Product Management:** Create, edit, publish, and manage products.
- **Product Variants:** Manage shoe sizes, colours, and stock quantities.
- **Product Images:** Manage multiple product images.
- **Inventory Management:** Monitor product and variant stock.
- **Order Management:** View customer orders and update order statuses.
- **Customer Management:** Manage authorized administrative access and view permitted customer information.
- **Order Details:** Inspect individual orders and their details.

Administrative operations are protected using authentication and database authorization.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Development server and build tool |
| JavaScript | Application programming |
| Tailwind CSS | Styling and responsive design |
| React Router | Application navigation |
| Supabase | Backend, database and authentication |
| PostgreSQL | Relational database |
| Three.js | 3D graphics, where integrated |
| React Three Fiber / Drei | 3D React components, where integrated |
| Lucide | Icons |

---

## 📁 Project Structure

The project is organized into frontend application code, reusable components, database migrations, and supporting configuration files.

```text
soleverse/
│
├── public/
│   └── Static assets
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── data/
│   ├── services/
│   ├── hooks/
│   ├── assets/
│   ├── lib/
│   ├── App.jsx
│   └── main.jsx
│
├── supabase/
│   └── migrations/
│
├── scripts/
│
├── tests/
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

*Note: The structure above is an overview. Refer to the actual project folders for the complete file structure.*

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Node.js (LTS version recommended)
- npm
- Git
- Visual Studio Code
- A Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/durgeshkathariya2301070-cell/soleverse-shoe-website.git
```

### 2. Open the Project

```bash
cd soleverse-shoe-website
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Add the environment variables expected by the application:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Replace the example values with your own Supabase project URL and publishable/anon key.

**Security:** Never place a Supabase service-role key, database password, or other private secret in a frontend environment variable beginning with `VITE_`.

### 5. Configure Supabase

1. Create a Supabase project.
2. Open Project Settings and obtain the project URL and publishable/anon key.
3. Configure the environment variables.
4. Review the SQL migration files inside `supabase/migrations/`.
5. Apply the required migrations in the correct order using the Supabase SQL Editor.
6. Configure the administrator account using the project's documented admin setup procedure.

Do not blindly rerun migrations that have already been applied.

### 6. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually:

```text
http://localhost:5173
```

---

## 🧪 Testing

Run the automated test suite:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

Preview the production build, if the project provides the Vite preview script:

```bash
npm run preview
```

The security audit previously reported:

- 137 automated tests passed.
- Production build completed successfully.
- Zero production dependency advisories at the time of that audit.

These results represent the earlier audit run and should be updated after subsequent code changes.

---

## 🔒 Security

Security is an important part of SOLEVERSE.

The project includes or is designed to use:

- Supabase Authentication.
- Role-based administrative authorization.
- PostgreSQL Row Level Security (RLS).
- Protected customer data and order access.
- Environment-variable protection.
- Server-side validation for privileged operations.
- Safe handling of demo payment sessions.

**Security status:** A local security audit was performed. Live Supabase permissions, migration state, Storage policies, and production deployment settings require separate verification.

No website can be guaranteed completely secure. Security testing and maintenance should continue throughout development and deployment.

---

## 📱 Responsive Design

SOLEVERSE is designed to provide a consistent shopping experience across:

- Desktop computers.
- Laptops.
- Tablets.
- Mobile devices.

---

## 🔮 Future Improvements

Potential future enhancements include:

- More advanced product recommendations.
- Improved real-time inventory analytics.
- Advanced sales reports.
- Enhanced order tracking.
- Additional 3D shoe models.
- Newsletter subscription integration.
- Accessibility and performance improvements.
- Further security testing and production hardening.

---

## ⚠️ Project Disclaimer

SOLEVERSE is an academic and portfolio demonstration project.

- Online payment methods are simulated.
- No actual financial transactions occur.
- Product availability and order fulfillment depend on the configured demonstration database.
- The website should not be treated as a fully operational commercial marketplace without additional production preparation, verification, and appropriate service integrations.

---

## 📬 Contact

**Project:** SOLEVERSE

**Email:** [kathariyadurgesh@gmail.com](mailto:kathariyadurgesh@gmail.com)

**Phone:**
- [9054187409](tel:9054187409)
- [9812678483](tel:9812678483)

---

## 📄 License

This project is developed for academic and portfolio purposes. Add an appropriate open-source license before permitting reuse or redistribution.

---

### SOLEVERSE
**STEP INTO YOUR NEXT DIMENSION.** 👟

/**
 * DvgCart E-Commerce - Product Catalog Seed
 */

const DEFAULT_PRODUCTS = [
  {
    id: "prod-001",
    title: "Signature Pima Tee",
    category: "T-Shirt",
    price: 9999,
    description: "A premium heavyweight t-shirt crafted from hand-harvested Peruvian Pima cotton. Designed with a structured, luxury drape and double-needle stitching for lasting shape.",
    image: "images/tshirt.png",
    featured: true,
    specs: [
      "Material: 100% Organic Pima Cotton",
      "Fabric Weight: 280 GSM Heavyweight",
      "Origin: Ethical tailoring in Lima, Peru",
      "Fit: Relaxed modern drape"
    ]
  },
  {
    id: "prod-002",
    title: "Elite Wireless Headphones",
    category: "Electronics",
    price: 34999,
    description: "Professional noise-cancelling headphones featuring acoustic-grade titanium drivers and premium calfskin memory foam ear cups. Experience sound in its purest, unfiltered form.",
    image: "images/headphones.png",
    featured: true,
    specs: [
      "Drivers: 40mm Electro-dynamic Titanium",
      "Connectivity: Bluetooth 5.2 & Ultra-low latency mode",
      "Battery Life: 40 hours of continuous playback",
      "Active Noise Cancellation: Premium hybrid ANC"
    ]
  }
];

const DEFAULT_CATEGORIES = ["T-Shirt", "Electronics"];

/**
 * Initialize catalog in LocalStorage if it doesn't exist.
 */
function initializeCatalog() {
  if (!localStorage.getItem("dvgcart_products_v4")) {
    localStorage.setItem("dvgcart_products_v4", JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem("dvgcart_categories_v4")) {
    localStorage.setItem("dvgcart_categories_v4", JSON.stringify(DEFAULT_CATEGORIES));
  }
}

/**
 * Fetch products from LocalStorage
 */
function getProducts() {
  initializeCatalog();
  return JSON.parse(localStorage.getItem("dvgcart_products_v4"));
}

/**
 * Save products list to LocalStorage
 */
function saveProducts(products) {
  localStorage.setItem("dvgcart_products_v4", JSON.stringify(products));
}

/**
 * Fetch categories from LocalStorage
 */
function getCategories() {
  initializeCatalog();
  return JSON.parse(localStorage.getItem("dvgcart_categories_v4"));
}

/**
 * Save categories to LocalStorage
 */
function saveCategories(categories) {
  localStorage.setItem("dvgcart_categories_v4", JSON.stringify(categories));
}

// Run initialization immediately on load
initializeCatalog();

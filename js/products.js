/**
 * DvgCart E-Commerce - Product Catalog Seed & Database Client
 */

// Load credentials from window config if present
const DEFAULT_SUPABASE_URL = "https://lbdadqkzporcxzkjbqh.supabase.co"; 
const DEFAULT_SUPABASE_ANON_KEY = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || "";

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

/**
 * Initialize Supabase Client
 */
const getSupabaseClient = () => {
  let url = localStorage.getItem("dvgcart_supabase_url") || DEFAULT_SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url);
  const key = localStorage.getItem("dvgcart_supabase_anon_key") || DEFAULT_SUPABASE_ANON_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey);

  // Auto-correct spelling typo in Vercel project ID if configured
  if (url && url.includes("lbdadqkzpzorcxzkjbqh")) {
    url = url.replace("lbdadqkzpzorcxzkjbqh", "lbdadqkzporcxzkjbqh");
  }

  if (url && key && typeof supabase !== "undefined") {
    try {
      return supabase.createClient(url, key);
    } catch (e) {
      console.error("Supabase client init error:", e);
    }
  }
  return null;
};

// Global DB client
let db = getSupabaseClient();

/**
 * Fetch full catalog from Supabase Relational Database
 */
async function fetchCloudCatalog() {
  db = getSupabaseClient();
  if (!db) {
    console.warn("Supabase credentials not configured. Local fallback enabled.");
    return null;
  }

  // Create a 4-second timeout promise
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Supabase query timed out")), 4000)
  );

  const fetchPromise = (async () => {
    // 1. Fetch categories
    const { data: catData, error: catError } = await db
      .from("categories")
      .select("name")
      .order("name", { ascending: true });
      
    if (catError) throw catError;
    
    // 2. Fetch products
    const { data: prodData, error: prodError } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
      
    if (prodError) throw prodError;

    const categoriesList = catData.map(c => c.name);
    
    // Update Local Cache for offline rendering speeds
    localStorage.setItem("dvgcart_products_v4", JSON.stringify(prodData));
    localStorage.setItem("dvgcart_categories_v4", JSON.stringify(categoriesList));

    return {
      products: prodData,
      categories: categoriesList
    };
  })();

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.error("Supabase Cloud Sync Fetch Error:", err);
  }
  return null;
}

/**
 * Perform bulk database save (Backup Import / Truncate & Seed)
 */
async function saveCloudCatalog(products, categories) {
  db = getSupabaseClient();
  if (!db) return { success: false, error: "Database client not initialized" };

  try {
    // 1. Delete all existing records (Cascade constraints handle dependencies)
    const { error: delProdError } = await db.from("products").delete().neq("id", "dummy");
    if (delProdError) throw delProdError;

    const { error: delCatError } = await db.from("categories").delete().neq("name", "dummy");
    if (delCatError) throw delCatError;

    // 2. Insert new categories list
    const categoryRows = categories.map(cat => ({ name: cat }));
    const { error: insCatError } = await db.from("categories").insert(categoryRows);
    if (insCatError) throw insCatError;

    // 3. Insert new products list
    const productRows = products.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      price: p.price,
      description: p.description,
      image: p.image,
      featured: p.featured,
      specs: p.specs
    }));
    
    if (productRows.length > 0) {
      const { error: insProdError } = await db.from("products").insert(productRows);
      if (insProdError) throw insProdError;
    }

    return { success: true };
  } catch (err) {
    console.error("Supabase Bulk Seed Error:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// Run initial offline catalog check
initializeCatalog();

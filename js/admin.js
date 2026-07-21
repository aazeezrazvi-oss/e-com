/**
 * DvgCart E-Commerce - Admin Panel Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // Helper to compress base64 images to prevent 413 Content Too Large errors on JSONBin
  function compressBase64Image(base64Str, maxWidth = 600, maxHeight = 600, quality = 0.7) {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith("data:image")) {
        resolve(base64Str);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  }

  // One-time compression of old heavy base64 products
  async function optimizeExistingProductImages() {
    let products = getProducts();
    let updated = false;
    for (let i = 0; i < products.length; i++) {
      if (products[i].image && products[i].image.startsWith("data:image") && products[i].image.length > 50000) {
        showToast(`Optimizing existing catalog image: ${products[i].title}...`, false);
        products[i].image = await compressBase64Image(products[i].image, 600, 600, 0.7);
        updated = true;
      }
    }
    if (updated) {
      saveProducts(products);
      renderProductsTable();
      updateStats();
      syncAdminCatalog(); // Push optimized catalog to cloud automatically
    }
  }

  // Authentication State
  let isAuthenticated = sessionStorage.getItem("dvgcart_admin_session") === "active";
  const defaultPasscode = "luxuryadmin";

  // Elements - Auth Gate
  const loginContainer = document.getElementById("login-container");
  const loginForm = document.getElementById("login-form");
  const adminPassInput = document.getElementById("admin-pass");
  const adminDashboard = document.getElementById("admin-dashboard");
  const logoutBtn = document.getElementById("logout-btn");

  // Elements - Products CRUD
  const productsTableBody = document.getElementById("admin-products-table-body");
  const addProductTrigger = document.getElementById("add-product-trigger");
  
  // Product Modal Elements
  const productModal = document.getElementById("product-modal");
  const productModalClose = document.getElementById("product-modal-close");
  const productModalTitle = document.getElementById("product-modal-title");
  const productForm = document.getElementById("product-form");
  const prodFormId = document.getElementById("prod-form-id");
  const prodTitle = document.getElementById("prod-title");
  const prodCategory = document.getElementById("prod-category");
  const prodPrice = document.getElementById("prod-price");
  const prodDesc = document.getElementById("prod-desc");
  const prodImageFile = document.getElementById("prod-image-file");
  const prodImageUrl = document.getElementById("prod-image-url");
  const prodImagePreview = document.getElementById("prod-image-preview");
  const prodSpecs = document.getElementById("prod-specs");
  const prodFeatured = document.getElementById("prod-featured");
  const prodSubmitBtn = document.getElementById("prod-form-submit-btn");

  // Elements - Settings
  const settingsPhoneForm = document.getElementById("settings-phone-form");
  const setPhoneInput = document.getElementById("set-phone");
  const settingsPassForm = document.getElementById("settings-pass-form");
  const setPassInput = document.getElementById("set-pass");
  
  // Logo Settings Elements
  const logoFileInput = document.getElementById("logo-file-input");
  const logoPreviewBox = document.getElementById("logo-preview-box");
  const clearLogoBtn = document.getElementById("clear-logo-btn");

  // Elements - Settings - Social links
  const settingsSocialsForm = document.getElementById("settings-socials-form");
  const setInstaInput = document.getElementById("set-insta");
  const setFbInput = document.getElementById("set-fb");
  const setYtInput = document.getElementById("set-yt");
  const setWaInput = document.getElementById("set-wa");

  // Elements - Category Management
  const addCategoryForm = document.getElementById("add-category-form");
  const newCategoryNameInput = document.getElementById("new-category-name");
  const adminCategoryList = document.getElementById("admin-category-list");

  // Elements - Import/Export
  const exportCatalogBtn = document.getElementById("export-catalog-btn");
  const importCatalogInput = document.getElementById("import-catalog-input");

  // Elements - Supabase DB Sync Settings
  const supabaseSyncForm = document.getElementById("supabase-sync-form");
  const supabaseUrlInput = document.getElementById("supabase-url");
  const supabaseAnonKeyInput = document.getElementById("supabase-anon-key");
  const clearDbBtn = document.getElementById("clear-db-btn");
  const dbStatusDot = document.getElementById("db-status-dot");
  const dbStatusText = document.getElementById("db-status-text");

  // Elements - Order Logs & Stats
  const ordersLogContainer = document.getElementById("orders-log-container");
  const clearOrdersBtn = document.getElementById("clear-orders-btn");
  
  const statRevenue = document.getElementById("stat-revenue");
  const statOrders = document.getElementById("stat-orders");
  const statProducts = document.getElementById("stat-products");
  const statClients = document.getElementById("stat-clients");

  // 1. SESSION MANAGEMENT & LOG IN
  checkAuth();

  function checkAuth() {
    if (isAuthenticated) {
      loginContainer.style.display = "none";
      adminDashboard.style.display = "block";
      initAdminPanel();
    } else {
      loginContainer.style.display = "block";
      adminDashboard.style.display = "none";
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredPass = adminPassInput.value;
    const correctPass = localStorage.getItem("dvgcart_admin_passcode") || defaultPasscode;

    // Check if Supabase client is active
    db = getSupabaseClient();
    if (db) {
      showToast("Verifying credentials with database...", false);
      try {
        const { data, error } = await db.auth.signInWithPassword({
          email: "admin@dvgcart.com",
          password: enteredPass
        });
        
        if (error) throw error;
        
        sessionStorage.setItem("dvgcart_admin_session", "active");
        isAuthenticated = true;
        adminPassInput.value = "";
        checkAuth();
        showToast("Access Granted. Welcome back, Manager.");
      } catch (err) {
        console.error("Supabase login error:", err);
        // Fallback to local passcode if credentials mismatch or network fail
        if (enteredPass === correctPass) {
          sessionStorage.setItem("dvgcart_admin_session", "active");
          isAuthenticated = true;
          adminPassInput.value = "";
          checkAuth();
          showToast("Offline Access Granted (Bypassed DB auth).");
        } else {
          showToast("Authentication Failed. Invalid passcode or database mismatch.", true);
        }
      }
    } else {
      // Fallback to simple LocalStorage passcode check if Supabase is not connected
      if (enteredPass === correctPass) {
        sessionStorage.setItem("dvgcart_admin_session", "active");
        isAuthenticated = true;
        adminPassInput.value = "";
        checkAuth();
        showToast("Access Granted (Offline Mode).");
      } else {
        showToast("Authentication Failed. Invalid passcode.", true);
      }
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("dvgcart_admin_session");
    isAuthenticated = false;
    checkAuth();
    showToast("Session Terminated.");
  });

  // 2. DASHBOARD INITIALIZATION
  function initAdminPanel() {
    // Populate stats, category selections, lists, and orders
    updateStats();
    populateCategoryDropdown();
    renderProductsTable();
    renderOrdersLog();
    loadSettingsInputs();
    renderCategoryList();
    initAdminLogo();
    
    // Automatically optimize and shrink heavy base64 products in background to keep cloud payloads light
    optimizeExistingProductImages();

    // Check database connection status
    checkDbConnection();
  }

  // Logo Detection and Integration for Admin Panel Top Bar
  function initAdminLogo() {
    const adminLogo = localStorage.getItem("dvgcart_logo");
    const logoDisplayContainer = document.getElementById("admin-logo-display-container");
    if (!logoDisplayContainer) return;
    
    if (adminLogo) {
      logoDisplayContainer.innerHTML = `
        <img src="${adminLogo}" class="logo-img" alt="DvgCart Logo" style="height: 35px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('admin-logo-text-fallback').style.display='inline'">
        <span id="admin-logo-text-fallback" style="display:none;">DVG<span>CART</span> <small style="font-size: 10px; letter-spacing: 1px; color: var(--color-text-muted); text-transform: uppercase;">Admin Portal</small></span>
      `;
    } else {
      const img = new Image();
      img.onload = function() {
        logoDisplayContainer.innerHTML = `
          <img src="logo.png" class="logo-img" alt="DvgCart Logo" style="height: 35px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('admin-logo-text-fallback').style.display='inline'">
          <span id="admin-logo-text-fallback" style="display:none;">DVG<span>CART</span> <small style="font-size: 10px; letter-spacing: 1px; color: var(--color-text-muted); text-transform: uppercase;">Admin Portal</small></span>
        `;
      };
      img.onerror = function() {
        const img2 = new Image();
        img2.onload = function() {
          logoDisplayContainer.innerHTML = `
            <img src="images/logo.png" class="logo-img" alt="DvgCart Logo" style="height: 35px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'; document.getElementById('admin-logo-text-fallback').style.display='inline'">
            <span id="admin-logo-text-fallback" style="display:none;">DVG<span>CART</span> <small style="font-size: 10px; letter-spacing: 1px; color: var(--color-text-muted); text-transform: uppercase;">Admin Portal</small></span>
          `;
        };
        img2.onerror = function() {
          // Fallback to text (already in HTML)
        };
        img2.src = "images/logo.png";
      };
      img.src = "logo.png";
    }
  }

  function updateStats() {
    const products = getProducts();
    const orders = JSON.parse(localStorage.getItem("dvgcart_orders")) || [];
    
    // Revenue
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    statRevenue.textContent = revenue.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    
    // Orders count
    statOrders.textContent = orders.length;

    // Products Count
    statProducts.textContent = `${products.length} Items`;

    // VIP Clientele
    const uniqueClients = [...new Set(orders.map(o => o.clientName.trim()))];
    statClients.textContent = `${uniqueClients.length} Clients`;
  }

  function populateCategoryDropdown() {
    const categories = getCategories();
    prodCategory.innerHTML = "";
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      prodCategory.appendChild(opt);
    });
  }

  // Load Settings into Inputs
  function loadSettingsInputs() {
    setPhoneInput.value = localStorage.getItem("dvgcart_admin_phone") || "919483635095";
    setInstaInput.value = localStorage.getItem("dvgcart_link_insta") || "";
    setFbInput.value = localStorage.getItem("dvgcart_link_fb") || "";
    setYtInput.value = localStorage.getItem("dvgcart_link_yt") || "";
    setWaInput.value = localStorage.getItem("dvgcart_link_wa") || "";
    
    // Custom Logo preview
    const customLogo = localStorage.getItem("dvgcart_logo");
    const faviconEl = document.getElementById("tab-favicon");
    if (customLogo) {
      logoPreviewBox.style.backgroundImage = `url(${customLogo})`;
      logoPreviewBox.classList.add("active");
      clearLogoBtn.style.display = "inline-block";
      if (faviconEl) faviconEl.href = customLogo;
    } else {
      logoPreviewBox.style.backgroundImage = "";
      logoPreviewBox.classList.remove("active");
      clearLogoBtn.style.display = "none";
      if (faviconEl) faviconEl.href = "logo.png";
    }

    // Supabase DB config preview
    supabaseUrlInput.value = localStorage.getItem("dvgcart_supabase_url") || DEFAULT_SUPABASE_URL || "";
    supabaseAnonKeyInput.value = localStorage.getItem("dvgcart_supabase_anon_key") || DEFAULT_SUPABASE_ANON_KEY || "";
    
    const hasCustomOverride = localStorage.getItem("dvgcart_supabase_url");
    if (hasCustomOverride) {
      clearDbBtn.style.display = "inline-block";
    } else {
      clearDbBtn.style.display = "none";
    }
  }

  // 3. PRODUCT CRUD AND TABLE DRAWING
  function renderProductsTable() {
    const products = getProducts();
    productsTableBody.innerHTML = "";

    if (products.length === 0) {
      productsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 40px;">
            No items present in the collection. Click 'Add Creation' to seed the catalog.
          </td>
        </tr>
      `;
      return;
    }

    products.forEach(p => {
      const tr = document.createElement("tr");
      const priceFormatted = p.price.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
      const statusHTML = p.featured 
        ? `<span class="badge-category" style="background-color: rgba(212, 175, 55, 0.15); font-weight: 500;">Featured Banner</span>` 
        : `<span style="color: var(--color-text-muted); font-size: 12px;">Standard Listing</span>`;

      tr.innerHTML = `
        <td data-label="Product">
          <div class="table-product-cell">
            <img src="${p.image}" alt="${p.title}" class="table-product-thumb" onerror="this.src='images/watch.png'">
            <div>
              <span class="table-product-title">${p.title}</span>
              <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 3px;">ID: ${p.id}</div>
            </div>
          </div>
        </td>
        <td data-label="Category"><span class="badge-category">${p.category}</span></td>
        <td data-label="Price"><strong style="color: var(--color-accent);">${priceFormatted}</strong></td>
        <td data-label="Status">${statusHTML}</td>
        <td data-label="Actions">
          <button class="btn-icon-action edit-product-btn" data-id="${p.id}" title="Edit product">Edit</button>
          <button class="btn-icon-action delete delete-product-btn" data-id="${p.id}" title="Delete product">&times; Delete</button>
        </td>
      `;

      productsTableBody.appendChild(tr);
    });

    // Add action listeners
    document.querySelectorAll(".edit-product-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        openProductModal(id);
      });
    });

    document.querySelectorAll(".delete-product-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        deleteProduct(id);
      });
    });
  }

  function deleteProduct(id) {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (confirm(`Are you sure you want to permanently remove "${product.title}" from the store catalog?`)) {
      const updated = products.filter(p => p.id !== id);
      saveProducts(updated);
      renderProductsTable();
      updateStats();
      showToast(`Removed "${product.title}" from catalog.`);
      syncAdminCatalog();
    }
  }

  // 4. PRODUCT ADD/EDIT MODAL
  function openProductModal(id = null) {
    productForm.reset();
    prodImagePreview.style.backgroundImage = "";
    prodImagePreview.classList.remove("active");
    
    if (id) {
      // Edit Mode
      const products = getProducts();
      const product = products.find(p => p.id === id);
      if (!product) return;

      productModalTitle.textContent = "Edit Luxury Creation";
      prodFormId.value = product.id;
      prodTitle.value = product.title;
      prodCategory.value = product.category;
      prodPrice.value = product.price;
      prodDesc.value = product.description;
      prodImageUrl.value = product.image;
      prodSpecs.value = product.specs ? product.specs.join("\n") : "";
      prodFeatured.checked = product.featured || false;
      prodSubmitBtn.textContent = "Save Changes";

      if (product.image) {
        prodImagePreview.style.backgroundImage = `url(${product.image})`;
        prodImagePreview.classList.add("active");
      }
    } else {
      // Add Mode
      productModalTitle.textContent = "Add New Creation";
      prodFormId.value = "";
      prodSubmitBtn.textContent = "Create Product";
    }

    productModal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeProductModal() {
    productModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  addProductTrigger.addEventListener("click", () => openProductModal());
  productModalClose.addEventListener("click", closeProductModal);
  productModal.addEventListener("click", (e) => {
    if (e.target === productModal) closeProductModal();
  });

  // Handle local image file uploads for products
  prodImageFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async function(evt) {
        const rawBase64 = evt.target.result;
        showToast("Optimizing product image...", false);
        const compressedBase64 = await compressBase64Image(rawBase64, 600, 600, 0.7);
        prodImagePreview.style.backgroundImage = `url(${compressedBase64})`;
        prodImagePreview.classList.add("active");
        prodImageUrl.value = "";
      };
      reader.readAsDataURL(file);
    }
  });

  // Keep preview synced if admin pastes image URL
  prodImageUrl.addEventListener("input", (e) => {
    const val = e.target.value;
    if (val) {
      prodImagePreview.style.backgroundImage = `url(${val})`;
      prodImagePreview.classList.add("active");
      // Clear file field
      prodImageFile.value = "";
    } else {
      prodImagePreview.style.backgroundImage = "";
      prodImagePreview.classList.remove("active");
    }
  });

  // Save/Create Product Form Submission
  productForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = prodFormId.value;
    const title = prodTitle.value;
    const category = prodCategory.value;
    const price = parseFloat(prodPrice.value);
    const description = prodDesc.value;
    const featured = prodFeatured.checked;
    
    // Process specs textarea (split by lines, exclude empty lines)
    const specsArray = prodSpecs.value
      ? prodSpecs.value.split("\n").map(line => line.trim()).filter(line => line.length > 0)
      : [];

    // Image URL resolution: Base64 preview style background, else the text URL, else watch placeholder
    let imageSrc = "";
    const bgUrl = prodImagePreview.style.backgroundImage;
    
    if (bgUrl && bgUrl.startsWith('url("data:image')) {
      // Extract base64 inside url("...")
      imageSrc = bgUrl.slice(5, -2);
    } else {
      imageSrc = prodImageUrl.value || "images/watch.png";
    }

    const products = getProducts();

    if (id) {
      // Edit
      const index = products.findIndex(p => p.id === id);
      if (index > -1) {
        products[index] = {
          ...products[index],
          title,
          category,
          price,
          description,
          image: imageSrc,
          specs: specsArray,
          featured
        };
        showToast(`Saved edits for "${title}".`);
      }
    } else {
      // Create New
      const newProduct = {
        id: "prod-" + Date.now(),
        title,
        category,
        price,
        description,
        image: imageSrc,
        specs: specsArray,
        featured
      };
      products.push(newProduct);
      showToast(`Added "${title}" to the store.`);
    }

    saveProducts(products);
    renderProductsTable();
    updateStats();
    closeProductModal();
    syncAdminCatalog();
  });

  // 5. ADMINISTRATIVE SETTINGS FORM SUBMITS
  settingsPhoneForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const phone = setPhoneInput.value.replace(/[^0-9]/g, ""); // Remove non-digits
    
    if (phone.length < 5) {
      showToast("Please enter a valid phone number with country code.", true);
      return;
    }

    localStorage.setItem("dvgcart_admin_phone", phone);
    showToast("Concierge WhatsApp contact updated successfully.");
  });

  settingsPassForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pass = setPassInput.value.trim();

    if (pass.length < 4) {
      showToast("Passcode should be at least 4 characters long.", true);
      return;
    }

    localStorage.setItem("dvgcart_admin_passcode", pass);
    setPassInput.value = "";
    showToast("Secure passcode updated successfully.");
  });

  settingsSocialsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    localStorage.setItem("dvgcart_link_insta", setInstaInput.value.trim());
    localStorage.setItem("dvgcart_link_fb", setFbInput.value.trim());
    localStorage.setItem("dvgcart_link_yt", setYtInput.value.trim());
    localStorage.setItem("dvgcart_link_wa", setWaInput.value.trim());
    showToast("Social media links updated successfully.");
  });

  // Handle Logo Upload (base64)
  logoFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async function(evt) {
        const rawBase64 = evt.target.result;
        showToast("Optimizing logo size...", false);
        const compressedLogo = await compressBase64Image(rawBase64, 300, 300, 0.7);
        localStorage.setItem("dvgcart_logo", compressedLogo);
        
        logoPreviewBox.style.backgroundImage = `url(${compressedLogo})`;
        logoPreviewBox.classList.add("active");
        clearLogoBtn.style.display = "inline-block";
        const faviconEl = document.getElementById("tab-favicon");
        if (faviconEl) faviconEl.href = compressedLogo;
        showToast("Custom brand logo saved.");
        initAdminLogo();
      };
      reader.readAsDataURL(file);
    }
  });

  clearLogoBtn.addEventListener("click", () => {
    localStorage.removeItem("dvgcart_logo");
    logoPreviewBox.style.backgroundImage = "";
    logoPreviewBox.classList.remove("active");
    clearLogoBtn.style.display = "none";
    logoFileInput.value = "";
    const faviconEl = document.getElementById("tab-favicon");
    if (faviconEl) faviconEl.href = "logo.png";
    showToast("Custom logo cleared. Falling back to default text brand.");
    initAdminLogo();
  });

  // Test and update database connection status indicator
  async function checkDbConnection() {
    let activeDb = getSupabaseClient();
    if (!activeDb) {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const config = await response.json();
          if (config.url && config.anonKey) {
            window.SUPABASE_CONFIG = config;
            if (typeof supabase !== "undefined") {
              db = supabase.createClient(config.url, config.anonKey);
              activeDb = db;
            }
          }
        }
      } catch (err) {
        console.warn("Vercel config fetch bypassed in admin:", err);
      }
    }

    db = activeDb;
    if (!db) {
      dbStatusDot.style.backgroundColor = "#d32f2f"; // Red
      dbStatusText.textContent = "Database: Offline (No Config)";
      clearDbBtn.style.display = "none";
      return;
    }

    dbStatusDot.style.backgroundColor = "#8E8E93"; // Gray
    dbStatusText.textContent = "Database: Testing Connection...";

    try {
      const { data, error } = await db.from("categories").select("name").limit(1);
      if (error) throw error;

      dbStatusDot.style.backgroundColor = "#2e7d32"; // Green
      dbStatusText.textContent = "Database: Online & Connected";
      
      const customUrl = localStorage.getItem("dvgcart_supabase_url");
      if (customUrl) {
        clearDbBtn.style.display = "inline-block";
      } else {
        clearDbBtn.style.display = "none";
      }
    } catch (err) {
      console.error("Database status check error:", err);
      dbStatusDot.style.backgroundColor = "#d32f2f"; // Red
      dbStatusText.textContent = "Database: Connection Error";
      clearDbBtn.style.display = "inline-block";
    }
  }

  // Handle Supabase DB Sync Form Submit
  supabaseSyncForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = supabaseUrlInput.value.trim();
    const key = supabaseAnonKeyInput.value.trim();

    if (!url || !key) {
      showToast("Both URL and Anon API Key are required.", true);
      return;
    }

    localStorage.setItem("dvgcart_supabase_url", url);
    localStorage.setItem("dvgcart_supabase_anon_key", key);
    showToast("Saving credentials & testing connection...", false);

    // Reinitialize Supabase instance
    db = getSupabaseClient();
    
    await checkDbConnection();
    
    // Sync current local products/categories up to the new database
    const products = getProducts();
    const categories = getCategories();
    
    showToast("Uploading offline catalog to Supabase...", false);
    const result = await saveCloudCatalog(products, categories);
    if (result.success) {
      showToast("Database linked & catalog synced successfully!");
    } else {
      showToast("Sync failed: " + result.error, true);
    }
  });

  // Handle Reset DB Settings to default hardcoded variables
  clearDbBtn.addEventListener("click", async () => {
    if (confirm("Reset connection settings to default project configurations?")) {
      localStorage.removeItem("dvgcart_supabase_url");
      localStorage.removeItem("dvgcart_supabase_anon_key");
      
      supabaseUrlInput.value = "";
      supabaseAnonKeyInput.value = "";
      clearDbBtn.style.display = "none";
      
      // Reinitialize
      db = getSupabaseClient();
      await checkDbConnection();
      showToast("Reset to project default configuration.");
    }
  });

  // --- Category Management Logic ---
  function renderCategoryList() {
    const categories = getCategories();
    adminCategoryList.innerHTML = "";

    if (categories.length === 0) {
      adminCategoryList.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); font-size: 11px; padding: 10px 0;">
          No categories configured.
        </div>
      `;
      return;
    }

    categories.forEach(cat => {
      const itemEl = document.createElement("div");
      itemEl.style.display = "flex";
      itemEl.style.justify = "space-between";
      itemEl.style.alignItems = "center";
      itemEl.style.padding = "8px 12px";
      itemEl.style.borderBottom = "1px solid rgba(255, 255, 255, 0.03)";
      itemEl.style.fontSize = "13px";
      
      itemEl.innerHTML = `
        <span>${cat}</span>
        <button type="button" class="delete-cat-btn" data-category="${cat}" style="color: #e53935; font-size: 16px; font-weight: bold; cursor: pointer; padding: 0 5px; background:none; border:none;" title="Delete category">&times;</button>
      `;

      adminCategoryList.appendChild(itemEl);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-cat-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const cat = e.currentTarget.getAttribute("data-category");
        deleteCategory(cat);
      });
    });
  }

  function deleteCategory(categoryName) {
    const products = getProducts();
    const categories = getCategories();

    // Check if there are active products in this category
    const hasProducts = products.some(p => p.category.toLowerCase() === categoryName.toLowerCase());
    if (hasProducts) {
      showToast(`Cannot delete "${categoryName}". Reassign or delete its active products first.`, true);
      return;
    }

    if (confirm(`Are you sure you want to permanently delete the category "${categoryName}"?`)) {
      const updated = categories.filter(c => c.toLowerCase() !== categoryName.toLowerCase());
      saveCategories(updated);
      renderCategoryList();
      populateCategoryDropdown();
      showToast(`Category "${categoryName}" deleted.`);
      syncAdminCatalog();
    }
  }

  addCategoryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newCat = newCategoryNameInput.value.trim();
    if (!newCat) return;

    const categories = getCategories();

    // Check for duplicate (case-insensitive)
    const exists = categories.some(c => c.toLowerCase() === newCat.toLowerCase());
    if (exists) {
      showToast(`Category "${newCat}" already exists.`, true);
      return;
    }

    // Capitalize first letter of each word in the category name for premium look
    const formattedCat = newCat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    categories.push(formattedCat);
    saveCategories(categories);
    
    newCategoryNameInput.value = "";
    renderCategoryList();
    populateCategoryDropdown();
    showToast(`Category "${formattedCat}" created.`);
    syncAdminCatalog();
  });

  // 6. BACKUP SYSTEMS (IMPORT/EXPORT JSON)
  exportCatalogBtn.addEventListener("click", () => {
    const products = getProducts();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "products.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    showToast("Downloaded catalog products.json backup.");
  });

  importCatalogInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        
        // Simple validation checks
        if (Array.isArray(parsed)) {
          const isValid = parsed.every(p => p.id && p.title && p.category && typeof p.price === 'number');
          if (isValid) {
            saveProducts(parsed);
            
            // Extract unique categories from imported products
            const cats = [...new Set(parsed.map(p => p.category))];
            if (cats.length > 0) {
              saveCategories(cats);
            }

            // Refresh UI
            renderProductsTable();
            populateCategoryDropdown();
            updateStats();
            importCatalogInput.value = "";
            showToast("Successfully imported catalog file!");
            syncAdminCatalog();
          } else {
            showToast("Invalid JSON schema. Missing required product fields.", true);
          }
        } else {
          showToast("File must contain a valid JSON array of products.", true);
        }
      } catch (err) {
        showToast("Error parsing file. Ensure it is a valid JSON file.", true);
      }
    };
    reader.readAsText(file);
  });

  // 7. CONCIERGE TRANSMISSION LOGS (SIMULATED ORDERS)
  function renderOrdersLog() {
    const orders = JSON.parse(localStorage.getItem("dvgcart_orders")) || [];
    ordersLogContainer.innerHTML = "";

    if (orders.length === 0) {
      ordersLogContainer.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 40px; font-weight: 300; font-size: 13px;">
          No order transmissions logged. Complete client checkout in storefront to simulate orders.
        </div>
      `;
      return;
    }

    orders.forEach(order => {
      const orderCard = document.createElement("div");
      orderCard.className = "cart-item";
      orderCard.style.gridTemplateColumns = "1fr auto";
      orderCard.style.padding = "20px";
      orderCard.style.backgroundColor = "rgba(255, 255, 255, 0.01)";
      orderCard.style.border = "1px solid rgba(255, 255, 255, 0.03)";
      orderCard.style.marginBottom = "15px";

      const itemsListHTML = order.items.map(item => 
        `<div style="font-size: 12px; color: var(--color-text-muted); margin-top: 3px;">• ${item.quantity}x ${item.title}</div>`
      ).join("");

      orderCard.innerHTML = `
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <strong class="serif" style="font-size: 16px; color: var(--color-text-light);">${order.clientName}</strong>
            <span class="badge-category" style="font-size: 9px; padding: 2px 6px;">${order.orderId}</span>
          </div>
          <div style="font-size: 12px; color: var(--color-text-muted);">Phone: ${order.clientPhone}</div>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px;">Date: ${order.date}</div>
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255, 255, 255, 0.05);">
            ${itemsListHTML}
          </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <strong style="color: var(--color-accent); font-family: var(--font-serif); font-size: 18px;">₹${order.total.toLocaleString('en-IN')}</strong>
          <span class="badge-category" style="background-color: rgba(46, 125, 50, 0.15); color: #81c784; font-size: 9px; font-weight: 500; border-radius: 2px; width: fit-content; align-self: flex-end; margin-top: 20px;">Transmitted</span>
        </div>
      `;

      ordersLogContainer.appendChild(orderCard);
    });
  }

  clearOrdersBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all order logs? This will reset your dashboard revenue statistics.")) {
      localStorage.setItem("dvgcart_orders", JSON.stringify([]));
      renderOrdersLog();
      updateStats();
      showToast("Order acquisition logs cleared.");
    }
  });

  // 8. LUXURY TOAST NOTIFICATION
  function showToast(message, isError = false) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    
    if (isError) {
      toast.style.borderColor = "#e53935";
      toast.innerHTML = `
        <span style="color: #e53935;">⚠️</span>
        <span>${message}</span>
      `;
    } else {
      toast.innerHTML = `
        <span class="toast-success-icon">✨</span>
        <span>${message}</span>
      `;
    }
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => {
        toast.remove();
      }, 5000);
    }, 3000);
  }

  // Cloud Sync trigger function for CRUD operations
  async function syncAdminCatalog() {
    const products = getProducts();
    const categories = getCategories();
    
    // Check if Supabase client is active
    db = getSupabaseClient();
    if (!db) return;
    
    showToast("Syncing changes with Supabase...");
    const result = await saveCloudCatalog(products, categories);
    if (result.success) {
      showToast("Supabase sync completed.");
    } else {
      showToast("Sync failed: " + result.error, true);
    }
  }
});

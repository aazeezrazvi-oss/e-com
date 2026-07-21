/**
 * DvgCart E-Commerce - Storefront Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // Application State
  let products = getProducts();
  let categories = getCategories();
  let activeCategory = "all";
  let cart = JSON.parse(localStorage.getItem("dvgcart_cart")) || [];
  
  // Admin configurations
  let adminPhone = localStorage.getItem("dvgcart_admin_phone") || "18008008800";

  // Elements
  const productsGrid = document.getElementById("products-grid");
  const categoryFilters = document.getElementById("category-filters");
  const catalogSearchInput = document.getElementById("catalog-search");
  const cartTrigger = document.getElementById("cart-trigger");
  const cartClose = document.getElementById("cart-close");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartCount = document.getElementById("cart-count");
  const cartSummaryQty = document.getElementById("cart-summary-qty");
  const cartSummaryTotal = document.getElementById("cart-summary-total");
  const checkoutTrigger = document.getElementById("checkout-trigger");
  
  // Modals
  const quickViewModal = document.getElementById("quick-view-modal");
  const quickViewClose = document.getElementById("quick-view-close");
  const quickViewContent = document.getElementById("quick-view-content");
  const heroQuickViewBtn = document.getElementById("hero-quickview-btn");
  
  const checkoutModal = document.getElementById("checkout-modal");
  const checkoutClose = document.getElementById("checkout-close");
  const checkoutForm = document.getElementById("checkout-form");
  
  const mainHeader = document.getElementById("main-header");
  const logoDisplayContainer = document.getElementById("logo-display-container");
  const footerCategoriesList = document.getElementById("footer-categories-list");
  
  // Mobile Navigation Menu Elements
  const mobileMenuTrigger = document.getElementById("mobile-menu-trigger");
  const mobileMenuClose = document.getElementById("mobile-menu-close");
  const mobileMenuDrawer = document.getElementById("mobile-menu-drawer");
  const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
  const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");

  // Elements - Social Links
  const footerLinkInsta = document.getElementById("footer-link-insta");
  const footerLinkFb = document.getElementById("footer-link-fb");
  const footerLinkYt = document.getElementById("footer-link-yt");
  const footerLinkWa = document.getElementById("footer-link-wa");

  // Initialize
  initLogo();
  initSocialLinks();
  
  const isSupabaseConfigured = typeof db !== "undefined" && db !== null;
  if (!isSupabaseConfigured) {
    renderFilters();
    renderProducts("all");
  }
  
  updateCartUI();
  initHeaderScroll();

  // Social Links Initialization
  function initSocialLinks() {
    footerLinkInsta.href = localStorage.getItem("dvgcart_link_insta") || "#";
    footerLinkFb.href = localStorage.getItem("dvgcart_link_fb") || "#";
    footerLinkYt.href = localStorage.getItem("dvgcart_link_yt") || "#";
    
    const savedWaLink = localStorage.getItem("dvgcart_link_wa");
    if (savedWaLink) {
      footerLinkWa.href = savedWaLink;
    } else {
      const sanitizedPhone = adminPhone.replace(/[^0-9]/g, "");
      footerLinkWa.href = sanitizedPhone ? `https://wa.me/${sanitizedPhone}` : "#";
    }
  }

  // Logo Detection and Integration
  function initLogo() {
    const adminLogo = localStorage.getItem("dvgcart_logo");
    const faviconEl = document.getElementById("tab-favicon");
    
    if (adminLogo) {
      // Use admin uploaded base64 logo
      logoDisplayContainer.innerHTML = `
        <img src="${adminLogo}" class="logo-img" alt="DvgCart Logo" onerror="this.style.display='none'; document.getElementById('logo-text-fallback').style.display='flex'">
        <div id="logo-text-fallback" style="display: none; align-items: center; gap: 4px;">
          <div class="logo-icon-fallback">D</div> DVG<span>CART</span>
        </div>
      `;
      if (faviconEl) faviconEl.href = adminLogo;
    } else {
      // Check if logo.png exists in local files
      const img = new Image();
      img.onload = function() {
        logoDisplayContainer.innerHTML = `<img src="logo.png" class="logo-img" alt="DvgCart Logo">`;
        if (faviconEl) faviconEl.href = "logo.png";
      };
      img.onerror = function() {
        // Check for images/logo.png next
        const img2 = new Image();
        img2.onload = function() {
          logoDisplayContainer.innerHTML = `<img src="images/logo.png" class="logo-img" alt="DvgCart Logo">`;
          if (faviconEl) faviconEl.href = "images/logo.png";
        };
        img2.onerror = function() {
          // Fallback to default (already in HTML)
        };
        img2.src = "images/logo.png";
      };
      img.src = "logo.png";
    }
  }

  // Header Scroll Effect
  function initHeaderScroll() {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        mainHeader.classList.add("scrolled");
      } else {
        mainHeader.classList.remove("scrolled");
      }
    });
  }

  // Render Filters
  function renderFilters() {
    // Clear filters except "All"
    categoryFilters.innerHTML = '<button class="filter-btn active" data-category="all">All Creations</button>';
    footerCategoriesList.innerHTML = '';
    
    categories.forEach(category => {
      // Store filter
      const btn = document.createElement("button");
      btn.className = "filter-btn";
      btn.setAttribute("data-category", category);
      btn.textContent = category;
      categoryFilters.appendChild(btn);

      // Footer link
      const li = document.createElement("li");
      li.innerHTML = `<a href="#catalog" class="footer-cat-link" data-category="${category}">${category}</a>`;
      footerCategoriesList.appendChild(li);
    });

    // Add filter action listeners
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        renderProducts(e.target.getAttribute("data-category"));
      });
    });

    // Footer category link listeners
    document.querySelectorAll(".footer-cat-link").forEach(link => {
      link.addEventListener("click", (e) => {
        const cat = e.target.getAttribute("data-category");
        document.querySelectorAll(".filter-btn").forEach(b => {
          if (b.getAttribute("data-category") === cat) {
            b.click();
          }
        });
      });
    });
  }

  if (catalogSearchInput) {
    catalogSearchInput.addEventListener("input", () => {
      renderProducts();
    });
  }

  // Render Products Grid
  function renderProducts(filterCategory) {
    if (filterCategory !== undefined) {
      activeCategory = filterCategory;
    }

    productsGrid.innerHTML = "";
    
    // Refresh products in case they changed in admin
    try {
      products = getProducts();
      if (!Array.isArray(products)) {
        products = [];
      }
    } catch (e) {
      console.error("Failed to load products from cache:", e);
      products = [];
    }
    
    let filtered = [];
    try {
      filtered = activeCategory === "all" 
        ? products 
        : products.filter(p => p && p.category && String(p.category).toLowerCase() === activeCategory.toLowerCase());
    } catch (e) {
      console.error("Filter category error:", e);
      filtered = products || [];
    }

    const searchTerm = catalogSearchInput ? catalogSearchInput.value.toLowerCase().trim() : "";
    if (searchTerm) {
      filtered = filtered.filter(p => {
        if (!p) return false;
        const titleMatch = p.title ? String(p.title).toLowerCase().includes(searchTerm) : false;
        const descMatch = p.description ? String(p.description).toLowerCase().includes(searchTerm) : false;
        const catMatch = p.category ? String(p.category).toLowerCase().includes(searchTerm) : false;
        const specsMatch = p.specs && Array.isArray(p.specs) 
          ? p.specs.some(spec => spec && String(spec).toLowerCase().includes(searchTerm)) 
          : false;
        return titleMatch || descMatch || catMatch || specsMatch;
      });
    }

    if (filtered.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--color-text-muted);">
          <p class="serif" style="font-size: 20px; margin-bottom: 10px;">Collection Empty</p>
          <p style="font-size: 13px; font-weight: 300;">New luxury additions will arrive shortly.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(product => {
      if (!product) return;
      const card = document.createElement("div");
      card.className = "product-card";
      
      const badgeHTML = product.featured ? `<span class="product-card-badge">Exclusive</span>` : "";
      
      const priceVal = typeof product.price === "number" ? product.price : parseFloat(product.price) || 0;
      const priceFormatted = priceVal.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

      card.innerHTML = `
        <div class="product-card-img-container">
          ${badgeHTML}
          <img src="${product.image || 'images/watch.png'}" alt="${product.title || 'Product'}" class="product-card-img" onerror="this.src='images/watch.png'">
          <div class="product-card-overlay">
            <button class="action-circle-btn quickview-action" data-id="${product.id}" aria-label="Quick View">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="action-circle-btn addcart-action" data-id="${product.id}" aria-label="Add to Cart">
              <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </button>
          </div>
        </div>
        <div class="product-card-info">
          <span class="product-card-category">${product.category || 'Creations'}</span>
          <h3 class="product-card-title">${product.title || 'No Title'}</h3>
          <p class="product-card-desc">${product.description || ''}</p>
          <div class="product-card-footer">
            <span class="product-card-price">${priceFormatted}</span>
            <button class="btn-text-luxury quickview-text-action" data-id="${product.id}">Details</button>
          </div>
        </div>
      `;

      productsGrid.appendChild(card);
    });

    // Add Action Listeners
    document.querySelectorAll(".quickview-action, .quickview-text-action").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        openQuickView(id);
      });
    });

    document.querySelectorAll(".addcart-action").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        addToCart(id);
      });
    });
  }

  // Cart Operations
  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        quantity: 1
      });
    }

    saveCart();
    updateCartUI();
    showToast(`Added ${product.title} to collection.`);
    openCartDrawer();
  }

  function updateCartQty(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    saveCart();
    updateCartUI();
  }

  function removeFromCart(productId) {
    const item = cart.find(item => item.id === productId);
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    if (item) {
      showToast(`Removed ${item.title} from collection.`);
    }
  }

  function saveCart() {
    localStorage.setItem("dvgcart_cart", JSON.stringify(cart));
  }

  function updateCartUI() {
    // Total quantity badge
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cartCount.textContent !== String(totalQty) && totalQty > 0) {
      cartCount.classList.add("cart-bounce-anim");
      setTimeout(() => {
        cartCount.classList.remove("cart-bounce-anim");
      }, 400);
    }

    cartCount.textContent = totalQty;
    cartSummaryQty.textContent = totalQty;

    // Subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartSummaryTotal.textContent = subtotal.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

    // Render drawer items
    cartItemsContainer.innerHTML = "";
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty-message">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <p class="serif" style="font-size: 18px; color: var(--color-text-light);">Collection is Empty</p>
          <p style="font-size: 12px; font-weight: 300;">Indulge in our products to build your selection.</p>
        </div>
      `;
      checkoutTrigger.style.display = "none";
    } else {
      checkoutTrigger.style.display = "block";
      
      cart.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "cart-item";
        const priceFormatted = item.price.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
        
        itemEl.innerHTML = `
          <img src="${item.image}" alt="${item.title}" class="cart-item-img" onerror="this.src='images/watch.png'">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.title}</h4>
            <span class="cart-item-price">${priceFormatted}</span>
            <div class="cart-item-quantity-selector">
              <button class="qty-btn dec-qty" data-id="${item.id}">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn inc-qty" data-id="${item.id}">+</button>
            </div>
          </div>
          <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove Item">&times;</button>
        `;

        cartItemsContainer.appendChild(itemEl);
      });

      // Cart listeners
      document.querySelectorAll(".dec-qty").forEach(btn => {
        btn.addEventListener("click", (e) => {
          updateCartQty(e.target.getAttribute("data-id"), -1);
        });
      });

      document.querySelectorAll(".inc-qty").forEach(btn => {
        btn.addEventListener("click", (e) => {
          updateCartQty(e.target.getAttribute("data-id"), 1);
        });
      });

      document.querySelectorAll(".cart-item-remove").forEach(btn => {
        btn.addEventListener("click", (e) => {
          removeFromCart(e.target.getAttribute("data-id"));
        });
      });
    }
  }

  // Drawer Toggles
  function openCartDrawer() {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("active");
    document.body.style.overflow = "hidden"; // Disable scroll
  }

  function closeCartDrawer() {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("active");
    document.body.style.overflow = ""; // Enable scroll
  }

  cartTrigger.addEventListener("click", openCartDrawer);
  cartClose.addEventListener("click", closeCartDrawer);
  cartOverlay.addEventListener("click", closeCartDrawer);

  // Mobile Menu Drawer Toggles
  function openMobileMenu() {
    if (mobileMenuDrawer) mobileMenuDrawer.classList.add("open");
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMobileMenu() {
    if (mobileMenuDrawer) mobileMenuDrawer.classList.remove("open");
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (mobileMenuTrigger) mobileMenuTrigger.addEventListener("click", openMobileMenu);
  if (mobileMenuClose) mobileMenuClose.addEventListener("click", closeMobileMenu);
  if (mobileMenuOverlay) mobileMenuOverlay.addEventListener("click", closeMobileMenu);

  // Close mobile drawer when clicking navigation links
  mobileNavLinks.forEach(link => {
    link.addEventListener("click", () => {
      closeMobileMenu();
      
      // Update active styling
      mobileNavLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Quick View Modal
  function openQuickView(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const priceFormatted = product.price.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    
    // Build specs list HTML
    let specsHTML = "";
    if (product.specs && product.specs.length > 0) {
      specsHTML = `
        <h4 class="product-detail-specs-title">Specifications</h4>
        <ul class="product-detail-specs-list">
          ${product.specs.map(spec => `<li>${spec}</li>`).join("")}
        </ul>
      `;
    }

    quickViewContent.innerHTML = `
      <div class="product-detail-image-box">
        <img src="${product.image}" alt="${product.title}" class="product-detail-img" onerror="this.src='images/watch.png'">
      </div>
      <div class="product-detail-info-box">
        <span class="product-detail-category">${product.category}</span>
        <h3 class="product-detail-title">${product.title}</h3>
        <span class="product-detail-price">${priceFormatted}</span>
        <p class="product-detail-desc">${product.description}</p>
        ${specsHTML}
        <button class="btn-luxury add-to-cart-quickview" data-id="${product.id}" style="width: 100%;">Add to Collection</button>
      </div>
    `;

    quickViewModal.classList.add("open");
    document.body.style.overflow = "hidden";

    // Re-bind click event inside modal
    document.querySelector(".add-to-cart-quickview").addEventListener("click", (e) => {
      addToCart(e.target.getAttribute("data-id"));
      closeQuickView();
    });
  }

  function closeQuickView() {
    quickViewModal.classList.remove("open");
    if (!cartDrawer.classList.contains("open")) {
      document.body.style.overflow = "";
    }
  }

  quickViewClose.addEventListener("click", closeQuickView);
  quickViewModal.addEventListener("click", (e) => {
    if (e.target === quickViewModal) closeQuickView();
  });

  // Featured Item Trigger
  heroQuickViewBtn.addEventListener("click", () => {
    // Open the first featured product (prod-001 by default)
    const featured = products.find(p => p.featured) || products[0];
    if (featured) openQuickView(featured.id);
  });

  // Checkout Concierge
  checkoutTrigger.addEventListener("click", () => {
    closeCartDrawer();
    checkoutModal.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  function closeCheckout() {
    checkoutModal.classList.remove("open");
    document.body.style.overflow = "";
  }

  checkoutClose.addEventListener("click", closeCheckout);
  checkoutModal.addEventListener("click", (e) => {
    if (e.target === checkoutModal) closeCheckout();
  });

  // Transmit Checkout to WhatsApp
  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("cust-name").value;
    const phone = document.getElementById("cust-phone").value;
    const address = document.getElementById("cust-address").value;
    const notes = document.getElementById("cust-notes").value;

    // Format WhatsApp message
    let messageText = `✨ *DVGCART - LUXURY ORDER* ✨\n`;
    messageText += `------------------------------------\n\n`;
    messageText += `👤 *CLIENT DETAILS:*\n`;
    messageText += `• Name: ${name}\n`;
    messageText += `• Phone: ${phone}\n`;
    messageText += `• Address: ${address}\n`;
    if (notes) {
      messageText += `• Special Notes: ${notes}\n`;
    }
    messageText += `\n🛍️ *ACQUISITIONS:*\n`;
    
    let subtotal = 0;
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      messageText += `• ${item.quantity}x ${item.title} (₹${item.price.toLocaleString('en-IN')} ea) - ₹${itemTotal.toLocaleString('en-IN')}\n`;
    });
    
    messageText += `\n💵 *TOTAL VALUE:* ₹${subtotal.toLocaleString('en-IN')}\n`;
    messageText += `------------------------------------\n`;
    messageText += `🚀 Transmitted via Concierge Services.`;

    // Encode message
    const encodedText = encodeURIComponent(messageText);
    
    // Retrieve latest admin phone setting
    adminPhone = localStorage.getItem("dvgcart_admin_phone") || "18008008800";
    // Sanitize phone number (remove spaces, symbols)
    const sanitizedPhone = adminPhone.replace(/[^0-9]/g, "");

    const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodedText}`;

    // Show simulated progress
    showToast("Preparing connection to VIP concierge...", 2000);

    setTimeout(() => {
      // Save simulated order log in LocalStorage for admin dashboard
      const orders = JSON.parse(localStorage.getItem("dvgcart_orders")) || [];
      const newOrder = {
        orderId: "ORD-" + Math.floor(1000 + Math.random() * 9000),
        clientName: name,
        clientPhone: phone,
        items: cart,
        total: subtotal,
        date: new Date().toLocaleDateString(),
        status: "Transmitted"
      };
      orders.unshift(newOrder);
      localStorage.setItem("dvgcart_orders", JSON.stringify(orders));

      // Open WhatsApp redirection link
      window.open(whatsappUrl, "_blank");

      // Reset cart
      cart = [];
      saveCart();
      updateCartUI();
      closeCheckout();
      
      // Toast notification of order completion
      showToast("Order transmitted successfully. Welcome to DvgCart.", 5000);
    }, 1500);
  });

  // Luxury Toast System
  function showToast(message, duration = 3000) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <span class="toast-success-icon">✨</span>
      <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => {
        toast.remove();
      }, 5000);
    }, duration);
  }

  // Background Sync from Cloud
  async function performBackgroundSync() {
    const cloudData = await fetchCloudCatalog();
    if (cloudData) {
      try {
        products = getProducts();
        categories = getCategories();
      } catch (e) {
        console.error("Cache parsing failed after cloud sync:", e);
      }
      renderFilters();
      renderProducts();
      console.log("Storefront catalog synced from cloud.");
    } else {
      // Fallback to local catalog if sync fails or times out
      try {
        products = getProducts();
        categories = getCategories();
      } catch (e) {
        console.error("Cache parsing failed during offline fallback:", e);
      }
      renderFilters();
      renderProducts();
    }
  }
  performBackgroundSync();
});

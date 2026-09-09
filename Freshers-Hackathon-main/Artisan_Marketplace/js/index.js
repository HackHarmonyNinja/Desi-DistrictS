(function () {
  const STORAGE = {
    PRODUCTS: "dd_products",
    CART: "dd_cart",
    WISHLIST: "dd_wishlist",
    REVIEW: "desi_review_id"
  };

  // Product images mapped by product id
  const PRODUCT_IMAGES = {
    1: "assets/images/product-terracotta.png",
    2: "https://images.unsplash.com/photo-1610030469668-3979d3879c69?w=600&q=80",
    3: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80",
    4: "https://images.unsplash.com/photo-1594969155192-a54ab70f51ed?w=600&q=80",
    5: "https://images.unsplash.com/photo-1605210055498-0e5277ad4402?w=600&q=80",
    6: "https://images.unsplash.com/photo-1606293926249-ed22e446aa98?w=600&q=80"
  };

  const PRODUCTS = [
    { id: 1, title: "Handcrafted Terracotta Vase", category: "Handicrafts", price: 499, desc: "Decorative handmade terracotta vase shaped on a traditional potter's wheel", featured: true },
    { id: 2, title: "Traditional Bandhani Fabric", category: "Textiles", price: 799, desc: "Authentic Bandhani tie-dye textile from the artisans of Kutch" },
    { id: 3, title: "Organic Millet Cookies", category: "Bakery", price: 299, desc: "Freshly baked organic millet cookies with jaggery and dry fruits", featured: true },
    { id: 4, title: "Handcrafted Bamboo Flute", category: "Musical instruments", price: 349, desc: "Traditional bansuri crafted from seasoned bamboo by master artisans" },
    { id: 5, title: "Clay Festival Diyas (Pack of 6)", category: "Handicrafts", price: 199, desc: "Handmade and hand-painted clay diya set for festive celebrations", featured: true },
    { id: 6, title: "Handwoven Cotton Shawl", category: "Textiles", price: 999, desc: "Soft hand-woven winter cotton shawl with traditional weave patterns" }
  ];

  localStorage.setItem(STORAGE.PRODUCTS, JSON.stringify(PRODUCTS));
  const featuredWrap = document.getElementById("homeProducts");
  const shownCount = document.getElementById("homeShownCount");

  function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem(STORAGE.CART) || "{}");
    const totalItems = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll("#navCartCount, #navCartCount2, #navCartCount3")
      .forEach(el => el.textContent = totalItems);
  }

  function render(list, container) {
    if (!container) return;
    const wishlist = JSON.parse(localStorage.getItem(STORAGE.WISHLIST) || "{}");
    container.innerHTML = "";

    list.forEach(p => {
      const isWishlisted = !!wishlist[p.id];
      const imgSrc = PRODUCT_IMAGES[p.id] || "";
      const card = document.createElement("div");
      card.className = "product";
      card.innerHTML = `
        <div class="product-image-wrap">
          <img class="product-image" src="${imgSrc}" alt="${p.title}" loading="lazy">
        </div>
        <div class="product-body">
          <div class="product-category">${p.category}</div>
          <h4>${p.title}</h4>
          <p class="desc">${p.desc}</p>
          <div class="price">₹${p.price}</div>
          <div class="actions">
            <button class="btn primary add" data-id="${p.id}">Add to Cart</button>
            <button class="icon-like wish" data-id="${p.id}">${isWishlisted ? '💛' : '🤍'}</button>
            <button class="btn ghost review" data-id="${p.id}">Review</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    if (shownCount) shownCount.textContent = list.length;

    container.addEventListener("click", (e) => {
      const btn = e.target;
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains("add")) {
        const cart = JSON.parse(localStorage.getItem(STORAGE.CART) || "{}");
        const item = cart[id] || { id: +id, qty: 0 };
        item.qty++;
        cart[id] = item;
        localStorage.setItem(STORAGE.CART, JSON.stringify(cart));
        updateCartUI();
        alert("Added to cart");
      }

      if (btn.classList.contains("wish")) {
        const w = JSON.parse(localStorage.getItem(STORAGE.WISHLIST) || "{}");
        if (w[id]) {
          delete w[id];
          btn.textContent = '🤍';
        } else {
          w[id] = true;
          btn.textContent = '💛';
        }
        localStorage.setItem(STORAGE.WISHLIST, JSON.stringify(w));
      }

      if (btn.classList.contains("review")) {
        localStorage.setItem(STORAGE.REVIEW, id);
        window.location.href = "review.html";
      }
    });
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // Mobile hamburger toggle
  const navToggle = document.getElementById('navToggle');
  const navRight = document.getElementById('navRight');
  if (navToggle && navRight) {
    navToggle.addEventListener('click', () => {
      navRight.classList.toggle('open');
      navToggle.textContent = navRight.classList.contains('open') ? '✕' : '☰';
    });
  }

  if (featuredWrap) {
    render(PRODUCTS.filter(p => p.featured), featuredWrap);
    updateCartUI();
  }
})();

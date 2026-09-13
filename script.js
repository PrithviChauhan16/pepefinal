/* PEPE KUN - functionality only. UI/design/photos unchanged */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://cmxhngjykgoqblobyefh.supabase.co';
  const SUPABASE_ANON_KEY =
    'sb_publishable_05GBhGfDMBLN009-tv5soQ_XkQ_7jPc';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase library did not load.');
    return;
  }

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  let products = [];
  let cart = JSON.parse(localStorage.getItem('pepekun_cart') || '[]');
  let currentUser = null;

  function toggleMobileMenu() {
    const m = document.getElementById('mobile-menu');

    if (m) {
      m.classList.toggle('hidden');
      m.classList.toggle('flex');
    }
  }

  function escapeHtml(v = '') {
    return String(v).replace(
      /[&<>'"]/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[c])
    );
  }

  async function loadProducts() {
    // Do NOT order by created_at because products table does not have that column.
    const { data, error } = await supabaseClient
      .from('products')
      .select('*');

   if (error) {
  console.error('PRODUCTS LOAD ERROR:', error);
  alert('Products error: ' + error.message);
  return;
}

    products = data || [];
  }

  async function loadUserAndCart() {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    currentUser = user || null;

    if (currentUser) {
      const { data, error } = await supabaseClient
        .from('carts')
        .select('items')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!error && data?.items) {
        cart = data.items;
        localStorage.setItem(
          'pepekun_cart',
          JSON.stringify(cart)
        );
      }
    }

    updateCartUI();
  }

  async function syncCart() {
    localStorage.setItem(
      'pepekun_cart',
      JSON.stringify(cart)
    );

    if (currentUser) {
      const { error } = await supabaseClient
        .from('carts')
        .upsert(
          {
            user_id: currentUser.id,
            items: cart
          },
          {
            onConflict: 'user_id'
          }
        );

      if (error) {
        console.error('Cart save error:', error);
      }
    }

    updateCartUI();
  }

  function updateCartUI() {
    const count = cart.reduce(
      (n, i) => n + (Number(i.quantity) || 1),
      0
    );

    [
      'cart-count',
      'cart-count-mobile'
    ].forEach(id => {
      const e = document.getElementById(id);

      if (e) {
        e.textContent = count;
      }
    });
  }

  async function addToCart(productId) {
    const p = products.find(
      x => String(x.id) === String(productId)
    );

    if (!p) return;

    const existing = cart.find(
      x =>
        String(x.product_id || x.id) ===
        String(productId)
    );

    if (existing) {
      existing.quantity =
        (Number(existing.quantity) || 1) + 1;
    } else {
      cart.push({
        ...p,
        product_id: p.id,
        quantity: 1
      });
    }

    await syncCart();

    const b = document.getElementById(`btn-${productId}`);

    if (b) {
      const old = b.textContent;

      b.textContent = 'Added ✓';

      setTimeout(() => {
        b.textContent = old;
      }, 1200);
    }
  }

  function showCategory(categoryName) {
    const section =
      document.getElementById('product-display');

    const grid =
      document.getElementById('product-grid');

    const title =
      document.getElementById('active-category-title');

    if (!section || !grid) {
      console.error('Product display elements not found.');
      return;
    }

    const list = products.filter(
      p =>
        String(p.category || '').toLowerCase() ===
        String(categoryName || '').toLowerCase()
    );

    if (title) {
      title.textContent = categoryName;
    }

    grid.innerHTML = list.length
      ? list
          .map(
            p => `
        <div class="masonry-item bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group">

          <div class="cloud-tag">
            ${escapeHtml(p.tag || 'PEPE KUN')}
          </div>

          <div class="w-full ${escapeHtml(
            p.heightClass || 'h-[300px]'
          )} overflow-hidden">

            <img
              src="${escapeHtml(p.image_url || p.image || '')}"
              onclick="openProductModal('${escapeHtml(p.id)}')"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
              alt="${escapeHtml(p.name || '')}"
            >

          </div>

          <div class="p-4 md:p-5">

            <div class="flex justify-between gap-3">

              <h3
                onclick="openProductModal('${escapeHtml(p.id)}')"
                class="font-medium text-lg cursor-pointer hover:text-pink-500"
              >
                ${escapeHtml(p.name)}
              </h3>

              <span class="font-semibold">
                ₹${Number(p.price || 0).toLocaleString('en-IN')}
              </span>

            </div>

            <button
              id="btn-${escapeHtml(p.id)}"
              onclick="addToCart('${escapeHtml(p.id)}')"
              class="mt-4 w-full bg-brand-900 text-white rounded-full py-2.5"
            >
              Add to Cart
            </button>

          </div>
        </div>
      `
          )
          .join('')
      : `
        <div class="col-span-full text-center bg-white/80 rounded-3xl p-12">
          No products in this collection yet.
        </div>
      `;

    section.classList.remove('hidden');

    setTimeout(() => {
      section.classList.remove('opacity-0');

      section.scrollIntoView({
        behavior: 'smooth'
      });
    }, 20);
  }

  function hideProducts() {
    const s =
      document.getElementById('product-display');

    if (!s) return;

    s.classList.add('opacity-0');

    setTimeout(() => {
      s.classList.add('hidden');
    }, 300);
  }

  function updateCenterMedia(type, url) {
    const img =
      document.getElementById('center-img');

    const vc =
      document.getElementById('center-video-container');

    const v =
      document.getElementById('center-video');

    const src =
      document.getElementById('center-video-src');

    if (!img || !vc || !v || !src) return;

    if (type === 'image') {
      v.pause();

      vc.classList.add('hidden');

      img.src = url;

      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');

      src.src = url;

      v.load();

      v.play().catch(() => {});

      vc.classList.remove('hidden');
    }
  }

  function openProductModal(id) {
    const p = products.find(
      x => String(x.id) === String(id)
    );

    if (!p) return;

    const modalTitle =
      document.getElementById('modal-title');

    const modalPrice =
      document.getElementById('modal-price');

    const modalCategory =
      document.getElementById('modal-category');

    const modalDesc =
      document.getElementById('modal-desc');

    const modalMainImg =
      document.getElementById('modal-main-img');

    const modalSpecs =
      document.getElementById('modal-specs');

    const modalGallery =
      document.getElementById('modal-gallery');

    const modalAddBtn =
      document.getElementById('modal-add-btn');

    const modalBuyBtn =
      document.getElementById('modal-buy-btn');

    if (modalTitle)
      modalTitle.textContent = p.name || '';

    if (modalPrice)
      modalPrice.textContent =
        `₹${Number(p.price || 0).toLocaleString('en-IN')}`;

    if (modalCategory)
      modalCategory.textContent =
        p.category || '';

    if (modalDesc)
      modalDesc.textContent =
        p.description ||
        'A beautifully crafted companion from Pepe Kun.';

    if (modalMainImg)
      modalMainImg.src =
        p.image_url || p.image || '';

    const specs =
      Array.isArray(p.specs)
        ? p.specs
        : [];

    if (modalSpecs) {
      modalSpecs.innerHTML = specs.length
        ? specs
            .map(
              x =>
                `<li>• ${escapeHtml(x)}</li>`
            )
            .join('')
        : '<li>• Premium plush material</li>';
    }

    const gallery =
      Array.isArray(p.gallery) &&
      p.gallery.length
        ? p.gallery
        : [p.image_url || p.image];

    if (modalGallery) {
      modalGallery.innerHTML = gallery
        .filter(Boolean)
        .map(
          x => `
            <img
              src="${escapeHtml(x)}"
              onclick="document.getElementById('modal-main-img').src='${escapeHtml(x)}'"
              class="w-20 h-20 object-cover rounded-xl border-2 border-transparent hover:border-pink-500 cursor-pointer"
              alt=""
            >
          `
        )
        .join('');
    }

    if (modalAddBtn) {
      modalAddBtn.onclick = () =>
        addToCart(p.id);
    }

    if (modalBuyBtn) {
      modalBuyBtn.onclick = async () => {
        await addToCart(p.id);
        location.href = 'cart.html';
      };
    }

    const m =
      document.getElementById('product-modal');

    if (m) {
      m.classList.remove('hidden');
      m.classList.add('flex');

      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    const m =
      document.getElementById('product-modal');

    if (!m) return;

    m.classList.add('hidden');
    m.classList.remove('flex');

    document.body.style.overflow = 'auto';
  }

  async function submitEnquiry(e) {
    e.preventDefault();

    const form = e.target;

    const name =
      form
        .querySelector('[name=name]')
        ?.value.trim() || '';

    const email =
      form
        .querySelector('[name=email]')
        ?.value.trim() || '';

    const message =
      form
        .querySelector('[name=message]')
        ?.value.trim() || '';

    const { error } =
      await supabaseClient
        .from('enquiries')
        .insert([
          {
            name,
            email,
            message
          }
        ]);

    if (error) {
      console.error('Enquiry error:', error);

      alert(
        'Could not send message: ' +
          error.message
      );

      return;
    }

    form.reset();

    alert('Message sent successfully!');
  }

  /*
    IMPORTANT:
    These make the functions available to
    onclick="..." handlers in index.html.
  */

  window.toggleMobileMenu = toggleMobileMenu;
  window.showCategory = showCategory;
  window.hideProducts = hideProducts;
  window.updateCenterMedia = updateCenterMedia;
  window.openProductModal = openProductModal;
  window.closeModal = closeModal;
  window.addToCart = addToCart;

  document.addEventListener(
    'DOMContentLoaded',
    async () => {
      await loadProducts();
      await loadUserAndCart();

      const f =
        document.getElementById('contact-form');

      if (f) {
        f.addEventListener(
          'submit',
          submitEnquiry
        );
      }
    }
  );
})();

/* PEPE KUN - functionality and DOM interactions */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://cmxhngjykgoqblobyefh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjbXhobmdqa2dvcWJsb2J5ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDAwNTMsImV4cCI6MjEwNDgxNjA1M30.puMa5Ty4NTWxzTM9gnSHzqAVMzgMhgAfTPu-8sIVgPM';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase library did not load.');
    return;
  }

  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
    return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  async function loadProducts() {
    const { data, error } = await supabaseClient.from('products').select('*');
    if (error) {
      console.error('PRODUCTS LOAD ERROR:', error);
      return;
    }
    products = data || [];
  }

  async function loadUserAndCart() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user || null;

    if (currentUser) {
      document.getElementById('auth-login-btn')?.classList.add('hidden');
      document.getElementById('auth-account-btn')?.classList.remove('hidden');
      document.getElementById('mobile-login-btn')?.classList.add('hidden');
      document.getElementById('mobile-account-btn')?.classList.remove('hidden');
      
      const { data, error } = await supabaseClient.from('carts').select('items').eq('user_id', currentUser.id).maybeSingle();
      if (!error && data?.items) {
        cart = data.items;
        localStorage.setItem('pepekun_cart', JSON.stringify(cart));
      }
    }
    updateCartUI();
  } 

  async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html'; 
  }

  async function syncCart() {
    localStorage.setItem('pepekun_cart', JSON.stringify(cart));
    if (currentUser) {
      await supabaseClient.from('carts').upsert({ user_id: currentUser.id, items: cart }, { onConflict: 'user_id' });
    }
    updateCartUI();
  }

  function updateCartUI() {
    const count = cart.reduce((n, i) => n + (Number(i.quantity) || 1), 0);
    ['cart-count', 'cart-count-mobile'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.textContent = count;
    });
  }

  async function addToCart(productId) {
    const p = products.find(x => String(x.id) === String(productId));
    if (!p) return;

    const existing = cart.find(x => String(x.product_id || x.id) === String(productId));
    if (existing) {
      existing.quantity = (Number(existing.quantity) || 1) + 1;
    } else {
      cart.push({ ...p, product_id: p.id, quantity: 1 });
    }

    await syncCart();

    const b = document.getElementById(`btn-${productId}`);
    if (b) {
      const old = b.textContent;
      b.textContent = 'Added ✓';
      setTimeout(() => b.textContent = old, 1200);
    }
  }

  function showCategory(categoryName) {
    const section = document.getElementById('product-display');
    const grid = document.getElementById('product-grid');
    const catGrid = document.getElementById('category-grid');
    const catHeader = document.getElementById('category-header');

    if (!section || !grid) return;

    const list = products.filter(p => String(p.category || '').toLowerCase() === String(categoryName || '').toLowerCase());

    grid.innerHTML = list.length
      ? list.map(p => `
        <div class="group flex flex-col gap-3">
          <div class="relative w-full aspect-square pepe-box overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
            ${p.tag ? `<div class="cloud-tag">${escapeHtml(p.tag)}</div>` : ''}
            <img src="${escapeHtml(p.image_url || p.image || '')}" onclick="openProductModal('${escapeHtml(p.id)}')" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" alt="${escapeHtml(p.name || '')}">
          </div>
          
          <div class="px-1 text-left flex flex-col">
            <h3 onclick="openProductModal('${escapeHtml(p.id)}')" class="font-medium text-gray-900 cursor-pointer hover:text-pink-500 text-base md:text-lg tracking-wide">${escapeHtml(p.name)}</h3>
            <span class="text-gray-600 text-sm mt-1">₹${Number(p.price || 0).toLocaleString('en-IN')}</span>
            
            <button id="btn-${escapeHtml(p.id)}" onclick="addToCart('${escapeHtml(p.id)}')" class="mt-3 w-fit px-5 py-2 border border-gray-800 rounded-full text-xs font-medium hover:bg-gray-800 hover:text-white transition-colors">
              + Add to Cart
            </button>
          </div>
        </div>
      `).join('')
      : `<div class="col-span-full text-center bg-white/80 rounded-3xl p-12">No products in this collection yet.</div>`;

    if (catHeader) catHeader.classList.add('hidden');

    const catButtons = document.querySelectorAll('.category-btn');
    catButtons.forEach(btn => {
        if (btn.getAttribute('data-category') === categoryName) {
            btn.classList.remove('hidden');
            btn.style.pointerEvents = 'none'; 
            btn.classList.remove('hover:shadow-2xl'); 
        } else {
            btn.classList.add('hidden');
        }
    });

    if (catGrid) {
        catGrid.classList.remove('md:grid-cols-3');
        catGrid.classList.add('max-w-2xl', 'mx-auto'); 
    }

    section.classList.remove('hidden');
    setTimeout(() => {
      section.classList.remove('opacity-0');
      document.getElementById('categories').scrollIntoView({ behavior: 'smooth' });
    }, 20);
  }

  function hideProducts() {
    const section = document.getElementById('product-display');
    const catGrid = document.getElementById('category-grid');
    const catHeader = document.getElementById('category-header');

    if (!section) return;

    section.classList.add('opacity-0');

    setTimeout(() => {
      section.classList.add('hidden');
      if (catHeader) catHeader.classList.remove('hidden');
      
      const catButtons = document.querySelectorAll('.category-btn');
      catButtons.forEach(btn => {
          btn.classList.remove('hidden');
          btn.style.pointerEvents = 'auto'; 
          btn.classList.add('hover:shadow-2xl'); 
      });

      if (catGrid) {
          catGrid.classList.add('md:grid-cols-3');
          catGrid.classList.remove('max-w-2xl', 'mx-auto');
      }
      document.getElementById('categories').scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }

  function updateCenterMedia(type, url) {
    const img = document.getElementById('center-img');
    const vc = document.getElementById('center-video-container');
    const v = document.getElementById('center-video');
    const src = document.getElementById('center-video-src');

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
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;

    const m = document.getElementById('product-modal');
    if (m) {
      document.getElementById('modal-title').textContent = p.name || '';
      document.getElementById('modal-price').textContent = `₹${Number(p.price || 0).toLocaleString('en-IN')}`;
      document.getElementById('modal-category').textContent = p.category || '';
      document.getElementById('modal-desc').textContent = p.description || 'A beautifully crafted companion from Pepe Kun.';
      document.getElementById('modal-main-img').src = p.image_url || p.image || '';

      const specs = Array.isArray(p.specs) ? p.specs : [];
      document.getElementById('modal-specs').innerHTML = specs.length ? specs.map(x => `<li>• ${escapeHtml(x)}</li>`).join('') : '<li>• Premium plush material</li>';
      
      const gallery = Array.isArray(p.gallery) && p.gallery.length ? p.gallery : [p.image_url || p.image];
      document.getElementById('modal-gallery').innerHTML = gallery.filter(Boolean).map(x => `<img src="${escapeHtml(x)}" onclick="document.getElementById('modal-main-img').src='${escapeHtml(x)}'" class="w-20 h-20 object-cover rounded-xl border-2 border-transparent hover:border-pink-500 cursor-pointer" alt="">`).join('');

      document.getElementById('modal-add-btn').onclick = () => addToCart(p.id);
      document.getElementById('modal-buy-btn').onclick = async () => { await addToCart(p.id); location.href = 'cart.html'; };

      m.classList.remove('hidden');
      m.classList.add('flex');
      
      // Ensures smooth fade transition
      setTimeout(() => m.classList.remove('opacity-0'), 10);
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    const m = document.getElementById('product-modal');
    if (!m) return;
    
    m.classList.add('opacity-0');
    setTimeout(() => {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }, 300);
    document.body.style.overflow = 'auto';
  }

  async function submitEnquiry(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('[name=name]')?.value.trim() || '';
    const email = form.querySelector('[name=email]')?.value.trim() || '';
    const message = form.querySelector('[name=message]')?.value.trim() || '';
    
    const { error } = await supabaseClient.from('enquiries').insert([{ name, email, message }]);
    if (error) { alert('Could not send message: ' + error.message); return; }
    form.reset();
    alert('Message sent successfully!');
  }

  window.toggleMobileMenu = toggleMobileMenu;
  window.showCategory = showCategory;
  window.hideProducts = hideProducts;
  window.updateCenterMedia = updateCenterMedia;
  window.openProductModal = openProductModal;
  window.closeModal = closeModal;
  window.addToCart = addToCart;
  window.logout = logout;

  document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    await loadUserAndCart();
    const f = document.getElementById('contact-form');
    if (f) f.addEventListener('submit', submitEnquiry);
  });
})();

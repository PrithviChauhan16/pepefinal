/* PEPE KUN - functionality only. No global supabase declaration. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://cmxhngjykgoqblobyefh.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjbXhobmdqa2dvcWJsb2J5ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDAwNTMsImV4cCI6MjEwNDgxNjA1M30.puMa5Ty4NTWxzTM9gnSHzqAVMzgMhgAfTPu-8sIVgPM';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase library did not load.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let products = [];
  let cart = JSON.parse(localStorage.getItem('pepekun_cart') || '[]');
  let currentUser = null;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function toggleMobileMenu() {
    const m = $('mobile-menu');
    if (m) { m.classList.toggle('hidden'); m.classList.toggle('flex'); }
  }

  function updateCartUI() {
    const count = cart.reduce((n, x) => n + Number(x.quantity || 1), 0);
    ['cart-count','cart-count-mobile'].forEach(id => { const el=$(id); if(el) el.textContent=count; });
  }

  async function syncCart() {
    localStorage.setItem('pepekun_cart', JSON.stringify(cart));
    updateCartUI();
    if (!currentUser) return;
    const { error } = await client.from('carts').upsert({user_id: currentUser.id, items: cart}, {onConflict:'user_id'});
    if (error) console.error('Cart save error:', error);
  }

  async function loadProducts() {
    const { data, error } = await client.from('products').select('*').order('created_at', {ascending:false});
    if (error) { console.error('Products load error:', error); return; }
    products = data || [];
  }

  async function loadUserAndCart() {
    const { data } = await client.auth.getUser();
    currentUser = data?.user || null;
    if (currentUser) {
      const r = await client.from('carts').select('items').eq('user_id', currentUser.id).maybeSingle();
      if (!r.error && r.data?.items) cart = r.data.items;
    }
    localStorage.setItem('pepekun_cart', JSON.stringify(cart));
    updateCartUI();
  }

  function showCategory(category) {
    const display = $('product-display'), grid = $('product-grid'), title = $('active-category-title');
    if (!display || !grid) return;
    const matches = products.filter(p => String(p.category || '').toLowerCase() === category.toLowerCase());
    if (title) title.textContent = category;
    grid.innerHTML = matches.length ? matches.map(p => `
      <div class="bg-white/70 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <img src="${esc(p.image_url || p.image || '')}" class="w-full h-64 object-cover" alt="${esc(p.name)}">
        <div class="p-5">
          <h3 class="font-semibold text-lg">${esc(p.name)}</h3>
          <p class="mt-1 text-gray-600">₹${Number(p.price || 0).toLocaleString('en-IN')}</p>
          <button onclick="openProductModal('${esc(p.id)}')" class="mt-4 w-full bg-brand-900 text-white py-3 rounded-full">View Product</button>
        </div>
      </div>`).join('') : '<p class="col-span-full text-center py-10 text-gray-500">No products found in this collection yet.</p>';
    display.classList.remove('hidden');
    display.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function hideProducts() { const d=$('product-display'); if(d) d.classList.add('hidden'); }

  function updateCenterMedia(type, url) {
    const img=$('center-img'), vc=$('center-video-container'), video=$('center-video'), src=$('center-video-src');
    if(type==='video') {
      if(img) img.classList.add('hidden');
      if(vc) vc.classList.remove('hidden');
      if(src) src.src=url;
      if(video) { video.load(); video.play().catch(()=>{}); }
    } else {
      if(video) video.pause();
      if(vc) vc.classList.add('hidden');
      if(img) { img.src=url; img.classList.remove('hidden'); }
    }
  }

  function openProductModal(id) {
    const p = products.find(x => String(x.id) === String(id));
    if(!p) return;
    $('modal-product-id').value = p.id;
    $('modal-title').textContent = p.name || '';
    $('modal-description').textContent = p.description || '';
    $('modal-price').textContent = '₹' + Number(p.price || 0).toLocaleString('en-IN');
    $('modal-image').src = p.image_url || p.image || '';
    $('product-modal').classList.remove('hidden');
    $('product-modal').classList.add('flex');
    $('modal-add-btn').onclick = () => addToCart(p.id);
    $('modal-buy-btn').onclick = () => { addToCart(p.id); window.location.href='cart.html'; };
  }

  function closeModal() { const m=$('product-modal'); if(m){m.classList.add('hidden');m.classList.remove('flex');} }

  async function addToCart(id) {
    const p=products.find(x=>String(x.id)===String(id));
    if(!p) return;
    const existing=cart.find(x=>String(x.product_id || x.id)===String(id));
    if(existing) existing.quantity=(existing.quantity||1)+1;
    else cart.push({product_id:p.id,name:p.name,price:p.price,image_url:p.image_url || p.image || '',quantity:1});
    await syncCart();
    closeModal();
    alert('Added to cart!');
  }

  async function submitContactForm(e) {
    if(e) e.preventDefault();
    const form=$('contact-form');
    if(!form) return;
    const fd=new FormData(form);
    const payload={name:fd.get('name'),email:fd.get('email'),message:fd.get('message')};
    const {error}=await client.from('enquiries').insert(payload);
    if(error){console.error(error); alert('Could not send your message. Please try again.'); return;}
    alert('Thank you! Your message has been sent.'); form.reset();
  }

  window.toggleMobileMenu=toggleMobileMenu;
  window.showCategory=showCategory;
  window.hideProducts=hideProducts;
  window.updateCenterMedia=updateCenterMedia;
  window.openProductModal=openProductModal;
  window.closeModal=closeModal;
  window.addToCart=addToCart;

  document.addEventListener('DOMContentLoaded', async () => {
    const form=$('contact-form'); if(form) form.addEventListener('submit', submitContactForm);
    await loadProducts();
    await loadUserAndCart();
  });
})();

const SUPABASE_URL = 'https://cmxhngjykgoqblobyefh.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjbXhobmdqa2dvcWJsb2J5ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDAwNTMsImV4cCI6MjEwNDgxNjA1M30.puMa5Ty4NTWxzTM9gnSHzqAVMzgMhgAfTPu-8sIVgPM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let products = [];
let cart = JSON.parse(localStorage.getItem('pepekun_cart') || '[]');
let currentUser = null;

function toggleMobileMenu(){ const m=document.getElementById('mobile-menu'); if(m){m.classList.toggle('hidden');m.classList.toggle('flex');} }
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function loadProducts(){
  const {data,error}=await supabase.from('products').select('*');
  if(error){console.error(error); alert('Products could not be loaded. Check your Supabase products table/RLS.'); return;}
  products=data||[];
}

async function loadUserAndCart(){
  const {data:{user}}=await supabase.auth.getUser(); currentUser=user||null;
  if(currentUser){
    const {data,error}=await supabase.from('carts').select('items').eq('user_id',currentUser.id).maybeSingle();
    if(!error && data?.items) { cart=data.items; localStorage.setItem('pepekun_cart',JSON.stringify(cart)); }
  }
  updateCartUI();
}
async function syncCart(){
  localStorage.setItem('pepekun_cart',JSON.stringify(cart));
  if(currentUser){
    const {error}=await supabase.from('carts').upsert({user_id:currentUser.id,items:cart},{onConflict:'user_id'});
    if(error) console.error('Cart save error',error);
  }
  updateCartUI();
}
function updateCartUI(){
  const count=cart.reduce((n,i)=>n+(Number(i.quantity)||1),0);
  ['cart-count','cart-count-mobile'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=count;});
}
async function addToCart(productId){
  const p=products.find(x=>String(x.id)===String(productId)); if(!p)return;
  const existing=cart.find(x=>String(x.id)===String(productId));
  if(existing) existing.quantity=(Number(existing.quantity)||1)+1; else cart.push({...p,quantity:1});
  await syncCart();
  const b=document.getElementById(`btn-${productId}`); if(b){const old=b.textContent;b.textContent='Added ✓';setTimeout(()=>b.textContent=old,1200);}
}
function showCategory(categoryName){
 const section=document.getElementById('product-display'),grid=document.getElementById('product-grid'),title=document.getElementById('active-category-title');
 const list=products.filter(p=>p.category===categoryName);
 title.textContent=categoryName;
 grid.innerHTML=list.length?list.map(p=>`<div class="masonry-item bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative group"><div class="cloud-tag">${escapeHtml(p.tag||'PEPE KUN')}</div><div class="w-full ${escapeHtml(p.heightClass||'h-[300px]')} overflow-hidden"><img src="${escapeHtml(p.image||'')}" onclick="openProductModal('${p.id}')" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"></div><div class="p-4 md:p-5"><div class="flex justify-between gap-3"><h3 onclick="openProductModal('${p.id}')" class="font-medium text-lg cursor-pointer hover:text-pink-500">${escapeHtml(p.name)}</h3><span class="font-semibold">₹${Number(p.price||0)}</span></div><button id="btn-${p.id}" onclick="addToCart('${p.id}')" class="mt-4 w-full bg-brand-900 text-white rounded-full py-2.5">Add to Cart</button></div></div>`).join(''):'<div class="col-span-full text-center bg-white/80 rounded-3xl p-12">No products in this collection yet.</div>';
 section.classList.remove('hidden');setTimeout(()=>{section.classList.remove('opacity-0');section.scrollIntoView({behavior:'smooth'});},20);
}
function hideProducts(){const s=document.getElementById('product-display');s.classList.add('opacity-0');setTimeout(()=>s.classList.add('hidden'),300);}
function updateCenterMedia(type,url){const img=document.getElementById('center-img'),vc=document.getElementById('center-video-container'),v=document.getElementById('center-video'),src=document.getElementById('center-video-src');if(type==='image'){v.pause();vc.classList.add('hidden');img.src=url;img.classList.remove('hidden')}else{img.classList.add('hidden');src.src=url;v.load();v.play().catch(()=>{});vc.classList.remove('hidden')}}
function openProductModal(id){
 const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
 document.getElementById('modal-title').textContent=p.name;document.getElementById('modal-price').textContent=`₹${Number(p.price||0)}`;document.getElementById('modal-category').textContent=p.category||'';document.getElementById('modal-desc').textContent=p.description||'A beautifully crafted companion from Pepe Kun.';document.getElementById('modal-main-img').src=p.image||'';
 const specs=Array.isArray(p.specs)?p.specs:[];document.getElementById('modal-specs').innerHTML=specs.length?specs.map(x=>`<li>• ${escapeHtml(x)}</li>`).join(''):'<li>• Premium plush material</li>';
 document.getElementById('modal-gallery').innerHTML=[...(Array.isArray(p.gallery)&&p.gallery.length?p.gallery:[p.image])].filter(Boolean).map(x=>`<img src="${escapeHtml(x)}" onclick="document.getElementById('modal-main-img').src='${escapeHtml(x)}'" class="w-20 h-20 object-cover rounded-xl border-2 border-transparent hover:border-pink-500 cursor-pointer">`).join('');
 document.getElementById('modal-add-btn').onclick=()=>addToCart(p.id);document.getElementById('modal-buy-btn').onclick=async()=>{await addToCart(p.id);location.href='cart.html'};
 const m=document.getElementById('product-modal');m.classList.remove('hidden');m.classList.add('flex');document.body.style.overflow='hidden';
}
function closeModal(){const m=document.getElementById('product-modal');m.classList.add('hidden');m.classList.remove('flex');document.body.style.overflow='auto';}

async function submitEnquiry(e){
 e.preventDefault(); const form=e.target; const name=form.querySelector('[name=name]').value.trim(),email=form.querySelector('[name=email]').value.trim(),message=form.querySelector('[name=message]').value.trim();
 const {error}=await supabase.from('enquiries').insert([{name,email,message}]);
 if(error){alert('Could not send message: '+error.message);return;} form.reset();alert('Message sent successfully!');
}

document.addEventListener('DOMContentLoaded',async()=>{await loadProducts();await loadUserAndCart();const f=document.getElementById('contact-form');if(f)f.addEventListener('submit',submitEnquiry);});

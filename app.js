(() => {
  'use strict';
  const config = window.CATALOG_CONFIG;
  const $ = (s) => document.querySelector(s);
  const products = config.products;
  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const money = (n) => new Intl.NumberFormat(config.locale, {style:'currency',currency:config.currency,maximumFractionDigits:0}).format(n);
  const cart = [];
  let currentCategory = 'Todos', search = '', activeProduct = null, activeQty = 1;
  let activeExtras = [];
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyOf = (id, extras) => `${id}|${extras.map(e=>e.name).sort().join('|')}`;
  const sumItems = () => cart.reduce((t,item)=>t + (item.product.price + item.extras.reduce((s,e)=>s+e.price,0))*item.qty,0);
  const qtyItems = () => cart.reduce((n,item)=>n + item.qty,0);
  function renderCategories(){
    $('#categories').innerHTML = categories.map(c=>`<button type="button" class="pill ${currentCategory===c?'active':''}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('');
  }
  function renderProducts(){
    const list = products.filter(p => (currentCategory==='Todos'||p.category===currentCategory) && `${p.name} ${p.description}`.toLocaleLowerCase('es').includes(search));
    $('#products').innerHTML = list.length ? list.map(p=>`<article class="product"><div class="product-photo"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy" referrerpolicy="no-referrer">${p.badge?`<span class="product-badge">${escapeHTML(p.badge)}</span>`:''}</div><div class="product-body"><span class="category-label">${escapeHTML(p.category)}</span><h3>${escapeHTML(p.name)}</h3><p class="product-desc">${escapeHTML(p.description)}</p><div class="product-bottom"><strong class="price">${money(p.price)}</strong><button class="add-btn" data-product="${escapeHTML(p.id)}">+ Agregar</button></div></div></article>`).join('') : '<div class="no-results">No encontramos ese producto. Prueba con otro nombre o categoría.</div>';
  }
  function openProduct(id){
    activeProduct = products.find(p=>p.id===id); if(!activeProduct) return;
    activeQty=1;activeExtras=[];
    $('#productDetail').innerHTML=`<img class="detail-img" src="${escapeHTML(activeProduct.image)}" alt="${escapeHTML(activeProduct.name)}"><div class="detail-content"><span class="category-label">${escapeHTML(activeProduct.category)}</span><h2>${escapeHTML(activeProduct.name)}</h2><p>${escapeHTML(activeProduct.description)}</p><strong class="price">${money(activeProduct.price)}</strong>${activeProduct.extras?.length?`<h3 style="margin:22px 0 8px">Agrégale algo extra</h3><div class="extra-list">${activeProduct.extras.map((e,i)=>`<div class="extra-row"><label><input type="checkbox" data-extra="${i}"> ${escapeHTML(e.name)}</label><strong>+${money(e.price)}</strong></div>`).join('')}</div>`:''}<div class="detail-bottom"><div class="detail-qty"><button id="lessQty" aria-label="Disminuir cantidad">−</button><strong id="detailQty">1</strong><button id="moreQty" aria-label="Aumentar cantidad">+</button></div><strong id="detailPrice" class="price">${money(activeProduct.price)}</strong></div><button id="confirmAdd" class="btn btn-main">Agregar al carrito →</button></div>`;
    $('#productDialog').showModal();
    $('#lessQty').addEventListener('click',()=>{activeQty=Math.max(1,activeQty-1);updateDetail()});
    $('#moreQty').addEventListener('click',()=>{activeQty=Math.min(99,activeQty+1);updateDetail()});
    $('#productDetail').querySelectorAll('[data-extra]').forEach(input=>input.addEventListener('change',()=>{
      activeExtras= [...$('#productDetail').querySelectorAll('[data-extra]:checked')].map(x=>activeProduct.extras[Number(x.dataset.extra)]);
      updateDetail();
    }));
    $('#confirmAdd').addEventListener('click',()=>{addToCart(activeProduct,activeQty,activeExtras);$('#productDialog').close();openCart()});
  }
  function updateDetail(){
    $('#detailQty').textContent=activeQty;
    $('#detailPrice').textContent=money(activeQty*(activeProduct.price+activeExtras.reduce((n,e)=>n+e.price,0)));
  }
  function addToCart(product,qty,extras){
    const key=keyOf(product.id,extras), found=cart.find(x=>x.key===key);
    if(found) found.qty=Math.min(99,found.qty+qty);
    else cart.push({key,product,qty,extras:[...extras]});
    updateCart();
  }
  function updateCart(){
    const n=qtyItems(), total=sumItems();
    $('#countTop').textContent=n;$('#floatingCount').textContent=n;$('#floatingTotal').textContent=money(total);
    $('#drawerCount').textContent=n;$('#cartTotal').textContent=money(total);
    $('#emptyCart').hidden=n>0; $('#orderForm').hidden=n===0;
    $('#sendOrder').disabled=n===0;$('#copyOrder').disabled=n===0;
    $('#cartLines').innerHTML=cart.map(item=>{
      const each=item.product.price+item.extras.reduce((s,e)=>s+e.price,0);
      return `<div class="cart-line"><div><h4>${escapeHTML(item.product.name)}</h4>${item.extras.length?`<small>+ ${escapeHTML(item.extras.map(e=>e.name).join(', '))}</small>`:''}<small>${money(each)} c/u</small></div><div style="text-align:right"><strong>${money(each*item.qty)}</strong><div class="qty"><button aria-label="Disminuir ${escapeHTML(item.product.name)}" data-minus="${escapeHTML(item.key)}">−</button><b>${item.qty}</b><button aria-label="Aumentar ${escapeHTML(item.product.name)}" data-plus="${escapeHTML(item.key)}">+</button><button class="remove" data-remove="${escapeHTML(item.key)}" aria-label="Quitar ${escapeHTML(item.product.name)}">Quitar</button></div></div></div>`;
    }).join('');
  }
  function orderMessage(){
    const name=$('#customerName').value.trim();
    const lines=[`¡Hola, ${config.businessName}! Quiero hacer un pedido:`, ''];
    cart.forEach((item,i)=>{
      const unit=item.product.price+item.extras.reduce((s,e)=>s+e.price,0);
      lines.push(`${i+1}. ${item.qty} x ${item.product.name} — ${money(unit*item.qty)}`);
      if(item.extras.length) lines.push(`   Extras: ${item.extras.map(e=>e.name).join(', ')}`);
    });
    lines.push('',`Subtotal estimado: ${money(sumItems())}`,`Tipo de pedido: ${$('#orderType').value}`);
    if(name) lines.push(`Nombre: ${name}`);
    if($('#orderNotes').value.trim())lines.push(`Indicaciones: ${$('#orderNotes').value.trim()}`);
    lines.push('', '¿Me confirman disponibilidad, total final y horario de entrega?');
    return lines.join('\n');
  }
  function feedback(msg){$('#feedback').textContent=msg;}
  async function copyOrder(){
    const msg=orderMessage();
    try {await navigator.clipboard.writeText(msg);feedback('Pedido copiado. Ya puedes pegarlo en WhatsApp.');}
    catch(e){const box=document.createElement('textarea');box.value=msg;box.style.position='fixed';box.style.opacity='0';document.body.appendChild(box);box.select();const result=document.execCommand('copy');box.remove();feedback(result?'Pedido copiado.':'No se pudo copiar; usa un navegador actualizado.');}
  }
  function sendOrder(){
    if(!cart.length)return;
    const number=String(config.whatsappNumber||'').replace(/[^0-9]/g,'');
    if(!/^\d{10,15}$/.test(number)){
      feedback('Modo demo: configura el número real en config.js. Usa «Copiar mensaje» para probar.');
      return;
    }
    const url=`https://wa.me/${number}?text=${encodeURIComponent(orderMessage())}`;
    window.open(url,'_blank','noopener,noreferrer');
    feedback('WhatsApp abierto. Recuerda pulsar Enviar para confirmar el mensaje.');
  }
  function openCart(){$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');$('#shade').hidden=false;document.body.classList.add('locked');$('#closeCart').focus();}
  function closeCart(){$('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');$('#shade').hidden=true;document.body.classList.remove('locked');}
  $('#categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){currentCategory=b.dataset.category;renderCategories();renderProducts()}});
  $('#products').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)openProduct(b.dataset.product)});
  $('#search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('es');renderProducts()});
  $('#cartLines').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const key=b.dataset.plus||b.dataset.minus||b.dataset.remove;
    const ix=cart.findIndex(x=>x.key===key);if(ix<0)return;
    if('plus' in b.dataset)cart[ix].qty=Math.min(99,cart[ix].qty+1);
    if('minus' in b.dataset)cart[ix].qty--;
    if('remove' in b.dataset||cart[ix].qty<=0)cart.splice(ix,1);
    updateCart();
  });
  for(const id of ['openCartTop','floatingCart'])$(id.startsWith('#')?id:'#'+id).addEventListener('click',openCart);
  $('#closeCart').addEventListener('click',closeCart);$('#shade').addEventListener('click',closeCart);
  $('#goShopping').addEventListener('click',()=>{closeCart();$('#menu').scrollIntoView({behavior:'smooth'})});
  $('#sendOrder').addEventListener('click',sendOrder);$('#copyOrder').addEventListener('click',copyOrder);
  $('#closeProduct').addEventListener('click',()=>$('#productDialog').close());
  $('#productDialog').addEventListener('click',e=>{if(e.target===$('#productDialog'))$('#productDialog').close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
  renderCategories();renderProducts();updateCart();
})();

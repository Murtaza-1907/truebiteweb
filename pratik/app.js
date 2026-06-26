const rupee = n => `₹${n}`;
const params = new URLSearchParams(location.search);
const cart = new Map(JSON.parse(localStorage.getItem('truebiteCart') || '[]'));

function saveCart(){localStorage.setItem('truebiteCart', JSON.stringify([...cart])); updateCartCount();}
function winnerFor(group){return group.products.find(product => product.id === group.winnerId) || group.products[0];}
function groupFor(id){return PRODUCT_GROUPS.find(group => group.id === id || group.products.some(product => product.id === id));}
function productFor(id){return PRODUCTS.find(product => product.id === id);}
function imageFallback(img){img.parentElement.classList.add('image-failed'); img.remove();}
function productArt(product){
  return `<div class="art"><img src="${product.image}" alt="${product.name}" loading="lazy" onerror="imageFallback(this)"><span>${product.name}</span></div>`;
}
function updateCartCount(){
  const count = [...cart.values()].reduce((sum, qty) => sum + qty, 0);
  document.querySelectorAll('#cartCount').forEach(node => node.textContent = count);
}
function addToCart(id){
  cart.set(id, (cart.get(id) || 0) + 1);
  saveCart();
  location.href = 'checkout.html';
}
function renderProductGrid(){
  const grid = document.querySelector('#productGrid');
  if(!grid) return;
  const search = document.querySelector('#search');
  const categoryFilter = document.querySelector('#categoryFilter');
  const winners = PRODUCT_GROUPS.map(group => ({...winnerFor(group), groupId: group.id}));
  [...new Set(winners.map(product => product.category))].forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
  function draw(){
    const q = search.value.toLowerCase();
    const cat = categoryFilter.value;
    const list = winners.filter(product => (cat === 'all' || product.category === cat) && [product.name, product.brand, product.category].join(' ').toLowerCase().includes(q));
    grid.innerHTML = list.map(product => `<article class="card" onclick="location.href='buy.html?group=${product.groupId}'">${productArt(product)}<div class="card-top"><span>${product.category}</span></div><h3>${product.name}</h3><p>${product.why}</p><div class="meta"><span>${rupee(product.price)} / ${product.pack}</span><span>${product.protein}g protein</span><span>${product.sugar}g sugar</span></div><button class="card-cart" onclick="event.stopPropagation(); addToCart('${product.id}')">Add to cart</button></article>`).join('');
  }
  search.addEventListener('input', draw);
  categoryFilter.addEventListener('change', draw);
  draw();
}
function compareCard(product, winner){
  return `<article class="compare-card ${winner ? 'winner' : ''}">${winner ? '<div class="badge">Best pick</div>' : ''}${productArt(product)}<h3>${product.name}</h3><p>${product.brand}</p><div class="score-row"><span>TrueScore</span><b>${product.score}/100</b></div><div class="score-row"><span>Price</span><b>${rupee(product.price)} / ${product.pack}</b></div><section class="info-box nutrition-box"><h4>Nutrition / 100g or 100ml</h4><dl class="nutrition-grid"><dt>Protein</dt><dd>${product.protein}g</dd><dt>Fibre</dt><dd>${product.fiber}g</dd><dt>Sugar</dt><dd>${product.sugar}g</dd><dt>Salt</dt><dd>${product.salt}g</dd><dt>Calories</dt><dd>${product.calories} kcal</dd><dt>Fat</dt><dd>${product.fat}g</dd><dt>Carbs</dt><dd>${product.carbs}g</dd></dl></section><section class="info-box ingredients-box"><h4>Ingredients</h4><p>${product.ingredients}</p></section>${winner ? `<button onclick="addToCart('${product.id}')">Add to cart</button>` : ''}</article>`;
}
function setupCompareTools(currentGroup){
  const search = document.querySelector('#compareSearch');
  const select = document.querySelector('#compareSelect');
  if(!search || !select) return;

  function optionLabel(group){
    return group.category;
  }
  function drawOptions(query = ''){
    const q = query.trim().toLowerCase();
    const matches = PRODUCT_GROUPS.filter(group => {
      const text = [group.category, ...group.products.flatMap(product => [product.name, product.brand])].join(' ').toLowerCase();
      return !q || text.includes(q);
    });
    select.innerHTML = matches.map(group => `<option value="${group.id}">${optionLabel(group)}</option>`).join('');
    if(matches.some(group => group.id === currentGroup.id)) select.value = currentGroup.id;
  }

  drawOptions();
  search.addEventListener('input', () => drawOptions(search.value));
  search.addEventListener('keydown', event => {
    if(event.key === 'Enter' && select.value) location.href = `buy.html?group=${select.value}`;
  });
  select.addEventListener('change', () => {
    if(select.value) location.href = `buy.html?group=${select.value}`;
  });
}
function renderBuyPage(){
  const comparison = document.querySelector('#comparison');
  if(!comparison) return;
  const group = groupFor(params.get('group')) || PRODUCT_GROUPS[0];
  const winner = winnerFor(group);
  const competitors = group.products.filter(product => product.id !== winner.id);
  const orderedProducts = [competitors[0], winner, competitors[1]].filter(Boolean);
  setupCompareTools(group);
  document.querySelector('#buyCategory').textContent = group.category;
  document.querySelector('#buyTitle').textContent = winner.name;
  document.querySelector('#buySubtitle').textContent = `${group.products.map(product => product.name).join(' vs ')}`;
  comparison.innerHTML = orderedProducts.map(product => compareCard(product, product.id === winner.id)).join('');
  document.querySelector('#summaryTitle').textContent = `Why ${winner.name} is the best pick`;
  document.querySelector('#summaryText').innerHTML = `${group.summary} It wins this category because it balances stronger nutrition with a cleaner label: ${winner.protein}g protein, ${winner.fiber}g fibre, ${winner.sugar}g sugar, ${winner.salt}g salt and ${winner.calories} kcal per 100g or 100ml. The ingredient list is easier to understand than the alternatives, with fewer unnecessary extras for everyday buying. At ${rupee(winner.price)} for ${winner.pack}, it also keeps the value practical instead of winning only on health claims.`;
}
function renderCheckout(){
  const root = document.querySelector('#checkoutPage');
  if(!root) return;
  const items = [...cart].map(([id, qty]) => ({...productFor(id), qty})).filter(item => item.id);
  const defaultItem = winnerFor(PRODUCT_GROUPS[0]);
  const lines = items.length ? items : [{...defaultItem, qty: 1}];
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.qty, 0);
  const fee = 12;
  const total = subtotal + fee;
  document.querySelector('#checkoutItems').innerHTML = lines.map(item => `<div class="pay-row"><span>${item.name}<small>${item.qty} x ${rupee(item.price)} / ${item.pack}</small></span><b>${rupee(item.price * item.qty)}</b></div>`).join('');
  document.querySelector('#paySubtotal').textContent = rupee(subtotal);
  document.querySelector('#payTotal').textContent = rupee(total);
  document.querySelector('#payButton').textContent = `Pay ${rupee(total)}`;
}
function confirmPayment(){
  localStorage.removeItem('truebiteCart');
  document.querySelector('#paymentStatus').textContent = 'Payment successful. Razorpay payment id: pay_TB' + Math.floor(100000 + Math.random() * 900000);
  updateCartCount();
}

updateCartCount();
renderProductGrid();
renderBuyPage();
renderCheckout();

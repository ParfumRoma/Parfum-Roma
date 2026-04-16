let carrito = [];

const STORAGE_KEY_PRODUCTS = 'parfumroma.products.v1';
const CATEGORY_ARAB = 'arabe';
const CATEGORY_DESIGNER = 'disenador';
let revealObserver = null;

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parsePrice(text) {
  const digits = String(text ?? '').replace(/[^\d]/g, '');
  return Number(digits || 0);
}

function normalizeCategory(value) {
  if (window.CloudDB?.normalizeCategory) return window.CloudDB.normalizeCategory(value);
  const cleaned = String(value || '').toLowerCase();
  return cleaned === CATEGORY_DESIGNER ? CATEGORY_DESIGNER : CATEGORY_ARAB;
}

function normalizeImagePath(path) {
  return String(path || '')
    .replace(/Importados dise\?ador/gi, 'Importados diseñador')
    .replace(/Importados diseÃ±ador/gi, 'Importados diseñador')
    .replace(/Importados%20dise%C3%B1ador/gi, 'Importados diseñador')
    .replace(/\\/g, '/')
    .trim();
}

function normalizeProduct(item, index) {
  if (window.CloudDB?.normalizeProduct) return window.CloudDB.normalizeProduct(item, index);
  return {
    id: item.id || `p-${index + 1}`,
    nombre: String(item.nombre || ''),
    precio: Number(item.precio || 0),
    descripcion: String(item.descripcion || ''),
    imagen: normalizeImagePath(item.imagen || ''),
    categoria: normalizeCategory(item.categoria)
  };
}

function getSavedProductsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item, index) => normalizeProduct(item, index));
  } catch {
    return null;
  }
}

function saveProductsLocal(products) {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
}

function extractProductsFromContainer(container, categoria) {
  return Array.from(container.querySelectorAll('.producto')).map((card, index) => ({
    id: `${categoria}-${index + 1}`,
    nombre: card.querySelector('h3')?.textContent?.trim() || '',
    precio: parsePrice(card.querySelector('.precio')?.textContent?.trim() || ''),
    descripcion: card.querySelector('.desc')?.textContent?.trim() || '',
    imagen: normalizeImagePath(card.querySelector('img')?.getAttribute('src') || ''),
    categoria: normalizeCategory(categoria)
  }));
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(precio);
}

function renderProductCard(product) {
  return `
    <div class="producto">
      <img src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}" loading="lazy" decoding="async">
      <div class="info">
        <h3>${escapeHtml(product.nombre)}</h3>
        <p class="precio">${formatearPrecio(product.precio)}</p>
        <p class="desc">${escapeHtml(product.descripcion)}</p>
        <button class="btn-wpp btn-add" onclick="agregarAlCarrito('${escapeHtml(product.nombre).replace(/&#039;/g, "\\'")}', ${Number(product.precio) || 0}, this)">Agregar al carrito</button>
      </div>
    </div>
  `;
}

function renderProductCatalogs(products) {
  const arabContainer = document.getElementById('catalogo-arabe');
  const designerContainer = document.getElementById('catalogo-disenador');
  if (!arabContainer || !designerContainer) return;

  const arabProducts = products.filter((product) => normalizeCategory(product.categoria) === CATEGORY_ARAB);
  const designerProducts = products.filter((product) => normalizeCategory(product.categoria) === CATEGORY_DESIGNER);

  arabContainer.innerHTML = arabProducts.map(renderProductCard).join('');
  designerContainer.innerHTML = designerProducts.map(renderProductCard).join('');

  applyProductRevealAnimation();
}

function mergeMissingDesigner(products, defaultDesignerProducts) {
  const hasDesigner = products.some((p) => normalizeCategory(p.categoria) === CATEGORY_DESIGNER);
  if (hasDesigner) return products;

  const existing = new Set(products.map((p) => String(p.nombre || '').toLowerCase().trim()));
  const missing = defaultDesignerProducts.filter((p) => !existing.has(String(p.nombre || '').toLowerCase().trim()));
  return missing.length ? [...products, ...missing] : products;
}

async function loadProducts(defaultProducts, defaultDesignerProducts) {
  const cloudEnabled = !!window.CloudDB?.enabled;

  if (cloudEnabled) {
    try {
      await window.CloudDB.seedProductsIfEmpty(defaultProducts);
      const remote = (await window.CloudDB.fetchProducts()) || [];
      const normalizedRemote = remote.map((item, index) => normalizeProduct(item, index));
      return mergeMissingDesigner(normalizedRemote, defaultDesignerProducts);
    } catch (error) {
      console.error('Fallo carga cloud, uso local.', error);
    }
  }

  let local = getSavedProductsLocal();
  if (!local || local.length === 0) {
    local = defaultProducts;
    saveProductsLocal(local);
  }

  local = local.map((item, index) => normalizeProduct(item, index));
  local = mergeMissingDesigner(local, defaultDesignerProducts);
  saveProductsLocal(local);
  return local;
}

async function ensureProductsLoaded() {
  const arabContainer = document.getElementById('catalogo-arabe');
  const designerContainer = document.getElementById('catalogo-disenador');
  if (!arabContainer || !designerContainer) return;

  const defaultArabProducts = extractProductsFromContainer(arabContainer, CATEGORY_ARAB);
  const defaultDesignerProducts = extractProductsFromContainer(designerContainer, CATEGORY_DESIGNER);
  const defaults = [...defaultArabProducts, ...defaultDesignerProducts];

  const products = await loadProducts(defaults, defaultDesignerProducts);
  renderProductCatalogs(products);
}

function agregarAlCarrito(nombre, precio, btnElement) {
  const itemIndex = carrito.findIndex((item) => item.nombre === nombre);
  if (itemIndex > -1) carrito[itemIndex].cantidad += 1;
  else carrito.push({ nombre, precio, cantidad: 1 });

  const txtOriginal = btnElement.innerText;
  btnElement.innerText = 'Agregado!';
  btnElement.style.background = 'var(--primary)';
  btnElement.style.color = '#000';
  setTimeout(() => {
    btnElement.innerText = txtOriginal;
    btnElement.style.background = 'transparent';
    btnElement.style.color = '#fff';
  }, 1500);

  actualizarCarrito();
  abrirCarrito();
}

function actualizarCarrito() {
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartFloatCount = document.getElementById('cart-float-count');
  const cartTotalPrice = document.getElementById('cart-total-price');
  if (!cartItems) return;

  cartItems.innerHTML = '';
  let total = 0;
  let count = 0;

  carrito.forEach((item, index) => {
    total += item.precio * item.cantidad;
    count += item.cantidad;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-info">
        <h4>${escapeHtml(item.nombre)}</h4>
        <p>${formatearPrecio(item.precio)}</p>
      </div>
      <div class="cart-item-actions">
        <button onclick="cambiarCantidad(${index}, -1)">-</button>
        <span>${item.cantidad}</span>
        <button onclick="cambiarCantidad(${index}, 1)">+</button>
      </div>
    `;
    cartItems.appendChild(div);
  });

  if (carrito.length === 0) cartItems.innerHTML = '<p class="empty-cart">El carrito esta vacio.</p>';
  if (cartCount) cartCount.innerText = count;
  if (cartFloatCount) cartFloatCount.innerText = count;
  if (cartTotalPrice) cartTotalPrice.innerText = formatearPrecio(total);
}

function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
  actualizarCarrito();
}

function toggleCart() {
  document.getElementById('cart-sidebar')?.classList.toggle('active');
  document.getElementById('cart-overlay')?.classList.toggle('active');
}

function abrirCarrito() {
  document.getElementById('cart-sidebar')?.classList.add('active');
  document.getElementById('cart-overlay')?.classList.add('active');
}

function enviarPedido() {
  if (carrito.length === 0) {
    alert('Tu carrito esta vacio.');
    return;
  }

  let mensaje = '*Hola Parfum Roma!* Quiero realizar el siguiente pedido:\n\n';
  let total = 0;
  carrito.forEach((item) => {
    mensaje += `- ${item.cantidad}x ${item.nombre} (${formatearPrecio(item.precio * item.cantidad)})\n`;
    total += item.precio * item.cantidad;
  });

  mensaje += `\n*TOTAL: ${formatearPrecio(total)}*\n\nEspero su respuesta para coordinar el pago y envio.`;
  window.open(`https://wa.me/5491150350552?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function toggleMenu() {
  document.getElementById('menu')?.classList.toggle('active');
}

function filterProducts() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const searchTerms = input.value.toLowerCase().trim().split(' ').filter(Boolean);
  const products = document.getElementsByClassName('producto');
  const noResults = document.getElementById('noResults');
  let hasVisibleProducts = false;

  for (let i = 0; i < products.length; i += 1) {
    const title = products[i].getElementsByTagName('h3')[0]?.textContent?.toLowerCase() || '';
    const desc = products[i].getElementsByClassName('desc')[0]?.textContent?.toLowerCase() || '';
    const searchableText = `${title} ${desc}`;
    const matches = searchTerms.length === 0 || searchTerms.every((term) => searchableText.includes(term));

    products[i].style.display = matches ? 'flex' : 'none';
    if (matches) {
      products[i].style.opacity = '1';
      products[i].style.transform = 'translateY(0)';
      hasVisibleProducts = true;
    }
  }

  if (noResults) noResults.style.display = hasVisibleProducts ? 'none' : 'block';
}

function applyProductRevealAnimation() {
  const targets = document.querySelectorAll('.producto, .reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((t) => {
      t.style.opacity = '1';
      t.style.transform = 'translateY(0)';
    });
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  targets.forEach((target) => {
    target.style.opacity = '0';
    target.style.transform = 'translateY(30px)';
    target.style.transition = 'all 0.8s ease-out';
    revealObserver.observe(target);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureProductsLoaded();
  actualizarCarrito();
});

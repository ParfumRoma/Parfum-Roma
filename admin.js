const STORAGE_KEY_PRODUCTS = 'parfumroma.products.v1';
const SESSION_KEY = 'parfumroma.admin.session';

const LEGACY_ADMIN_USER = 'Lucas';
const LEGACY_ADMIN_PASS = 'click24web';

const loginSection = document.getElementById('loginSection');
const panelSection = document.getElementById('panelSection');
const loginBtn = document.getElementById('loginBtn');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');

const productForm = document.getElementById('productForm');
const productIdInput = document.getElementById('productId');
const productNameInput = document.getElementById('productName');
const productCategoryInput = document.getElementById('productCategory');
const productPriceInput = document.getElementById('productPrice');
const productImageInput = document.getElementById('productImage');
const productImageFileInput = document.getElementById('productImageFile');
const imageDropZone = document.getElementById('imageDropZone');
const pickImageBtn = document.getElementById('pickImageBtn');
const removeImageBtn = document.getElementById('removeImageBtn');
const imagePreview = document.getElementById('imagePreview');
const imageStatus = document.getElementById('imageStatus');
const productDescInput = document.getElementById('productDesc');
const adminSearchInput = document.getElementById('adminSearchInput');
const productsTableBodyArab = document.getElementById('productsTableBodyArab');
const productsTableBodyDesigner = document.getElementById('productsTableBodyDesigner');

const cancelEditBtn = document.getElementById('cancelEditBtn');
const logoutBtn = document.getElementById('logoutBtn');

const MAX_IMAGE_SIDE = 1100;
const JPG_QUALITY = 0.82;

let uploadedImageData = '';
let existingImageValue = '';
let productsCache = [];

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(price);
}

function normalizeCategory(value) {
  if (window.CloudDB?.normalizeCategory) return window.CloudDB.normalizeCategory(value);
  return String(value || '').toLowerCase() === 'disenador' ? 'disenador' : 'arabe';
}

function normalizeProduct(product, index) {
  if (window.CloudDB?.normalizeProduct) return window.CloudDB.normalizeProduct(product, index);
  return {
    id: String(product.id || `p-${Date.now()}-${index || 0}`),
    nombre: String(product.nombre || '').trim(),
    categoria: normalizeCategory(product.categoria),
    precio: Number(product.precio || 0),
    imagen: String(product.imagen || '').trim(),
    descripcion: String(product.descripcion || '').trim()
  };
}

function getProductsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p, i) => normalizeProduct(p, i));
  } catch {
    return [];
  }
}

function saveProductsLocal(products) {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
}

async function readProducts() {
  if (window.CloudDB?.enabled) {
    try {
      const remote = await window.CloudDB.fetchProducts();
      return Array.isArray(remote) ? remote.map((p, i) => normalizeProduct(p, i)) : [];
    } catch (error) {
      console.error('Fallo lectura cloud, uso local', error);
    }
  }
  return getProductsLocal();
}

async function writeProducts(products) {
  const normalized = (products || []).map((p, i) => normalizeProduct(p, i));

  if (window.CloudDB?.enabled) {
    await window.CloudDB.saveProducts(normalized);
    return;
  }

  saveProductsLocal(normalized);
}

function parsePrice(text) {
  const digits = String(text || '').replace(/[^\d]/g, '');
  return Number(digits || 0);
}

function extractSeedProductsFromDocument(doc, selector, categoria) {
  const container = doc.querySelector(selector);
  if (!container) return [];

  return Array.from(container.querySelectorAll('.producto')).map((card, index) => ({
    id: `${categoria}-${index + 1}`,
    nombre: card.querySelector('h3')?.textContent?.trim() || '',
    precio: parsePrice(card.querySelector('.precio')?.textContent?.trim() || ''),
    descripcion: card.querySelector('.desc')?.textContent?.trim() || '',
    imagen: String(card.querySelector('img')?.getAttribute('src') || '').trim(),
    categoria: normalizeCategory(categoria)
  }));
}

async function seedFromIndexHtmlIfNeeded(currentProducts) {
  if (!window.CloudDB?.enabled) return currentProducts;
  if ((currentProducts || []).length > 0) return currentProducts;

  try {
    const response = await fetch('index.html', { cache: 'no-store' });
    if (!response.ok) return currentProducts;
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const arabSeed = extractSeedProductsFromDocument(doc, '#catalogo-arabe', 'arabe');
    const designerSeed = extractSeedProductsFromDocument(doc, '#catalogo-disenador', 'disenador');
    const seed = [...arabSeed, ...designerSeed].map((item, index) => normalizeProduct(item, index));

    if (seed.length === 0) return currentProducts;
    await writeProducts(seed);
    return seed;
  } catch (error) {
    console.error('No se pudo importar catalogo base desde index.html', error);
    return currentProducts;
  }
}

async function isAuthenticated() {
  if (window.CloudDB?.enabled) {
    try {
      return await window.CloudDB.hasSession();
    } catch {
      return false;
    }
  }
  return sessionStorage.getItem(SESSION_KEY) === 'ok';
}

function setLegacyAuthenticated(value) {
  if (value) sessionStorage.setItem(SESSION_KEY, 'ok');
  else sessionStorage.removeItem(SESSION_KEY);
}

function setImageStatus(message) {
  imageStatus.textContent = message;
}

function showPreview(src) {
  if (!src) {
    imagePreview.classList.add('hidden');
    imagePreview.removeAttribute('src');
    return;
  }
  imagePreview.src = src;
  imagePreview.classList.remove('hidden');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(MAX_IMAGE_SIDE / img.width, MAX_IMAGE_SIDE / img.height, 1);
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPG_QUALITY));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function processSelectedFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Selecciona un archivo de imagen valido.');
    return;
  }

  try {
    const rawDataUrl = await readFileAsDataUrl(file);
    uploadedImageData = await resizeImage(rawDataUrl);
    showPreview(uploadedImageData);
    setImageStatus(`Imagen lista: ${file.name}`);
  } catch {
    alert('No se pudo leer la imagen seleccionada.');
  }
}

function clearForm() {
  productIdInput.value = '';
  productNameInput.value = '';
  productCategoryInput.value = 'arabe';
  productPriceInput.value = '';
  productImageInput.value = '';
  productImageFileInput.value = '';
  productDescInput.value = '';
  uploadedImageData = '';
  existingImageValue = '';
  showPreview('');
  setImageStatus('No hay imagen seleccionada.');
}

function rowTemplate(product) {
  return `
    <tr>
      <td data-label="Img"><img src="${escapeHtml(product.imagen || '')}" alt="${escapeHtml(product.nombre || '')}" /></td>
      <td data-label="Nombre">${escapeHtml(product.nombre || '')}</td>
      <td data-label="Categoria">${escapeHtml(product.categoria || 'arabe')}</td>
      <td data-label="Precio">${formatPrice(Number(product.precio || 0))}</td>
      <td data-label="Descripcion">${escapeHtml(product.descripcion || '')}</td>
      <td data-label="Acciones">
        <button class="admin-btn" type="button" onclick="editProduct('${escapeHtml(product.id)}')">Editar</button>
        <button class="admin-btn" type="button" onclick="deleteProduct('${escapeHtml(product.id)}')">Eliminar</button>
      </td>
    </tr>
  `;
}

function renderTable() {
  const query = adminSearchInput.value.trim().toLowerCase();
  const filtered = productsCache.filter((product) => {
    if (!query) return true;
    const text = `${product.nombre || ''} ${product.descripcion || ''} ${product.categoria || ''}`.toLowerCase();
    return text.includes(query);
  });

  if (productsCache.length === 0) {
    const emptyRow = `
      <tr>
        <td colspan="6">No hay productos cargados todavia.</td>
      </tr>
    `;
    productsTableBodyArab.innerHTML = emptyRow;
    productsTableBodyDesigner.innerHTML = emptyRow;
    return;
  }

  const arabProducts = filtered.filter((p) => normalizeCategory(p.categoria) === 'arabe');
  const designerProducts = filtered.filter((p) => normalizeCategory(p.categoria) === 'disenador');

  productsTableBodyArab.innerHTML = arabProducts.length
    ? arabProducts.map(rowTemplate).join('')
    : '<tr><td colspan="6">No hay resultados en la seccion Arabes.</td></tr>';

  productsTableBodyDesigner.innerHTML = designerProducts.length
    ? designerProducts.map(rowTemplate).join('')
    : '<tr><td colspan="6">No hay resultados en la seccion Disenador.</td></tr>';
}

async function refreshProducts() {
  const loaded = await readProducts();
  productsCache = await seedFromIndexHtmlIfNeeded(loaded);
  renderTable();
}

function showPanel() {
  loginSection.classList.add('hidden');
  panelSection.classList.remove('hidden');
  refreshProducts();
}

function showLogin() {
  panelSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

function editProduct(productId) {
  const selected = productsCache.find((product) => product.id === productId);
  if (!selected) return;

  productIdInput.value = selected.id || '';
  productNameInput.value = selected.nombre || '';
  productCategoryInput.value = normalizeCategory(selected.categoria || 'arabe');
  productPriceInput.value = Number(selected.precio || 0);
  productImageInput.value = (selected.imagen || '').startsWith('data:image/') ? '' : (selected.imagen || '');
  productImageFileInput.value = '';
  productDescInput.value = selected.descripcion || '';
  existingImageValue = selected.imagen || '';
  uploadedImageData = '';
  showPreview(existingImageValue);
  setImageStatus(existingImageValue ? 'Imagen actual cargada.' : 'No hay imagen seleccionada.');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(productId) {
  const confirmed = window.confirm('Seguro que queres eliminar este producto?');
  if (!confirmed) return;

  const next = productsCache.filter((product) => product.id !== productId);
  try {
    await writeProducts(next);
    productsCache = next;
    renderTable();
  } catch (error) {
    console.error(error);
    alert('No se pudo eliminar el producto.');
  }
}

async function handleLogin() {
  const user = loginUser.value.trim();
  const pass = loginPass.value;

  if (window.CloudDB?.enabled) {
    try {
      await window.CloudDB.signIn(user, pass);
      showPanel();
      return;
    } catch {
      alert('No se pudo iniciar sesion en la nube. Revisa email y contrasena.');
      return;
    }
  }

  if (user === LEGACY_ADMIN_USER && pass === LEGACY_ADMIN_PASS) {
    setLegacyAuthenticated(true);
    showPanel();
    return;
  }

  alert('Usuario o contrasena incorrectos.');
}

loginBtn.addEventListener('click', handleLogin);
loginPass.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleLogin();
  }
});

pickImageBtn.addEventListener('click', () => productImageFileInput.click());
productImageFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (file) await processSelectedFile(file);
});

removeImageBtn.addEventListener('click', () => {
  uploadedImageData = '';
  productImageFileInput.value = '';
  const preview = productImageInput.value.trim() || existingImageValue;
  showPreview(preview);
  setImageStatus(preview ? 'Preview por ruta manual.' : 'Imagen subida removida.');
});

['dragenter', 'dragover'].forEach((eventName) => {
  imageDropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    imageDropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  imageDropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    imageDropZone.classList.remove('dragover');
  });
});

imageDropZone.addEventListener('drop', async (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) await processSelectedFile(file);
});
imageDropZone.addEventListener('click', () => productImageFileInput.click());
imageDropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    productImageFileInput.click();
  }
});

productImageInput.addEventListener('input', () => {
  if (uploadedImageData) return;
  const previewValue = productImageInput.value.trim() || existingImageValue;
  showPreview(previewValue);
  setImageStatus(previewValue ? 'Preview por ruta manual.' : 'No hay imagen seleccionada.');
});

adminSearchInput.addEventListener('input', renderTable);

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = productIdInput.value.trim();
  const nombre = productNameInput.value.trim();
  const categoria = normalizeCategory(productCategoryInput.value);
  const precio = Number(productPriceInput.value);
  const imagenManual = productImageInput.value.trim();
  const imagen = uploadedImageData || imagenManual || existingImageValue;
  const descripcion = productDescInput.value.trim();

  if (!nombre || !imagen || !descripcion || !Number.isFinite(precio) || precio <= 0) {
    alert('Completa todos los campos correctamente.');
    return;
  }

  const next = [...productsCache];
  if (id) {
    const index = next.findIndex((product) => product.id === id);
    if (index > -1) next[index] = { ...next[index], nombre, categoria, precio, imagen, descripcion };
  } else {
    next.push({ id: `p-${Date.now()}`, nombre, categoria, precio, imagen, descripcion });
  }

  try {
    await writeProducts(next);
    productsCache = next;
    clearForm();
    renderTable();
  } catch (error) {
    console.error(error);
    alert('No se pudo guardar. Verifica conexion o espacio de almacenamiento.');
  }
});

cancelEditBtn.addEventListener('click', clearForm);
logoutBtn.addEventListener('click', async () => {
  if (window.CloudDB?.enabled) {
    try {
      await window.CloudDB.signOut();
    } catch (error) {
      console.error(error);
    }
  }
  setLegacyAuthenticated(false);
  showLogin();
});

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

clearForm();

(async () => {
  const ok = await isAuthenticated();
  if (ok) showPanel();
  else showLogin();
})();

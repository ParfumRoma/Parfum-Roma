const STORAGE_KEY_PRODUCTS = 'parfumroma.products.v1';
const SESSION_KEY = 'parfumroma.admin.session';

const ADMIN_USER = 'Lucas';
const ADMIN_PASS = 'click24web';

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
  const cleaned = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const compact = cleaned.replace(/[^a-z]/g, '');

  if (
    cleaned === 'disenador' ||
    cleaned === 'designer' ||
    compact === 'disenador' ||
    compact === 'diseador'
  ) {
    return 'disenador';
  }

  return 'arabe';
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
      const maxSide = MAX_IMAGE_SIDE;
      const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

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
    const optimizedDataUrl = await resizeImage(rawDataUrl);
    uploadedImageData = optimizedDataUrl;
    showPreview(uploadedImageData);
    setImageStatus(`Imagen lista: ${file.name}`);
  } catch (error) {
    alert('No se pudo leer la imagen seleccionada.');
  }
}

function getProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((product) => ({
      ...product,
      categoria: normalizeCategory(product.categoria)
    }));
  } catch (error) {
    console.error('Error al leer productos', error);
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
}

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === 'ok';
}

function setAuthenticated(value) {
  if (value) {
    sessionStorage.setItem(SESSION_KEY, 'ok');
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

function showPanel() {
  loginSection.classList.add('hidden');
  panelSection.classList.remove('hidden');
  renderTable();
}

function showLogin() {
  panelSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
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

function renderTable() {
  const products = getProducts();
  const query = adminSearchInput.value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    if (!query) return true;
    const text = `${product.nombre || ''} ${product.descripcion || ''} ${product.categoria || ''}`.toLowerCase();
    return text.includes(query);
  });

  if (products.length === 0) {
    productsTableBodyArab.innerHTML = `
      <tr>
        <td colspan="6">Todavia no hay productos en localStorage. Abri primero index.html para cargar el catalogo inicial.</td>
      </tr>
    `;
    productsTableBodyDesigner.innerHTML = `
      <tr>
        <td colspan="6">Todavia no hay productos en localStorage. Abri primero index.html para cargar el catalogo inicial.</td>
      </tr>
    `;
    return;
  }

  const rowTemplate = (product) => `
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

  const arabProducts = filtered.filter((product) => (product.categoria || 'arabe') === 'arabe');
  const designerProducts = filtered.filter((product) => product.categoria === 'disenador');

  productsTableBodyArab.innerHTML = arabProducts.length > 0
    ? arabProducts
      .map(rowTemplate)
      .join('')
    : `
      <tr>
        <td colspan="6">No hay resultados en la seccion Arabes.</td>
      </tr>
    `;

  productsTableBodyDesigner.innerHTML = designerProducts.length > 0
    ? designerProducts
    .map((product) => `
      ${rowTemplate(product)}
    `)
    .join('')
    : `
      <tr>
        <td colspan="6">No hay resultados en la seccion Disenador.</td>
      </tr>
    `;
}

function editProduct(productId) {
  const products = getProducts();
  const selected = products.find((product) => product.id === productId);
  if (!selected) return;

  productIdInput.value = selected.id || '';
  productNameInput.value = selected.nombre || '';
  productCategoryInput.value = selected.categoria || 'arabe';
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

function deleteProduct(productId) {
  const confirmed = window.confirm('Seguro que queres eliminar este producto?');
  if (!confirmed) return;

  const products = getProducts().filter((product) => product.id !== productId);
  saveProducts(products);
  renderTable();
}

function handleLogin() {
  const user = loginUser.value.trim();
  const pass = loginPass.value;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    setAuthenticated(true);
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

pickImageBtn.addEventListener('click', () => {
  productImageFileInput.click();
});

productImageFileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await processSelectedFile(file);
});

removeImageBtn.addEventListener('click', () => {
  uploadedImageData = '';
  productImageFileInput.value = '';
  if (existingImageValue && !productImageInput.value.trim()) {
    showPreview(existingImageValue);
    setImageStatus('Volviste a la imagen actual del producto.');
    return;
  }
  showPreview(productImageInput.value.trim() || '');
  setImageStatus('Imagen subida removida.');
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
  if (!file) return;
  await processSelectedFile(file);
});

imageDropZone.addEventListener('click', () => {
  productImageFileInput.click();
});

imageDropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    productImageFileInput.click();
  }
});

productImageInput.addEventListener('input', () => {
  if (uploadedImageData) return;
  const manualValue = productImageInput.value.trim();
  const previewValue = manualValue || existingImageValue;
  showPreview(previewValue);
  setImageStatus(previewValue ? 'Preview por ruta manual.' : 'No hay imagen seleccionada.');
});

adminSearchInput.addEventListener('input', () => {
  renderTable();
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = productIdInput.value.trim();
  const nombre = productNameInput.value.trim();
  const categoria = productCategoryInput.value;
  const precio = Number(productPriceInput.value);
  const imagenManual = productImageInput.value.trim();
  const imagen = uploadedImageData || imagenManual || existingImageValue;
  const descripcion = productDescInput.value.trim();

  if (!nombre || !imagen || !descripcion || !Number.isFinite(precio) || precio <= 0) {
    alert('Completa todos los campos correctamente.');
    return;
  }

  const products = getProducts();

  if (id) {
    const index = products.findIndex((product) => product.id === id);
    if (index > -1) {
      products[index] = { ...products[index], nombre, categoria, precio, imagen, descripcion };
    }
  } else {
    products.push({
      id: `p-${Date.now()}`,
      nombre,
      categoria,
      precio,
      imagen,
      descripcion
    });
  }

  try {
    saveProducts(products);
  } catch (error) {
    alert('No se pudo guardar. Puede faltar espacio en el navegador por imagenes muy grandes.');
    return;
  }

  clearForm();
  renderTable();
});

cancelEditBtn.addEventListener('click', clearForm);
logoutBtn.addEventListener('click', () => {
  setAuthenticated(false);
  showLogin();
});

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

clearForm();

if (isAuthenticated()) {
  showPanel();
} else {
  showLogin();
}

// Carrito de compras state
let carrito = [];

// Función para formatear moneda
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(precio);
}

// Agregar producto al carrito
function agregarAlCarrito(nombre, precio, btnElement) {
  const itemIndex = carrito.findIndex(item => item.nombre === nombre);

  if (itemIndex > -1) {
    carrito[itemIndex].cantidad += 1;
  } else {
    carrito.push({ nombre, precio, cantidad: 1 });
  }

  // Animación del botón
  const txtOriginal = btnElement.innerText;
  btnElement.innerText = "¡Agregado!";
  btnElement.style.background = "var(--primary)";
  btnElement.style.color = "#000";
  setTimeout(() => {
    btnElement.innerText = txtOriginal;
    btnElement.style.background = "transparent";
    btnElement.style.color = "#fff";
  }, 1500);

  actualizarCarrito();
  abrirCarrito();
}

// Actualizar UI del carrito
function actualizarCarrito() {
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartFloatCount = document.getElementById('cart-float-count');
  const cartTotalPrice = document.getElementById('cart-total-price');

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
        <h4>${item.nombre}</h4>
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

  if (carrito.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">El carrito está vacío.</p>';
  }

  if (cartCount) cartCount.innerText = count;
  if (cartFloatCount) cartFloatCount.innerText = count;
  if (cartTotalPrice) cartTotalPrice.innerText = formatearPrecio(total);
}

function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) {
    carrito.splice(index, 1);
  }
  actualizarCarrito();
}

function toggleCart() {
  document.getElementById('cart-sidebar').classList.toggle('active');
  document.getElementById('cart-overlay').classList.toggle('active');
}

function abrirCarrito() {
  document.getElementById('cart-sidebar').classList.add('active');
  document.getElementById('cart-overlay').classList.add('active');
}

// Enviar a WhatsApp
function enviarPedido() {
  if (carrito.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  let mensaje = "*¡Hola Parfum Roma!* ✨ Quiero realizar el siguiente pedido:\n\n";
  let total = 0;

  carrito.forEach(item => {
    mensaje += `- ${item.cantidad}x ${item.nombre} (${formatearPrecio(item.precio * item.cantidad)})\n`;
    total += item.precio * item.cantidad;
  });

  mensaje += `\n*TOTAL: ${formatearPrecio(total)}*\n\n¡Espero su respuesta para coordinar el pago y envío!`;

  const waLink = `https://wa.me/5491150350552?text=${encodeURIComponent(mensaje)}`;
  window.open(waLink, '_blank');
}

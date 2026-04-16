(function () {
  const config = window.CLOUD_CONFIG || {};
  const url = (config.SUPABASE_URL || '').trim();
  const key = (config.SUPABASE_ANON_KEY || '').trim();
  const enabled =
    !!url &&
    !!key &&
    !url.includes('PON_AQUI') &&
    !key.includes('PON_AQUI');

  function normalizeCategory(value) {
    const cleaned = String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const compact = cleaned.replace(/[^a-z]/g, '');

    if (cleaned === 'disenador' || cleaned === 'designer' || compact === 'disenador' || compact === 'diseador') {
      return 'disenador';
    }
    return 'arabe';
  }

  function normalizeProduct(product, index) {
    return {
      id: String(product.id || `p-${Date.now()}-${index || 0}`),
      nombre: String(product.nombre || '').trim(),
      precio: Number(product.precio || 0),
      descripcion: String(product.descripcion || '').trim(),
      imagen: String(product.imagen || '').trim(),
      categoria: normalizeCategory(product.categoria)
    };
  }

  let client = null;
  function getClient() {
    if (!enabled) return null;
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('No se encontro supabase-js en la pagina.');
    }
    client = window.supabase.createClient(url, key);
    return client;
  }

  async function fetchProducts() {
    if (!enabled) return null;
    const supa = getClient();
    const { data, error } = await supa
      .from('products')
      .select('id,nombre,precio,descripcion,imagen,categoria')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw error;
    return (data || []).map((item, index) => normalizeProduct(item, index));
  }

  async function saveProducts(products) {
    if (!enabled) return false;
    const supa = getClient();
    const normalized = (products || []).map((item, index) => normalizeProduct(item, index));

    const { error: deleteError } = await supa.from('products').delete().neq('id', '');
    if (deleteError) throw deleteError;

    if (normalized.length === 0) return true;

    const { error: insertError } = await supa.from('products').insert(normalized);
    if (insertError) throw insertError;

    return true;
  }

  async function seedProductsIfEmpty(products) {
    if (!enabled) return false;
    const current = await fetchProducts();
    if (Array.isArray(current) && current.length > 0) return false;
    await saveProducts(products || []);
    return true;
  }

  async function signIn(email, password) {
    if (!enabled) return false;
    const supa = getClient();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return true;
  }

  async function signOut() {
    if (!enabled) return false;
    const supa = getClient();
    const { error } = await supa.auth.signOut();
    if (error) throw error;
    return true;
  }

  async function hasSession() {
    if (!enabled) return false;
    const supa = getClient();
    const { data, error } = await supa.auth.getSession();
    if (error) throw error;
    return !!data?.session;
  }

  window.CloudDB = {
    enabled,
    normalizeCategory,
    normalizeProduct,
    fetchProducts,
    saveProducts,
    seedProductsIfEmpty,
    signIn,
    signOut,
    hasSession
  };
})();

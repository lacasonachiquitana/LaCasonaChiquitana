// Configuración de Supabase y constantes
const SUPABASE_URL = "https://ckxbkzbrvejtespjjgcs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreGJremJydmVqdGVzcGpqZ2NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzA5NTEsImV4cCI6MjEwNzAwNjk1MX0.WgEcZFodWhZE69skClAHtJ5VgraR1FxJ1ffyRgBHnwQ";
const TELEFONO_WHATSAPP = "59177007374";
const IMAGE_BUCKET = 'hotel-images';
const PAGE_IMAGE_PATHS = {
  hero: 'site/hero-image',
  'about-room': 'site/about-room-image',
  'about-gallery': 'site/about-gallery-image'
};

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let habitacionesData = [];
let testimoniosData = [];
let currentFilter = 'todos';
let isAdminLoggedIn = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

// --- GESTIÓN DE TEMA OSCURO / CLARO ---
function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
      
      showToast(`Tema cambiado a modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'}`);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;

  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
    icon.style.color = '#f59e0b';
  } else {
    icon.className = 'fa-solid fa-moon';
    icon.style.color = '#c85a32';
  }
}

// --- MENÚ MÓVIL RESPONSIVE ---
function setupMobileMenu() {
  const toggleBtn = document.getElementById('menuToggleBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (toggleBtn && mobileMenu) {
    toggleBtn.addEventListener('click', toggleMobileMenu);

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.hidden = true;
      });
    });
  }
}

function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.hidden = !mobileMenu.hidden;
  }
}

// --- SUPABASE & RENDER ---
async function fetchHabitaciones() {
  const loadingEl = document.getElementById('loadingState');

  if (loadingEl) loadingEl.style.display = 'block';

  try {
    const { data, error } = await supabaseClient
      .from('habitaciones')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    habitacionesData = data || [];
    if (loadingEl) loadingEl.style.display = 'none';
    renderHabitaciones();
  } catch (err) {
    console.error("Error conectando con Supabase:", err);
    if (loadingEl) {
      loadingEl.innerHTML = `<p style="color:#ef4444; font-size:13px;">Error al obtener las habitaciones de la base de datos.</p>`;
    }
  }
}

function renderHabitaciones() {
  const grid = document.getElementById('habitacionesGrid');
  if (!grid) return;
  
  grid.innerHTML = '';

  const filtradas = habitacionesData.filter(item => {
    const estadoNorm = (item.estado || '').toLowerCase();
    const tipoNorm = (item.tipo || '').toLowerCase();

    if (currentFilter === 'todos') return true;
    if (currentFilter === 'Disponible') return estadoNorm === 'disponible';
    if (currentFilter === 'Matrimonial') return tipoNorm.includes('matrimonial');
    if (currentFilter === 'Triple') return tipoNorm.includes('triple') || tipoNorm.includes('múltiple') || tipoNorm.includes('cuádruple');
    return true;
  });

  if (filtradas.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; padding:40px 0; text-align:center; color:var(--text-muted);">No se encontraron habitaciones en esta categoría.</div>`;
    return;
  }

  filtradas.forEach(item => {
    const estadoNorm = (item.estado || 'disponible').toLowerCase();
    
    const estadoBadges = {
      disponible: { color: 'background:#10b98122; color:#10b981; border:1px solid #10b98155;', label: 'Disponible' },
      ocupada: { color: 'background:#ef444422; color:#ef4444; border:1px solid #ef444455;', label: 'Ocupada' },
      limpieza: { color: 'background:#f59e0b22; color:#f59e0b; border:1px solid #f59e0b55;', label: 'En Limpieza' },
      mantenimiento: { color: 'background:#6b728022; color:#9ca3af; border:1px solid #6b728055;', label: 'Mantenimiento' }
    };

    const currentBadge = estadoBadges[estadoNorm] || estadoBadges.disponible;
    const nombreHabitacion = escapeHtml(`Habitación N° ${item.numero} (${item.tipo})`);
    const isAvailable = estadoNorm === 'disponible';
    const imagenGuardada = (item.imagen_url || '').trim();
    const esImagenPredeterminada = imagenGuardada.includes('images.unsplash.com');
    const imagenHabitacionHTML = imagenGuardada && !esImagenPredeterminada
      ? `<img src="${escapeHtml(imagenGuardada)}" alt="Habitación ${escapeHtml(item.numero)}">`
      : '<div class="room-image-placeholder" aria-label="Sin imagen disponible"><i class="fa-regular fa-image"></i><span>Sin imagen</span></div>';
    const amenidades = [
      { key: 'incluye_aire_acondicionado', label: 'Aire acondicionado', icon: 'fa-snowflake' },
      { key: 'incluye_bano_privado', label: 'Baño privado', icon: 'fa-shower' },
      { key: 'incluye_desayuno', label: 'Desayuno', icon: 'fa-mug-hot' }
    ].filter(amenidad => item[amenidad.key] !== false)
      .map(amenidad => `<div class="room-amenity"><i class="fa-solid ${amenidad.icon}"></i> <span>${amenidad.label}</span></div>`)
      .join('');

    const adminControlHTML = isAdminLoggedIn ? `
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--surface-border); display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Estado:</span>
        <select onchange="updateHabitacionEstado(${item.id}, this.value)" class="form-select" style="width:auto; padding:4px 8px; font-size:11px;">
          <option value="disponible" ${estadoNorm === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="ocupada" ${estadoNorm === 'ocupada' ? 'selected' : ''}>Ocupada</option>
          <option value="limpieza" ${estadoNorm === 'limpieza' ? 'selected' : ''}>En Limpieza</option>
          <option value="mantenimiento" ${estadoNorm === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
        </select>
      </div>
    ` : '';

    const card = document.createElement('div');
    card.className = "room-card";
    card.innerHTML = `
      <div>
        <div class="room-media">
          ${imagenHabitacionHTML}
          ${isAdminLoggedIn ? `<button class="image-edit-button room-image-edit" data-image-key="room:${item.id}" type="button" title="Cambiar foto de habitación ${item.numero}" aria-label="Cambiar foto de habitación ${item.numero}"><i class="fa-solid fa-camera"></i></button>` : ''}
          <span class="room-badge" style="${currentBadge.color}">${currentBadge.label}</span>
          <span class="room-number-tag">N° ${escapeHtml(item.numero)}</span>
        </div>

        <div class="room-body">
          <div class="room-header-row">
            <h4 class="room-title brand-font">${escapeHtml(item.tipo)}</h4>
            <div class="room-price">${escapeHtml(item.precio)} <small>$us / noche</small></div>
          </div>

          <p class="room-desc">${escapeHtml(item.descripcion || 'Habitación confortable con galería colonial e iluminación cálida.')}</p>

          <div class="room-amenities">
            <div class="room-amenity"><i class="fa-solid fa-user-group"></i> <span>${escapeHtml(item.capacidad || '2 Personas')}</span></div>
            ${amenidades}
          </div>

          ${adminControlHTML}
          ${isAdminLoggedIn ? `<div class="room-admin-actions"><button class="btn btn-secondary" type="button" data-edit-room="${escapeHtml(item.id)}"><i class="fa-solid fa-pen"></i> Editar</button><button class="btn btn-danger" type="button" data-delete-room="${escapeHtml(item.id)}"><i class="fa-solid fa-trash"></i> Eliminar</button></div>` : ''}
        </div>
      </div>

      <div style="padding: 0 24px 24px;">
        <button onclick="openWhatsappModal('${nombreHabitacion}')" class="btn btn-whatsapp" style="width:100%;" ${isAvailable ? '' : 'disabled'} title="${isAvailable ? 'Consultar disponibilidad por WhatsApp' : 'Esta habitación no está disponible para reservas'}">
          <i class="fa-brands fa-whatsapp"></i> Consultar WhatsApp
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function fetchTestimonials() {
  try {
    const { data, error } = await supabaseClient
      .from('testimonios')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    testimoniosData = data || [];
    renderTestimonials();
  } catch (error) {
    console.error('Error al cargar testimonios:', error);
    const grid = document.getElementById('testimonialsGrid');
    if (grid) grid.innerHTML = '<p class="empty-testimonials">Aún no hay reseñas publicadas.</p>';
  }
}

function testimonialCardHTML(review, pending = false) {
  const stars = `${'★'.repeat(Number(review.calificacion))}${'☆'.repeat(5 - Number(review.calificacion))}`;
  const adminActions = isAdminLoggedIn ? `
    <div class="testimonial-admin-actions">
      <button class="btn btn-secondary" type="button" data-edit-testimonial="${escapeHtml(review.id)}" aria-label="Editar reseña"><i class="fa-solid fa-pen"></i></button>
      ${pending ? `<button class="btn btn-primary" type="button" data-publish-testimonial="${escapeHtml(review.id)}" aria-label="Publicar reseña"><i class="fa-solid fa-check"></i> Publicar</button>` : ''}
      <button class="btn btn-danger" type="button" data-delete-testimonial="${escapeHtml(review.id)}" aria-label="Eliminar reseña"><i class="fa-solid fa-trash"></i></button>
    </div>
  ` : '';
  const photo = review.foto_url
    ? `<img class="testimonial-photo" src="${escapeHtml(review.foto_url)}" alt="Foto de ${escapeHtml(review.nombre)}" loading="lazy">`
    : '';

  return `
    <article class="testimonial-card${pending ? ' testimonial-pending-card' : ''}">
      <div>
        <div class="stars" aria-label="${Number(review.calificacion)} de 5 estrellas">${stars}</div>
        <p class="testimonial-text">“${escapeHtml(review.comentario)}”</p>
      </div>
      <div class="testimonial-author-row">
        <div class="testimonial-author">
          <strong class="author-name">${escapeHtml(review.nombre)}</strong>
          ${review.contexto ? `<span class="author-sub">${escapeHtml(review.contexto)}</span>` : ''}
        </div>
        ${photo}
      </div>
      ${adminActions}
    </article>
  `;
}

function renderTestimonials() {
  const grid = document.getElementById('testimonialsGrid');
  const pendingContainer = document.getElementById('pendingTestimonials');
  if (!grid || !pendingContainer) return;

  const published = testimoniosData.filter(review => review.publicado);
  const pending = isAdminLoggedIn ? testimoniosData.filter(review => !review.publicado) : [];

  grid.innerHTML = published.length
    ? published.map(review => testimonialCardHTML(review)).join('')
    : '<p class="empty-testimonials">Aún no hay reseñas publicadas.</p>';

  pendingContainer.hidden = !isAdminLoggedIn || pending.length === 0;
  pendingContainer.innerHTML = pending.length
    ? `<h3 class="pending-title">Pendientes de revisión <span>${pending.length}</span></h3><div class="testimonials-grid">${pending.map(review => testimonialCardHTML(review, true)).join('')}</div>`
    : '';

  document.querySelectorAll('.testimonial-photo').forEach(image => {
    image.addEventListener('error', () => image.remove(), { once: true });
  });
}

function openRoomModal(room = null) {
  if (!isAdminLoggedIn) return;
  const form = document.getElementById('room-form');
  form.reset();
  document.getElementById('room-id').value = room?.id ?? '';
  document.getElementById('room-number').value = room?.numero ?? '';
  document.getElementById('room-type').value = room?.tipo ?? '';
  document.getElementById('room-capacity').value = room?.capacidad ?? '';
  document.getElementById('room-price').value = room?.precio ?? '';
  document.getElementById('room-status').value = room?.estado ?? 'disponible';
  document.getElementById('room-description').value = room?.descripcion ?? '';
  document.getElementById('room-has-bathroom').checked = room ? room.incluye_bano_privado !== false : true;
  document.getElementById('room-has-ac').checked = room ? room.incluye_aire_acondicionado !== false : true;
  document.getElementById('room-has-breakfast').checked = room ? room.incluye_desayuno !== false : true;
  document.getElementById('room-modal-title').textContent = room ? `Editar habitación ${room.numero}` : 'Añadir habitación';
  document.getElementById('room-modal').classList.add('active');
}

async function saveRoom(event) {
  event.preventDefault();
  if (!isAdminLoggedIn) return;

  const roomId = document.getElementById('room-id').value;
  const room = {
    numero: document.getElementById('room-number').value.trim(),
    tipo: document.getElementById('room-type').value.trim(),
    capacidad: document.getElementById('room-capacity').value.trim() || '2 Personas',
    precio: Number(document.getElementById('room-price').value),
    estado: document.getElementById('room-status').value,
    descripcion: document.getElementById('room-description').value.trim(),
    incluye_bano_privado: document.getElementById('room-has-bathroom').checked,
    incluye_aire_acondicionado: document.getElementById('room-has-ac').checked,
    incluye_desayuno: document.getElementById('room-has-breakfast').checked
  };

  try {
    const query = roomId
      ? supabaseClient.from('habitaciones').update(room).eq('id', roomId)
      : supabaseClient.from('habitaciones').insert(room);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se guardó la habitación. Verifica las políticas INSERT/UPDATE de habitaciones.');

    document.getElementById('room-modal').classList.remove('active');
    await fetchHabitaciones();
    showToast(roomId ? 'Habitación actualizada' : 'Habitación añadida');
  } catch (error) {
    console.error('Error al guardar habitación:', error);
    if (error.message?.includes('schema cache')) {
      showToast('Falta actualizar la base de datos: ejecuta supabase/room-services-migration.sql en Supabase SQL Editor.');
      return;
    }
    showToast(`No se pudo guardar la habitación: ${error.message}`);
  }
}

async function deleteRoom(roomId) {
  if (!isAdminLoggedIn || !window.confirm('¿Eliminar esta habitación? Esta acción no se puede deshacer.')) return;
  try {
    const { data, error } = await supabaseClient
      .from('habitaciones')
      .delete()
      .eq('id', roomId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se eliminó la habitación. Verifica las políticas DELETE de habitaciones.');
    await fetchHabitaciones();
    showToast('Habitación eliminada');
  } catch (error) {
    console.error('Error al eliminar habitación:', error);
    showToast(`No se pudo eliminar: ${error.message}`);
  }
}

function openTestimonialModal(review = null) {
  if (!isAdminLoggedIn) return;
  document.getElementById('testimonial-form').reset();
  document.getElementById('testimonial-id').value = review?.id ?? '';
  document.getElementById('testimonial-name').value = review?.nombre ?? '';
  document.getElementById('testimonial-context').value = review?.contexto ?? '';
  document.getElementById('testimonial-rating').value = review?.calificacion ?? '5';
  document.getElementById('testimonial-comment').value = review?.comentario ?? '';
  document.getElementById('testimonial-published').checked = Boolean(review?.publicado);
  document.getElementById('testimonial-modal-title').textContent = review ? 'Editar reseña' : 'Añadir reseña';
  document.getElementById('testimonial-modal').classList.add('active');
}

async function saveTestimonial(event) {
  event.preventDefault();
  if (!isAdminLoggedIn) return;

  const reviewId = document.getElementById('testimonial-id').value;
  const review = {
    nombre: document.getElementById('testimonial-name').value.trim(),
    contexto: document.getElementById('testimonial-context').value.trim(),
    comentario: document.getElementById('testimonial-comment').value.trim(),
    calificacion: Number(document.getElementById('testimonial-rating').value),
    publicado: document.getElementById('testimonial-published').checked
  };
  const photoFile = document.getElementById('testimonial-photo').files[0];
  if (photoFile && (!photoFile.type.startsWith('image/') || photoFile.size > 8 * 1024 * 1024)) {
    showToast('La foto debe ser una imagen de menos de 8 MB');
    return;
  }

  try {
    let savedReview;
    if (reviewId) {
      const { data, error } = await supabaseClient.from('testimonios').update(review).eq('id', reviewId).select('*').maybeSingle();
      if (error) throw error;
      savedReview = data;
    } else {
      const { data, error } = await supabaseClient.from('testimonios').insert({ ...review, foto_url: null }).select('*').single();
      if (error) throw error;
      savedReview = data;
    }
    if (!savedReview) throw new Error('No se guardó la reseña. Revisa los permisos de testimonios.');

    if (photoFile) {
      const photoPath = `testimonials/${savedReview.id}/photo`;
      const { error: uploadError } = await supabaseClient.storage.from(IMAGE_BUCKET).upload(photoPath, photoFile, { upsert: true, cacheControl: '0' });
      if (uploadError) throw uploadError;
      const { data: photo } = supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(photoPath);
      const photoUrl = `${photo.publicUrl}?v=${Date.now()}`;
      const { error: photoUpdateError } = await supabaseClient.from('testimonios').update({ foto_url: photoUrl }).eq('id', savedReview.id);
      if (photoUpdateError) throw photoUpdateError;
    }

    document.getElementById('testimonial-modal').classList.remove('active');
    await fetchTestimonials();
    showToast('Reseña guardada');
  } catch (error) {
    console.error('Error al guardar reseña:', error);
    showToast(`No se pudo guardar la reseña: ${error.message}`);
  }
}

async function submitGuestReview(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('guest-review-status');
  const formData = new FormData(form);
  const review = {
    nombre: String(formData.get('nombre')).trim(),
    contexto: String(formData.get('contexto') || '').trim(),
    comentario: String(formData.get('comentario')).trim(),
    calificacion: Number(formData.get('calificacion'))
  };

  try {
    const { error } = await supabaseClient.from('testimonios').insert(review);
    if (error) throw error;
    form.reset();
    if (status) status.textContent = 'Gracias. Tu reseña será revisada antes de publicarse.';
  } catch (error) {
    console.error('Error al enviar reseña:', error);
    if (status) status.textContent = `No se pudo enviar la reseña: ${error.message}`;
  }
}

async function updateTestimonial(reviewId, changes) {
  if (!isAdminLoggedIn) return;
  try {
    const { error } = await supabaseClient.from('testimonios').update(changes).eq('id', reviewId);
    if (error) throw error;
    await fetchTestimonials();
    showToast(changes.publicado ? 'Reseña publicada' : 'Reseña actualizada');
  } catch (error) {
    showToast(`No se pudo actualizar la reseña: ${error.message}`);
  }
}

async function deleteTestimonial(reviewId) {
  if (!isAdminLoggedIn || !window.confirm('¿Eliminar esta reseña? Esta acción no se puede deshacer.')) return;
  try {
    const { data, error } = await supabaseClient.from('testimonios').delete().eq('id', reviewId).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se eliminó la reseña. Revisa la política DELETE de testimonios.');
    await fetchTestimonials();
    showToast('Reseña eliminada');
  } catch (error) {
    showToast(`No se pudo eliminar la reseña: ${error.message}`);
  }
}

function setupContentAdminEvents() {
  document.getElementById('btn-add-room')?.addEventListener('click', () => openRoomModal());
  document.getElementById('btn-add-testimonial')?.addEventListener('click', () => openTestimonialModal());
  document.getElementById('room-form')?.addEventListener('submit', saveRoom);
  document.getElementById('testimonial-form')?.addEventListener('submit', saveTestimonial);
  document.getElementById('guest-review-form')?.addEventListener('submit', submitGuestReview);

  document.addEventListener('click', event => {
    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) document.getElementById(closeButton.dataset.closeModal)?.classList.remove('active');

    const editRoomButton = event.target.closest('[data-edit-room]');
    if (editRoomButton) openRoomModal(habitacionesData.find(room => String(room.id) === editRoomButton.dataset.editRoom));

    const deleteRoomButton = event.target.closest('[data-delete-room]');
    if (deleteRoomButton) deleteRoom(deleteRoomButton.dataset.deleteRoom);

    const editReviewButton = event.target.closest('[data-edit-testimonial]');
    if (editReviewButton) openTestimonialModal(testimoniosData.find(review => String(review.id) === editReviewButton.dataset.editTestimonial));

    const publishButton = event.target.closest('[data-publish-testimonial]');
    if (publishButton) updateTestimonial(publishButton.dataset.publishTestimonial, { publicado: true });

    const deleteReviewButton = event.target.closest('[data-delete-testimonial]');
    if (deleteReviewButton) deleteTestimonial(deleteReviewButton.dataset.deleteTestimonial);
  });
}

// Filtros
function setupFiltros() {
  const contenedor = document.getElementById('filtrosContenedor');
  if (!contenedor) return;

  contenedor.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    currentFilter = btn.dataset.filter;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderHabitaciones();
  });
}

// Modal WhatsApp
function openWhatsappModal(roomName = "Consulta General") {
  const modal = document.getElementById('whatsappModal');
  const roomInput = document.getElementById('modalRoom');

  if (roomInput) roomInput.value = roomName;

  const hoy = new Date().toISOString().split('T')[0];
  const mañana = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const checkInInput = document.getElementById('modalCheckIn');
  const checkOutInput = document.getElementById('modalCheckOut');

  if (checkInInput && !checkInInput.value) { checkInInput.value = hoy; checkInInput.min = hoy; }
  if (checkOutInput && !checkOutInput.value) { checkOutInput.value = mañana; checkOutInput.min = hoy; }

  if (modal) modal.classList.add('active');
}

function closeWhatsappModal() {
  const modal = document.getElementById('whatsappModal');
  if (modal) modal.classList.remove('active');
}

function sendWhatsappMessage(event) {
  event.preventDefault();

  const name = document.getElementById('modalName').value.trim();
  const room = document.getElementById('modalRoom').value.trim();
  const checkIn = document.getElementById('modalCheckIn').value;
  const checkOut = document.getElementById('modalCheckOut').value;
  const huespedes = document.getElementById('modalHuespedes').value;
  const details = document.getElementById('modalMessage').value.trim();

  let text = `Hola, quisiera consultar disponibilidad en *Hotel La Casona Chiquitana*:\n\n`;
  text += `*Nombre:* ${name}\n`;
  text += `*Habitación o consulta:* ${room}\n`;
  if (checkIn) text += `*Fecha de entrada:* ${checkIn}\n`;
  if (checkOut) text += `*Fecha de salida:* ${checkOut}\n`;
  text += `*Huéspedes:* ${huespedes}\n`;
  if (details) text += `*Mensaje adicional:* ${details}\n`;

  window.open(`https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank');
  closeWhatsappModal();
}

// Admin
function setupAdminEvents() {
  const modalAdmin = document.getElementById('modal-admin');
  const btnAdminLogin = document.getElementById('btn-admin-login');
  const btnAdminLogout = document.getElementById('btn-admin-logout');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminEmailInput = document.getElementById('admin-email-input');
  const adminAuthError = document.getElementById('admin-auth-error');
  const badgeAdminSession = document.getElementById('badge-admin-session');

  if (btnAdminLogin && modalAdmin) {
    btnAdminLogin.addEventListener('click', () => {
      modalAdmin.classList.add('active');
      if (adminAuthError) adminAuthError.style.display = 'none';
      if (adminEmailInput) adminEmailInput.focus();
    });
  }

  if (btnCloseModal && modalAdmin) {
    btnCloseModal.addEventListener('click', () => modalAdmin.classList.remove('active'));
  }

  if (adminLoginForm) adminLoginForm.addEventListener('submit', signInAdmin);

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', async () => {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        showToast(`No se pudo cerrar sesión: ${error.message}`);
        return;
      }
      isAdminLoggedIn = false;
      setImageEditControls(false);
      if (badgeAdminSession) badgeAdminSession.style.display = 'none';
      if (btnAdminLogin) btnAdminLogin.style.display = '';
      renderHabitaciones();
      await fetchTestimonials();
      showToast("Sesión de Admin cerrada");
    });
  }

  supabaseClient.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      isAdminLoggedIn = false;
      if (badgeAdminSession) badgeAdminSession.style.display = 'none';
      if (btnAdminLogin) btnAdminLogin.style.display = '';
      setImageEditControls(false);
      renderHabitaciones();
      fetchTestimonials();
    }
  });
}

async function signInAdmin(event) {
  event.preventDefault();
  const modalAdmin = document.getElementById('modal-admin');
  const btnAdminLogin = document.getElementById('btn-admin-login');
  const submitButton = document.getElementById('btn-admin-submit');
  const badgeAdminSession = document.getElementById('badge-admin-session');
  const email = document.getElementById('admin-email-input').value.trim();
  const password = document.getElementById('admin-password-input').value;
  const authError = document.getElementById('admin-auth-error');

  if (submitButton) submitButton.disabled = true;
  if (authError) authError.style.display = 'none';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: admin, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!admin) {
      await supabaseClient.auth.signOut();
      throw new Error('Esta cuenta no tiene permisos de administrador.');
    }

    isAdminLoggedIn = true;
    setImageEditControls(true);
    if (modalAdmin) modalAdmin.classList.remove('active');
    if (btnAdminLogin) btnAdminLogin.style.display = 'none';
    if (badgeAdminSession) badgeAdminSession.style.display = 'inline-flex';
    renderHabitaciones();
    await fetchTestimonials();
    showToast('Sesión de administrador iniciada');
  } catch (error) {
    if (authError) {
      authError.textContent = error.message || 'No se pudo iniciar sesión.';
      authError.style.display = 'block';
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function restoreAdminSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) return;

  const { data: admin, error: adminError } = await supabaseClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.session.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabaseClient.auth.signOut();
    return;
  }

  isAdminLoggedIn = true;
  const btnAdminLogin = document.getElementById('btn-admin-login');
  const badgeAdminSession = document.getElementById('badge-admin-session');
  if (btnAdminLogin) btnAdminLogin.style.display = 'none';
  if (badgeAdminSession) badgeAdminSession.style.display = 'inline-flex';
  setImageEditControls(true);
  renderHabitaciones();
  await fetchTestimonials();
}

function setImageEditControls(visible) {
  document.querySelectorAll('.page-image-edit, .editable-image-frame .image-edit-button').forEach(button => {
    button.hidden = !visible;
  });
  document.querySelectorAll('.admin-only-control').forEach(button => {
    button.hidden = !visible;
  });
  renderTestimonials();
}

function setupImageUploads() {
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-image-key]');
    if (!button || !isAdminLoggedIn) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) uploadImage(button.dataset.imageKey, file);
      input.remove();
    }, { once: true });
    input.click();
  });
}

async function uploadImage(imageKey, file) {
  if (!isAdminLoggedIn) return;
  if (!file.type.startsWith('image/')) {
    showToast('Selecciona un archivo de imagen');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast('La imagen debe pesar menos de 8 MB');
    return;
  }

  const isRoomImage = imageKey.startsWith('room:');
  const roomId = isRoomImage ? imageKey.slice(5) : null;
  const objectPath = isRoomImage ? `rooms/${roomId}/image` : PAGE_IMAGE_PATHS[imageKey];
  if (!objectPath) return;

  let failedOperation = 'Subida a Storage';
  try {
    const { error: uploadError } = await supabaseClient.storage
      .from(IMAGE_BUCKET)
      .upload(objectPath, file, { upsert: true, cacheControl: '0' });
    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(objectPath);
    const imageUrl = `${data.publicUrl}?v=${Date.now()}`;

    if (isRoomImage) {
      failedOperation = 'Actualización de habitaciones';
      const { data: updatedRoom, error } = await supabaseClient
        .from('habitaciones')
        .update({ imagen_url: imageUrl })
        .eq('id', roomId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!updatedRoom) {
        throw new Error('Supabase no actualizó ninguna habitación. Revisa que tu usuario esté en admin_users y tenga permiso UPDATE.');
      }

      const room = habitacionesData.find(item => String(item.id) === roomId);
      if (room) room.imagen_url = imageUrl;
      renderHabitaciones();
    } else if (imageKey === 'hero') {
      const image = new Image();
      image.onload = () => {
        document.querySelector('.hero-bg').style.backgroundImage = `url("${imageUrl}")`;
      };
      image.src = imageUrl;
    } else {
      const image = document.getElementById(imageKey === 'about-room' ? 'image-about-room' : 'image-about-gallery');
      if (image) image.src = imageUrl;
    }

    showToast('Imagen actualizada correctamente');
  } catch (error) {
    console.error('Error al guardar la imagen:', error);
    showToast(`${failedOperation}: ${error.message || 'revisa las políticas RLS en Supabase.'}`);
  }
}

function loadPageImages() {
  Object.entries(PAGE_IMAGE_PATHS).forEach(([imageKey, objectPath]) => {
    const { data } = supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(objectPath);
    const imageUrl = `${data.publicUrl}?v=${Date.now()}`;

    if (imageKey === 'hero') {
      const image = new Image();
      image.onload = () => {
        document.querySelector('.hero-bg').style.backgroundImage = `url("${imageUrl}")`;
      };
      image.onerror = () => {
        console.error('No se pudo restaurar la imagen de portada desde Storage:', imageUrl);
        showToast('No se pudo cargar la portada guardada. Verifica que el bucket hotel-images permita lectura pública.');
      };
      image.src = imageUrl;
      return;
    }

    const image = document.getElementById(imageKey === 'about-room' ? 'image-about-room' : 'image-about-gallery');
    if (!image) return;
    image.onload = () => { image.hidden = false; };
    image.onerror = () => {
      image.onerror = null;
      console.error(`No se pudo restaurar ${imageKey} desde Storage:`, imageUrl);
      showToast(`No se pudo cargar ${imageKey === 'about-room' ? 'la foto de habitación' : 'la foto de galería'}. Verifica la lectura pública del bucket hotel-images.`);
    };
    image.src = imageUrl;
  });
}

async function updateHabitacionEstado(id, nuevoEstado) {
  if (!isAdminLoggedIn) return;

  try {
    const { error } = await supabaseClient
      .from('habitaciones')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) throw error;

    const room = habitacionesData.find(r => r.id === id);
    if (room) room.estado = nuevoEstado;

    renderHabitaciones();
    showToast(`Estado de Habitación #${id} cambiado a "${nuevoEstado.toUpperCase()}"`);
  } catch (err) {
    console.error("Error al actualizar estado:", err);
    showToast("Error al actualizar el estado");
  }
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = "toast-msg";
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-circle-info';
  icon.style.color = 'var(--accent)';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);
  
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupMobileMenu();
  fetchHabitaciones();
  setupFiltros();
  setupAdminEvents();
  setupContentAdminEvents();
  setupImageUploads();
  loadPageImages();
  restoreAdminSession();
  fetchTestimonials();
});

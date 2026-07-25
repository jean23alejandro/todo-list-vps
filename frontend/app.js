const API_URL = '/api/tasks';
const MATERIAS_URL = '/api/materias';

// Navegación
const welcomeScreen = document.getElementById('welcome-screen');
const appScreen = document.getElementById('app-screen');
const enterBtn = document.getElementById('enter-btn');
const backBtn = document.getElementById('back-btn');

// Formulario y filtros
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const materiaSelect = document.getElementById('materia-select');
const newMateriaBtn = document.getElementById('new-materia-btn');
const fechaInput = document.getElementById('fecha-input');
const filterInput = document.getElementById('filter-input');
const dateFilterSelect = document.getElementById('date-filter-select');
const taskList = document.getElementById('task-list');

// Modal de edición
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const editMateria = document.getElementById('edit-materia');
const editFecha = document.getElementById('edit-fecha');
const editCancelBtn = document.getElementById('edit-cancel-btn');

let allTasks = [];
let allMaterias = [];
let editingTaskId = null;

/* ==============================
   NAVEGACIÓN ENTRE PANTALLAS
============================== */
enterBtn.addEventListener('click', () => {
  welcomeScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  fetchMaterias();
  fetchTasks();
});

backBtn.addEventListener('click', () => {
  appScreen.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
  // Reseteamos filtros para que la próxima vez que entre, empiece limpio
  filterInput.value = '';
  dateFilterSelect.value = '';
});

/* ==============================
   MATERIAS
============================== */
async function fetchMaterias() {
  try {
    const res = await fetch(MATERIAS_URL);
    allMaterias = await res.json();

    // Llenamos ambos selects: el del formulario de creación y el del modal de edición
    [materiaSelect, editMateria].forEach(select => {
      select.innerHTML = '<option value="">Sin materia</option>';
      allMaterias.forEach(materia => {
        const opt = document.createElement('option');
        opt.value = materia.id;
        opt.textContent = materia.nombre;
        select.appendChild(opt);
      });
    });
  } catch (err) {
    console.error('Error al obtener materias:', err);
  }
}

newMateriaBtn.addEventListener('click', async () => {
  const nombre = prompt('Nombre de la nueva materia:');
  if (!nombre || nombre.trim() === '') return;

  try {
    const res = await fetch(MATERIAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Error al crear materia');
      return;
    }
    await fetchMaterias();
  } catch (err) {
    console.error('Error al crear materia:', err);
  }
});

/* ==============================
   TAREAS: obtener y renderizar
============================== */
async function fetchTasks() {
  try {
    const params = new URLSearchParams();
    if (filterInput.value) params.append('search', filterInput.value);
    if (dateFilterSelect.value) params.append('date_filter', dateFilterSelect.value);

    const res = await fetch(`${API_URL}?${params.toString()}`);
    allTasks = await res.json();
    renderTasks(allTasks);
  } catch (err) {
    console.error('Error al obtener tareas:', err);
  }
}

function formatFecha(fecha) {
  if (!fecha) return '<span class="sin-materia">Sin fecha</span>';
  const [year, month, day] = fecha.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    taskList.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">No hay tareas para mostrar.</td></tr>';
    return;
  }

  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.className = task.completed ? 'completed' : '';

    const materiaHtml = task.materia_nombre
      ? `<span class="materia-badge">${task.materia_nombre}</span>`
      : `<span class="sin-materia">Sin materia</span>`;

    tr.innerHTML = `
      <td><input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="toggle-check"></td>
      <td class="task-title">${task.title}</td>
      <td>${materiaHtml}</td>
      <td>${formatFecha(task.fecha_entrega)}</td>
      <td class="task-actions">
        <button class="edit-btn" data-id="${task.id}" title="Editar">✏️</button>
        <button class="delete-btn" data-id="${task.id}" title="Eliminar">🗑️</button>
      </td>
    `;
    taskList.appendChild(tr);
  });
}

/* ==============================
   CREAR tarea
============================== */
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        materia_id: materiaSelect.value || null,
        fecha_entrega: fechaInput.value || null
      })
    });
    taskInput.value = '';
    fechaInput.value = '';
    materiaSelect.value = '';
    fetchTasks();
  } catch (err) {
    console.error('Error al crear tarea:', err);
  }
});

/* ==============================
   ELIMINAR y ABRIR MODAL DE EDICIÓN
============================== */
taskList.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('toggle-check')) {
    const completed = e.target.checked;
    await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    fetchTasks();
  }

  if (e.target.classList.contains('delete-btn')) {
    const currentTask = allTasks.find(t => t.id == id);
    if (confirm(`"${currentTask.title}"\n¿Eliminar esta tarea?`)) {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchTasks();
    }
  }

  if (e.target.classList.contains('edit-btn')) {
    openEditModal(id);
  }
});

/* ==============================
   MODAL DE EDICIÓN COMPLETO
============================== */
function openEditModal(id) {
  const task = allTasks.find(t => t.id == id);
  if (!task) return;

  editingTaskId = id;
  editTitle.value = task.title;
  editMateria.value = task.materia_id || '';
  editFecha.value = task.fecha_entrega ? task.fecha_entrega.split('T')[0] : '';

  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editingTaskId = null;
}

editCancelBtn.addEventListener('click', closeEditModal);

// Cerrar el modal si se hace clic fuera del cuadro (en el fondo oscuro)
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editingTaskId) return;

  try {
    await fetch(`${API_URL}/${editingTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.value.trim(),
        materia_id: editMateria.value || null,
        fecha_entrega: editFecha.value || null
      })
    });
    closeEditModal();
    fetchTasks();
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
  }
});

/* ==============================
   FILTROS (texto + fecha, combinados)
============================== */
filterInput.addEventListener('input', fetchTasks);
dateFilterSelect.addEventListener('change', fetchTasks);
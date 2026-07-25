const API_URL = '/api/tasks';
const MATERIAS_URL = '/api/materias';

// Elementos - navegación
const welcomeScreen = document.getElementById('welcome-screen');
const appScreen = document.getElementById('app-screen');
const enterBtn = document.getElementById('enter-btn');

// Elementos - formulario y filtros
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const materiaSelect = document.getElementById('materia-select');
const newMateriaBtn = document.getElementById('new-materia-btn');
const fechaInput = document.getElementById('fecha-input');
const filterInput = document.getElementById('filter-input');
const dateFilterSelect = document.getElementById('date-filter-select');
const taskList = document.getElementById('task-list');

let allTasks = [];

/* ==============================
   NAVEGACIÓN ENTRE PANTALLAS
============================== */
enterBtn.addEventListener('click', () => {
  welcomeScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  fetchMaterias();
  fetchTasks();
});

/* ==============================
   MATERIAS
============================== */
async function fetchMaterias() {
  try {
    const res = await fetch(MATERIAS_URL);
    const materias = await res.json();

    materiaSelect.innerHTML = '<option value="">Sin materia</option>';
    materias.forEach(materia => {
      const opt = document.createElement('option');
      opt.value = materia.id;
      opt.textContent = materia.nombre;
      materiaSelect.appendChild(opt);
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
   ACTUALIZAR / ELIMINAR (delegación de eventos)
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
    const currentTask = allTasks.find(t => t.id == id);
    const newTitle = prompt('Editar tarea:', currentTask.title);
    if (newTitle !== null && newTitle.trim() !== '') {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      fetchTasks();
    }
  }
});

/* ==============================
   FILTROS (texto + fecha, combinados)
============================== */
filterInput.addEventListener('input', fetchTasks);
dateFilterSelect.addEventListener('change', fetchTasks);
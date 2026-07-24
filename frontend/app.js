// Detecta automáticamente la URL de la API según dónde se esté ejecutando
const API_URL = '/api/tasks';

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const filterInput = document.getElementById('filter-input');
const taskList = document.getElementById('task-list');

let allTasks = []; // guardamos las tareas en memoria para filtrar sin pedirlas de nuevo al servidor

// Traer todas las tareas desde la API y renderizarlas
async function fetchTasks() {
  try {
    const res = await fetch(API_URL);
    allTasks = await res.json();
    renderTasks(allTasks);
  } catch (err) {
    console.error('Error al obtener tareas:', err);
  }
}

// Dibujar la lista de tareas en el HTML
function renderTasks(tasks) {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    taskList.innerHTML = '<li>No hay tareas para mostrar.</li>';
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = task.completed ? 'completed' : '';

    li.innerHTML = `
      <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="toggle-check">
      <span class="task-title">${task.title}</span>
      <span class="task-actions">
        <button class="edit-btn" data-id="${task.id}" title="Editar">✏️</button>
        <button class="delete-btn" data-id="${task.id}" title="Eliminar">🗑️</button>
      </span>
    `;
    taskList.appendChild(li);
  });
}

// INSERTAR: Crear nueva tarea
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    taskInput.value = '';
    fetchTasks();
  } catch (err) {
    console.error('Error al crear tarea:', err);
  }
});

// ACTUALIZAR (checkbox) y ELIMINAR: usamos delegación de eventos sobre la lista
taskList.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  // Marcar como completada / no completada
  if (e.target.classList.contains('toggle-check')) {
    const completed = e.target.checked;
    await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    fetchTasks();
  }

// Eliminar tarea
  if (e.target.classList.contains('delete-btn')) {
    const currentTask = allTasks.find(t => t.id == id);
    if (confirm(`"${currentTask.title}"\n¿Eliminar esta tarea?`)) {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchTasks();
    }
  }

  // Editar tarea (título)
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

// FILTRO en tiempo real (sobre los datos ya cargados en memoria, sin pedir al servidor cada tecla)
filterInput.addEventListener('input', () => {
  const query = filterInput.value.toLowerCase();
  const filtered = allTasks.filter(task =>
    task.title.toLowerCase().includes(query)
  );
  renderTasks(filtered);
});

// Cargar tareas al iniciar
fetchTasks();

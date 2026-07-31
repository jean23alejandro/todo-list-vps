const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ['http://34.122.131.138'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

/* ==============================
   RUTAS DE MATERIAS
============================== */

// Listar todas las materias
app.get('/api/materias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materias ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener materias' });
  }
});

// Crear una nueva materia
app.post('/api/materias', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre de la materia es obligatorio' });
    }
    const result = await pool.query(
      'INSERT INTO materias (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Error 23505 = violación de UNIQUE (materia repetida)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Esa materia ya existe' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear materia' });
  }
});

/* ==============================
   RUTAS DE TAREAS
============================== */

// LISTAR tareas (con filtro por texto y por fecha: semana/mes actual)
app.get('/api/tasks', async (req, res) => {
  try {
    const { search, date_filter } = req.query;

    // Usamos LEFT JOIN (no INNER JOIN) para no ocultar tareas sin materia asignada
    let query = `
      SELECT tasks.*, materias.nombre AS materia_nombre
      FROM tasks
      LEFT JOIN materias ON tasks.materia_id = materias.id
    `;
    
    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`tasks.title ILIKE $${params.length}`);
    }

    if (date_filter === 'week') {
      conditions.push(`tasks.fecha_entrega >= date_trunc('week', CURRENT_DATE)
                        AND tasks.fecha_entrega < date_trunc('week', CURRENT_DATE) + interval '7 days'`);
    } else if (date_filter === 'month') {
      conditions.push(`tasks.fecha_entrega >= date_trunc('month', CURRENT_DATE)
                        AND tasks.fecha_entrega < date_trunc('month', CURRENT_DATE) + interval '1 month'`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY tasks.fecha_entrega ASC NULLS LAST, tasks.id DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// CREAR una nueva tarea
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, fecha_entrega, materia_id } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (title.length > 255) {
      return res.status(400).json({ error: 'El título no puede superar los 255 caracteres' });
    }
    const result = await pool.query(
      'INSERT INTO tasks (title, fecha_entrega, materia_id) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), fecha_entrega || null, materia_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// ACTUALIZAR una tarea
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed, fecha_entrega, materia_id } = req.body;

    // Distinguimos "el campo no vino en el body" (undefined) de "vino explícitamente en null"
    const result = await pool.query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        completed = COALESCE($2, completed),
        fecha_entrega = CASE WHEN $6 THEN $3 ELSE fecha_entrega END,
        materia_id = CASE WHEN $7 THEN $4 ELSE materia_id END
       WHERE id = $5 RETURNING *`,
      [
        title,
        completed,
        fecha_entrega,
        materia_id,
        id,
        fecha_entrega !== undefined,
        materia_id !== undefined
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// ELIMINAR una tarea
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
const express = require('express');
const pool = require('../db/connection');
const router = express.Router();

// Get all precincts
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM precincts ORDER BY name');
    res.json({ precincts: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prioritized precincts
router.get('/prioritize', async (req, res) => {
  try {
    // TODO: Calculate precinct priorities based on:
    // - Partisan lean
    // - Registration potential
    // - Turnout history
    // - Persuasion opportunity
    res.json({ precincts: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get precinct details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Fetch precinct details
    res.json({ precinct: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

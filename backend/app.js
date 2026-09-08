const express = require('express');

const {
  getAllRequests,
  addRequest,
} = require('./requestStore');

const {
  createVacationRequest,
  validateCreateRequest,
} = require('./vacationRequest');

const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get('/api/requests', (req, res) => {
  res.json(getAllRequests());
});

app.post('/api/requests', (req, res) => {
  const validation = validateCreateRequest(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'Validation error',
      details: validation.details,
    });
  }

  const request = createVacationRequest(validation.value);

  addRequest(request);

  return res.status(201).json(request);
});

module.exports = app;
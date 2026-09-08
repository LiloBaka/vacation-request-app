const express = require('express');

const {
  getAllRequests,
  findRequestById,
  addRequest,
} = require('./requestStore');

const {
  createVacationRequest,
  validateCreateRequest,
  validateRejection,
  approveVacationRequest,
  rejectVacationRequest,
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

app.patch('/api/requests/:id/approve', (req, res) => {
  const request = findRequestById(req.params.id);

  if (!request) {
    return res.status(404).json({
      error: 'Request not found',
    });
  }

  if (request.status !== 'pending') {
    return res.status(409).json({
      error: 'Request already processed',
    });
  }

  approveVacationRequest(request);

  return res.json(request);
});

app.patch('/api/requests/:id/reject', (req, res) => {
  const request = findRequestById(req.params.id);

  if (!request) {
    return res.status(404).json({
      error: 'Request not found',
    });
  }

  if (request.status !== 'pending') {
    return res.status(409).json({
      error: 'Request already processed',
    });
  }

  const validation = validateRejection(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      error: 'Validation error',
      details: validation.details,
    });
  }

  rejectVacationRequest(request, validation.value.reason);

  return res.json(request);
});

module.exports = app;
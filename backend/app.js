const path = require('node:path');
const express = require('express');

const {
  getAllRequests,
  findRequestById,
  addRequest,
} = require('./requestStore');

const {
  isValidStatus,
  createVacationRequest,
  validateCreateRequest,
  validateRejection,
  approveVacationRequest,
  rejectVacationRequest,
} = require('./vacationRequest');

const app = express();

const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(express.json());
app.use(express.static(frontendPath));

function sendError(res, statusCode, error, details) {
  const response = {
    error,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get('/api/requests', (req, res) => {
  const { status } = req.query;

  if (status !== undefined && !isValidStatus(status)) {
    return sendError(
      res,
      400,
      'Validation error',
      {
        status: 'Неизвестный статус заявки',
      },
    );
  }

  return res.json(getAllRequests(status));
});

app.post('/api/requests', (req, res) => {
  const validation = validateCreateRequest(req.body);

  if (!validation.valid) {
    return sendError(
      res,
      400,
      'Validation error',
      validation.details,
    );
  }

  const request = createVacationRequest(validation.value);

  addRequest(request);

  return res.status(201).json(request);
});

app.patch('/api/requests/:id/approve', (req, res) => {
  const request = findRequestById(req.params.id);

  if (!request) {
    return sendError(
      res,
      404,
      'Request not found',
    );
  }

  if (request.status !== 'pending') {
    return sendError(
      res,
      409,
      'Request already processed',
    );
  }

  approveVacationRequest(request);

  return res.json(request);
});

app.patch('/api/requests/:id/reject', (req, res) => {
  const request = findRequestById(req.params.id);

  if (!request) {
    return sendError(
      res,
      404,
      'Request not found',
    );
  }

  if (request.status !== 'pending') {
    return sendError(
      res,
      409,
      'Request already processed',
    );
  }

  const validation = validateRejection(req.body);

  if (!validation.valid) {
    return sendError(
      res,
      400,
      'Validation error',
      validation.details,
    );
  }

  rejectVacationRequest(
    request,
    validation.value.reason,
  );

  return res.json(request);
});

module.exports = app;
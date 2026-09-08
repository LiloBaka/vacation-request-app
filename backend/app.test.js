const {
    test,
    before,
    after,
    beforeEach,
} = require('node:test');

const assert = require('node:assert/strict');

const app = require('./app');
const { clearRequests } = require('./requestStore');

let server;
let baseUrl;

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();

    baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

beforeEach(() => {
    clearRequests();
});

async function apiRequest(path, options = {}) {
    const requestOptions = {
        method: options.method || 'GET',
    };

    if (options.body !== undefined) {
        requestOptions.headers = {
            'Content-Type': 'application/json',
        };

        requestOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(
        `${baseUrl}${path}`,
        requestOptions,
    );

    const body = await response.json();

    return {
        status: response.status,
        body,
    };
}

async function createRequest(overrides = {}) {
    return apiRequest('/api/requests', {
        method: 'POST',
        body: {
            employeeName: 'Иван Иванов',
            startDate: '2026-09-10',
            endDate: '2026-09-12',
            reason: 'Семейная поездка',
            ...overrides,
        },
    });
}

test('creates a vacation request and calculates days', async () => {
    const response = await createRequest();

    assert.equal(response.status, 201);

    assert.equal(response.body.employeeName, 'Иван Иванов');
    assert.equal(response.body.startDate, '2026-09-10');
    assert.equal(response.body.endDate, '2026-09-12');
    assert.equal(response.body.days, 3);
    assert.equal(response.body.status, 'pending');
    assert.equal(response.body.rejectionReason, null);

    assert.ok(response.body.id);
    assert.ok(response.body.createdAt);
});

test('rejects request when endDate is before startDate', async () => {
    const response = await createRequest({
        startDate: '2026-09-15',
        endDate: '2026-09-10',
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation error');

    assert.equal(
        response.body.details.endDate,
        'Дата окончания не может быть раньше даты начала',
    );
});

test('approves a pending request', async () => {
    const created = await createRequest();

    const response = await apiRequest(
        `/api/requests/${created.body.id}/approve`,
        {
            method: 'PATCH',
        },
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'approved');
    assert.equal(response.body.id, created.body.id);
});

test('requires a reason when rejecting a request', async () => {
    const created = await createRequest();

    const response = await apiRequest(
        `/api/requests/${created.body.id}/reject`,
        {
            method: 'PATCH',
            body: {
                reason: '   ',
            },
        },
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation error');

    assert.equal(
        response.body.details.reason,
        'Причина отклонения обязательна',
    );
});

test('does not allow changing an already processed request', async () => {
    const created = await createRequest();

    const approved = await apiRequest(
        `/api/requests/${created.body.id}/approve`,
        {
            method: 'PATCH',
        },
    );

    assert.equal(approved.status, 200);

    const response = await apiRequest(
        `/api/requests/${created.body.id}/reject`,
        {
            method: 'PATCH',
            body: {
                reason: 'Изменили решение',
            },
        },
    );

    assert.equal(response.status, 409);
    assert.equal(
        response.body.error,
        'Request already processed',
    );
});

test('filters requests by status', async () => {
    const approvedRequest = await createRequest({
        employeeName: 'Иван Иванов',
    });

    await apiRequest(
        `/api/requests/${approvedRequest.body.id}/approve`,
        {
            method: 'PATCH',
        },
    );

    const pendingRequest = await createRequest({
        employeeName: 'Петр Петров',
    });

    const response = await apiRequest(
        '/api/requests?status=approved',
    );

    assert.equal(response.status, 200);

    assert.equal(response.body.length, 1);
    assert.equal(
        response.body[0].id,
        approvedRequest.body.id,
    );

    assert.notEqual(
        response.body[0].id,
        pendingRequest.body.id,
    );

    assert.equal(response.body[0].status, 'approved');
});
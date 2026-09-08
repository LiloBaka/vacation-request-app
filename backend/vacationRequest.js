const { randomUUID } = require('node:crypto');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const REQUEST_STATUSES = [
    'pending',
    'approved',
    'rejected',
];

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function parseCalendarDate(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);

    const isValid =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;

    if (!isValid) {
        return null;
    }

    return timestamp;
}

function calculateVacationDays(startDate, endDate) {
    const startTimestamp = parseCalendarDate(startDate);
    const endTimestamp = parseCalendarDate(endDate);

    if (startTimestamp === null || endTimestamp === null) {
        return null;
    }

    return Math.floor((endTimestamp - startTimestamp) / MS_PER_DAY) + 1;
}

function isValidStatus(status) {
    return REQUEST_STATUSES.includes(status);
}

function validateCreateRequest(input) {
    const employeeName = normalizeString(input?.employeeName);
    const startDate = normalizeString(input?.startDate);
    const endDate = normalizeString(input?.endDate);
    const reason = normalizeString(input?.reason);

    const details = {};

    if (!employeeName) {
        details.employeeName = 'ФИО обязательно';
    }

    const startTimestamp = parseCalendarDate(startDate);

    if (!startDate) {
        details.startDate = 'Дата начала обязательна';
    } else if (startTimestamp === null) {
        details.startDate = 'Некорректная дата начала';
    }

    const endTimestamp = parseCalendarDate(endDate);

    if (!endDate) {
        details.endDate = 'Дата окончания обязательна';
    } else if (endTimestamp === null) {
        details.endDate = 'Некорректная дата окончания';
    }

    if (
        startTimestamp !== null &&
        endTimestamp !== null &&
        endTimestamp < startTimestamp
    ) {
        details.endDate =
            'Дата окончания не может быть раньше даты начала';
    }

    if (!reason) {
        details.reason = 'Причина обязательна';
    }

    if (Object.keys(details).length > 0) {
        return {
            valid: false,
            details,
        };
    }

    return {
        valid: true,
        value: {
            employeeName,
            startDate,
            endDate,
            reason,
        },
    };
}

function validateRejection(input) {
    const reason = normalizeString(input?.reason);

    if (!reason) {
        return {
            valid: false,
            details: {
                reason: 'Причина отклонения обязательна',
            },
        };
    }

    return {
        valid: true,
        value: {
            reason,
        },
    };
}

function createVacationRequest(input) {
    return {
        id: randomUUID(),
        employeeName: input.employeeName,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        status: 'pending',
        days: calculateVacationDays(input.startDate, input.endDate),
        rejectionReason: null,
        createdAt: new Date().toISOString(),
    };
}

function approveVacationRequest(request) {
    request.status = 'approved';
    request.rejectionReason = null;

    return request;
}

function rejectVacationRequest(request, reason) {
    request.status = 'rejected';
    request.rejectionReason = reason;

    return request;
}

module.exports = {
    REQUEST_STATUSES,
    calculateVacationDays,
    isValidStatus,
    createVacationRequest,
    validateCreateRequest,
    validateRejection,
    approveVacationRequest,
    rejectVacationRequest,
};
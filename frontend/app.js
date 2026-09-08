const requestForm = document.querySelector('#request-form');
const submitButton = document.querySelector('#submit-button');
const requestsList = document.querySelector('#requests-list');
const listMessage = document.querySelector('#list-message');
const formError = document.querySelector('#form-error');
const statusFilter = document.querySelector('#status-filter');

const statusLabels = {
    pending: 'Ожидает',
    approved: 'Одобрена',
    rejected: 'Отклонена',
};

let isSubmitting = false;
let isLoadingRequests = false;

const decisionRequestsInFlight = new Set();

function formatDate(date) {
    const [year, month, day] = date.split('-');

    return `${day}.${month}.${year}`;
}

function showFormError(message) {
    formError.textContent = message;
    formError.classList.remove('hidden');
}

function hideFormError() {
    formError.textContent = '';
    formError.classList.add('hidden');
}

function getApiErrorMessage(data) {
    if (data?.details) {
        return Object.values(data.details).join('. ');
    }

    return data?.error || 'Произошла неизвестная ошибка';
}

function addDetail(details, label, value) {
    const wrapper = document.createElement('div');

    const term = document.createElement('dt');
    term.textContent = label;

    const description = document.createElement('dd');
    description.textContent = value;

    wrapper.append(term, description);
    details.append(wrapper);
}

function createRequestError() {
    const error = document.createElement('div');

    error.className =
        'message message-error request-error hidden';

    error.setAttribute('role', 'alert');
    error.setAttribute('aria-live', 'polite');

    return error;
}

function showRequestError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideRequestError(element) {
    element.textContent = '';
    element.classList.add('hidden');
}

function setButtonsDisabled(container, disabled) {
    const buttons = container.querySelectorAll('button');

    buttons.forEach((button) => {
        button.disabled = disabled;
    });
}

async function approveRequest(
    request,
    controls,
    errorElement,
) {
    if (decisionRequestsInFlight.has(request.id)) {
        return;
    }

    decisionRequestsInFlight.add(request.id);

    hideRequestError(errorElement);
    setButtonsDisabled(controls, true);

    try {
        const response = await fetch(
            `/api/requests/${request.id}/approve`,
            {
                method: 'PATCH',
            },
        );

        const data = await response.json();

        if (!response.ok) {
            showRequestError(
                errorElement,
                getApiErrorMessage(data),
            );
            return;
        }

        await loadRequests();
    } catch (error) {
        showRequestError(
            errorElement,
            `Не удалось одобрить заявку: ${error.message}`,
        );
    } finally {
        decisionRequestsInFlight.delete(request.id);

        if (controls.isConnected) {
            setButtonsDisabled(controls, false);
        }
    }
}

async function rejectRequest(
    request,
    reason,
    controls,
    errorElement,
) {
    if (decisionRequestsInFlight.has(request.id)) {
        return;
    }

    const normalizedReason = reason.trim();

    hideRequestError(errorElement);

    if (!normalizedReason) {
        showRequestError(
            errorElement,
            'Причина отклонения обязательна',
        );
        return;
    }

    decisionRequestsInFlight.add(request.id);
    setButtonsDisabled(controls, true);

    try {
        const response = await fetch(
            `/api/requests/${request.id}/reject`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: normalizedReason,
                }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            showRequestError(
                errorElement,
                getApiErrorMessage(data),
            );
            return;
        }

        await loadRequests();
    } catch (error) {
        showRequestError(
            errorElement,
            `Не удалось отклонить заявку: ${error.message}`,
        );
    } finally {
        decisionRequestsInFlight.delete(request.id);

        if (controls.isConnected) {
            setButtonsDisabled(controls, false);
        }
    }
}

function createRequestActions(request, errorElement) {
    const container = document.createElement('div');

    const actions = document.createElement('div');
    actions.className = 'request-actions';

    const approveButton = document.createElement('button');
    approveButton.type = 'button';
    approveButton.textContent = 'Одобрить';

    const rejectButton = document.createElement('button');
    rejectButton.type = 'button';
    rejectButton.className = 'button-danger';
    rejectButton.textContent = 'Отклонить';

    const rejectForm = document.createElement('div');
    rejectForm.className = 'reject-form hidden';

    const rejectReasonId = `reject-reason-${request.id}`;

    const rejectLabel = document.createElement('label');
    rejectLabel.htmlFor = rejectReasonId;
    rejectLabel.textContent = 'Причина отклонения';

    const rejectReason = document.createElement('textarea');
    rejectReason.id = rejectReasonId;
    rejectReason.rows = 3;
    rejectReason.required = true;

    const rejectFormActions = document.createElement('div');
    rejectFormActions.className = 'reject-form-actions';

    const confirmRejectButton =
        document.createElement('button');

    confirmRejectButton.type = 'button';
    confirmRejectButton.className = 'button-danger';
    confirmRejectButton.textContent = 'Подтвердить отклонение';

    const cancelRejectButton =
        document.createElement('button');

    cancelRejectButton.type = 'button';
    cancelRejectButton.className = 'button-secondary';
    cancelRejectButton.textContent = 'Отмена';

    approveButton.addEventListener('click', () => {
        approveRequest(
            request,
            container,
            errorElement,
        );
    });

    rejectButton.addEventListener('click', () => {
        hideRequestError(errorElement);
        rejectForm.classList.remove('hidden');
        rejectReason.focus();
    });

    cancelRejectButton.addEventListener('click', () => {
        rejectReason.value = '';
        rejectForm.classList.add('hidden');
        hideRequestError(errorElement);
    });

    confirmRejectButton.addEventListener('click', () => {
        rejectRequest(
            request,
            rejectReason.value,
            container,
            errorElement,
        );
    });

    actions.append(
        approveButton,
        rejectButton,
    );

    rejectFormActions.append(
        confirmRejectButton,
        cancelRejectButton,
    );

    rejectForm.append(
        rejectLabel,
        rejectReason,
        rejectFormActions,
    );

    container.append(
        actions,
        rejectForm,
    );

    return container;
}

function createRequestCard(request) {
    const article = document.createElement('article');
    article.className = 'request-card';

    const header = document.createElement('div');
    header.className = 'request-card-header';

    const employeeName = document.createElement('h3');
    employeeName.textContent = request.employeeName;

    const status = document.createElement('span');
    status.className = `status status-${request.status}`;
    status.textContent =
        statusLabels[request.status] || request.status;

    header.append(employeeName, status);

    const details = document.createElement('dl');
    details.className = 'request-details';

    const period = `${formatDate(request.startDate)} — ${formatDate(
        request.endDate,
    )}`;

    addDetail(details, 'Период', period);
    addDetail(
        details,
        'Количество дней',
        String(request.days),
    );
    addDetail(details, 'Причина', request.reason);

    if (
        request.status === 'rejected' &&
        request.rejectionReason
    ) {
        addDetail(
            details,
            'Причина отклонения',
            request.rejectionReason,
        );
    }

    article.append(header, details);

    if (request.status === 'pending') {
        const errorElement = createRequestError();

        article.append(
            createRequestActions(request, errorElement),
            errorElement,
        );
    }

    return article;
}

function renderRequests(requests) {
    requestsList.replaceChildren();

    if (requests.length === 0) {
        listMessage.textContent =
            statusFilter.value
                ? 'Заявок с выбранным статусом нет.'
                : 'Заявок пока нет.';

        listMessage.classList.remove('hidden');
        return;
    }

    listMessage.classList.add('hidden');

    requests.forEach((request) => {
        requestsList.append(createRequestCard(request));
    });
}

async function loadRequests() {
    if (isLoadingRequests) {
        return;
    }

    isLoadingRequests = true;
    statusFilter.disabled = true;

    listMessage.textContent = 'Загрузка заявок...';
    listMessage.classList.remove('hidden');

    requestsList.replaceChildren();

    const status = statusFilter.value;

    const query = status
        ? `?status=${encodeURIComponent(status)}`
        : '';

    try {
        const response = await fetch(
            `/api/requests${query}`,
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(getApiErrorMessage(data));
        }

        renderRequests(data);
    } catch (error) {
        listMessage.textContent =
            `Не удалось загрузить заявки: ${error.message}`;
    } finally {
        isLoadingRequests = false;
        statusFilter.disabled = false;
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    if (!requestForm.reportValidity()) {
        return;
    }

    hideFormError();

    const formData = new FormData(requestForm);

    const requestData = {
        employeeName: formData.get('employeeName'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        reason: formData.get('reason'),
    };

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Отправка...';

    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        const data = await response.json();

        if (!response.ok) {
            showFormError(getApiErrorMessage(data));
            return;
        }

        requestForm.reset();

        await loadRequests();
    } catch (error) {
        showFormError(
            `Не удалось отправить заявку: ${error.message}`,
        );
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить заявку';
    }
}

requestForm.addEventListener('submit', handleSubmit);

statusFilter.addEventListener('change', () => {
    loadRequests();
});

loadRequests();
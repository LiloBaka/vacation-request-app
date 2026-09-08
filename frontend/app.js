const requestForm = document.querySelector('#request-form');
const requestsList = document.querySelector('#requests-list');
const listMessage = document.querySelector('#list-message');
const formError = document.querySelector('#form-error');
const statusFilter = document.querySelector('#status-filter');

const statusLabels = {
    pending: 'Ожидает',
    approved: 'Одобрена',
    rejected: 'Отклонена',
};

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

    return error;
}

function showRequestError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

async function approveRequest(id, errorElement) {
    errorElement.classList.add('hidden');

    try {
        const response = await fetch(
            `/api/requests/${id}/approve`,
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
    }
}

async function rejectRequest(
    id,
    reason,
    errorElement,
) {
    errorElement.classList.add('hidden');

    if (!reason.trim()) {
        showRequestError(
            errorElement,
            'Причина отклонения обязательна',
        );
        return;
    }

    try {
        const response = await fetch(
            `/api/requests/${id}/reject`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason,
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

    const rejectLabel = document.createElement('label');
    rejectLabel.textContent = 'Причина отклонения';

    const rejectReason = document.createElement('textarea');
    rejectReason.rows = 3;

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
        approveRequest(request.id, errorElement);
    });

    rejectButton.addEventListener('click', () => {
        rejectForm.classList.remove('hidden');
        rejectReason.focus();
    });

    cancelRejectButton.addEventListener('click', () => {
        rejectReason.value = '';
        rejectForm.classList.add('hidden');
        errorElement.classList.add('hidden');
    });

    confirmRejectButton.addEventListener('click', () => {
        rejectRequest(
            request.id,
            rejectReason.value,
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
        listMessage.textContent = 'Заявок пока нет.';
        listMessage.classList.remove('hidden');
        return;
    }

    listMessage.classList.add('hidden');

    requests.forEach((request) => {
        requestsList.append(createRequestCard(request));
    });
}

async function loadRequests() {
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
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    hideFormError();

    const formData = new FormData(requestForm);

    const requestData = {
        employeeName: formData.get('employeeName'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        reason: formData.get('reason'),
    };

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

        await loadRequests();
    } catch (error) {
        showFormError(
            `Не удалось отправить заявку: ${error.message}`,
        );
    }
}

requestForm.addEventListener('submit', handleSubmit);

statusFilter.addEventListener('change', () => {
    loadRequests();
});

loadRequests();
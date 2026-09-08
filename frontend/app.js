const requestForm = document.querySelector('#request-form');
const requestsList = document.querySelector('#requests-list');
const listMessage = document.querySelector('#list-message');
const formError = document.querySelector('#form-error');

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

    const fields = [
        ['Период', period],
        ['Количество дней', String(request.days)],
        ['Причина', request.reason],
    ];

    fields.forEach(([label, value]) => {
        const wrapper = document.createElement('div');

        const term = document.createElement('dt');
        term.textContent = label;

        const description = document.createElement('dd');
        description.textContent = value;

        wrapper.append(term, description);
        details.append(wrapper);
    });

    article.append(header, details);

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

    try {
        const response = await fetch('/api/requests');
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

loadRequests();
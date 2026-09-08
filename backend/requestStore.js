const requests = [];

function getAllRequests(status) {
    if (!status) {
        return requests;
    }

    return requests.filter((request) => request.status === status);
}

function findRequestById(id) {
    return requests.find((request) => request.id === id);
}

function addRequest(request) {
    requests.push(request);
    return request;
}

function clearRequests() {
    requests.length = 0;
}

module.exports = {
    getAllRequests,
    findRequestById,
    addRequest,
    clearRequests,
};
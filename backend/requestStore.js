const requests = [];

function getAllRequests() {
    return requests;
}

function findRequestById(id) {
    return requests.find((request) => request.id === id);
}

function addRequest(request) {
    requests.push(request);
    return request;
}

module.exports = {
    getAllRequests,
    findRequestById,
    addRequest,
};
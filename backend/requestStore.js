const requests = [];

function getAllRequests() {
    return requests;
}

function addRequest(request) {
    requests.push(request);
    return request;
}

module.exports = {
    getAllRequests,
    addRequest,
};
const publicMessages = {
    500: 'Internal server error',
    502: 'Upstream service error',
    503: 'Service unavailable',
};

function notFound(req, res) {
    res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    if (status >= 500) {
        console.error('[error]', err);
    }
    const message = status >= 500
        ? publicMessages[status] || 'Internal server error'
        : err.message;
    res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };

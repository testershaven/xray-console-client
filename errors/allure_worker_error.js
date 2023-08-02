class AllureWorkerError extends Error {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AllureWorkerError);
        }
        this.name = 'AllureWorkerError';
    }
}

module.exports = {AllureWorkerError}
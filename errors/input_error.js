class InputError extends Error {
    constructor(message) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InputError);
        }
        this.name = 'InputError';
    }
}

module.exports = {InputError}
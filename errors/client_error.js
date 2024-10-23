export class ClientError extends Error {
    constructor(title, message, statusCode, statusText) {
        super(title);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ClientError);
        }
        this.name = 'ClientError';
        this.message = message;
        this.statusCode = statusCode;
        this.statusText = statusText;
    }
}

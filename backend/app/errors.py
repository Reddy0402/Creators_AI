class AppError(Exception):
    """Base for expected failures. status_code and message map straight to the HTTP response."""

    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class DatabaseError(AppError):
    """The database cannot be reached or is misconfigured. Message is safe to show to the user."""

    status_code = 503


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class InvalidContentError(AppError):
    status_code = 422


class UnsupportedMediaError(AppError):
    status_code = 415


class PayloadTooLargeError(AppError):
    status_code = 413

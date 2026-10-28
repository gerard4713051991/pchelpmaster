// Доменные ошибки, понятные UI. Из ошибок PocketBase SDK их делает toDomainError().

/** Общий предок доменных ошибок: по нему toDomainError() узнаёт уже переведённую ошибку. */
export class DomainError extends Error {}

export class NotFoundError extends DomainError {}

export class ValidationError extends DomainError {
    /** Код ошибки PocketBase по каждому полю, например `{ email: 'validation_invalid_email' }`. */
    constructor(
        readonly fieldErrors: Record<string, string>,
        options?: ErrorOptions,
    ) {
        super(undefined, options);
    }
}

export class UnauthorizedError extends DomainError {}

/** Неверный email или пароль; создаёт сервис аутентификации, toDomainError() её не знает. */
export class InvalidCredentialsError extends DomainError {}

export class NetworkError extends DomainError {}

export class UnknownError extends DomainError {}

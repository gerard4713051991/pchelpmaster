import { ClientResponseError } from 'pocketbase';
import {
    DomainError,
    NetworkError,
    NotFoundError,
    UnauthorizedError,
    UnknownError,
    ValidationError,
} from './domain-errors';

/** Переводит ошибку PocketBase SDK (`ClientResponseError`) в доменную ошибку из `domain-errors.ts`. */
export function toDomainError(error: unknown): Error {
    if (error instanceof DomainError) {
        return error;
    }
    if (!(error instanceof ClientResponseError)) {
        return new UnknownError(undefined, { cause: error });
    }
    if (error.isAbort || error.status === 0) {
        return new NetworkError(undefined, { cause: error });
    }
    if (error.status === 404) {
        return new NotFoundError(undefined, { cause: error });
    }
    if (error.status === 401 || error.status === 403) {
        return new UnauthorizedError(undefined, { cause: error });
    }
    if (error.status === 400) {
        const fieldErrors = toFieldErrors(error.response['data']);
        if (Object.keys(fieldErrors).length > 0) {
            return new ValidationError(fieldErrors, { cause: error });
        }
    }
    return new UnknownError(undefined, { cause: error });
}

function toFieldErrors(data: unknown): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    if (typeof data !== 'object' || data === null) {
        return fieldErrors;
    }
    for (const [field, value] of Object.entries(data)) {
        const code = (value as { code?: unknown } | null)?.code;
        if (typeof code === 'string') {
            fieldErrors[field] = code;
        }
    }
    return fieldErrors;
}

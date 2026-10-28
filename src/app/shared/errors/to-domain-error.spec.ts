import { ClientResponseError } from 'pocketbase';
import {
    DomainError,
    NetworkError,
    NotFoundError,
    UnauthorizedError,
    UnknownError,
    ValidationError,
} from './domain-errors';
import { toDomainError } from './to-domain-error';

function pbError(status: number, data: Record<string, unknown> = {}): ClientResponseError {
    return new ClientResponseError({ status, response: { status, message: 'Ошибка', data } });
}

describe('toDomainError', () => {
    it('404 → NotFoundError', () => {
        expect(toDomainError(pbError(404))).toBeInstanceOf(NotFoundError);
    });

    it('400 с ошибками по полям → ValidationError с кодами по полям', () => {
        const error = toDomainError(
            pbError(400, {
                email: { code: 'validation_invalid_email', message: 'Must be a valid email.' },
                password: { code: 'validation_length_out_of_range', message: 'Too short.' },
            }),
        );

        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).fieldErrors).toEqual({
            email: 'validation_invalid_email',
            password: 'validation_length_out_of_range',
        });
    });

    it('400 без ошибок по полям → UnknownError с исходной ошибкой в cause', () => {
        const original = pbError(400);

        const error = toDomainError(original);

        expect(error).toBeInstanceOf(UnknownError);
        expect(error.cause).toBe(original);
    });

    it.each([401, 403])('%i → UnauthorizedError', (status) => {
        expect(toDomainError(pbError(status))).toBeInstanceOf(UnauthorizedError);
    });

    it('status 0 (нет связи) → NetworkError', () => {
        expect(toDomainError(new ClientResponseError({ status: 0 }))).toBeInstanceOf(NetworkError);
    });

    it('прерванный запрос → NetworkError', () => {
        expect(toDomainError(new ClientResponseError({ isAbort: true }))).toBeInstanceOf(
            NetworkError,
        );
    });

    it.each([429, 500])('%i → UnknownError с исходной ошибкой в cause', (status) => {
        const original = pbError(status);

        const error = toDomainError(original);

        expect(error).toBeInstanceOf(UnknownError);
        expect(error.cause).toBe(original);
    });

    it.each([new Error('boom'), 'строка', undefined])(
        'произвольное значение (%s) → UnknownError с ним в cause',
        (original) => {
            const error = toDomainError(original);

            expect(error).toBeInstanceOf(UnknownError);
            expect(error.cause).toBe(original);
        },
    );

    it('уже доменную ошибку возвращает как есть', () => {
        const original = new NotFoundError();

        expect(toDomainError(original)).toBe(original);
    });

    it('любую доменную ошибку возвращает как есть, в том числе новую', () => {
        class ConflictError extends DomainError {}
        const original = new ConflictError();

        expect(toDomainError(original)).toBe(original);
    });

    it('400 с полями без строкового code → UnknownError', () => {
        const error = toDomainError(pbError(400, { email: { message: 'Нет кода' }, name: null }));

        expect(error).toBeInstanceOf(UnknownError);
    });

    it('сохраняет исходную ошибку в cause у NotFound, Unauthorized и Network', () => {
        const notFound = pbError(404);
        const unauthorized = pbError(401);
        const network = new ClientResponseError({ status: 0 });

        expect(toDomainError(notFound).cause).toBe(notFound);
        expect(toDomainError(unauthorized).cause).toBe(unauthorized);
        expect(toDomainError(network).cause).toBe(network);
    });
});

# Общая инфраструктура (`shared/`)

Клиент PocketBase, который можно получить только через DI, и доменные ошибки, в которые переводятся ошибки SDK.

## Где лежит

```
src/app/shared/
├── pocketbase/
│   ├── pb-url.ts            # PB_PUBLIC_PATH, токен PB_URL, серверный провайдер
│   └── pocketbase-client.ts # токен POCKETBASE, фабрика, providePocketBase()
└── errors/
    ├── domain-errors.ts     # DomainError (база), NotFoundError, ValidationError, ...
    └── to-domain-error.ts   # toDomainError(error: unknown): Error
```

## Публичный API

- `PB_URL` — `InjectionToken<string>`: базовый адрес PocketBase. В браузере `<origin>/pb`, на сервере `process.env['PB_URL']` или `http://127.0.0.1:8090`.
- `PB_PUBLIC_PATH` — `'/pb'`, путь, по которому браузер обращается к PocketBase.
- `providePbUrlForServer()` — серверный провайдер `PB_URL`; регистрируется в `app.config.server.ts` и перекрывает браузерный.
- `POCKETBASE` — `InjectionToken<PocketBase>`: свой экземпляр на каждый инжектор приложения (на сервере — на каждый запрос). Фабрика одна и та же в браузере и на сервере.
- `providePocketBase()` — регистрирует `POCKETBASE` и `PB_URL` по умолчанию (браузерный: `<origin>/pb`); вызывается в `app.config.ts`, поэтому действует и в браузере, и на сервере. Возвращает `EnvironmentProviders`: в `providers` компонента его подключить нельзя, иначе у поддерева был бы свой клиент с пустым `authStore`.
- `toDomainError(error)` и классы ошибок из `domain-errors.ts` — таблица соответствий в [architecture.md, раздел 4](../architecture.md).

## Как пользоваться

```ts
// data/ слоя фичи
private readonly pb = inject(POCKETBASE);

async list(): Promise<Tag[]> {
    try {
        return (await this.pb.collection('tags').getFullList()).map(toTag);
    } catch (error) {
        throw toDomainError(error);
    }
}
```

## Как расширить или заменить

- В тестах вместо клиента подставляется `{ provide: POCKETBASE, useValue: ... }` или тестовый `PB_URL`.
- `InvalidCredentialsError` создаёт сервис аутентификации; `toDomainError` её не знает.

## Тесты

- `to-domain-error.spec.ts`, `pocketbase-client.spec.ts` — unit.
- `pocketbase-client.integration.spec.ts` — клиент из DI на тестовом PocketBase, изоляция двух пользователей и гостя.
- `tests/lint/eslint-rules.spec.ts` — границы ESLint, см. [config-tests.md](tests/config-tests.md).

## Подводные камни

- `new PocketBase(` и импорт класса `PocketBase` (в том числе из `pocketbase/*`) разрешены только в фабрике `pocketbase-client.ts` (и в `tests/`; `import type` можно везде кроме `domain/` и `ui/`); импорт `pocketbase` и `pocketbase/*` запрещён в `domain/` и `ui/`. См. [architecture.md, раздел 6](../architecture.md).
- Новую доменную ошибку наследуйте от `DomainError`, а не от `Error`: только так `toDomainError` узнаёт её и возвращает как есть. Иначе она будет завёрнута в `UnknownError`, и UI её не распознает.
- `authStore` — `BaseAuthStore` в памяти, не `LocalAuthStore`: на сервере иначе данные пользователей были бы общими.
- Автоотмена запросов SDK выключена: параллельные запросы одного типа не отменяют друг друга.
- Серверный `PB_URL` — внутренний адрес; он не попадает в браузер, браузер ходит через `/pb`. См. [architecture.md, раздел 7](../architecture.md).

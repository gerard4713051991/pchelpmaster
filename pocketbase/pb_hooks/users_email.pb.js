/// <reference path="../pb_data/types.d.ts" />

// Встроенная проверка PocketBase пропускает кириллицу и домен верхнего уровня из одной буквы.
// onRecordValidate срабатывает при любом сохранении: регистрация, смена email, суперпользователь.
onRecordValidate((e) => {
    // Обработчики выполняются изолированно, поэтому регулярка объявлена внутри.
    // Только печатные символы ASCII без пробела: что-то@что-то.минимум-два-символа.
    const email = /^[!-?A-~]+@[!-?A-~]+\.[!-?A-~]{2,}$/;

    if (!email.test(e.record.email())) {
        throw new BadRequestError('Некорректный email.', {
            email: new ValidationError('validation_invalid_email', 'Некорректный email.'),
        });
    }

    e.next();
}, 'users');

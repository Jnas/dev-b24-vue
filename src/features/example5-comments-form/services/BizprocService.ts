import {api} from "../../../../dev/api.ts";
import type { CommentType } from "../types/types.ts";

/**
 * Сервис для работы с бизнес-процессами Bitrix24
 *
 * Основная цель - запускать бизнес-процессы в ответ на действия пользователя
 * (например, добавление комментария).
 *
 * Перед использованием необходимо настроить бизнес-процесс в Bitrix24 с параметрами:
 * - Триггер: Создание/изменение элемента CRM
 * - Параметры:
 *   - END_COMMENT_USER: ID пользователя, оставившего комментарий
 *   - END_COMMENT_TEXT: Текст комментария
 *
 * Для отладки и настройки можно использовать API-запрос:
 * bizproc.workflow.template.list с параметрами:
 * {
 *    "SELECT": ["ID", "MODULE_ID", "ENTITY", "DOCUMENT_TYPE", "NAME"],
 *    "FILTER": {
 *      "DOCUMENT_TYPE": "{{ID_сущности_CRM}}"
 *    }
 * }
 */

export class BizprocService {
    /**
     * ID шаблона бизнес-процесса
     * @private
     */
    private readonly templateId: number;

    /**
     * Создает экземпляр BizprocService
     * @param templateId - ID шаблона бизнес-процесса (по умолчанию: 1915)
     */
    constructor(templateId: number) {
        this.templateId = templateId;
    }

    /**
     * Запускает бизнес-процесс, связанный с добавлением комментария
     *
     * @param entityTypeId - ID типа сущности CRM
     * @param crmId - ID элемента сущности CRM
     * @param comment - Объект комментария
     * @returns Promise, который разрешается при успешном запуске бизнес-процесса
     */
    async startCommentWorkflow(
        entityTypeId: number,
        crmId: number,
        comment: CommentType
    ): Promise<void> {
        // Вызов API Bitrix24 для запуска бизнес-процесса
        await api().methods.b24Call("bizproc.workflow.start", {
            // ID шаблона бизнес-процесса (должен быть предварительно создан в Bitrix24)
            TEMPLATE_ID: this.templateId,

            // Идентификатор документа, к которому привязан бизнес-процесс
            DOCUMENT_ID: [
                "crm",  // Модуль CRM
                "Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic",  // Класс документа
                `DYNAMIC_${entityTypeId}_${crmId}`  // Идентификатор типа документа
            ],

            // Параметры, передаваемые в бизнес-процесс
            PARAMETERS: {
                // ID пользователя, оставившего комментарий (с префиксом 'user_' для корректной работы BP)
                END_COMMENT_USER: "user_" + comment.userId,
                // Текст комментария
                END_COMMENT_TEXT: comment.text
            }
        });
    }
}
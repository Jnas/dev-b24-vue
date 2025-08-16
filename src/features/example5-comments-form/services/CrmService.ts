import {api} from "../../../../dev/api";
import type {CrmCommentType} from "../types/types";

/**
 * Сервис для работы с сущностями CRM
 * Обеспечивает:
 * - Загрузку и кэширование данных элемента CRM
 * - Управление комментариями в контексте элемента
 * - Взаимодействие с API Bitrix24 для операций с CRM
 */
export default class CrmService {
    // Кэш загруженного элемента CRM
    private _currentItem: Record<string, any> | null = null;

    /**
     * ID типа сущности CRM
     * Идентификатор динамического типа сущности
     */
    public readonly entityTypeId: number;

    /**
     * Создает экземпляр CrmService
     * @param entityTypeId - ID типа сущности CRM (по умолчанию: 1288)
     */
    constructor(entityTypeId: number) {
        this.entityTypeId = entityTypeId;
    }

    /**
     * Получает ID текущего элемента CRM из контекста размещения
     * @returns Числовой ID элемента CRM
     */
    get crmId(): number {
        return Number(api().fields.placement.options.ID);
    }

    /**
     * Загружает текущий элемент CRM по его ID
     * @throws {Error} Если не удалось загрузить элемент
     *
     * @description
     * 1. Проверяет наличие закэшированного элемента
     * 2. Загружает данные элемента через API Bitrix24
     * 3. Сохраняет результат в кэш
     */
    async fetchCurrentItem(): Promise<void> {
        // Возвращаем закэшированные данные, если они есть
        if (this._currentItem) return;

        // Загружаем данные элемента через API
        const response = await api().methods.b24Call("crm.item.get", {
            entityTypeId: this.entityTypeId,
            id: this.crmId
        });

        if (response?.result?.item) {
            this._currentItem = response.result.item;
        } else {
            throw new Error("Не удалось загрузить элемент CRM");
        }
    }

    /**
     * Возвращает массив комментариев для текущего элемента CRM
     * @returns {CrmCommentType[]} Массив комментариев или пустой массив, если элемент не загружен
     */
    getComments(): CrmCommentType[] {
        if (!this._currentItem) return [];
        return this.parseComments(this._currentItem.ufCrm107SvJsonComments);
    }

    /**
     * Добавляет новый комментарий к элементу CRM
     *
     * @param userId - ID пользователя, оставившего комментарий
     * @param text - Текст комментария
     * @param timestamp - Временная метка создания комментария
     * @returns {Promise<{success: boolean}>} Результат операции
     *
     * @description
     * 1. Загружает текущий элемент, если он еще не загружен
     * 2. Создает новый комментарий в формате JSON
     * 3. Обновляет список комментариев элемента
     * 4. Сохраняет изменения через API Bitrix24
     * 5. Обновляет локальный кэш при успешном сохранении
     */
    async addComment(
        userId: string,
        text: string,
        timestamp: number
    ): Promise<{ success: boolean }> {
        // Убеждаемся, что элемент загружен
        await this.fetchCurrentItem();
        if (!this._currentItem) {
            console.error('Элемент CRM не загружен');
            return {success: false};
        }

        // Создаем новый комментарий в формате JSON
        const newComment = JSON.stringify({userId, text, timestamp});

        // Получаем текущие комментарии или инициализируем пустым массивом
        const comments = this._currentItem.ufCrm107SvJsonComments || [];
        const updatedComments = [...comments, newComment];

        try {
            // Обновляем элемент через API Bitrix24
            const response = await api().methods.b24Call("crm.item.update", {
                entityTypeId: this.entityTypeId,
                id: this.crmId,
                fields: {
                    ufCrm107SvJsonComments: updatedComments
                }
            });

            // При успешном обновлении обновляем локальный кэш
            if (response?.result) {
                this._currentItem.ufCrm107SvJsonComments = updatedComments;
                return {success: true};
            }

            console.error('Не удалось обновить комментарий: неверный формат ответа');
            return {success: false};
        } catch (error) {
            console.error("Ошибка при обновлении комментария:", error);
            return {success: false};
        }
    }

    /**
     * Парсит массив строк с JSON-комментариями в массив объектов CrmCommentType
     * @param commentsRaw - Массив строк в формате JSON
     * @returns Массив комментариев в формате CrmCommentType
     */
    private parseComments(commentsRaw: string[]): CrmCommentType[] {
        if (!commentsRaw || !Array.isArray(commentsRaw)) return [];

        return commentsRaw.reduce<CrmCommentType[]>((acc, jsonString) => {
            try {
                const parsed = JSON.parse(jsonString);
                // Проверяем, что распарсенный объект имеет ожидаемую структуру
                if (parsed && typeof parsed === 'object' && 'userId' in parsed) {
                    acc.push({
                        userId: parsed.userId,
                        text: parsed.text || '',
                        timestamp: parsed.timestamp || Date.now()
                    });
                }
            } catch (error) {
                console.error('Ошибка парсинга комментария:', jsonString);
                // Продолжаем обработку остальных комментариев при ошибке парсинга
            }
            return acc;
        }, []);
    }
}
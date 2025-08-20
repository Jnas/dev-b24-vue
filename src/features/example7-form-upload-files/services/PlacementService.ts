/**
 * PlacementService - Сервис для работы с размещением приложения в Bitrix24
 * 
 * Отвечает за:
 * - Парсинг параметров размещения из Bitrix24
 * - Управление состоянием приложения в контексте размещения
 * - Предоставление доступа к данным о файлах и сущностях CRM
 */
import type {BitrixPlacementType, BitrixPlacementOptionsType} from "@/features/example7-form-upload-files/types/types.ts";
import {api} from "../../../../dev/api.ts";

export class PlacementService {
    /** Словарь файлов в формате {id: имя_файла} */
    private _files: Record<string, string> = {};
    
    /** ID CRM-сущности, с которой работает приложение */
    private _crmId: string | null = null;
    
    /** Тип сущности CRM (числовой идентификатор) */
    private _entityTypeId: number | null = null;

    /**
     * Конструктор сервиса, инициализирует внутреннее состояние
     */
    constructor() {
        this._initialize();
    }

    /**
     * Инициализирует сервис, парсит параметры размещения
     * @private
     */
    private _initialize(): void {
        try {
            const placement = api().fields?.placement as BitrixPlacementType;
            const options = placement.options || ({} as BitrixPlacementOptionsType);

            this._parseValueInput(options.VALUE);
            this._parseEntityId(options.ENTITY_ID);
            console.log('PlacementService инициализирован', this);
        } catch (error) {
            console.error('Ошибка инициализации PlacementService:', error);
            this._resetState();
        }
    }

    /**
     * Сбрасывает внутреннее состояние сервиса
     * @private
     */
    private _resetState(): void {
        this._files = {};
        this._crmId = null;
        this._entityTypeId = null;
    }

    /**
     * Парсит строку с данными о файлах и ID сущности
     * Формат строки: "id1#file1.txt??id2#file2.jpg??crmId#123"
     * @private
     * @param {string} [input] - Входная строка с данными
     */
    private _parseValueInput(input?: string): void {
        if (!input) {
            this._resetState();
            return;
        }

        const files: Record<string, string> = {};
        let crmId: string | null = null;

        input.split('??').forEach(part => {
            if (!part || !part.includes('#')) return;

            const [key, value] = part.split('#');
            const trimmedKey = key.trim();
            const trimmedValue = value.trim();

            if (trimmedKey === 'crmId') {
                crmId = trimmedValue;
            } else {
                files[trimmedKey] = trimmedValue;
            }
        });

        this._files = files;
        this._crmId = crmId;
    }

    /**
     * Извлекает числовой идентификатор типа сущности из строки
     * @private
     * @param {string} [entityIdStr] - Строка с ID сущности (например, "CRM_DYNAMIC_123")
     */
    private _parseEntityId(entityIdStr?: string): void {
        if (!entityIdStr) {
            this._entityTypeId = null;
            return;
        }

        const match = entityIdStr.match(/CRM_DYNAMIC_(\d+)/);
        this._entityTypeId = match ? parseInt(match[1], 10) : null;

        if (!this._entityTypeId) {
            console.warn(`Не удалось определить entityTypeId из ENTITY_ID: ${entityIdStr}`);
        }
    }

    /**
     * Возвращает копию словаря файлов
     * @returns {Record<string, string>} Объект с файлами в формате {id: имя_файла}
     */
    get files(): Record<string, string> {
        return {...this._files};
    }

    /**
     * Возвращает ID текущей CRM-сущности
     * @returns {string | null} ID сущности или null, если не определен
     */
    get crmId(): string | null {
        return this._crmId;
    }

    /**
     * Возвращает числовой идентификатор типа сущности
     * @returns {number | null} Числовой ID типа сущности или null, если не определен
     */
    get entityTypeId(): number | null {
        return this._entityTypeId;
    }
}
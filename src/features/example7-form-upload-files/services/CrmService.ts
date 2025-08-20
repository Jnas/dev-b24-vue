/**
 * CrmService - Сервис для работы с CRM Bitrix24
 * 
 * Отвечает за:
 * - Загрузку и обновление файлов в CRM
 * - Работу с сущностями CRM
 * - Взаимодействие с API Bitrix24
 */
import {PlacementService} from './PlacementService';
import {api} from "../../../../dev/api.ts";
import type {CrmItemType, CrmServiceConfigType} from "@/features/example7-form-upload-files/types/types.ts";

/**
 * Конструктор сервиса CrmService
 * 
 * @param {PlacementService} placementService - Сервис размещения
 * @param {CrmServiceConfigType} config - Конфигурация сервиса
 */
export class CrmService {
    /**
     * Числовой идентификатор типа сущности CRM
     */
    public entityTypeId: number | null;
    
    /**
     * Текущий элемент CRM
     */
    private _currentItem: CrmItemType | null = null;
    
    /**
     * Наименование поля для временных файлов в CRM
     */
    private readonly fieldNameUploadTempFiles: string;
    
    /**
     * ID сущности CRM
     */
    private readonly crmId: number;

    /**
     * Конструктор сервиса CrmService
     * 
     * @param {PlacementService} placementService - Сервис размещения
     * @param {CrmServiceConfigType} config - Конфигурация сервиса
     */
    constructor(
        placementService: PlacementService,
        config: CrmServiceConfigType
    ) {
        this.entityTypeId = placementService.entityTypeId;
        this.crmId = Number(placementService.crmId);
        this.fieldNameUploadTempFiles = config.fieldNameUploadTempFiles;
    }

    /**
     * Возвращает текущий загруженный элемент CRM
     * @returns {CrmItemType | null} Текущий элемент или null, если не загружен
     */
    get currentItem(): CrmItemType | null {
        return this._currentItem;
    }

    /**
     * Загружает файл в CRM
     * @async
     * @param {File} file - Файл для загрузки
     * @returns {Promise<string>} ID загруженного файла
     * @throws {Error} Если не удалось загрузить файл
     */
    async uploadFile(file: File): Promise<string> {
        const base64 = await this._readFileAsBase64(file);
        const currentFiles = this._getCurrentFiles();
        const filesData = [...currentFiles, [file.name, base64]];

        await this.updateCurrentItem({
            [this.fieldNameUploadTempFiles]: filesData
        });

        // Исправление: используем length вместо at(-1)
        const files = this._getCurrentFiles();
        if (files.length === 0) {
            throw new Error("Файл не был добавлен в CRM");
        }
        return files[files.length - 1].id;
    }

    /**
     * Загружает текущий элемент CRM по его ID
     * @async
     * @returns {Promise<void>}
     * @throws {Error} Если не удалось загрузить элемент
     */
    async fetchCurrentItem(): Promise<void> {
        const response = await api().methods.b24Call("crm.item.get", {
            entityTypeId: this.entityTypeId,
            id: this.crmId
        }) as { result?: { item?: CrmItemType } };

        if (response?.result?.item) {
            this._currentItem = response.result.item;
        } else {
            throw new Error("Не удалось загрузить элемент CRM");
        }
    }

    /**
     * Обновляет поля текущего элемента CRM
     * @async
     * @param {Record<string, any>} fields - Объект с полями для обновления
     * @returns {Promise<void>}
     * @throws {Error} Если не удалось обновить элемент
     */
    async updateCurrentItem(fields: Record<string, any>): Promise<void> {
        const response = await api().methods.b24Call("crm.item.update", {
            entityTypeId: this.entityTypeId,
            id: this.crmId,
            fields
        }) as { result?: { item?: CrmItemType } };

        if (response?.result?.item) {
            this._currentItem = response.result.item;
        } else {
            throw new Error("Не удалось обновить элемент CRM");
        }
    }

    /**
     * Возвращает массив текущих файлов из элемента CRM
     * @private
     * @returns {any[]} Массив файлов
     */
    private _getCurrentFiles(): any[] {
        return this._currentItem?.[this.fieldNameUploadTempFiles] || [];
    }

    /**
     * Конвертирует файл в строку base64
     * @private
     * @param {File} file - Файл для конвертации
     * @returns {Promise<string>} Строка в формате base64
     */
    private _readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result?.toString().split(',')[1] || '';
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
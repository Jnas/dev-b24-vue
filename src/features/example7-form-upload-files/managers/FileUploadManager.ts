/**
 * FileUploadManager.ts - Менеджер загрузки файлов
 * 
 * Основной класс, отвечающий за управление загрузкой файлов в CRM.
 * Обеспечивает взаимодействие между интерфейсом и сервисами загрузки.
 * 
 * Основная функциональность:
 * - Управление состоянием загружаемых файлов
 * - Интеграция с Bitrix24 API для загрузки файлов
 * - Управление локальным состоянием файлов
 * 
 * @module managers/FileUploadManager
 */

import {ref, type Ref} from 'vue';
import {PlacementService} from '@/features/example7-form-upload-files/services/PlacementService';
import {CrmService} from '@/features/example7-form-upload-files/services/CrmService';
import type {
    CrmServiceConfigType,
    FileWithCustomProps,
    LocalFileType,
    UploadedFileType
} from '@/features/example7-form-upload-files/types/types';
import {crmConfig} from '@/features/example7-form-upload-files/config';
import {api} from "../../../../dev/api.ts";

/**
 * Класс менеджера загрузки файлов
 * 
 * Обеспечивает управление загрузкой файлов, их хранение и взаимодействие с API.
 * Использует сервисы PlacementService и CrmService для работы с Bitrix24.
 */
export class FileUploadManager {
    /** Приватное реактивное состояние списка файлов */
    private _allFiles: Ref<FileWithCustomProps[]> = ref([]);

    /** Сервис для работы с размещением приложения */
    public readonly placementService: PlacementService;
    
    /** Сервис для работы с CRM */
    public readonly crmService: CrmService;

    /**
     * Создает экземпляр FileUploadManager
     * @param {CrmServiceConfigType} config - Конфигурация для сервиса CRM
     */
    constructor(config: CrmServiceConfigType = crmConfig) {
        this.placementService = new PlacementService();
        this.crmService = new CrmService(this.placementService, config);
    }

    /**
     * Получает текущий список файлов
     * @returns {FileWithCustomProps[]} Массив файлов
     */
    public get files() {
        return this._allFiles.value;
    }

    /**
     * Получает строку с идентификаторами загруженных файлов
     * @returns {string} Строка с ID файлов, разделенных запятыми
     */
    public get uploadedFileIds() {
        return this._allFiles.value
            .filter(this.isUploadedFile)
            .map(file => file.id)
            .join(',');
    }

    /**
     * Проверяет, является ли файл загруженным
     * @param {FileWithCustomProps} file - Файл для проверки
     * @returns {boolean} True, если файл загружен
     */
    public isUploadedFile = (file: FileWithCustomProps): file is File & UploadedFileType => {
        return 'isUploaded' in file && file.isUploaded === true;
    };

    /**
     * Проверяет, является ли файл локальным (еще не загруженным в CRM)
     * Используется для различения загруженных и еще не загруженных файлов в интерфейсе
     * @param {FileWithCustomProps} file - Файл для проверки
     * @returns {boolean} True, если файл локальный и еще не загружен в CRM
     */
    public isLocalFile = (file: FileWithCustomProps): file is File & LocalFileType => {
        return 'isUploaded' in file && file.isUploaded === false;
    };

    /**
     * Инициализирует менеджер
     * @async
     * @returns {Promise<void>}
     */
    public async initialize() {
        // Загружаем текущий элемент CRM
        await this.crmService.fetchCurrentItem();

        // Создаем объекты File для уже загруженных файлов из CRM
        // Это нужно для отображения файлов в интерфейсе
        const uploadedFiles = Object.entries(this.placementService.files).map(([id, name]) => {
            // Создаем пустой файл с правильным именем
            // Реальные данные файла не нужны, так как он уже загружен в CRM
            const file = new File([], name, {type: 'application/octet-stream'});
            // Добавляем метаданные для идентификации файла
            return Object.assign(file, {id, isUploaded: true}) as FileWithCustomProps;
        });

        this._allFiles.value = [...uploadedFiles];
    }

    /**
     * Добавляет файлы для загрузки
     * @async
     * @param {File[]|null} files - Массив файлов для загрузки
     * @returns {Promise<void>}
     * @throws {Error} В случае ошибки загрузки файлов
     */
    public async addFiles(files: File[] | null) {
        if (!files?.length) return;

        // Добавляем временные ID и метаданные к новым файлам
        // tempId нужен для отслеживания файлов до их загрузки в CRM
        const processedFiles = files.map(file =>
            Object.assign(file, {
                tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                isUploaded: false
            }) as FileWithCustomProps & LocalFileType
        );

        // Добавляем файлы в общий список перед загрузкой, чтобы показать их в интерфейсе
        this._allFiles.value = [...this._allFiles.value, ...processedFiles];

        try {
            for (const file of processedFiles) {
                // Загружаем файл в CRM и получаем его ID
                const fileId = await this.crmService.uploadFile(file);

                // Создаем новый объект File с правильным размером (без реального содержимого)
                // new ArrayBuffer(file.size) создает буфер нужного размера для корректного отображения в интерфейсе
                const newFile = new File([new ArrayBuffer(file.size)], file.name, {type: file.type});
                
                // Создаем объект загруженного файла с ID из CRM
                const uploadedFile = Object.assign(newFile, {
                    id: fileId,
                    isUploaded: true,
                    tempId: undefined
                }) as FileWithCustomProps & UploadedFileType;

                // Заменяем временный файл на загруженный в списке файлов
                this.replaceFile(file, uploadedFile);
            }
        } catch (error) {
            console.error('Ошибка загрузки файлов', error);
            // В случае ошибки удаляем не загруженные файлы из списка
            this._allFiles.value = this._allFiles.value.filter(
                f => !processedFiles.some(pf => this.getFileKey(pf) === this.getFileKey(f))
            );
        }
    }

    /**
     * Удаляет файл из списка загружаемых/загруженных файлов
     * @param {FileWithCustomProps} file - Файл для удаления
     */
    public removeFile(file: FileWithCustomProps) {
        this._allFiles.value = this._allFiles.value.filter(
            f => this.getFileKey(f) !== this.getFileKey(file)
        );
    }

    /**
     * Заменяет старый файл новым в списке файлов
     * Используется для обновления состояния файла после загрузки в CRM
     * @private
     * @param {FileWithCustomProps} oldFile - Временный файл до загрузки
     * @param {FileWithCustomProps} newFile - Файл с данными после загрузки в CRM
     */
    private replaceFile(oldFile: FileWithCustomProps, newFile: FileWithCustomProps) {
        const index = this._allFiles.value.findIndex(
            f => this.getFileKey(f) === this.getFileKey(oldFile)
        );

        if (index !== -1) {
            // Создаем новый массив файлов, заменяя старый файл на новый
            // Используем spread оператор для создания нового массива и обновления реактивности
            this._allFiles.value = [
                ...this._allFiles.value.slice(0, index),
                newFile,
                ...this._allFiles.value.slice(index + 1)
            ];
        }
    }

    /**
     * Генерирует уникальный ключ для файла
     * Используется для идентификации файлов в списке и корректного обновления UI
     * @private
     * @param {FileWithCustomProps} file - Файл для генерации ключа
     * @returns {string} Уникальный ключ в формате 'uploaded-{id}' или 'local-{tempId}'
     */
    private getFileKey(file: FileWithCustomProps): string {
        return this.isUploadedFile(file)
            ? `uploaded-${file.id}`
            : `local-${file.tempId}`;
    }


    /**
     * Устанавливает значение пользовательского поля с загруженными файлами
     * @param {null|undefined} value - Значение для установки. Если undefined, используется текущий список ID файлов
     */
    public setUserFieldValue(value: null | undefined = undefined) {
        const v = this.uploadedFileIds ? this.uploadedFileIds : -1
        api().methods.setUserfieldValue(value === undefined ? v : value)
    }

}
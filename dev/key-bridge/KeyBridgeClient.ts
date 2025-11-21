// KeyBridgeClient.ts
// Основной клиентский класс для взаимодействия с сервером KeyBridge

import {keyBridgeConfig} from "./keyBridgeConfig.ts";
import {api} from "../api.ts";

// ===== ТИПЫ ДАННЫХ =====
type AxiosErrorResponseType = {
    response?: {
        status: number;
        data?: {
            message?: string;
        };
    };
    message?: string;
}

/**
 * Тип для описания вызова API
 */
export type ApiCallType = {
    method: string;         // Название метода API
    params?: unknown[];     // Параметры вызова
};

/**
 * Тип для запроса в пакетной обработке
 */
export type BatchRequestType = {
    requestKey: string;     // Уникальный идентификатор запроса
    call: ApiCallType;      // Данные вызова API
    resolve: (value: unknown) => void;  // Функция разрешения промиса
    reject: (reason?: unknown) => void; // Функция отклонения промиса
    timestamp: number;      // Временная метка создания
};

/**
 * Тип результата от сервера
 */
export type ServerResultType = {
    requestKey: string;     // Идентификатор запроса
    status: 'done';         // Статус выполнения
    result?: unknown;       // Результат выполнения
    isError?: boolean;      // Флаг ошибки
};

/**
 * Тип ответа на пакетный запрос от сервера
 */
export type ServerBatchResponseType = {
    ok: boolean;            // Флаг успешности операции
    data: {
        intervalMs?: number;                    // Текущий интервал опроса
        results?: ServerResultType[];           // Результаты выполненных запросов
        created?: Array<{ requestKey: string; status: string }>; // Созданные запросы
        cleanupCount?: number;                  // Количество очищенных записей
    };
};

// Тип для ответа axios
type AxiosResponseType<T = unknown> = {
    data: T;
    status: number;
    statusText: string;
    headers: unknown;
    config: unknown;
    request?: unknown;
};

/**
 * Тип состояния клиента KeyBridge
 */
export type KeyBridgeStateType = {
    connected: boolean;     // Флаг активного подключения
    processing: boolean;    // Флаг выполнения операций
    error: string | null;   // Текст последней ошибки
    pollRate: number;
    queues: {
        pending: number;    // Количество ожидающих запросов
        active: number;     // Количество активных запросов
        completed: number;  // Количество завершенных запросов
    };
};

// ===== ОСНОВНОЙ КЛАСС КЛИЕНТА =====

/**
 * Клиент для взаимодействия с сервером KeyBridge
 *
 * Управляет очередями запросов, обеспечивает пакетную обработку
 * и автоматическое восстановление при ошибках соединения
 */
class KeyBridgeClient {
    // Приватные поля состояния соединения
    private connection = {
        key: null as string | null,     // Текущий ключ подключения
        pollRate: 500,                  // Интервал опроса в миллисекундах
        broken: false                   // Флаг критического разрыва соединения
    };

    // Очереди для управления запросами
    private queues = {
        pending: new Map<string, BatchRequestType>(),   // Ожидающие отправки запросы
        active: new Map<string, BatchRequestType>(),    // Отправленные, но не выполненные запросы
        completed: new Set<string>()                    // Завершенные запросы (для очистки)
    };

    // Внутреннее состояние клиента
    private state = {
        processing: false,              // Флаг выполнения пакетной операции
        error: null as string | null    // Текст последней ошибки
    };

    // Подписчики на изменения состояния
    private stateListeners = new Set<(state: KeyBridgeStateType) => void>();

    /**
     * Возвращает текущее состояние клиента
     */
    getState(): KeyBridgeStateType {
        return {
            connected: !this.connection.broken && !!this.connection.key,
            processing: this.state.processing,
            error: this.state.error,
            pollRate: this.connection.pollRate,
            queues: {
                pending: this.queues.pending.size,
                active: this.queues.active.size,
                completed: this.queues.completed.size
            }
        };
    }

    /**
     * Подписывает слушателя на изменения состояния
     * @param listener - Функция-обработчик изменений состояния
     * @returns Функция для отписки
     */
    onStateChange(listener: (state: KeyBridgeStateType) => void): () => void {
        this.stateListeners.add(listener);
        listener(this.getState());
        return () => this.stateListeners.delete(listener);
    }

    /**
     * Уведомляет всех подписчиков об изменении состояния
     */
    private notifyStateChange(): void {
        const state = this.getState();
        this.stateListeners.forEach(listener => listener(state));
    }

    /**
     * Устанавливает или сбрасывает ключ подключения
     * @param key - Ключ подключения или null для сброса
     */
    async setKey(key: string | null): Promise<void> {
        // Сбрасываем флаги ошибок
        this.connection.broken = false;
        this.state.error = null;
        this.resetState();

        // Устанавливаем новый ключ (или null)
        this.connection.key = (key || '').trim() || null;

        if (!this.connection.key) {
            this.notifyStateChange();
            return;
        }

        try {
            // Инициализируем соединение с сервером
            await this.initializeConnection();
            this.notifyStateChange();
        } catch (error) {
            this.state.error = this.getErrorMessage(error);
            this.notifyStateChange();
            throw error;
        }
    }

    /**
     * Выполняет API-вызов через KeyBridge или использует fallback при недоступности
     * @param apiCall - Данные вызова API
     * @param fallback - Фолбек-функция на случай недоступности KeyBridge
     * @returns Promise с результатом выполнения
     */
    async executeOrFallback<T>(apiCall: ApiCallType, fallback: () => Promise<T>): Promise<T> {
        // Если соединение разорвано или ключ не установлен - используем фолбек
        if (this.connection.broken || !this.connection.key) {
            return fallback();
        }

        // Создаем новый запрос и добавляем в очередь
        return new Promise<T>((resolve, reject) => {
            const requestKey = this.generateRequestKey();
            const request: BatchRequestType = {
                requestKey,
                call: apiCall,
                resolve: (value) => resolve(value as T),
                reject,
                timestamp: Date.now()
            };

            this.queues.pending.set(requestKey, request);
            this.notifyStateChange();
            this.processIfNeeded();
        });
    }

    /**
     * Инициализирует соединение с сервером KeyBridge
     */
    private async initializeConnection(): Promise<void> {
        if (!this.connection.key) throw new Error('No connection key');
        // Отправляем тестовый запрос для проверки соединения
        try {
            const response: AxiosResponseType<unknown> = await api().methods.axios.post(
                keyBridgeConfig.getPushUrl(),
                {key: this.connection.key, init: true},
                {timeout: 5000}
            );
            // Валидируем и преобразуем ответ
            const serverResponse = this.validateInitResponse(response.data);

            // Обновляем интервал опроса
            if (typeof serverResponse.intervalMs === 'number' && serverResponse.intervalMs > 0) {
                this.connection.pollRate = Math.max(500, Math.min(10000, serverResponse.intervalMs));
            }

        } catch (error: unknown) {
            const axiosError = error as AxiosErrorResponseType;
            // Обрабатываем случай, когда ключ не найден на сервере
            if (axiosError.response?.status === 404) {
                this.connection.broken = true;
                this.state.error = axiosError.response.data?.message || 'Сессия не найдена. Создайте ключ заново.';
                this.connection.key = null;
                throw new Error('KEY_NOT_FOUND');
            }
            throw error;
        }
    }

    /**
     * Валидирует ответ сервера при инициализации
     */
    private validateInitResponse(data: unknown): ServerBatchResponseType['data'] {
        // Проверяем, что ответ имеет ожидаемую структуру
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid response structure');
        }

        // Используем type guards для безопасной проверки
        const hasOkAndData = (obj: object): obj is ServerBatchResponseType =>
            'ok' in obj && 'data' in obj;

        const hasDirectData = (obj: object): obj is ServerBatchResponseType['data'] =>
            'intervalMs' in obj || 'results' in obj || 'created' in obj || 'cleanupCount' in obj;

        // Вариант 1: Сервер возвращает данные в обертке { ok, data }
        if (hasOkAndData(data)) {
            const batchResponse = data as ServerBatchResponseType;
            if (!batchResponse.ok) {
                throw new Error('Server returned error status');
            }
            return batchResponse.data;
        }

        // Вариант 2: Сервер возвращает данные напрямую
        if (hasDirectData(data)) {
            return data as ServerBatchResponseType['data'];
        }

        throw new Error('Unrecognized response format');
    }

    /**
     * Проверяет необходимость обработки и запускает пакетную обработку
     */
    private async processIfNeeded(): Promise<void> {
        // Проверяем условия для начала обработки
        if (this.connection.broken || this.state.processing || !this.connection.key) return;

        // Проверяем наличие работы в очередях
        const hasWork = this.queues.pending.size > 0 || this.queues.active.size > 0 || this.queues.completed.size > 0;
        if (!hasWork) return;

        // Устанавливаем флаг обработки и уведомляем подписчиков
        this.state.processing = true;
        this.notifyStateChange();

        try {
            await this.processBatch();
        } finally {
            this.state.processing = false;
            this.notifyStateChange();
        }
    }

    /**
     * Выполняет пакетную обработку запросов
     */
    private async processBatch(): Promise<void> {
        if (this.connection.broken || !this.connection.key) return;

        // Формируем payload для отправки на сервер
        const payload = {
            key: this.connection.key,
            completedKeys: Array.from(this.queues.completed),
            statusRequestKeys: Array.from(this.queues.active.keys()),
            calls: Array.from(this.queues.pending.values()).map(req => ({
                requestKey: req.requestKey,
                method: req.call.method,
                params: req.call.params || []
            }))
        };

        // Сохраняем текущее состояние для возможного восстановления при ошибке
        const batchToSend = new Map(this.queues.pending);
        const completedSnapshot = new Set(this.queues.completed);

        // Очищаем очереди перед отправкой
        this.queues.pending.clear();
        this.queues.completed.clear();

        try {
            // Отправляем пакетный запрос на сервер
            const response: AxiosResponseType<unknown> = await api().methods.axios.post(
                keyBridgeConfig.getPushUrl(),
                payload,
                {timeout: this.connection.pollRate * 2}
            );

            // Валидируем ответ сервера
            const responseData = this.validateInitResponse(response.data);

            if (!responseData) {
                throw new Error('Invalid batch response');
            }

            // Обрабатываем успешный ответ
            this.handleBatchResponse(responseData, batchToSend);

            // Планируем следующую обработку если есть необработанные запросы
            if (this.queues.pending.size > 0 || this.queues.active.size > 0) {
                setTimeout(() => this.processIfNeeded(), this.connection.pollRate);
            }

        } catch (error) {
            // Восстанавливаем состояние и обрабатываем ошибку
            this.handleBatchError(error, batchToSend, completedSnapshot);
        }
    }

    /**
     * Обрабатывает успешный ответ от сервера
     * @param data - Данные ответа от сервера
     * @param batchToSend - Исходная партия запросов
     */
    private handleBatchResponse(data: ServerBatchResponseType['data'], batchToSend: Map<string, BatchRequestType>): void {
        // Обновляем интервал опроса если получен от сервера
        if (typeof data.intervalMs === 'number') {
            this.connection.pollRate = Math.max(500, Math.min(10000, data.intervalMs));
        }

        // Обрабатываем результаты выполненных запросов
        data.results?.forEach((result: ServerResultType) => {
            const request = this.queues.active.get(result.requestKey);
            if (!request) return;

            if (result.status === 'done') {
                if (result.isError) {
                    // Отклоняем промис с ошибкой
                    request.reject(new Error(typeof result.result === 'string' ? result.result : 'Execution failed'));
                } else {
                    // Разрешаем промис с результатом
                    request.resolve(this.parseResult(result.result));
                }
                this.queues.active.delete(result.requestKey);
                this.queues.completed.add(result.requestKey);
            }
        });

        // Обрабатываем подтверждения создания новых запросов
        data.created?.forEach((item: { requestKey: string; status: string }) => {
            const request = batchToSend.get(item.requestKey);
            if (!request) return;

            if (item.status === 'pending') {
                // Перемещаем запрос в активные
                this.queues.active.set(item.requestKey, request);
            } else {
                // Отклоняем запрос который не удалось создать
                request.reject(new Error('Failed to enqueue request'));
            }
        });

        this.notifyStateChange();
    }

    /**
     * Обрабатывает ошибку при пакетной обработке
     * @param error - Объект ошибки
     * @param batchToSend - Исходная партия запросов
     * @param completedSnapshot - Снимок завершенных запросов
     */
    private handleBatchError(
        error: unknown,
        batchToSend: Map<string, BatchRequestType>,
        completedSnapshot: Set<string>
    ): void {
        // Восстанавливаем очереди из снимка
        batchToSend.forEach((request, key) => {
            this.queues.pending.set(key, request);
        });
        completedSnapshot.forEach(key => this.queues.completed.add(key));

        // Сохраняем текст ошибки
        this.state.error = this.getErrorMessage(error);

        // Проверяем является ли ошибка критической
        const axiosError = error as AxiosErrorResponseType;
        const isCriticalError = axiosError.response?.status === 404 || axiosError.response?.status === 500;

        if (isCriticalError) {
            // Разрываем соединение при критических ошибках
            this.connection.broken = true;

            // Если это ошибка 404 (ключ не найден), сбрасываем ключ
            if (axiosError.response?.status === 404) {
                this.connection.key = null;
                this.state.error = axiosError.response.data?.message || 'Сессия не найдена. Создайте ключ заново.';
            }

            this.resetState();
        } else {
            // Планируем повторную попытку при некритических ошибках
            setTimeout(() => this.processIfNeeded(), Math.min(2000, this.connection.pollRate));
        }

        this.notifyStateChange();
    }

    /**
     * Сбрасывает состояние клиента и отклоняет все ожидающие запросы
     */
    private resetState(): void {
        // Отклоняем все ожидающие и активные запросы
        [...this.queues.pending.values(), ...this.queues.active.values()].forEach(req => {
            req.reject(new Error('Connection reset'));
        });

        // Очищаем все очереди
        this.queues.pending.clear();
        this.queues.active.clear();
        this.queues.completed.clear();
        this.state.processing = false;
        this.notifyStateChange();
    }

    /**
     * Генерирует уникальный ключ для запроса
     */
    private generateRequestKey(): string {
        return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    /**
     * Парсит результат выполнения запроса
     * @param result - Результат от сервера
     */
    private parseResult(result: unknown): unknown {
        if (typeof result === 'string') {
            try {
                return JSON.parse(result);
            } catch {
                return result;
            }
        }
        return result;
    }

    /**
     * Извлекает текстовое сообщение из объекта ошибки
     * @param error - Объект ошибки
     */
    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Unknown error';
    }

    // Совместимость со старым кодом

    /**
     * Проверяет активность подключения
     */
    get isConnected(): boolean {
        // Подключение считается активным только если:
        // - Нет критической ошибки соединения
        // - Ключ установлен
        // - Нет ошибки состояния (например, 404 от сервера)
        return !this.connection.broken &&
            !!this.connection.key &&
            !this.state.error;
    }

    /**
     * Возвращает текст последней ошибки
     */
    getLastError(): string | null {
        return this.state.error;
    }
}

// Экспортируем единственный экземпляр клиента (singleton)
export const keyBridgeClient = new KeyBridgeClient();
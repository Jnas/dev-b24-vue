// /dev/api.ts
import { loadMockData, type MockDataType, areParamsEqual } from './mockDataLoader.ts';
import { keyBridgeClient } from './key-bridge/KeyBridgeClient.ts';

interface ToastMethods {
    success: (message: string, options?: unknown) => void;
    error: (message: string, options?: unknown) => void;
    warning: (message: string, options?: unknown) => void;
    info: (message: string, options?: unknown) => void;
    clear: () => void;
    isActive: (id: number) => boolean;
}

interface AxiosMethods {
    get<T = unknown>(url: string, config?: unknown): Promise<T>;
    post<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
    put<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
    delete<T = unknown>(url: string, config?: unknown): Promise<T>;
}

interface ApiMethods {
    b24Call: <T = unknown>(method: string, params?: unknown) => Promise<T>;
    toast: ToastMethods;
    axios: AxiosMethods;
    openCustomScript: (...args: unknown[]) => void;
    setUserfieldValue: (value: unknown) => void;
}

export interface ApiObjectType {
    methods: ApiMethods;
    fields: ApiObjectFieldsType;
}

export type ApiObjectFieldsType = {
    placement: unknown;
    [key: string]: unknown;
};

declare global {
    interface Window {
        __GLOBAL_API__?: () => ApiObjectType;
        Toast?: ToastMethods;
        Axios?: AxiosMethods;
        OpenCustomScript?: () => void;
    }
}

const getMockData = (): MockDataType => {
    if (import.meta.env.DEV) {
        try {
            return loadMockData();
        } catch {
            console.warn('[API] Не удалось загрузить моковые данные');
        }
    }
    return { latestFields: { placement: null }, methodMocks: [] };
};

const { latestFields, methodMocks } = getMockData();

const findMock = async <T = unknown>(
    method: string,
    params: unknown = {}
): Promise<T> => {
    // Используем функцию сравнения с нормализацией вместо прямого JSON.stringify
    const mock = methodMocks.find(
        (m) =>
            m.method === method &&
            areParamsEqual(m.params ?? {}, params)
    );

    if (!mock) {
        const indentedParams = JSON.stringify(params, null, 2)
            .split('\n')
            .map((line) => '  ' + line)
            .join(' \n');

        console.log(
            '%c[API]📥 Требуется сохранить моковые результаты запроса\n' +
            '%c  Метод: %c \n    ' + method + '\n' +
            '%c  Параметры: %c \n ' + indentedParams,

            // ОБЯЗАТЕЛЬНО в этом порядке:
            'color: #1A1A1A; background: #faf9f0; padding: 6px; border-radius: 4px; font-weight: bold', // [API]
            'color: #1A1A1A; background: #faf9f0; font-weight: bold', // "  Метод: "
            'color: #1976D2; background: #faf9f0; font-weight: bold; cursor: text', // Значение метода
            'color: #1A1A1A; background: #faf9f0; font-weight: bold', // "  Параметры: "
            'color: #1976D2; background: #faf9f0; white-space: pre; cursor: text' // Значение параметров
        );
        return { result: [] } as T;
    }

    if (mock.delay) {
        await new Promise((resolve) => setTimeout(resolve, mock.delay));
    }
    return mock.result as T;
};

const createDevApi = (): ApiObjectType => {
    if (latestFields === null) {
        console.log('%c[API] ⚠️ Входные данные не загружены ' +
            '\n\tТребуется зайти в приложение, получить входные данные и сохранить их в папку /src/mock ',
            'color: #8B0000; font-weight: bold; background: #FFF0F5; padding: 2px 5px; border-radius: 3px; border-left: 2px solid #FF6B6B;',
        );
    }
    return {
        methods: {
            b24Call: async <T = unknown>(method: string, params?: unknown): Promise<T> => {
                return keyBridgeClient.executeOrFallback<T>(
                    { method: 'b24Call', params: [method, params] },
                    () => findMock<T>(method, params)
                );
            },
            toast: window.Toast ?? ({} as ToastMethods),
            axios: window.Axios ?? ({} as AxiosMethods),
            openCustomScript: (...args: unknown[]) => {
                window.Toast?.warning?.(
                    `Метод "openCustomScript" не доступен в dev-режиме. Аргументы: ${JSON.stringify(args)}`
                );
            },
            setUserfieldValue: (value: unknown) => {
                console.log(
                    '%c[DEV] ⚠️ setUserfieldValue' +
                    '\n\tМетод недоступен в режиме разработки \n\t→ Для тестирования используйте production-сборку \n\t→ Переданное значение: ' + JSON.stringify(value),
                    'color: #D35400; background: #FDF5E6; padding: 2px 5px; border-radius: 3px; font-weight: bold; border-left: 2px solid #F39C12;',
                )
                ;
            }
        },
        fields: latestFields === null ? { placement: null } : latestFields
    };
};

export const api = (): ApiObjectType => {
    if (import.meta.env.DEV) {
        return createDevApi();
    }

    if (typeof window.__GLOBAL_API__ === 'function') {
        return window.__GLOBAL_API__();
    }
    throw new Error('[API] Глобальный API недоступен');
};
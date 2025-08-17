// /dev/api.ts
import {loadMockData, type MockDataType} from './mockDataLoader.ts';

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
        } catch{
            console.warn('[API] Не удалось загрузить моковые данные');
        }
    }
    return {latestFields: {placement: null}, methodMocks: []};
};

const {latestFields, methodMocks} = getMockData();

const findMock = async <T = unknown>(
    method: string,
    params: unknown = {}
): Promise<T> => {
    const mock = methodMocks.find(
        m =>
            m.method === method &&
            JSON.stringify(m.params ?? {}) === JSON.stringify(params)
    );

    if (!mock) return {result: []} as T;
    if (mock.delay) await new Promise(r => setTimeout(r, mock.delay));
    return mock.result as T;
};

const createDevApi = (): ApiObjectType => ({
    methods: {
        b24Call: findMock,
        toast: window.Toast ?? ({} as ToastMethods),
        axios: window.Axios ?? ({} as AxiosMethods),
        openCustomScript: (...args: unknown[]) => {
            window.Toast?.error?.(
                `Метод "openCustomScript" не доступен в dev-режиме. Аргументы: ${JSON.stringify(args)}`
            );
        },
        setUserfieldValue: (value: unknown) => {
            window.Toast?.error?.(`Метод "setUserfieldValue" не доступен в dev-режиме. Значение: ${JSON.stringify(value)}`);
        }
    },
    fields: latestFields
});

export const api = (): ApiObjectType => {
    if (import.meta.env.DEV) {
        return createDevApi();
    }
    if (typeof window.__GLOBAL_API__ === 'function') {
        return window.__GLOBAL_API__();
    }
    throw new Error('[API] Глобальный API недоступен');
};

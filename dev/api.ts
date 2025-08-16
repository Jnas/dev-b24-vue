// /dev/api.ts
import {loadMockData, type mockDataType} from './mockDataLoader.ts';

interface ToastMethods {
    success: (message: string, options?: any) => void;
    error: (message: string, options?: any) => void;
    warning: (message: string, options?: any) => void;
    info: (message: string, options?: any) => void;
    clear: () => void;
    isActive: (id: number) => boolean;
}

interface AxiosMethods {
    get<T = any>(url: string, config?: any): Promise<T>;
    post<T = any>(url: string, data?: any, config?: any): Promise<T>;
    put<T = any>(url: string, data?: any, config?: any): Promise<T>;
    delete<T = any>(url: string, config?: any): Promise<T>;
}

interface ApiMethods {
    b24Call: (method: string, params?: any) => Promise<any>;
    toast: ToastMethods;
    axios: AxiosMethods;
    openCustomScript: (...args: any[]) => void;
}

export interface ApiObjectType {
    methods: ApiMethods;
    fields: ApiObjectFieldsType;

    [key: string]: any;
}

export type ApiObjectFieldsType = {
    placement: any;
    [key: string]: any;
};


declare global {
    interface Window {
        __GLOBAL_API__?: () => ApiObjectType;
        Toast?: ToastMethods;
        Axios?: AxiosMethods;
        OpenCustomScript?: () => void;
    }
}

const getMockData = (): mockDataType => {
    if (import.meta.env.DEV) {
        try {
            return loadMockData();
        } catch (e) {
            console.warn('[API] Не удалось загрузить моковые данные', e);
        }
    }
    return {latestFields: {placement: null}, methodMocks: []};
};

const {latestFields, methodMocks} = getMockData();

const findMock = async (method: string, params: any = {}): Promise<any> => {
    const mock = methodMocks.find(m =>
        m.method === method &&
        JSON.stringify(m.params ?? {}) === JSON.stringify(params)
    );
    if (!mock) return {result: []};
    if (mock.delay) await new Promise(r => setTimeout(r, mock.delay));
    return mock.result;
};

const createDevApi = (): ApiObjectType => ({
    methods: {
        b24Call: findMock,
        toast: window.Toast ?? ({} as ToastMethods),
        axios: window.Axios ?? ({} as AxiosMethods),
        openCustomScript: (...args: any[]) => {
            window.Toast?.error?.(
                `Метод "openCustomScript" не доступен в dev-режиме. Аргументы: ${JSON.stringify(args)}`
            );
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

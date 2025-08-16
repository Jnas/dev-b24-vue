// /dev/mockDataLoader.ts
import type {ApiObjectFieldsType} from "./api.ts";

type MockMethodType = {
    method: string;
    params?: any;
    result: any;
    delay?: number;
}

type FieldsFileType = {
    data: ApiObjectFieldsType;
    mtime: Date;
}

export type mockDataType = { latestFields: ApiObjectFieldsType; methodMocks: MockMethodType[] }


const env = import.meta.env;

export function loadMockData(): mockDataType {
    if (!env?.DEV) {
        return {latestFields: {placement: null}, methodMocks: []};
    }

    try {
        const mockModules = import.meta.glob('/src/mock/*.json', {
            eager: true,
            import: 'default'
        });

        const fieldsFiles: FieldsFileType[] = [];
        const methodMocks: MockMethodType[] = [];

        Object.values(mockModules).forEach((content: any) => {
            if (!content) return;

            // Если JSON содержит ключ placement — сохраняем весь объект
            if (content.placement) {
                fieldsFiles.push({
                    data: content as ApiObjectFieldsType,
                    mtime: new Date()
                });
            }
            // Если это метод-мок
            else if (content.method && content.result) {
                methodMocks.push({
                    method: content.method,
                    params: content.params || {},
                    result: content.result,
                    delay: content.delay
                });
            }
        });

        fieldsFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        return {
            latestFields: fieldsFiles[0]?.data || null,
            methodMocks
        };
    } catch (error) {
        console.error('Ошибка при загрузке моков:', error);
        return {latestFields: {placement: null}, methodMocks: []};
    }
}

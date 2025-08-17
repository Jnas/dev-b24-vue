// /dev/mockDataLoader.ts
import type { ApiObjectFieldsType } from "./api.ts";

type MockMethodType = {
    method: string;
    params?: Record<string, unknown>;
    result: unknown;
    delay?: number;
};

type FieldsFileType = {
    data: ApiObjectFieldsType;
    mtime: Date;
};

export type MockDataType = {
    latestFields: ApiObjectFieldsType;
    methodMocks: MockMethodType[];
};

const env = import.meta.env;

// ----------- TYPE GUARDS -----------
function isApiObjectFieldsType(obj: unknown): obj is ApiObjectFieldsType {
    return typeof obj === "object" && obj !== null && "placement" in obj;
}

function isMockMethodType(obj: unknown): obj is MockMethodType {
    if (typeof obj !== "object" || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return (
        typeof o.method === "string" &&
        "result" in o
    );
}

// ----------- MAIN LOADER -----------
export function loadMockData(): MockDataType {
    if (!env?.DEV) {
        return { latestFields: { placement: null }, methodMocks: [] };
    }

    try {
        const mockModules = import.meta.glob<unknown>("/src/mock/*.json", {
            eager: true,
            import: "default"
        });

        const fieldsFiles: FieldsFileType[] = [];
        const methodMocks: MockMethodType[] = [];

        Object.values(mockModules).forEach((content: unknown) => {
            if (isApiObjectFieldsType(content)) {
                fieldsFiles.push({
                    data: content,
                    mtime: new Date()
                });
            } else if (isMockMethodType(content)) {
                methodMocks.push({
                    method: content.method,
                    params: content.params ?? {},
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
    } catch {
        console.error("Ошибка при загрузке моков");
        return { latestFields: { placement: null }, methodMocks: [] };
    }
}

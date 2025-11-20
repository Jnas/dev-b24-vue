const baseUrl = 'https://apibitrix.jnas.ru/bitrix24-forms-dynamic'

// Конфигурация для клиента KeyBridge
export const keyBridgeConfig = {
    // Возвращает полный URL для push-запроса
    getPushUrl(): string {
        return `${baseUrl}/key/client-batch`;
    },
};

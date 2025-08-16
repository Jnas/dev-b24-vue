/**
 * Создает задержку на указанное количество миллисекунд
 * @param ms - количество миллисекунд для ожидания
 * @returns Promise, который разрешается через указанное время
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
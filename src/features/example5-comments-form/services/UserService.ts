import type { UserType } from "../types/types";
import {api} from "../../../../dev/api.ts";

/**
 * Сервис для работы с пользователями системы
 * 
 * Основные функции:
 * - Управление данными текущего пользователя
 * - Кэширование списка пользователей
 * - Поиск пользователей по ID
 * - Формирование ФИО пользователей
 */
export default class UserService {
    // Кэш данных текущего пользователя
    private _currentUser: UserType | null = null;
    
    // Кэш списка пользователей
    private _users: UserType[] | null = null;

    /**
     * Получает данные текущего аутентифицированного пользователя
     * Использует кэширование для избежания лишних запросов
     * @returns Promise с данными пользователя
     */
    async getCurrentUser(): Promise<UserType> {
        // Возвращаем закэшированные данные, если они есть
        if (this._currentUser) return this._currentUser;

        // Запрашиваем данные текущего пользователя из API Bitrix24
        const response = await api().methods.b24Call<{ result: UserType }>(
            "user.current",
            {}
        );
        this._currentUser = response.result as UserType;
        return this._currentUser;
    }

    /**
     * Геттер для получения аватара текущего пользователя
     * @returns {string} URL аватара или пустая строка, если аватар не задан
     * 
     * @note
     * Возвращает URL аватара в формате, пригодном для использования в теге img
     */
    get userAvatar(): string {
        return this._currentUser?.PERSONAL_PHOTO || "";
    }

    /**
     * Загружает список всех пользователей системы
     * @returns {Promise<void>}
     * 
     * @description
     * 1. Проверяет наличие закэшированного списка пользователей
     * 2. Загружает список пользователей через API Bitrix24
     * 3. Сохраняет результат в кэш
     */
    async fetchUsers(): Promise<void> {
        // Не загружаем повторно, если данные уже есть в кэше
        if (this._users) return;

        // Загружаем список пользователей через API
        const response = await api().methods.b24Call<{ result: UserType[] }>(
            "user.get",
            {}
        );
        
        // Сохраняем результат в кэш
        this._users = response.result;
    }

    /**
     * Находит пользователя по ID
     * 
     * @param id - ID пользователя для поиска
     * @returns {UserType | undefined} Найденный пользователь или undefined, если не найден
     * 
     * @note
     * Для работы метода необходимо предварительно вызвать fetchUsers()
     */
    getUserById(id: string): UserType | undefined {
        return this._users?.find(user => user.ID === id);
    }

    /**
     * Формирует ФИО пользователя по его ID
     * @param id - ID пользователя
     * @returns Строка с ФИО пользователя или пустая строка, если пользователь не найден
     */
    getUserFioById(id: string): string {
        const user = this.getUserById(id);
        if (!user) return "";

        // Собираем ФИО из отдельных полей, отфильтровывая пустые значения
        return [user.LAST_NAME, user.NAME, user.SECOND_NAME]
            .filter(Boolean) // Удаляем пустые значения
            .join(" ");     // Объединяем через пробел
    }
}
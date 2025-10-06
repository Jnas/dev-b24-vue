import {ref} from "vue";
import type { CommentType, CrmCommentType, UserType } from "../types/types";
import CrmService from "../services/CrmService";
import UserService from "../services/UserService";
import { BizprocService } from "../services/BizprocService";

/**
 * Менеджер комментариев - центральный класс для работы с комментариями
 * Отвечает за:
 * - Загрузку и хранение списка комментариев
 * - Управление текущим пользователем
 * - Взаимодействие с CRM и бизнес-процессами
 */
export default class CommentManager {
    // Реактивный массив комментариев
    public comments = ref<CommentType[]>([]);
    
    // Текущий авторизованный пользователь
    public currentUser = ref<UserType | null>(null);

    // Сервисы для работы с данными
    private crmService: CrmService;
    private userService: UserService;
    private bizprocService: BizprocService;

    /**
     * Создает экземпляр CommentManager
     * @param entityTypeId - ID типа сущности CRM (по умолчанию: 1288)
     * @param bizprocTemplateId - ID шаблона бизнес-процесса (по умолчанию: 1915)
     */
    constructor(entityTypeId: number = 1288, bizprocTemplateId: number = 1915) {
        this.crmService = new CrmService(entityTypeId);
        this.userService = new UserService();
        this.bizprocService = new BizprocService(bizprocTemplateId);
    }

    /**
     * Инициализация менеджера комментариев
     * Выполняет параллельную загрузку:
     * - Текущего элемента CRM
     * - Списка пользователей
     * - Данных текущего пользователя
     * После загрузки обновляет список комментариев
     */
    async initialize(): Promise<void> {
        try {
            // Параллельная загрузка всех необходимых данных
            await Promise.all([
                this.crmService.fetchCurrentItem(),
                this.userService.fetchUsers(),
                this.loadCurrentUser()
            ]);
            
            // Обновление списка комментариев после загрузки данных
            this.updateComments(this.crmService.getComments());
        } catch {
            console.error('Ошибка инициализации CommentManager');
            throw 'Ошибка инициализации CommentManager';
        }
    }

    private async loadCurrentUser(): Promise<void> {
        this.currentUser.value = await this.userService.getCurrentUser();
    }

    /**
     * Обновляет список комментариев, преобразуя их из формата CRM в формат приложения
     * 
     * @param comments - Массив комментариев в формате CRM
     * @returns void
     * 
     * @description
     * 1. Принимает массив комментариев из CRM
     * 2. Конвертирует каждый комментарий в формат приложения
     * 3. Фильтрует null/undefined значения
     * 4. Обновляет реактивное свойство comments
     */
    updateComments(comments: CrmCommentType[]): void {
        const convertedComments = comments
            .map(comment => this.convertComment(comment))
            .filter((comment): comment is CommentType => comment !== null);
            
        this.comments.value = convertedComments;
    }

    /**
     * Конвертирует комментарий из формата CRM в формат приложения
     * @param comment - Комментарий в формате CRM
     * @returns Комментарий в формате приложения или null, если конвертация невозможна
     */
    private convertComment(comment: CrmCommentType): CommentType | null {
        // Проверка на наличие обязательных полей
        if (!comment?.userId) return null;
        
        // Получение данных пользователя
        const userId = comment.userId.toString();
        const user = this.userService.getUserById(userId);
        if (!user) return null;

        // Формирование ФИО пользователя
        const username = this.userService.getUserFioById(userId);
        if (!username) return null;

        // Возврат объекта комментария в формате приложения
        return {
            userId: userId,
            username,
            avatar: user.PERSONAL_PHOTO || '',
            text: comment.text || '',
            timestamp: comment.timestamp || Date.now()
        };
    }

    /**
     * Добавляет новый комментарий от текущего пользователя
     * 
     * @param text - Текст комментария для добавления
     * @returns Promise<boolean> - true, если комментарий успешно добавлен, иначе false
     * 
     * @description
     * 1. Проверяет авторизацию пользователя
     * 2. Создает объект комментария с текущей меткой времени
     * 3. Сохраняет комментарий в CRM
     * 4. При успешном сохранении:
     *    - Добавляет комментарий в локальный список
     *    - Запускает связанный бизнес-процесс
     */
    async addComment(text: string): Promise<boolean> {
        // Проверяем, что пользователь авторизован
        if (!this.currentUser.value) {
            console.error('Текущий пользователь не определен');
            return false;
        }

        const userId = this.currentUser.value.ID;
        const timestamp = Date.now();

        // Формируем объект комментария для отображения
        const commentData: CommentType = {
            userId,
            username: this.userService.getUserFioById(userId) || "Неизвестный пользователь",
            avatar: this.currentUser.value.PERSONAL_PHOTO || "",
            text,
            timestamp
        };

        try {
            // Сохраняем комментарий в CRM
            const saveResult = await this.crmService.addComment(userId, text, timestamp);
            if (!saveResult.success) {
                console.error('Не удалось сохранить комментарий в CRM');
                return false;
            }

            // Добавляем комментарий в локальный список для мгновенного отображения
            this.comments.value.push(commentData);

            // Запускаем бизнес-процесс асинхронно, не дожидаясь его завершения
            this.startBusinessProcess(commentData).catch(() => {
                console.error('Ошибка при запуске бизнес-процесса');
                // Продолжаем выполнение, даже если бизнес-процесс не запустился
            });

            return true;
        } catch {
            console.error('Ошибка при добавлении комментария');
            return false;
        }
    }

    /**
     * Запускает бизнес-процесс, связанный с добавлением комментария
     * 
     * @param comment - Данные комментария для передачи в бизнес-процесс
     * @returns Promise<void>
     * 
     * @description
     * 1. Получает ID типа сущности из CRM-сервиса
     * 2. Вызывает сервис бизнес-процессов для запуска workflow
     * 3. Обрабатывает возможные ошибки, логируя их в консоль
     * 
     * @note
     * - Ошибки логируются, но не пробрасываются выше, чтобы не прерывать основной поток
     * - Бизнес-процесс запускается асинхронно и не блокирует интерфейс
     */
    private async startBusinessProcess(comment: CommentType): Promise<void> {
        try {
            await this.bizprocService.startCommentWorkflow(
                this.crmService.entityTypeId,
                this.crmService.crmId,
                comment
            );
        } catch {
            console.error('Ошибка запуска бизнес-процесса');
            // Можно добавить уведомление пользователя об ошибке через систему нотификаций
        }
    }

    /**
     * Геттер для получения аватара текущего пользователя
     */
    get currentUserAvatar(): string {
        return this.currentUser.value?.PERSONAL_PHOTO || "";
    }

    /**
     * Геттер для получения имени текущего пользователя
     */
    get currentUserName(): string {
        return this.currentUser.value?.NAME || "";
    }
}
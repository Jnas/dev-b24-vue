<!-- 
  Button3BusinessProcess.vue - Компонент для управления бизнес-процессом
  
  Компонент предоставляет кнопку для взаимодействия с бизнес-процессами Bitrix24.
  Отслеживает состояние бизнес-процесса и отображает соответствующее состояние кнопки.
  
  Основная функциональность:
  - Отображение состояния бизнес-процесса
  - Периодический опрос состояния бизнес-процесса
  
  Используемые технологии:
  - Vue.js 3 Composition API
  - Vuetify 3 для UI компонентов
  - Интеграция с Bitrix24 API
-->
<template>
  <v-app style="background-color: #f9fafb">
    <v-main fluid class="d-flex justify-center align-center">
      <v-btn
          :color="hasError ? 'error' : 'primary'"
          :disabled="isProcessing || hasError"
          class="d-inline-flex align-center"
          @click="onClick"
      >
        <span v-if="hasError">Ошибка</span>
        <template v-else>
          <v-progress-circular
              v-if="isProcessing"
              indeterminate
              size="16"
              width="2"
              class="me-2"
          />
          Бизнес процесс
        </template>
      </v-btn>
    </v-main>
  </v-app>
</template>
<script>
import {api} from "../../../dev/api.js";

// Конфигурация компонента
const config = {
  pollIntervalMs: 2000, // Интервал опроса состояния бизнес-процесса в миллисекундах
  templateId: 1927,     // ID шаблона бизнес-процесса
};

export default {
  name: 'BusinessProcessButton',
  
  /**
   * Инициализация состояния компонента
   * @returns {Object} Начальное состояние компонента
   */
  data() {
    return {
      isProcessing: true,  // Флаг выполнения бизнес-процесса
      hasError: false,     // Флаг ошибки
      pollTimerId: null,   // Идентификатор таймера опроса
      isPolling: false,    // Флаг выполнения опроса (для предотвращения наложений)
    };
  },
  computed: {
    /**
     * Генерирует идентификатор документа для бизнес-процесса
     * на основе данных из контекста размещения
     * @returns {string|null} Идентификатор документа или null, если данные недоступны
     */
    documentId() {
      // Получаем тип и ID сущности из контекста размещения
      const entityTypeId = api()?.fields?.placement?.options?.ENTITY_DATA?.entityTypeId;
      const entityId = api()?.fields?.placement?.options?.ENTITY_DATA?.entityId;

      // Формируем идентификатор документа в формате DYNAMIC_{entityTypeId}_{entityId}
      if (entityTypeId && entityId) {
        return `DYNAMIC_${entityTypeId}_${entityId}`;
      }
      return null;
    },
  },
  /**
   * Хук жизненного цикла: выполняется после монтирования компонента
   * Запускает периодический опрос состояния бизнес-процесса
   * @lifecycle
   */
  mounted() {
    this.startPolling();
  },
  
  /**
   * Хук жизненного цикла: выполняется перед уничтожением компонента
   * Останавливает таймер опроса для предотвращения утечек памяти
   * @lifecycle
   */
  beforeUnmount() {
    this.stopPolling();
  },
  methods: {
    /**
     * Обработчик клика по кнопке
     * Активирует состояние обработки, если нет ошибок и процесс не выполняется
     */
    onClick() {
      if (!this.isProcessing && !this.hasError) {
        this.isProcessing = true;
      }
    },
    /**
     * Запускает периодический опрос состояния бизнес-процесса
     * @returns {void}
     */
    startPolling() {
      // Проверяем наличие documentId
      if (!this.documentId) {
        this.stopPolling();
        this.hasError = true;
        return;
      }

      // Выполняем немедленный первый опрос
      this.pollWorkflowState();

      // Устанавливаем интервал для периодического опроса
      this.pollTimerId = setInterval(
          this.pollWorkflowState,
          config.pollIntervalMs
      );
    },
    /**
     * Останавливает периодический опрос состояния бизнес-процесса
     */
    stopPolling() {
      if (this.pollTimerId) {
        clearInterval(this.pollTimerId);
        this.pollTimerId = null;
      }
    },
    /**
     * Опрашивает состояние бизнес-процесса через Bitrix24 API
     * @async
     * @returns {Promise<void>}
     */
    async pollWorkflowState() {
      // Проверяем, не выполняется ли уже опрос и доступен ли documentId
      if (this.isPolling || !this.documentId) return;
      this.isPolling = true;

      try {
        // Выполняем запрос к Bitrix24 API для получения информации о бизнес-процессе
        const response = await api().methods.b24Call(
            "bizproc.workflow.instances",
            {
              FILTER: {
                DOCUMENT_ID: this.documentId,
                TEMPLATE_ID: config.templateId
              },
            }
        );

        // Обрабатываем ответ API
        const total = Number(response?.total);

        if (Number.isFinite(total)) {
          // Обновляем состояние на основе количества активных экземпляров бизнес-процесса
          this.hasError = false;
          this.isProcessing = total > 0;
        } else {
          // В случае невалидного ответа помечаем ошибку и останавливаем опрос
          this.hasError = true;
          this.stopPolling();
        }
      } catch {
        this.hasError = true;
        this.stopPolling(); // при ошибке запроса останавливаем
      } finally {
        this.isPolling = false;
      }
    },
  },
};
</script>


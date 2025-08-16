<!-- 
  Example1MyApp.vue - Демонстрационный компонент с базовой функциональностью
  
  Компонент демонстрирует различные возможности работы с Vue.js и Vuetify,
  включая работу с состоянием, обработку событий и интеграцию с API Bitrix24.
  
  Основная функциональность:
  - Ввод и отображение текста с реактивными вычислениями
  - Обработка кликов по кнопкам с анимацией загрузки
  - Интеграция с Bitrix24 API для получения данных пользователя
  - Демонстрация работы с хуками жизненного цикла
  - Отображение уведомлений и результатов
  
  Используемые технологии:
  - Vue.js 3 Composition API
  - Vuetify 3 для UI компонентов
  - Интеграция с Bitrix24 через api().methods
-->
<template>
  <div>
    <!-- Основной заголовок приложения -->
    <h1 class="text-h4 text--primary ma-4">Тестовая форма</h1>
    <!-- Карточка с основным контентом -->
    <v-card variant="outlined" class="ma-4">
      <v-card-title>Результаты</v-card-title>
      <v-card-text>
        <!-- Поле ввода текста с двусторонним связыванием через v-model -->
        <v-text-field
            v-model="inputText"
            label="Введите текст"
            placeholder="Начните вводить..."
            outlined
            clearable
            @input="onInput"
        ></v-text-field>

        <!-- Кнопка с обработчиком клика -->
        <div>
          <v-btn
              color="primary"
              @click="onButtonClick"
              :loading="loading"
              class="mb-2"
          >
            Нажми меня
          </v-btn>
        </div>
        <!-- Кнопка с обработчиком клика -->
        <div>
          <v-btn
              color="primary"
              @click="onButtonToast"
              class="mb-2"
          >
            Вывести сообщение
          </v-btn>
        </div>


        <!-- Индикатор количества нажатий кнопки -->
        <v-chip class="ml-4" color="success" variant="outlined">
          Нажатий: {{ clickCount }}
        </v-chip>

        <!-- Уведомление с введенным текстом -->
        <v-alert
            v-if="displayText"
            color="info"
            variant="tonal"
            class="mt-2"
        >
          Вы ввели: <strong>{{ displayText }}</strong>
        </v-alert>

        <!-- Уведомление с удвоенным текстом -->
        <v-alert
            v-if="doubledText"
            color="warning"
            variant="tonal"
            class="mt-2"
        >
          Удвоенный текст: <strong>{{ doubledText }}</strong>
        </v-alert>

        <!-- Уведомление с количеством нажатий -->
        <v-alert
            v-if="clickCount > 0"
            color="success"
            variant="tonal"
            class="mt-2"
        >
          Кнопка была нажата {{ clickCount }} раз(а)
        </v-alert>

        <!-- Кнопка с обработчиком клика -->
        <div>
          <v-btn
              color="primary"
              @click="onButtonB24"
              class="mt-2"
              :loading="loadingB24"
          >
            О Пользователе
          </v-btn>
        </div>
        <div>Результат B24 : {{ b24result }}</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import {api} from "../../../dev/api.js";

/**
 * Основной компонент демонстрационного приложения
 * 
 * @component
 * @example
 * <example1-my-app />
 */
export default {
  /**
   * Объявление реактивных данных компонента
   * @returns {Object} Начальное состояние компонента
   */
  data() {
    return {
      /** @type {string} Текст, введенный пользователем в поле ввода */
      inputText: "",
      
      /** @type {number} Счетчик нажатий на кнопку "Нажми меня" */
      clickCount: 0,
      
      /** @type {boolean} Флаг отображения индикатора загрузки для основной кнопки */
      loading: false,
      
      /** @type {boolean} Флаг отображения индикатора загрузки для кнопки B24 */
      loadingB24: false,
      
      /** @type {Object} Результат запроса к API Bitrix24 */
      b24result: {},
    };
  },

  /**
   * Вычисляемые свойства компонента
   */
  computed: {
    /**
     * Возвращает введенный текст или "ничего", если поле пустое
     * @returns {string} Текст для отображения
     */
    displayText() {
      return this.inputText || "ничего";
    },

    /**
     * Создает строку с удвоенным введенным текстом
     * @returns {string} Удвоенный введенный текст
     */
    doubledText() {
      return this.inputText + this.inputText;
    }
  },

  /**
   * Наблюдатели за изменениями данных
   */
  watch: {
    /**
     * Отслеживание изменений в поле ввода
     * @param {string} newVal - Новое значение
     * @param {string} oldVal - Предыдущее значение
     */
    inputText(newVal, oldVal) {
      console.log("Текст изменился с", oldVal, "на", newVal);
    },

    /**
     * Отслеживание количества нажатий на кнопку
     * @param {number} newVal - Новое количество нажатий
     */
    clickCount(newVal) {
      if (newVal > 5) {
        console.log("Уже больше 5 нажатий!");
      }
    }
  },

  /**
   * Методы компонента
   */
  methods: {
    /**
     * Обработчик ввода текста
     * @fires console.log - Логирует введенный текст
     */
    onInput() {
      console.log("Ввод:", this.inputText);
    },

    /**
     * Обработчик клика по кнопке "Нажми меня"
     * Увеличивает счетчик нажатий и имитирует асинхронную операцию
     * @async
     */
    async onButtonClick() {
      this.loading = true;        // Включаем индикатор загрузки
      this.clickCount++;          // Увеличиваем счетчик нажатий
      
      // Имитируем асинхронную операцию
      await new Promise(r => setTimeout(r, 500));
      
      console.log(`Кнопка нажата ${this.clickCount} раз(а)!`);
      this.loading = false;       // Выключаем индикатор загрузки
    },

    /**
     * Отображает toast-уведомление с введенным текстом
     * @fires api().methods.toast - Показывает уведомление
     */
    onButtonToast() {
      api().methods.toast(this.inputText || "Введите текст");
    },

    /**
     * Получает информацию о текущем пользователе через Bitrix24 API
     * @async
     * @fires api().methods.b24Call - Вызывает метод Bitrix24 API
     */
    async onButtonB24() {
      this.loadingB24 = true;
      try {
        // Получаем данные о текущем пользователе
        this.b24result = await api().methods.b24Call("user.current", {});
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
        this.b24result = { error: "Не удалось загрузить данные пользователя" };
      } finally {
        this.loadingB24 = false;
      }
    }
  },

  /**
   * Хук жизненного цикла: выполняется после монтирования компонента в DOM
   * @lifecycle
   */
  mounted() {
    console.log("Компонент загружен! Hello World в консоли");
    console.log("Доступен объект api():", api());
  }
};
</script>

<style>
/* Стили для отображения результата B24 */
code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
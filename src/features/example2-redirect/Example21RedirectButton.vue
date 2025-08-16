<!-- 
  Example21RedirectButton.vue - Кнопка для инициализации процесса перенаправления
  
  Компонент предоставляет кнопку, при нажатии на которую открывается пользовательский скрипт
  для выполнения перенаправления. Содержания скрипта определено в компоненте Example22RedirectProcess.vue.
  
  Основная функциональность:
  - Отображение кнопки с обработчиком клика
  - Интеграция с Bitrix24 API для открытия пользовательского скрипта
  
  Используемые технологии:
  - Vue.js 3 Composition API
  - Vuetify 3 для UI компонентов
  - Интеграция с Bitrix24 через api().methods
-->
<template>
  <v-app style="background-color: #f9fafb">
    <v-main>
      <v-container>
        <v-btn
            color="primary"
            @click="onButtonClick"
            class="mb-2"
        >
          Нажми меня
        </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>
<script>
import {api} from "../../../dev/api.js";

export default {
  name: 'RedirectButton',
  methods: {
    /**
     * Обработчик клика по кнопке
     * Открывает пользовательский скрипт для выполнения перенаправления
     * @fires api().methods.openCustomScript - Открывает указанный кастомный скрипт
     */
    async onButtonClick() {
      // Вызываем метод API для открытия кастомного скрипта перенаправления
      api().methods.openCustomScript("customScriptRedirect")
    },
  },
};
</script>

<!-- 
  Example22RedirectProcess.vue - Компонент процесса перенаправления
  
  Компонент отображает индикатор загрузки и выполняет перенаправление на указанный URL
  после короткой задержки. Используется как целевая страница для процесса перенаправления.
  
  Основная функциональность:
  - Отображение индикатора загрузки во время ожидания перенаправления
  - Автоматическое перенаправление на указанный URL после задержки
  
  Используемые технологии:
  - Vue.js 3 Composition API
  - Vuetify 3 для UI компонентов
-->
<!-- this is customScriptRedirect -->
<template>
  <v-app>
    <v-main class="redirect-container">
      <p>Перенаправление...</p>
      <v-progress-circular
          indeterminate
          color="primary"
          class="mt-2"
      />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'RedirectProcess',
  /**
   * Хук жизненного цикла: выполняется после монтирования компонента в DOM
   * Устанавливает таймер для перенаправления на страницу документации Bitrix24 API
   * @lifecycle
   */
  mounted() {
    // Устанавливаем таймер для перенаправления через 3 секунды
    setTimeout(() => {
      // Выполняем перенаправление на страницу документации API Bitrix24
      window.location.href = 'https://apidocs.bitrix24.ru/api-reference/';
    }, 3000);
  }
}
</script>

<style scoped>
.redirect-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0;
  text-align: center;
}
</style>

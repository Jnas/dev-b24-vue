<!--
  Example4MeowFact.vue - Компонент для отображения случайных фактов о кошках

  Компонент отображает случайный факт о кошках, загружаемый с внешнего API.
  Предоставляет кнопку для обновления факта.

  Функциональность:
  - Загрузка факта при монтировании компонента
  - Обновление факта по нажатию кнопки
  - Отображение состояния загрузки
  - Обработка и отображение ошибок

  Использует:
  - Внешний API: https://meowfacts.herokuapp.com/
  - Компонент AppLoader для отображения состояния загрузки
  - Vuetify компоненты для UI
-->
<template>
  <v-card class="ma-4 pa-4" elevation="2">
    <v-card-title>Факт о кошках</v-card-title>
    <v-card-text>
      <AppLoader isclass v-if="loading"/>
      <template v-else>
        <div v-if="fact">{{ fact }}</div>
        <div v-else class="text-error">{{ error }}</div>
      </template>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" @click="fetchFact">Обновить факт</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {api} from "../../../dev/api.ts";
import AppLoader from "@/shared/components/AppLoader.vue";

// Интерфейс для типизации ответа от API с фактами о кошках
interface MeowApiResponse {
  data: string[];
}

// Состояния компонента
const loading = ref(false);      // Флаг состояния загрузки
const fact = ref<string | null>(null);  // Текущий отображаемый факт
const error = ref<string | null>(null); // Сообщение об ошибке, если загрузка не удалась

/**
 * Загружает случайный факт о кошках с внешнего API
 * Обновляет состояние компонента в зависимости от результата запроса
 */
async function fetchFact() {
  loading.value = true;
  try {
    // Выполняем запрос к API для получения факта
    const response = await api().methods.axios.get<MeowApiResponse>(
        'https://meowfacts.herokuapp.com/'
    );

    // @ts-ignore - Игнорируем предупреждение о типе, так как структура ответа известна
    const facts = response.data.data;
    fact.value = facts.length > 0 ? facts[0] : null;

    // Обрабатываем случай, когда факт не был получен
    if (!fact.value) {
      error.value = 'Не удалось получить факт о кошках';
    } else {
      error.value = null;
    }
  } catch (e) {
    // Обрабатываем ошибки при загрузке
    error.value = 'Ошибка при загрузке факта';
    fact.value = null;
  } finally {
    loading.value = false;
  }
}

// Загружаем факт при монтировании компонента
fetchFact();
</script>
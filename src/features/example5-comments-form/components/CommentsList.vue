<!-- components/CommentsList.vue -->
<!--
  CommentsList.vue - Компонент для отображения списка комментариев с пагинацией

  Компонент отображает список комментариев с возможностью постраничного просмотра.
  Комментарии сортируются по убыванию времени (новые сверху).

  Пропсы:
  - comments: Ref<CommentType[]> - реактивная ссылка на массив комментариев
  - itemsPerPage: number - количество комментариев на странице
-->
<template>
  <div class="comments-container">
    <!-- Список комментариев -->
    <v-list class="comments-list">
      <!-- Отображение каждого комментария -->
      <v-list-item
          v-for="comment in displayedComments"
          :key="comment.userId + comment.timestamp"
          class="comment-item"
      >
        <!-- Аватар пользователя -->
        <template v-slot:prepend>
          <v-avatar size="40">
            <v-img :src="comment.avatar" :alt="comment.username"></v-img>
          </v-avatar>
        </template>

        <!-- Содержимое комментария -->
        <div class="w-100">
          <!-- Шапка комментария с именем и временем -->
          <div class="d-flex justify-space-between align-center">
            <div class="font-weight-bold">{{ comment.username }}</div>
            <div class="text-caption text-grey time-badge">
              {{ formatTime(comment.timestamp) }}
              <!-- Всплывающая подсказка с полной датой -->
              <v-tooltip activator="parent" location="top">
                {{
                  new Date(comment.timestamp).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }}
              </v-tooltip>
            </div>
          </div>

          <!-- Текст комментария -->
          <div class="comment-text mt-1">{{ comment.text }}</div>
        </div>
      </v-list-item>

      <!-- Сообщение, если комментариев нет -->
      <v-list-item v-if="reversedComments.length === 0" class="text-center py-8">
        <v-list-item-title class="text-grey">Нет комментариев</v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Пагинация (отображается, если страниц больше одной) -->
    <div class="pagination-container mt-4" v-if="totalPages > 1">
      <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          rounded="circle"
          active-color="primary"
          @update:model-value="handlePageChange"
      ></v-pagination>

      <div class="text-center mt-2 text-grey">
        Страница {{ currentPage }} из {{ totalPages }} • Всего комментариев: {{ reversedComments.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, type Ref, ref, watch} from 'vue';
import type {CommentType} from "@/features/example-dev-comments-form/types/types.js";

// Пропсы компонента
const props = defineProps<{
  comments: Ref<CommentType[]>;  // Реактивный массив комментариев
  itemsPerPage: number;          // Количество комментариев на странице
}>();

// Текущая страница пагинации
const currentPage = ref(1);

/**
 * Возвращает массив комментариев, отсортированных по убыванию времени (новые сверху)
 */
const reversedComments = computed(() => {
  return [...props.comments.value].sort((a, b) => b.timestamp - a.timestamp);
});

/**
 * Вычисляет общее количество страниц на основе количества комментариев
 */
const totalPages = computed(() => {
  return Math.ceil(reversedComments.value.length / props.itemsPerPage);
});

/**
 * Возвращает подмассив комментариев для текущей страницы
 */
const displayedComments = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  const end = start + props.itemsPerPage;
  return reversedComments.value.slice(start, end);
});

/**
 * Форматирует временную метку в читаемый формат (например, "2 часа назад")
 * @param {number} timestamp - Временная метка в миллисекундах
 * @returns {string} Отформатированная строка времени
 */
const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 10) {
    return 'только что';
  } else if (seconds < 60) {
    return `${seconds} сек. назад`;
  } else if (minutes < 60) {
    return `${minutes} мин. назад`;
  } else if (hours < 24) {
    return `${hours} ч. назад`;
  } else if (days < 7) {
    return `${days} дн. назад`;
  } else if (weeks < 4) {
    return `${weeks} нед. назад`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

// Сброс на первую страницу при изменении списка комментариев
watch(() => props.comments.value.length, () => {
  currentPage.value = 1;
});

// Обработчик изменения страницы
const handlePageChange = (newPage: number) => {
  currentPage.value = newPage;
  // Прокрутка к началу списка при смене страницы
  const container = document.querySelector('.comments-container');
  container?.scrollTo({top: 0, behavior: 'smooth'});
};
</script>

<style scoped>
.comments-list {
  max-width: 800px;
  margin: 0 auto;
}

.comment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px 0;
  transition: background-color 0.2s;
}

.comment-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.comment-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.time-badge {
  cursor: help;
  transition: opacity 0.2s;
}

.time-badge:hover {
  opacity: 0.8;
}

.pagination-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
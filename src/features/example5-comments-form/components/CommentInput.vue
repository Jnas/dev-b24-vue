<!-- components/CommentInput.vue -->
<!--
  CommentInput.vue - Компонент для ввода нового комментария

  Компонент предоставляет текстовое поле для ввода комментария с возможностью
  отправки по нажатию кнопки или комбинации клавиш Ctrl+Enter.

  Пропсы:
  - avatar: string - URL аватара текущего пользователя
  - loading?: boolean - флаг загрузки (опциональный)
  - currentUser?: string - имя текущего пользователя (опциональное)
  - reset: boolean - флаг сброса текста комментария

  События:
  - submit - генерируется при отправке комментария
-->
<template>
  <div class="comment-input-container pa-4">
    <v-sheet rounded="lg" elevation="1" class="pa-3">
      <v-row align="start" no-gutters>
        <!-- Аватар пользователя -->
        <v-col cols="auto" class="pr-3">
          <v-avatar size="40">
            <v-img :src="avatar" :alt="currentUser"></v-img>
          </v-avatar>
        </v-col>

        <!-- Поле ввода и кнопка отправки -->
        <v-col>
          <!-- Поле для ввода текста комментария -->
          <v-textarea
              v-model="commentText"
              :disabled="loading"
              label="Напишите комментарий..."
              placeholder="Введите ваш комментарий здесь"
              rows="3"
              auto-grow
              clearable
              hide-details="auto"
              :class="{ 'loading-overlay': loading }"
              @keydown.enter.ctrl="handleSubmit"
          ></v-textarea>

          <!-- Панель с кнопкой отправки -->
          <div class="d-flex justify-end mt-2">
            <!-- Индикатор загрузки -->
            <v-progress-linear
                v-if="loading"
                indeterminate
                color="primary"
                class="loading-indicator"
            ></v-progress-linear>

            <!-- Кнопка отправки комментария -->
            <v-btn
                color="primary"
                :loading="loading"
                :disabled="loading || !commentText.trim()"
                @click="handleSubmit"
            >
              <v-icon start icon="mdi-send"></v-icon>
              Отправить
            </v-btn>
          </div>

          <!-- Подсказка по горячим клавишам -->
          <div v-if="!loading" class="text-caption text-grey mt-1 d-flex justify-end">
            Нажмите Ctrl+Enter для отправки
          </div>
        </v-col>
      </v-row>
    </v-sheet>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';

// Определение пропсов компонента
const props = defineProps<{
  avatar: string;       // URL аватара пользователя
  loading?: boolean;    // Флаг загрузки (опциональный)
  currentUser?: string; // Имя текущего пользователя (опциональное)
  reset: boolean        // Флаг сброса текста комментария
}>();

// Следим за изменением флага сброса и очищаем поле ввода
watch(() => props.reset, () => {
  commentText.value = ''
})

// Определение событий компонента
const emit = defineEmits<{
  (e: 'submit', text: string): void;  // Событие отправки комментария
}>();

// Реактивная ссылка на текст комментария
const commentText = ref('');

// Вычисляемое свойство для проверки валидности комментария
const isValid = computed(() => {
  return commentText.value.trim().length > 0;
});

/**
 * Обработчик отправки комментария
 * Вызывает событие submit с текстом комментария, если он не пустой
 */
const handleSubmit = () => {
  if (isValid.value && !props.loading) {
    const trimmedText = commentText.value.trim();
    emit('submit', trimmedText);
  }
};
</script>

<style scoped>
/* Контейнер компонента */
.comment-input-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Стиль для состояния загрузки */
.loading-overlay {
  opacity: 0.7;
  pointer-events: none;
  user-select: none;
}

/* Стиль для индикатора загрузки */
.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  border-radius: 4px;
}
</style>
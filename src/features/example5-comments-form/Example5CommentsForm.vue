<template>
  <!-- Основной контейнер компонента -->
  <div class="comments-form-container">
    <!-- Индикатор загрузки при начальной загрузке данных -->
    <AppLoader v-if="isInitialLoading"/>

    <!-- Блок отображения ошибок -->
    <div v-else-if="errorMessage" class="error-message pa-4">
      <v-alert type="error" prominent>
        {{ errorMessage }}
        <!-- Кнопка для повторной попытки загрузки данных -->
        <v-btn color="primary" class="ml-2" @click="retryLoad">Повторить попытку</v-btn>
      </v-alert>
    </div>

    <!-- Основной контент после загрузки -->
    <div v-else>
      <!-- Компонент ввода нового комментария -->
      <CommentInput
          :avatar="commentManager.currentUserAvatar"
          :loading="isAddingComment"
          :current-user="commentManager.currentUserName"
          @submit="onSubmit"
          :reset="resetText"
      />

      <!-- Компонент отображения списка комментариев -->
      <CommentsList
          :comments="commentManager.comments"
          :items-per-page="5"
          :loading="isLoadingComments"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import AppLoader from "@/shared/components/AppLoader.vue";
import CommentsList from "@/features/example5-comments-form/components/CommentsList.vue";
import CommentInput from "@/features/example5-comments-form/components/CommentInput.vue";
import CommentManager from "@/features/example5-comments-form/managers/CommentManager.ts";

// Состояния компонента
const isInitialLoading = ref(true); // Флаг начальной загрузки данных
const isAddingComment = ref(false); // Флаг процесса добавления комментария
const isLoadingComments = ref(false); // Флаг загрузки списка комментариев
const resetText = ref(false); // Флаг для сброса поля ввода
const errorMessage = ref<string | null>(null); // Сообщение об ошибке

/**
 * Менеджер комментариев - основной класс для работы с комментариями
 * Инкапсулирует логику работы с API и управление состоянием комментариев
 */
// Конфигурация компонента
const config = {
  // ID типа сущности CRM
  entityTypeId: 1288,
  // ID шаблона бизнес-процесса
  bizprocTemplateId: 1915
}


// Инициализация менеджера комментариев с переданными параметрами
const commentManager = new CommentManager(config.entityTypeId, config.bizprocTemplateId);

/**
 * Загружает данные для формы комментариев
 */
const loadData = async () => {
  try {
    errorMessage.value = null;
    isInitialLoading.value = true;
    isLoadingComments.value = true;

    await commentManager.initialize();
  } catch  {
    console.error('Ошибка при загрузке данных');
    errorMessage.value = 'Не удалось загрузить комментарии. Пожалуйста, попробуйте позже.';
  } finally {
    isInitialLoading.value = false;
    isLoadingComments.value = false;
  }
};

/**
 * Повторная попытка загрузки данных
 */
const retryLoad = () => {
  loadData();
};

/**
 * Обработчик отправки нового комментария
 * @param {string} text - Текст комментария
 */
const onSubmit = async (text: string) => {
  if (!text.trim()) return;

  isAddingComment.value = true;

  try {
    const success = await commentManager.addComment(text);
    if (success) {
      // Инвертируем флаг сброса, чтобы очистить поле ввода
      resetText.value = !resetText.value;
    } else {
      errorMessage.value = 'Не удалось добавить комментарий. Пожалуйста, попробуйте снова.';
    }
  } catch {
    console.error('Ошибка при отправке комментария');
    errorMessage.value = 'Произошла ошибка при отправке комментария.';
  } finally {
    isAddingComment.value = false;
  }
};

/**
 * Хук жизненного цикла: вызывается при монтировании компонента
 * Инициирует загрузку данных при первом рендеринге
 */
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.comments-form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.error-message {
  background-color: #ffebee;
  border-radius: 8px;
  margin-bottom: 20px;
}
</style>
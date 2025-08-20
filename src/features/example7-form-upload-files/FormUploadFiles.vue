<!--
  FormUploadFiles.vue - Компонент для загрузки файлов в CRM
  
  Компонент предоставляет функциональность загрузки и управления файлами
  с интеграцией в Bitrix24 CRM. Поддерживает множественную загрузку,
  отображение прогресса загрузки и удаление загруженных файлов.
  
  Основная функциональность:
  - Загрузка одного или нескольких файлов
  - Удаление загруженных файлов
  - Интеграция с полями сущностей CRM
  
  Используемые технологии:
  - Vue.js 3 Composition API
  - Vuetify 3 для UI компонентов
  - Bitrix24 API для работы с файлами
-->
<template>
  <div>
    <v-file-input
        :model-value="allFiles"
        @update:model-value="handleFileAdd"
        label="Прикрепите файлы"
        multiple
        chips
        placeholder="Выберите файлы"
        prepend-icon="mdi-paperclip"
        counter
        hide-details="auto"
        :clearable="false"
    >
      <template #selection>
        <v-chip
            v-for="(file, index) in allFiles"
            :key="fileKey(file, index)"
            size="small"
            class="ma-1"
            label
            variant="flat"
            :color="manager.isUploadedFile(file) ? 'success' : 'grey-lighten-1'"
        >
          <template #prepend>
            <div v-if="!manager.isUploadedFile(file)">
              <v-progress-circular
                  indeterminate
                  size="20"
                  class="mr-2 ml-0 pl-0"
              />
            </div>
          </template>
          {{ file.name }}
          <v-icon
              v-if="manager.isUploadedFile(file)"
              size="x-small"
              class="ml-1 cursor-pointer"
              @click.stop="removeFile(file)"
          >
            mdi-close
          </v-icon>
        </v-chip>
      </template>
    </v-file-input>
  </div>
</template>

<script setup lang="ts">
/**
 * Импорты компонентов и утилит
 */
import {computed, onMounted, onUnmounted, watch} from 'vue';
import type {FileWithCustomProps, UploadedFileType} from "@/features/example7-form-upload-files/types/types.ts";
import {FileUploadManager} from "@/features/example7-form-upload-files/managers/FileUploadManager.ts";

// Инициализация менеджера загрузки файлов
const manager = new FileUploadManager();

// Флаг монтирования компонента для предотвращения утечек памяти
let isMounted = true;

/**
 * Lifecycle hook: mounted
 *
 * Выполняется после монтирования компонента.
 * Инициализирует менеджер загрузки файлов и устанавливает значение поля пользователя.
 */
onMounted(async () => {
  isMounted = true;
  await manager.initialize();
  manager.setUserFieldValue();
});

/**
 * Lifecycle hook: unmounted
 *
 * Выполняется после размонтирования компонента.
 * Сбрасывает флаг монтирования для предотвращения утечек памяти.
 */
onUnmounted(() => {
  isMounted = false;
});

/**
 * Вычисляемые свойства
 */

/**
 * Получает список всех файлов из менеджера
 * @type {ComputedRef<FileWithCustomProps[]>}
 */
const allFiles = computed<FileWithCustomProps[]>(() => manager.files);

/**
 * Обработчики событий
 */

/**
 * Обрабатывает добавление новых файлов
 * @param {File|File[]|null} files - Файлы для добавления
 */
const handleFileAdd = (files: File | File[] | null) => {
  if (!isMounted) return;
  const filesArray = Array.isArray(files) ? files : files ? [files] : null;
  manager.addFiles(filesArray);
};

/**
 * Удаляет файл из списка
 * @param {File} file - Файл для удаления
 */
const removeFile = (file: File) => {
  if (!isMounted) return;
  if ('id' in file && manager.isUploadedFile(file as FileWithCustomProps)) {
    manager.removeFile(file as FileWithCustomProps & UploadedFileType);
  }
  // Обновляем значение поля бизнес-процесса, передавая актуальный список ID загруженных файлов
  // Если файл был удален, он автоматически исключается из списка
  manager.setUserFieldValue();
};

/**
 * Проверяет, идет ли в данный момент загрузка файлов
 * Используется для отображения состояния загрузки и блокировки интерфейса
 * @type {ComputedRef<boolean>}
 */
const isLoading = computed(() => {
  return allFiles.value.some(file => !file.isUploaded);
});

/**
 * Watcher: isLoading
 *
 * Следит за изменением свойства isLoading и устанавливает значение поля пользователя.
 */
watch(isLoading, (value) => {
  // TODO тут мы устанавливаем значение в форму, когда идет загрузка устанавливаем null и тогда Бизнес-процесс сбросит считает, что данное поле не заполнено, иначе устанавливаем в поле все загруженные файлы
  manager.setUserFieldValue(value ? null : undefined);
})

/**
 * Генерирует уникальный ключ для файла
 * Используется Vue для эффективного обновления списка файлов в v-for
 * @param {File} file - Файл
 * @param {number} index - Индекс файла в списке (используется как fallback)
 * @returns {string} Уникальный ключ в формате 'file-{type}-{id}'
 */
const fileKey = (file: File, index: number) => {
  if (manager.isLocalFile(file as FileWithCustomProps)) {
    return `file-local-${(file as FileWithCustomProps & { tempId: string }).tempId}`;
  }
  // Проверяем наличие id через менеджер
  else if (manager.isUploadedFile(file as FileWithCustomProps)) {
    return `file-uploaded-${(file as FileWithCustomProps & UploadedFileType).id}`;
  }
  return `file-new-${index}`;
};
</script>
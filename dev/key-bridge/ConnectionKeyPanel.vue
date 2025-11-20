<template>
  <div>
    <!-- Основная панель управления подключением -->
    <v-card
        v-if="showPanel"
        class="connection-key-panel"
        elevation="2"
        style="position: fixed; bottom: 16px; right: 16px; z-index: 1000; max-width: 400px;"
    >
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Подключение KeyBridge</span>
        <!-- Кнопка закрытия панели -->
        <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closePanel"
            :disabled="isLoading"
        />
      </v-card-title>

      <v-card-text>
        <!-- Поле ввода ключа подключения -->
        <v-text-field
            v-model="keyInput"
            label="Ключ подключения"
            placeholder="Введите ключ подключения"
            variant="outlined"
            density="compact"
            :error-messages="displayError"
            :loading="isLoading"
            @keyup.enter="saveKey"
            @input="clearTemporaryError"
        />

        <!-- Дополнительная информация при активном подключении -->
        <template v-if="isConnected || isLoading">
          <v-divider class="my-4"/>

          <!-- Статус подключения -->
          <v-alert
              :type="connectionStatus.type"
              variant="tonal"
              class="mt-3"
          >
            <div class="d-flex align-center">
              <v-icon
                  size="20"
                  :color="connectionStatus.color"
                  class="mr-2"
                  :class="{ 'rotating-icon': connectionStatus.isRunning }"
              >
                {{ connectionStatus.icon }}
              </v-icon>
              <div>
                <div class="text-caption font-weight-medium">
                  {{ connectionStatus.text }}
                </div>
                <div v-if="isConnected" class="text-caption">
                  Интервал опроса: {{ pollRate }}мс
                </div>
                <div v-if="hasActiveOperations" class="text-caption mt-1">
                  Активные запросы: {{ activeCount }}
                </div>
              </div>
            </div>
          </v-alert>
        </template>

        <!-- Отображение временных ошибок (только текущей сессии) -->
        <v-alert v-if="temporaryError" type="error" variant="tonal" class="mt-3">
          {{ temporaryError }}
        </v-alert>
      </v-card-text>

      <!-- Кнопки действий -->
      <v-card-actions>
        <v-spacer/>
        <v-btn
            variant="text"
            @click="clearKey"
            :disabled="isLoading"
        >
          Очистить
        </v-btn>
        <v-btn
            color="primary"
            @click="saveKey"
            :disabled="!keyInput.trim() || isLoading"
            :loading="isLoading"
        >
          {{ isConnected ? 'Обновить ключ' : 'Подключить' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Компактная кнопка статуса (отображается когда панель скрыта) -->
    <v-btn
        v-else
        :color="statusColor"
        fab
        icon
        size="small"
        class="status-fab"
        @click="openPanel"
    >
      <!-- Динамическая иконка статуса -->
      <v-icon
          :icon="statusIcon"
          size="x-large"
          :class="{ 'rotating-icon': shouldRotate }"
      />
      <!-- Всплывающая подсказка с детальной информацией -->
      <v-tooltip activator="parent" location="top">
        {{ tooltipText }}
      </v-tooltip>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref } from 'vue';
import {keyBridgeClient} from './KeyBridgeClient.ts';

// Реактивные переменные состояния
const showPanel = ref(false);        // Видимость основной панели
const keyInput = ref('');            // Введенный ключ подключения
const isLoading = ref(false);        // Состояние загрузки (подключения)
const temporaryError = ref<string | null>(null); // Временная ошибка (только для текущей сессии)
const clientState = ref(keyBridgeClient.getState()); // Текущее состояние клиента
const hasRecentActivity = ref(false); // Флаг недавней активности (для оранжевого цвета)

/**
 * Инициализация компонента при монтировании
 * Восстанавливает сохраненный ключ и автоматически подключается
 */
onMounted(() => {
  // Проверяем наличие сохраненного ключа в localStorage
  const savedKey = localStorage.getItem('keybridge_connection_key');
  if (savedKey) {
    keyInput.value = savedKey;
    // Автоматически подключаемся через небольшой таймаут
    setTimeout(() => {
      if (!clientState.value.connected && savedKey) {
        saveKey();
      }
    }, 500);
  }

// Подписываемся на изменения состояния клиента
  const unsubscribe = keyBridgeClient.onStateChange((newState) => {
    const hadActiveOperations = hasActiveOperations.value;
    clientState.value = newState;

    // Если появились активные операции, включаем оранжевый индикатор
    if (!hadActiveOperations && hasActiveOperations.value) {
      hasRecentActivity.value = true;
      // Автоматически выключаем оранжевый индикатор через 1 секунду
      setTimeout(() => {
        hasRecentActivity.value = false;
      }, 1000);
    }

    // Автоматически очищаем временную ошибку при успешном подключении
    if (newState.connected && temporaryError.value) {
      temporaryError.value = null;
    }

    // Обрабатываем случай, когда сервер вернул ошибку 404
    if (newState.error?.includes('Сессия не найдена')) {
      // Очищаем невалидный ключ
      keyInput.value = '';
      localStorage.removeItem('keybridge_connection_key');
      temporaryError.value = newState.error;
    }
  });

  // Отписываемся при размонтировании компонента
  onUnmounted(() => {
    unsubscribe();
  });
});

// Вычисляемые свойства для удобства использования состояния

/**
 * Флаг активного подключения к серверу KeyBridge
 */
const isConnected = computed(() => clientState.value.connected);

/**
 * Текущий интервал опроса сервера в миллисекундах
 */
const pollRate = computed(() => clientState.value.queues.active);

/**
 * Текст последней ошибки подключения (из клиента)
 */
const clientError = computed(() => clientState.value.error);

/**
 * Отображаемая ошибка (приоритет у временной ошибки)
 */
const displayError = computed(() => temporaryError.value || clientError.value);

/**
 * Флаг наличия активных операций в очередях
 */
const hasActiveOperations = computed(() =>
    clientState.value.queues.pending > 0 ||
    clientState.value.queues.active > 0
);

/**
 * Общее количество активных запросов (ожидающие + выполняющиеся)
 */
const activeCount = computed(() =>
    clientState.value.queues.pending + clientState.value.queues.active
);

/**
 * Должна ли иконка вращаться (при активных операциях)
 */
const shouldRotate = computed(() =>
    hasActiveOperations.value
);

// ===== УНИФИЦИРОВАННЫЕ СТАТУСЫ =====

/**
 * Определяет иконку статуса в зависимости от состояния подключения
 */
const statusIcon = computed(() => {
  if (isLoading.value) return 'mdi-timer-sand';                     // Загрузка/подключение
  if (hasActiveOperations.value) return 'mdi-timer-sand';           // Активные запросы
  if (isConnected.value) return 'mdi-connection';                   // Просто подключено
  if (displayError.value) return 'mdi-alert-circle';                // Ошибка
  if (keyInput.value && !isConnected.value) return 'mdi-link-off';  // Ключ есть, но нет подключения
  return 'mdi-key-remove';                                          // Нет ключа
});

/**
 * Определяет цвет индикатора статуса
 */
const statusColor = computed(() => {
  if (hasRecentActivity.value) return 'warning';                    // Оранжевый (недавняя активность)
  if (isLoading.value) return 'primary';                            // Синий (загрузка)
  if (hasActiveOperations.value) return 'primary';                  // Синий (активные запросы)
  if (isConnected.value) return 'success';                          // Зеленый (просто подключено)
  if (displayError.value) return 'error';                           // Красный (ошибка)
  if (keyInput.value && !isConnected.value) return 'error';         // Красный (нет подключения)
  return 'grey';                                                    // Серый (нет ключа)
});

/**
 * Формирует текст всплывающей подсказки в зависимости от состояния
 */
const tooltipText = computed(() => {
  if (isLoading.value) return 'Подключение...';
  if (hasActiveOperations.value) return `Обмен данными... (${activeCount.value} активных)`;
  if (isConnected.value) return `Подключено • Интервал: ${pollRate.value}мс`;
  if (displayError.value) return `Ошибка: ${displayError.value}`;
  if (keyInput.value && !isConnected.value) return 'Соединение неактивно';
  return 'KeyBridge отключён';
});

/**
 * Детальный статус подключения для отображения в панели
 */
const connectionStatus = computed(() => {
  if (isLoading.value) {
    return {
      type: "warning" as const,
      color: "warning",
      icon: "mdi-timer-sand",
      text: "Подключение...",
      isRunning: true,
    };
  }

  if (hasActiveOperations.value) {
    return {
      type: "info" as const,
      color: "primary",
      icon: "mdi-timer-sand",
      text: `Обмен данными (${activeCount.value} активных)`,
      isRunning: true,
    };
  }

  if (isConnected.value) {
    return {
      type: "success" as const,
      color: "success",
      icon: "mdi-connection",
      text: "Подключение активно",
      isRunning: false,
    };
  }

  if (displayError.value) {
    return {
      type: "error" as const,
      color: "error",
      icon: "mdi-alert-circle",
      text: `Ошибка: ${displayError.value}`,
      isRunning: false,
    };
  }

  if (keyInput.value && !isConnected.value) {
    return {
      type: "error" as const,
      color: "error",
      icon: "mdi-link-off",
      text: "Соединение неактивно",
      isRunning: false,
    };
  }

  return {
    type: "info" as const,
    color: "grey",
    icon: "mdi-key-remove",
    text: "KeyBridge отключён",
    isRunning: false,
  };
});

/**
 * Открывает панель и очищает временные состояния
 */
const openPanel = () => {
  showPanel.value = true;
  temporaryError.value = null;
};

/**
 * Закрывает панель и очищает временные ошибки
 */
const closePanel = () => {
  showPanel.value = false;
  temporaryError.value = null;
};

/**
 * Очищает временную ошибку при вводе нового ключа
 */
const clearTemporaryError = () => {
  temporaryError.value = null;
};

/**
 * Сохраняет ключ подключения и устанавливает соединение
 * Вызывается при нажатии кнопки "Подключить" или Enter в поле ввода
 */
/**
 * Сохраняет ключ подключения и устанавливает соединение
 */
const saveKey = async () => {
  const key = keyInput.value.trim();
  if (!key) return;

  isLoading.value = true;
  temporaryError.value = null;

  try {
    // Устанавливаем ключ в клиенте KeyBridge
    await keyBridgeClient.setKey(key);

    // Сохраняем ключ в localStorage для автоматического подключения
    localStorage.setItem('keybridge_connection_key', key);

    // Если подключение успешно, скрываем панель через короткую задержку
    if (clientState.value.connected) {
      setTimeout(() => {
        showPanel.value = false;
      }, 1000);
    }
  } catch (err: unknown) {
    console.error('Ошибка подключения:', err);

    // Обрабатываем случай, когда ключ не найден на сервере
    if (err instanceof Error && err?.message === 'KEY_NOT_FOUND') {
      // Очищаем невалидный ключ
      keyInput.value = '';
      localStorage.removeItem('keybridge_connection_key');
      temporaryError.value = 'Сессия не найдена. Создайте ключ заново.';
    } else {
      temporaryError.value = 'Ошибка подключения';
    }
  } finally {
    isLoading.value = false;
  }
};

/**
 * Очищает ключ подключения и разрывает соединение
 */
const clearKey = () => {
  keyInput.value = '';
  temporaryError.value = null;
  keyBridgeClient.setKey(null);
  localStorage.removeItem('keybridge_connection_key');
};
</script>

<style scoped>
/* Стили для компактной кнопки статуса */
.status-fab {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.status-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

/* Анимация вращения для иконки синхронизации */
.rotating-icon {
  animation: rotate 1s linear infinite;
}

/* Keyframes для анимации вращения */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
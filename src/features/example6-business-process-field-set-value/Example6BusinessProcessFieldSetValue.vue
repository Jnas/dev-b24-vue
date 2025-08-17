<!--
Пример 6: Установка значения в пользовательское поле бизнес-процесса

Назначение:
Компонент позволяет программно заполнить значение пользовательского поля в бизнес-процессе Битрикс24.

Как это работает:
1. Вы создаете пользовательское поле с необходимым видом.
2. В конфигурации бизнес-процесса в элементе "Запрос доп. информации" выбираете созданное пользовательское поле
3. В настройках "Запрос доп. информации" поля отмечаете  как обязательное
4. При выполнении кода (например, при заполнения поля) значение сохраняется в это поле и запущенный Бизнес-процесс будет считать данное поле заполненным

ВАЖНЫЕ ОГРАНИЧЕНИЯ:
- Код работает ТОЛЬКО в контексте того пользовательского поля, в которое он встроен
- Нельзя изменить другие поля сущности, только текущее поле
- Метод setUserfieldValue() доступен только внутри пользовательского поля

Пример вызова: api().methods.setUserfieldValue("ваше значение");
-->
<template>
  <v-app>
    <v-main>
      <v-card style="background-color: #f8fafb">
        <v-card-title>
          Выберите фрукты
        </v-card-title>
        <!-- Выпадающий список для выбора фруктов -->
        <v-combobox
            v-model="selectedFruits"
            :items="availableFruits"
            label="Добавить фрукты"
            multiple
            clearable
            hide-details
        >
          <template #selection="{ item, index }">
            <v-chip
                size="small"
                closable
                color="success"
                variant="elevated"
                text-color="black"
                class="ma-1"
                @click:close="removeFruit(index)"
            >
              {{ item.value }}
            </v-chip>
          </template>
        </v-combobox>
      </v-card>
    </v-main>
  </v-app>
</template>

<script>
import {api} from "../../../dev/api.ts";

export default {
  data() {
    return {
      // Текущее значение выбранных фруктов
      // Хранится в формате массива строк: ['Яблоко', 'Банан', ...]
      selectedFruits: [],

      // Список доступных для выбора фруктов
      // Используется для отображения в выпадающем списке
      availableFruits: [
        'Яблоко', 'Банан', 'Апельсин', 'Киви',
        'Виноград', 'Груша', 'Ананас', 'Манго'
      ]
    };
  },

  /**
   * Хук жизненного цикла: вызывается при монтировании компонента
   * Восстанавливает ранее сохраненные значения из пользовательского поля
   */
  mounted() {
    // Получаем сохраненное значение из пользовательского поля
    // api().fields.placement.options.VALUE содержит текущее значение поля
    const rawValue = api()?.fields?.placement?.options?.VALUE;

    // Парсим и устанавливаем начальные значения
    this.selectedFruits = this.parseInitial(rawValue);
  },

  watch: {
    /**
     * Наблюдатель за изменением списка выбранных фруктов
     * Автоматически синхронизирует изменения с бизнес-процессом
     *
     * @param {Array} list - Новое значение списка выбранных фруктов
     */
    selectedFruits: {
      handler(list) {
        // Сохраняем в формате JSON-строки, если список не пустой
        // Или null, если список пустой (для сброса значения поля)
        api().methods.setUserfieldValue(
            list.length ? JSON.stringify(list) : null
        );
      },
      immediate: true // Вызывать обработчик сразу при инициализации
    }
  },

  methods: {
    /**
     * Удаляет фрукт из списка выбранных по индексу
     * @param {number} idx - Индекс удаляемого фрукта в массиве selectedFruits
     */
    removeFruit(idx) {
      this.selectedFruits.splice(idx, 1);
    },

    /**
     * Парсит начальное значение пользовательского поля
     * Обрабатывает различные форматы входящих данных
     *
     * @param {any} val - Входное значение из пользовательского поля
     * @returns {Array} - Нормализованный массив выбранных фруктов
     */
    parseInitial(val) {
      // Если значение отсутствует или пустое, возвращаем пустой массив
      if (!val) {
        return [];
      }

      // 1. Приводим значение к строке и декодируем HTML-сущности
      // (на случай, если значение было закодировано при сохранении)
      const str = String(val);
      const tempElement = document.createElement('textarea');
      tempElement.innerHTML = str;
      let decoded = tempElement.value;

      // Двойное декодирование на случай множественного экранирования
      tempElement.innerHTML = decoded;
      decoded = tempElement.value;

      // 2. Пытаемся распарсить значение как JSON-массив
      try {
        const parsedArray = JSON.parse(decoded);

        if (Array.isArray(parsedArray)) {
          return parsedArray
              // Оставляем только строковые значения
              .filter(item => typeof item === 'string')
              // Удаляем лишние пробелы
              .map(item => item.trim())
              // Оставляем только фрукты из списка доступных
              .filter(fruit => this.availableFruits.includes(fruit));
        }
      } catch (error) {
        // В случае ошибки парсинга (невалидный JSON) возвращаем пустой массив
        console.warn('Не удалось распарсить сохраненное значение:', error);
      }

      return [];
    }
  }
};
</script>
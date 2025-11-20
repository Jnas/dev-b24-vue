// utils/normalizeMockFiles.ts
import fs from 'fs';
import path from 'path';

/**
 * Скрипт для нормализации существующих моковых файлов
 * Преобразует пустые массивы [] в пустые объекты {} в параметрах
 */
function normalizeMockFiles() {
    const mockDir = path.join(process.cwd(), 'src', 'mock');

    if (!fs.existsSync(mockDir)) {
        console.log('Папка с моковыми данными не найдена');
        return;
    }

    const files = fs.readdirSync(mockDir);

    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(mockDir, file);
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                // Нормализуем параметры если это массив и он пустой
                if (content.params && Array.isArray(content.params) && content.params.length === 0) {
                    content.params = {};
                    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                }
            } catch (error) {
                console.error(`Ошибка при обработке файла ${file}:`, error);
            }
        }
    });

}
// Запуск если файл выполняется напрямую
if (require.main === module) {
    normalizeMockFiles();
}

export { normalizeMockFiles };
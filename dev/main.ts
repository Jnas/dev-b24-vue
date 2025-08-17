// /dev/main.ts
import { createApp } from 'vue'
import AppMount from '../src/AppMount.vue'
import vuetify from './vuetify'

async function setupDevTools(app: ReturnType<typeof createApp>) {
    const [{ default: Toast, useToast }] = await Promise.all([
        import('vue-toastification'),
        import('vue-toastification/dist/index.css')
    ])
    app.use(Toast, { icon: false })
    ;(window as any).Toast = useToast()

    const { default: Axios } = await import('axios')
    ;(window as any).Axios = Axios
}

function resolveContainer(target: string | Element): Element {
    if (typeof target === 'string') {
        const el = document.querySelector(target)
        if (!el) throw new Error(`Container not found: ${target}`)
        return el
    }
    return target
}

export async function initApp(container: string | Element = '#appMount') {
    try {
        const app = createApp(AppMount)
        app.use(vuetify)

        if (import.meta.env.DEV) {
            await setupDevTools(app)
        }

        app.mount(resolveContainer(container))
    } catch {
        console.error('Ошибка инициализации приложения')
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('#appMount')) {
            initApp()
        }
    })
}

// /dev/main.ts
import {createApp} from 'vue'
import AppMount from '../src/AppMount.vue'
import vuetify from './vuetify'

async function setupDevTools(app: ReturnType<typeof createApp>) {
    const {default: Toast, useToast} = await import('vue-toastification');
    if (import.meta.env.DEV) {
        import('vue-toastification/dist/index.css')
    }
    app.use(Toast, {icon: false})
    ;(window as unknown as { Toast: ReturnType<typeof useToast> }).Toast = useToast();

    const {default: Axios} = await import('axios')
    ;(window as unknown as { Axios: typeof Axios }).Axios = Axios;
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

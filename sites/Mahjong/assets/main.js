import { App } from './ui/app.js';
void new App().start().catch(error => {
    console.error(error);
    const root = document.querySelector('#app');
    if (root) {
        root.textContent = `アプリを開始できませんでした: ${error instanceof Error ? error.message : String(error)}`;
    }
});

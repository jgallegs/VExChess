// ============================================================
//  VEXCHESS · Ajustes — monta los controles de preferencias.
//  · Idioma: el <select> compartido de i18n (recarga al cambiar).
//  · Tema del tablero: lo construye theme.js solo, al encontrar
//    #theme-sw-list en la página. Aquí no hay nada que hacer.
// ============================================================
import { langSelectHTML, wireLangSelect } from './i18n.js';

const slot = document.getElementById('set-lang-slot');
if (slot) {
  slot.innerHTML = langSelectHTML('set-lang', 'set-select');
  wireLangSelect(document.getElementById('set-lang'));
}

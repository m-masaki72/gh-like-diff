import { getKeyboardNavScript } from './components/keyboard-nav.js';
import { getFileTreeScript } from './components/file-tree.js';
import { getSearchScript } from './components/search.js';
import { getThemeToggleScript } from './components/theme-toggle.js';
import { getVirtualScrollScript } from './components/virtual-scroll.js';
import { getToolbarScript } from './components/toolbar.js';
import { getContextExpandScript } from './components/context-expand.js';

export function getClientScripts(): string {
  return [
    getToolbarScript(),
    getFileTreeScript(),
    getKeyboardNavScript(),
    getSearchScript(),
    getThemeToggleScript(),
    getVirtualScrollScript(),
    getContextExpandScript(),
  ].join('\n');
}

import { getDomUtilsScript } from './components/dom-utils.js';
import { getKeyboardNavScript } from './components/keyboard-nav.js';
import { getFileTreeScript } from './components/file-tree.js';
import { getSearchScript } from './components/search.js';
import { getThemeToggleScript } from './components/theme-toggle.js';
import { getToolbarScript } from './components/toolbar.js';
import { getContextExpandScript } from './components/context-expand.js';
import { getSplitResizerScript } from './components/split-resizer.js';
import { getLineHighlightScript } from './components/line-highlight.js';
import { getLineMemoScript } from './components/line-memo.js';
import { getReviewProgressScript } from './components/review-progress.js';
import { getToastScript } from './components/toast.js';
import { getCommandPaletteScript } from './components/command-palette.js';
import { getMinimapScript } from './components/minimap.js';
import { getViewPrefsScript } from './components/view-prefs.js';

export function getClientScripts(): string {
  // dom-utils must come first: every other component calls window.__gld helpers it
  // defines at load time. view-prefs runs late so the elements it restores already exist.
  return [
    getDomUtilsScript(),
    getToastScript(),
    getToolbarScript(),
    getFileTreeScript(),
    getKeyboardNavScript(),
    getSearchScript(),
    getThemeToggleScript(),
    getContextExpandScript(),
    getSplitResizerScript(),
    getLineHighlightScript(),
    getLineMemoScript(),
    getReviewProgressScript(),
    getCommandPaletteScript(),
    getMinimapScript(),
    getViewPrefsScript(),
  ].join('\n');
}

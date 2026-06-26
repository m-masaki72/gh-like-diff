import { getKeyboardNavScript } from './components/keyboard-nav.js';
import { getFileTreeScript } from './components/file-tree.js';
import { getSearchScript } from './components/search.js';
import { getThemeToggleScript } from './components/theme-toggle.js';
import { getVirtualScrollScript } from './components/virtual-scroll.js';
import { getToolbarScript } from './components/toolbar.js';
import { getContextExpandScript } from './components/context-expand.js';
import { getSplitResizerScript } from './components/split-resizer.js';
import { getLineHighlightScript } from './components/line-highlight.js';
import { getLineMemoScript } from './components/line-memo.js';
import { getReviewProgressScript } from './components/review-progress.js';

export function getClientScripts(): string {
  return [
    getToolbarScript(),
    getFileTreeScript(),
    getKeyboardNavScript(),
    getSearchScript(),
    getThemeToggleScript(),
    getVirtualScrollScript(),
    getContextExpandScript(),
    getSplitResizerScript(),
    getLineHighlightScript(),
    getLineMemoScript(),
    getReviewProgressScript(),
  ].join('\n');
}

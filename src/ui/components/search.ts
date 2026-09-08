export function getSearchScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var highlights = [];
  var currentMatch = -1;
  var scope = 'all';

  function clearHighlights() {
    highlights.forEach(function(el) {
      var parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
      }
    });
    highlights = [];
    currentMatch = -1;
  }

  function rowMatchesScope(el) {
    if (scope === 'all') return true;
    var tr = el.closest('tr');
    if (!tr) return true;
    var cls = scope === 'add' ? 'gp-add' : 'gp-del';
    if (tr.classList.contains(cls)) return true;
    // Side-by-side keeps both sides on one row, so fall back to the cell's own marker.
    return el.classList.contains(cls) || !!el.closest('.' + cls);
  }

  function doSearch(query) {
    clearHighlights();
    if (!query) { updateCount(''); return; }

    // Only the visible view: the hidden one doubles every count and makes Enter a no-op.
    var codeEls = window.__gld.qa('.gp-code');
    var regex;
    try { regex = new RegExp(escapeRegex(query), 'gi'); } catch(e) { return; }

    codeEls.forEach(function(el) {
      if (!rowMatchesScope(el)) return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach(function(node) {
        if (node.parentNode && node.parentNode.classList &&
            node.parentNode.classList.contains('gp-prefix')) return;
        var text = node.textContent;
        regex.lastIndex = 0;
        if (!regex.test(text)) return;
        regex.lastIndex = 0;

        var frag = document.createDocumentFragment();
        var lastIdx = 0;
        var match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
          }
          var mark = document.createElement('mark');
          mark.className = 'gp-search-hit';
          mark.textContent = match[0];
          highlights.push(mark);
          frag.appendChild(mark);
          lastIdx = regex.lastIndex;
          if (match[0].length === 0) regex.lastIndex++;
        }
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }
        node.parentNode.replaceChild(frag, node);
      });
    });

    // Deliberately no scroll here: jumping on every keystroke threw the page around while
    // the user was still typing. Enter / Shift+Enter drive navigation instead.
    if (highlights.length > 0) currentMatch = 0;
    markCurrent();
    updateCount(query);
  }

  function markCurrent() {
    highlights.forEach(function(h, i) {
      h.classList.toggle('gp-search-hit-current', i === currentMatch);
    });
  }

  function scrollToMatch() {
    if (currentMatch < 0 || currentMatch >= highlights.length) return;
    markCurrent();
    window.__gld.scrollToElement(highlights[currentMatch], Math.round(window.innerHeight / 3));
  }

  function nextMatch() {
    if (highlights.length === 0) return;
    currentMatch = (currentMatch + 1) % highlights.length;
    scrollToMatch();
    updateCount();
  }

  function prevMatch() {
    if (highlights.length === 0) return;
    currentMatch = (currentMatch - 1 + highlights.length) % highlights.length;
    scrollToMatch();
    updateCount();
  }

  function currentQuery() {
    var input = document.querySelector('.gp-search input');
    return input ? input.value : '';
  }

  function updateCount(query) {
    var countEl = document.querySelector('.gp-search-count');
    if (!countEl) return;
    var q = query === undefined ? currentQuery() : query;
    if (!q) { countEl.textContent = ''; return; }
    countEl.textContent = highlights.length > 0
      ? (currentMatch + 1) + ' / ' + highlights.length
      : 'No results';
  }

  function escapeRegex(s) {
    return s.replace(new RegExp('[.*+?^$' + String.fromCharCode(123,125) + '()|\\\\[\\\\]\\\\\\\\]', 'g'), '\\\\$&');
  }

  var debounceTimer;
  window.__gld.openSearch = function() {
    var el = document.querySelector('.gp-search');
    if (!el) return;
    el.classList.add('open');
    var input = el.querySelector('input');
    if (!input) return;
    input.focus();
    input.select();
    // Re-run so the bar never shows a stale query with no highlights behind it.
    if (input.value) doSearch(input.value);
  };

  window.__gld.closeSearch = function() {
    var el = document.querySelector('.gp-search');
    if (el) el.classList.remove('open');
    clearHighlights();
    updateCount('');
  };

  window.__gld.searchIsOpen = function() {
    var el = document.querySelector('.gp-search');
    return !!el && el.classList.contains('open');
  };

  window.__gld.setSearchScope = function(next) {
    scope = next;
    document.querySelectorAll('.gp-search-scope button').forEach(function(b) {
      var on = b.dataset.scope === next;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    doSearch(currentQuery());
  };

  // Re-running on view switch keeps the highlight set aligned with what is on screen.
  window.__gld.refreshSearch = function() {
    if (window.__gld.searchIsOpen()) doSearch(currentQuery());
  };

  document.addEventListener('DOMContentLoaded', function() {
    var input = document.querySelector('.gp-search input');
    if (!input) return;

    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var q = input.value;
      debounceTimer = setTimeout(function() { doSearch(q); }, 200);
    });

    input.addEventListener('keydown', function(e) {
      // Enter also confirms an IME conversion; acting on it stole the candidate choice.
      if (window.__gld.composing(e)) return;
      if (e.key === 'Enter') {
        e.shiftKey ? prevMatch() : nextMatch();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        window.__gld.closeSearch();
        e.preventDefault();
      }
    });
  });
})();
`;
}

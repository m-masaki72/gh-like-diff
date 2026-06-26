export function getSearchScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};
  var highlights = [];
  var currentMatch = -1;

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
    updateCount();
  }

  function doSearch(query) {
    clearHighlights();
    if (!query) return;

    var codeEls = document.querySelectorAll('.gp-code');
    var regex;
    try { regex = new RegExp(escapeRegex(query), 'gi'); } catch(e) { return; }

    codeEls.forEach(function(el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach(function(node) {
        var text = node.textContent;
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
          mark.style.background = '#fff2b3';
          mark.style.borderRadius = '2px';
          mark.textContent = match[0];
          highlights.push(mark);
          frag.appendChild(mark);
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }
        node.parentNode.replaceChild(frag, node);
      });
    });

    if (highlights.length > 0) {
      currentMatch = 0;
      scrollToMatch();
    }
    updateCount();
  }

  function scrollToMatch() {
    if (currentMatch < 0 || currentMatch >= highlights.length) return;
    highlights.forEach(function(h, i) {
      h.style.background = i === currentMatch ? '#f9a825' : '#fff2b3';
    });
    highlights[currentMatch].scrollIntoView({ block: 'center', behavior: 'smooth' });
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

  function updateCount() {
    var countEl = document.querySelector('.gp-search-count');
    if (countEl) {
      countEl.textContent = highlights.length > 0
        ? (currentMatch + 1) + ' / ' + highlights.length
        : 'No results';
    }
  }

  function escapeRegex(s) {
    return s.replace(new RegExp('[.*+?^$' + String.fromCharCode(123,125) + '()|\\\\[\\\\]\\\\\\\\]', 'g'), '\\\\$&');
  }

  var debounceTimer;
  window.__gld.openSearch = function() {
    var el = document.querySelector('.gp-search');
    if (el) {
      el.classList.add('open');
      var input = el.querySelector('input');
      if (input) input.focus();
    }
  };

  window.__gld.closeSearch = function() {
    var el = document.querySelector('.gp-search');
    if (el) el.classList.remove('open');
    clearHighlights();
  };

  // Init search events
  document.addEventListener('DOMContentLoaded', function() {
    var input = document.querySelector('.gp-search input');
    if (!input) return;

    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      var q = input.value;
      debounceTimer = setTimeout(function() { doSearch(q); }, 200);
    });

    input.addEventListener('keydown', function(e) {
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

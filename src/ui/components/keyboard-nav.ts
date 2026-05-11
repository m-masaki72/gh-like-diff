export function getKeyboardNavScript(): string {
  return `
(function() {
  var currentFileIndex = -1;
  var fileElements = [];
  var sidebarItems = [];

  function init() {
    fileElements = Array.from(document.querySelectorAll('.gp-file'));
    sidebarItems = Array.from(document.querySelectorAll('.gp-file-item'));
  }

  function highlightFile(index) {
    if (index < 0 || index >= fileElements.length) return;
    currentFileIndex = index;

    // Update sidebar active state
    sidebarItems.forEach(function(item, i) {
      item.classList.toggle('active', i === index);
    });

    // Scroll file into view
    var el = fileElements[index];
    if (el) {
      var headerH = 82;
      var y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  function nextFile() {
    var next = Math.min(currentFileIndex + 1, fileElements.length - 1);
    highlightFile(next);
  }

  function prevFile() {
    var prev = Math.max(currentFileIndex - 1, 0);
    highlightFile(prev);
  }

  function nextHunk() {
    var hunks = document.querySelectorAll('.gp-hunk');
    var scrollTop = window.scrollY + 100;
    for (var i = 0; i < hunks.length; i++) {
      var rect = hunks[i].getBoundingClientRect();
      if (rect.top + window.scrollY > scrollTop) {
        window.scrollTo({ top: rect.top + window.scrollY - 90, behavior: 'smooth' });
        return;
      }
    }
  }

  function prevHunk() {
    var hunks = document.querySelectorAll('.gp-hunk');
    var scrollTop = window.scrollY - 10;
    for (var i = hunks.length - 1; i >= 0; i--) {
      var rect = hunks[i].getBoundingClientRect();
      if (rect.top + window.scrollY < scrollTop) {
        window.scrollTo({ top: rect.top + window.scrollY - 90, behavior: 'smooth' });
        return;
      }
    }
  }

  document.addEventListener('keydown', function(e) {
    // Don't capture when typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'j': nextFile(); e.preventDefault(); break;
      case 'k': prevFile(); e.preventDefault(); break;
      case 'n': nextHunk(); e.preventDefault(); break;
      case 'p': prevHunk(); e.preventDefault(); break;
      case '/':
        e.preventDefault();
        window.__gld.openSearch();
        break;
      case 'Escape':
        window.__gld.closeSearch();
        break;
      case 'b':
        window.__gld.toggleSidebar();
        e.preventDefault();
        break;
      case '?':
        window.__gld.toggleHelp();
        e.preventDefault();
        break;
    }
  });

  // Track scroll position to highlight current file
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var scrollTop = window.scrollY + 100;
        for (var i = fileElements.length - 1; i >= 0; i--) {
          if (fileElements[i].getBoundingClientRect().top + window.scrollY <= scrollTop) {
            if (currentFileIndex !== i) {
              currentFileIndex = i;
              sidebarItems.forEach(function(item, idx) {
                item.classList.toggle('active', idx === i);
              });
            }
            break;
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  });

  window.__gld = window.__gld || {};
  window.__gld.navFile = highlightFile;
  window.__gld.nextFile = nextFile;
  window.__gld.prevFile = prevFile;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

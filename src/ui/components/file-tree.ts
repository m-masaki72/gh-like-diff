// File tree sidebar is rendered server-side in renderer.ts
// This script handles sidebar toggle and filter

export function getFileTreeScript(): string {
  return `
(function() {
  window.__gld = window.__gld || {};

  window.__gld.toggleSidebar = function() {
    var sidebar = document.getElementById('gp-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
    }
  };
})();
`;
}

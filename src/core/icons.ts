/**
 * Icon sprite.
 *
 * The icons were inlined at every use site, which for a 50-file diff meant 409 copies of
 * 15 distinct shapes — 11% of the page, 160KB of it pure repetition. Defining each shape
 * once as a `<symbol>` and referencing it with `<use>` costs about 40 bytes per use
 * instead of 400.
 *
 * `<use href="#id">` is a same-document reference, so it works from `file://` with no
 * network access, and the shapes inherit `fill: currentColor` from the referencing
 * element exactly as the inline copies did.
 */
export const ICON_PATHS: Record<string, string> = {
  logo: '<path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75C0 1.784.784 1 1.75 1Zm0 1.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Zm9.22 3.72a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.14-.094l-1.25-1.75a.75.75 0 0 1 1.24-.844l.63.88 1.71-1.71a.75.75 0 0 1 1.06 0Z"/>',
  sun: '<path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0Zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Z"/>',
  moon: '<path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.22-7.832Z"/>',
  sidebar: '<path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"/>',
  wrap: '<path d="M1.75 3h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Zm0 4h9.5a2.75 2.75 0 0 1 0 5.5H9.56l.72.72a.75.75 0 1 1-1.06 1.06l-2-2a.75.75 0 0 1 0-1.06l2-2a.75.75 0 1 1 1.06 1.06l-.72.72h1.69a1.25 1.25 0 0 0 0-2.5h-9.5a.75.75 0 0 1 0-1.5Zm0 5.5h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z"/>',
  minimap: '<path d="M1.75 1h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Zm0 4h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5Zm0 4h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Zm0 4h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5ZM13 1.75a.75.75 0 0 1 1.5 0v12.5a.75.75 0 0 1-1.5 0Z"/>',
  memo: '<path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>',
  chevron: '<path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.94l3.72-3.72a.749.749 0 0 1 1.06 0Z"/>',
  copy: '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>',
  check: '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>',
  file: '<path d="M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5Zm5.75.56v2.19c0 .138.112.25.25.25h2.19ZM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25Z"/>',
  'tree-chevron': '<path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L10.19 8 6.22 4.03a.75.75 0 0 1 0-1.06Z"/>',
  folder: '<path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.5A1.75 1.75 0 0 1 16 4.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75c0-.464.184-.91.513-1.237Z"/>',
  'arrow-up': '<path d="M4.427 9.573a.25.25 0 0 0 .177.427h6.792a.25.25 0 0 0 .177-.427L8.177 6.177a.25.25 0 0 0-.354 0Z"/>',
  'arrow-down': '<path d="M4.427 6.427a.25.25 0 0 1 .177-.427h6.792a.25.25 0 0 1 .177.427L8.177 9.823a.25.25 0 0 1-.354 0Z"/>',
  'arrow-both': '<path d="M8.177 14.323l2.896-2.896a.25.25 0 0 0-.177-.427H8.75V5h2.146a.25.25 0 0 0 .177-.427L8.177 1.677a.25.25 0 0 0-.354 0L4.927 4.573a.25.25 0 0 0 .177.427H7.25v6h-2.146a.25.25 0 0 0-.177.427l2.896 2.896a.25.25 0 0 0 .354 0z"/>',
};

export interface IconOptions {
  className?: string;
  size?: number;
  /** Set when the icon carries meaning of its own rather than labelling a control. */
  title?: string;
  style?: string;
}

/**
 * A reference to a sprite symbol. Decorative by default — every icon here sits inside a
 * button that already has an accessible name, so announcing the shape as well is noise.
 */
export function icon(name: keyof typeof ICON_PATHS, options: IconOptions = {}): string {
  const { className, size = 16, title, style } = options;
  const attrs = [
    className ? ` class="${className}"` : '',
    ` width="${size}" height="${size}"`,
    style ? ` style="${style}"` : '',
    title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"',
  ].join('');
  return `<svg${attrs}><use href="#gp-i-${name}"/></svg>`;
}

/** Emitted once per page; every `icon()` call points at it. */
export function renderIconSprite(): string {
  const symbols = Object.entries(ICON_PATHS)
    .map(([name, path]) => `<symbol id="gp-i-${name}" viewBox="0 0 16 16" fill="currentColor">${path}</symbol>`)
    .join('');
  return `<svg class="gp-icon-sprite" aria-hidden="true" width="0" height="0">${symbols}</svg>`;
}

# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `git diff | gh-like-diff` reads a diff from stdin, and works outside a git repository.
- `--single-view` renders only the selected view for roughly half the output size. The
  in-page view toggle becomes a static label, since there is nothing to switch to.
- `.gh-like-diffrc` sets defaults for `style`, `colorScheme`, `context`, `ignore`,
  `singleView` and `noOpen`. The nearest file wins, falling back to `~/.gh-like-diffrc`;
  command-line flags always take precedence, and the path in use is printed. Options that
  select *what* to diff stay on the command line.
- Line wrapping toggle (`w`), minimap toggle (`m`), "next unreviewed file" (`u`), an
  unreviewed-only filter, a keyboard shortcut dialog (`?`), a state reset button, search
  scoped to added or deleted lines, Markdown memo export, and per-file "copy the new side".
- Markers for the two changes that are otherwise invisible: no trailing newline, and a
  line-ending difference between the two sides.
- Explanatory placeholders for binary, rename-only, mode-only and empty files, which
  previously rendered as blank cards.
- View preferences, theme, sidebar state and directory collapse are remembered per diff.

### Fixed
- `gh-like-diff HEAD~1` no longer ignores its refs when stdin is not a terminal. Stdin is
  redirected under CI, npm scripts, editor tasks and cron; treating that as piped input
  read an empty stdin and reported "No changes detected". Refs and `--staged` now win, and
  `-` forces reading stdin.
- Fully expanding a gap hides its now-stale `@@` header again: the expand row and the hunk
  row were labelled with different ids, so the lookup never matched.
- Marking a file viewed dims its sidebar entry again; the code toggled a class the
  stylesheet does not define.
- Files with more than 500 changed lines could not be opened at all: the placeholder called
  `window.__gld.renderFile`, which was never defined. Lazy loading is removed and every
  file is rendered up front.
- Search counted matches in the hidden view, roughly doubling every total and making Enter
  a no-op on alternate presses. All diff queries are now scoped to the visible view.
- Permalinks (`#diff-…`) did not scroll to the line, and memo badges appeared in only one
  view — same cause.
- Expanding context in one view hid the other view's hunk header, because the two views
  shared gap identifiers.
- Expand arrows now follow the GitHub convention and reveal lines contiguous with the
  adjacent hunk; every gap offers both directions plus "show all".
- Context expansion reads the revision the diff's "+" side refers to. It previously always
  read the working tree, so a historical range showed unrelated current code under
  plausible-looking line numbers.
- `Cmd/Ctrl+R`, `Cmd/Ctrl+P` and `Cmd/Ctrl+J` are no longer swallowed by the single-letter
  shortcuts, and shortcuts no longer fire while an IME conversion is in progress.
- Memos and review state are keyed on the diff itself rather than the repository name, so a
  second diff of the same repository no longer inherits notes onto unrelated lines.
- Deleted files show their real path instead of `/dev/null`, and no longer create a phantom
  `dev/` folder in the sidebar.
- The sidebar highlights the file actually being viewed; it previously matched by position
  although directories sort before sibling files.
- Changed lines keep their syntax highlighting under the word-diff marker, and the word diff
  no longer splits surrogate pairs, which corrupted emoji.
- Dark mode: file tag chips kept their light-mode background, leaving them at about 2:1
  contrast. Printing a dark page now uses the light palette, and long lines wrap instead of
  being clipped off the page.
- The toolbar wraps instead of pushing its right-hand controls off screen, and sticky
  offsets follow the real header height rather than a hard-coded 82px.
- Unified view keeps its line-number gutters visible while scrolling sideways.
- The minimap can be dismissed, no longer draws phantom bars from the hidden view, and
  redraws when the document height changes.
- Clipboard failures, missing expansion data and empty exports report themselves instead of
  doing nothing.
- Firefox restores form state across a reload, which left "Viewed" ticked after clearing
  storage; the restore now synchronises with the stored state.
- Safari dragged line numbers into copied text: `-webkit-user-select` was missing.
- The file collapse button exposes `aria-expanded`, the review progress bar reports its
  value, and the closed memo panel is out of the tab order.

### Performance
- Icons are defined once in an SVG sprite and referenced with `<use>`. They were inlined at
  every use site: a 50-file diff carried 409 copies of 15 distinct shapes, 11% of the page.
  That diff is now 1386KB instead of 1505KB.
- The embedded file sources used for context expansion are now capped by a total budget.
  Whole-file sources are expensive and highlighting them multiplies the cost again: twenty
  5000-line files with a one-line change each produced a 42MB page in 1.7s, and now produce
  4.5MB in 0.17s. Files that do not fit lose their expand controls, and the CLI says so.

### Changed
- Scrolling one side of a long line horizontally now scrolls the other side with it, so the
  two can be compared without lining them up by hand.

### Changed
- The full parsed diff is no longer embedded in the page. Nothing read it at runtime and it
  roughly doubled the output size.
- Expand controls are omitted when the file's source is not available, rather than rendered
  inert.
- Published packages no longer include source maps.

[Unreleased]: https://github.com/m-masaki72/gh-like-diff/compare/main...HEAD

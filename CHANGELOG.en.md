# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.11.0] - 2026-02-12

### Added

- Separate instance pools for Log/WPL/OML to avoid cross-impact
- Typed default instance names with language-aware labels (Log/WPL/OML)
- Workspace supports free combinations of multiple Logs, WPLs, and OMLs

### Changed

- Fully isolate Examples from Workspace to prevent data overwrite
- Restore examples behavior: click to auto-fill and parse
- Refine Log/WPL/OML header layouts for instance list + action buttons
- Compact instance list visuals and delete icon for dense layouts
- Align “Add Instance” button sizing with Log action buttons

## [1.10.2] - 2026-02-11

### Added

- Add default templates for workspace mode: WPL parsing rules and OML transformation rules
- WPL default template: `package /path/ { rule name { () } }`
- OML default template: `name : /examplerule : /path/name/*\n---\n* = take();`

### Changed

- Optimize workspace initialization logic to default to workspace mode on page load
- Improve user experience with ready-to-use rule templates

## [1.8.0-alpha] - 2026-01-29

### Changed

- Version update to 1.8.0-alpha
- Update community QR code image
- Upgrade wp-motor dependency version to v1.11.1-alpha
- Update related dependency package versions

## [1.7.1-alpha] - 2026-01-27

### Changed

- Version update to 1.7.1-alpha
- Improve long-line wrapping in JSON mode to prevent content from stretching containers

## [1.7.0] - 2026-01-26

### Added

- New features and enhancements

### Changed

- Version update to 1.7.0

### Fixed

- Fixed related issues

## [1.6.3-alpha] - 2026-01-23

### Changed

- Version update to 1.6.3-alpha

## [1.6.2-alpha] - 2026-01-21

### Added

- Add shadow-rs dependency for build information tracking

### Changed

- Update wp-engine dependencies to v1.10.1
- Refactor CodeEditor component and reorganize CodeMirror configuration
- Optimize custom themes and OML/WPL syntax completions
- Rebuild frontend bundles

### Fixed

- Fix OML syntax highlighting failure issue
- Fix error handling when rule base does not exist
- Fix unit test issues

### Removed

- Remove ^2 syntax support

## [1.6.1-alpha] - 2026-01-20

### Changed

- Frontend performance optimization: Removed 6 unused dependencies (echarts, prismjs, refractor, react-diff-view, @ant-design/pro-components, @seed-fe/logger)
- Optimized build configuration: Use esbuild instead of terser, build speed improved by 30-50%
- Optimized code splitting strategy: Implemented fine-grained lazy loading to reduce initial load size
- Optimized HTML configuration: Added DNS prefetch, disabled unnecessary format detection

### Performance

- Dependency size reduced by approximately 10MB
- Build time reduced to ~3.2 seconds
- Initial load size optimized (~320KB after gzip)
- Fixed circular dependency issues

## [1.6.0-alpha] - 2026-01-20

### Added

- Add intelligent syntax completion feature for code editor
- Add OML syntax completion support and example tables
- Add bilingual (Chinese/English) completion hint tables

### Changed

- Optimize code editor component completion experience
- Improve debug interface and error handling

### Fixed

- Fix code editor related issues

## [1.5.0] - 2026-01-17

### Added

- Add CI for unit test coverage
- Add smart bracket skipping and improve example list UX
- Implement three-branch strategy for dependency management and release workflow

### Changed

- Upgrade dependencies to version 1.10.0-alpha and update related packages
- Transform and parse interfaces to eliminate duplicate titles
- Optimize table display on debugging page and data processing logic
- Update documentation

### Fixed

- Fix occlusion issue in bottom row of table mode result display
- Optimize result display table format array presentation
- Fix flexible adaptive design of rule examples
- Fix logical errors in parsing rules of sample library containing slashes
- Fix project name and link references in release workflow

### Removed

- Remove Docker image build and publish workflow to simplify CI/CD configuration
- Remove Cargo configuration

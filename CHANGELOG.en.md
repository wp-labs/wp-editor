# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.17.2-alpha] - 2026-04-23

### Changed

- Unified version identifiers to `1.17.2` / `v1.17.2-alpha` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-alpha.json`)
- Upgrade wp-motor-related dependencies to v1.21.4
- Add the Chinese and English changelog entries for `1.17.2-alpha`
- Fix the grammatical errors caused by the oml formatting.

## [1.17.0-alpha] - 2026-04-16

### Changed

- Upgrade wp-motor dependency to v1.20.3
- Synchronize wp-motor-related dependency versions and source references in `Cargo.lock`
- Bump the locked `wp-lang` version to `0.1.10`

## [1.16.0-beta] - 2026-04-16

### Added

- Add a Prometheus metrics endpoint at `/metrics`

### Changed

- Merge changes from the `alpha` branch into `beta`
- Upgrade wp-motor dependency to v1.19.16
- Restore `Cargo.lock` and synchronize the dependency lock state for the beta release
- Update beta release manifest `dist/install-manifest-beta.json`, changing the release version to `v1.16.0-beta`
- Update WPL Tree-sitter highlight queries and `tree-sitter-wpl.wasm` assets to support the new syntax nodes
- Convert the OML transformation and example loading pipeline to async implementations, covering `debug_transform`, `debug_examples`, `oml_examples`, and `convert_record`

### Fixed

- Adapt to upstream API changes for `OMLCodeError`, `WparseReason`, `FieldQueryCache`, and related interfaces
- Fix recursive OML example loading and error propagation issues
- Fix `/metrics` log filtering to avoid polluting normal request logs

## [1.15.4-alpha] - 2026-04-08

### Changed

- Unified version identifiers to `1.15.4` / `v1.15.4-alpha` (synchronized in `Cargo.toml`, `version.txt`, and `dist/install-manifest-alpha.json`)
- Restore `web/package-lock.json` and adjust ignore rules so frontend dependency lock results are shipped with the release

## [1.15.3-alpha] - 2026-04-08

### Added

- Add a Prometheus metrics endpoint at `/metrics`

### Changed

- Assign stable metric names for Actix HTTP metrics
- Update access log filtering rules to exclude `/metrics`
- Adjust lockfile commit strategy by removing `Cargo.lock` and `web/package-lock.json`

## [1.15.2-alpha] - 2026-04-07

### Changed

- Unified version identifiers to `1.15.2` / `v1.15.2-alpha` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-alpha.json`)
- Refactor the README and update release process documentation, consolidating into a single bilingual document
- Optimize frontend chunk splitting and dev-time dependency pre-bundling to reduce fragmented requests during refresh
- Add tiered caching rules for static assets, distinguishing the entry page, hashed assets, and other static files

### Fixed

- Make unmatched `/api/*` routes return JSON 404 responses instead of falling back to the frontend page

### Performance

- Enable gzip/deflate compression by default to reduce frontend asset transfer size

### Removed

- Remove the standalone `README.en.md`

## [1.15.1-alpha] - 2026-04-03

### Changed

- Unified version identifiers to `1.15.1` / `v1.15.1-alpha` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-alpha.json`)

### Fixed

- Update `Cargo.lock` to synchronize the dependency lock state

## [1.15.0-alpha] - 2026-04-03

### Changed

- Unified version identifiers to `1.15.0` / `v1.15.0-alpha` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-alpha.json`)
- Upgrade wp-motor dependency to v1.19.16
- Switch `wp-lang` and `wp-knowledge` to standalone versioned dependencies to adapt to upstream package splitting
- Convert the OML transformation and example loading pipeline to async implementations, covering `debug_transform`, `debug_examples`, `oml_examples`, and `convert_record`

### Fixed

- Fix error propagation and `Future` handling in recursive OML example loading
- Adapt to import path changes for `OMLCodeError`, `WparseReason`, and related types
- Convert related integration tests and example tests to async and add the missing `await`

## [1.14.2] - 2026-04-07

### Changed

- Version update to 1.14.2
- Refactor the README and update release process documentation, consolidating into a single bilingual document
- Optimize frontend chunk splitting and dev-time dependency pre-bundling to reduce fragmented requests during refresh
- Add tiered caching rules for static assets, distinguishing the entry page, hashed assets, and other static files

### Fixed

- Make unmatched `/api/*` routes return JSON 404 responses instead of falling back to the frontend page

### Performance

- Enable gzip/deflate compression by default to reduce frontend asset transfer size

### Removed

- Remove the standalone `README.en.md`

## [1.14.2-beta] - 2026-04-07

### Changed

- Unified version identifiers to `1.14.2` / `v1.14.2-beta` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-beta.json`)
- Refactor the README and update release process documentation, consolidating into a single bilingual document
- Optimize frontend chunk splitting and dev-time dependency pre-bundling to reduce fragmented requests during refresh
- Add tiered caching rules for static assets, distinguishing the entry page, hashed assets, and other static files

### Fixed

- Make unmatched `/api/*` routes return JSON 404 responses instead of falling back to the frontend page

### Performance

- Enable gzip/deflate compression by default to reduce frontend asset transfer size

### Removed

- Remove the standalone `README.en.md`

## [1.14.1] - 2026-04-03

### Changed

- Version update to 1.14.1
- Fine-tune copy in `README.md` and `README.en.md`
- Update the stable release manifest `dist/install-manifest.json`

### Fixed

- Update `Cargo.lock` to synchronize the dependency lock state

## [1.14.1-beta] - 2026-04-03

### Changed

- Unified version identifiers to `1.14.1` / `v1.14.1-beta` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-beta.json`)

### Fixed

- Update `Cargo.lock` to synchronize the dependency lock state

## [1.14.0] - 2026-04-03

### Added

- Add `CONTRIBUTING.md` with contribution guidelines and collaboration instructions

### Changed

- Version update to 1.14.0
- Change the license from Elastic License 2.0 to Apache 2.0
- Refactor the README, add bilingual documentation, and align Chinese and English content
- Update the stable release manifest `dist/install-manifest.json`

### Removed

- Remove the Test Coverage badge and the usage guide and API documentation sections from the README

## [1.14.0-beta] - 2026-04-01

### Added

- Add one-click copy/paste support to the code editor

### Changed

- Unified version identifiers to `1.14.0` / `v1.14.0-beta` (synchronized in `Cargo.toml`, `Cargo.lock`, `version.txt`, and `dist/install-manifest-beta.json`)
- Upgrade wp-motor dependency to v1.18.3

### Fixed

- Fix abnormal `Tab` key behavior in the editor
- Add `Shift+Tab` support for reverse indentation

## [1.13.0-alpha] - 2026-03-12

### Changed

- Upgrade wp-motor dependency to v1.19.16
- Unified version identifiers to `1.13.0` / `v1.13.0-alpha` (synchronized in `Cargo.toml`, `Cargo.lock`, and `version.txt`)
- Updated alpha release manifest `dist/install-manifest-alpha.json`, changing the release marker from `v1.14.0-alpha` to `v1.13.0-alpha`
- Updated artifact filename mapping for:
  - `wp-editor-v1.13.0-alpha-aarch64-apple-darwin.tar.gz`
  - `wp-editor-v1.13.0-alpha-aarch64-unknown-linux-gnu.tar.gz`
  - `wp-editor-v1.13.0-alpha-x86_64-unknown-linux-gnu.tar.gz`
- Updated async call chains in `debug_examples` and `debug_transform` by adding missing `await`

### Fixed

- Fixed `oml_examples` directory recursion logic that treated a `Future` as a `Result`
- Fixed OML parse error propagation (`oml_parse(...).await?`)
- Fixed argument borrowing style for `oml_parse` by using a stable `parse_input` binding
- Updated related tests to async style and added missing `await` for OML example loading

## [1.13.0] - 2026-03-08

### Changed

- Version update to 1.13.0
- Upgrade wp-motor dependency to v1.18.0
- Upgrade `wp-connector-api`, `wp-parse-api`, `wp-error`, `wp-specs`, `wp-conf-base`, and `wp-log`

### Fixed

- Fix compilation errors after dependency upgrades by unifying `orion-error` to `0.6`
- Adapt `RawData` import path change (`wp_model_core::raw::RawData`)
- Adapt to the new `UvsReason::DataError` enum shape and fix error matching logic


## [1.12.2] - 2026-03-05

### Changed

- Version update to 1.12.2
- Upgrade wp-motor dependency to v1.17.8
- Improve OML Tree-sitter highlighting: function keywords, plain-argument regions, and fallback highlighting

## [1.12.1-alpha] - 2026-03-04

### Changed

- Version update to 1.12.1-alpha
- Upgrade wp-motor dependency version
- Make WPL formatting depend on tree-sitter
- Adjust OML formatting logic
- Make WPL highlighting depend on the tree-sitter-wpl repository
- Make OML highlighting depend on the tree-sitter-oml repository

## [1.12.0-alpha] - 2026-02-26

### Changed

- Version update to 1.12.0-alpha
- Optimize error message formatting
- Improve presentation of modified examples
- Sync engine grammar completion rules and examples
- Upgrade wp-motor dependency to v1.17.2-alpha

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

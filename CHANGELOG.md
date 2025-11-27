# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2025-11-27

### Fixed

- Fixed formatting issues that caused CI publish to fail

## [0.1.0] - 2025-11-27

### Added

- Initial release
- `SessionManager` class for framework-agnostic session management
- Cookie session extraction from HTTP requests
- Cookie session creation with Set-Cookie header generation
- Session refresh with updated `lastAccessed` timestamp
- Mobile Bearer token seal/unseal support
- Bearer token validation from Authorization headers
- Configurable cookie name, TTL, and logging
- Full test coverage

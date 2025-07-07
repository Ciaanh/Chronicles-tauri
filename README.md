# Chronicles

This application is intended for usage with the World of Warcraft Chronicles addon in order to manage the database of events, characters and factions of the Warcraft Universe.

## Features
- Manage events, characters, factions, and locales
- Export database for use with the Chronicles addon
- Modern UI built with React and Ant Design
- Cross-platform desktop app powered by Tauri

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)
- [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/)

### Install dependencies
```sh
npm install
```

### Development
```sh
npm run tauri dev
```

### Build for Production
```sh
npm run build
npm run tauri build
```
The installer will be in `src-tauri/target/release/bundle/`.

## Creating a Release
1. Ensure your code is committed and tagged (e.g., `v1.0.0`).
2. Build the app and locate the installer in the bundle directory.
3. [Create a release on GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) and upload the installer as an asset.

## License
See [LICENSE](./LICENSE).

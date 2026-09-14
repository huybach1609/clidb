# clidb

A sleek desktop CLI command manager built with Tauri v2 and React.

---

## Installation

### Arch Linux / Arch-based distributions (CachyOS, Manjaro, EndeavourOS)

You can install `clidb` using `makepkg` without needing the AUR. Choose one of the two options below:

#### Option 1: Fast installation from pre-compiled binary (`clidb-bin`, Recommended)
Installs in seconds. No need to install `rust`, `cargo`, or `bun`.

```bash
git clone https://github.com/huybach1609/clidb.git
cd clidb/packaging/clidb-bin
makepkg -si
```

#### Option 2: Compile from source (`clidb`)
Builds and compiles the source code locally on your machine. Requires `rust`, `cargo`, and `bun` installed.

```bash
git clone https://github.com/huybach1609/clidb.git
cd clidb/packaging/clidb
makepkg -si
```

#### Updating
To update to a newer release in the future:

```bash
git pull
# Run makepkg -sif in your preferred directory (packaging/clidb-bin or packaging/clidb)
makepkg -sif
```

#### Uninstalling
Since both packages register with `pacman`, remove them anytime with:

```bash
sudo pacman -R clidb
```

---

### Other Linux Distributions

* **AppImage**: Download `clidb_<version>_amd64.AppImage` from [GitHub Releases](https://github.com/huybach1609/clidb/releases), make it executable (`chmod +x`), and run.
* **Debian / Ubuntu**: Download and install `clidb_<version>_amd64.deb` from [GitHub Releases](https://github.com/huybach1609/clidb/releases):
  ```bash
  sudo dpkg -i clidb_<version>_amd64.deb
  ```

---

### macOS & Windows

Pre-built installers are available on the [Releases page](https://github.com/huybach1609/clidb/releases):
* **macOS**: `.dmg` or `.app.tar.gz` (Apple Silicon `aarch64`)
* **Windows**: `.msi` or `setup.exe` (x64)

---

## Development

### Prerequisites

* [Bun](https://bun.sh/)
* [Rust](https://www.rust-lang.org/)
* [Tauri CLI prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

### Setup

```bash
# Install frontend dependencies
bun install

# Run in development mode
bun run dev

# Run Tauri development window
bun tauri dev

# Build production bundle
bun tauri build
```

## License

[MIT](LICENSE)

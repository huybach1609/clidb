# Maintainer: huybach1609 <huybach1609@gmail.com>
pkgname=clidb
pkgver=0.1.4
pkgrel=1
pkgdesc="A sleek desktop CLI command manager built with Tauri v2 and React"
arch=('x86_64' 'aarch64')
url="https://github.com/huybach1609/clidb"
license=('MIT')
depends=(
  'webkit2gtk-4.1'
  'gtk3'
  'libsoup3'
  'openssl'
  'hicolor-icon-theme'
)
makedepends=(
  'cargo'
  'rust'
  'bun'
  'pkg-config'
)
options=('!lto')
source=("$pkgname-$pkgver.tar.gz::$url/archive/refs/tags/v$pkgver.tar.gz")
sha256sums=('ce2788fa8975373144b88915ec43b9873f44979bc95b2c41d597dcce16249b47')

build() {
  cd "$pkgname-$pkgver"
  bun install --frozen-lockfile
  bun tauri build --no-bundle
}

package() {
  cd "$pkgname-$pkgver"

  # Install binary executable
  install -Dm755 "src-tauri/target/release/clidb" "$pkgdir/usr/bin/clidb"

  # Install App Icon
  install -Dm644 "public/icon.png" "$pkgdir/usr/share/icons/hicolor/1024x1024/apps/clidb.png"

  # Install Desktop Entry launcher
  install -Dm644 /dev/stdin "$pkgdir/usr/share/applications/clidb.desktop" << END
[Desktop Entry]
Type=Application
Name=clidb
Comment=$pkgdesc
Exec=clidb
Icon=clidb
Terminal=false
Categories=Utility;Development;
END
}

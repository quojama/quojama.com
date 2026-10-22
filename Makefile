# VSS のバージョンは固定する（latest だと破壊的変更がそのまま本番に入るため）
# 上げるときは VSS_VERSION と VSS_SHA256_* を一緒に更新する
# （ハッシュは gh api repos/veltiosoft/vss/releases/tags/<版> -q '.assets[] | "\(.name) \(.digest)"' で見られる）
VSS_VERSION ?= v0.18.0
VSS_RELEASE_URL = https://github.com/veltiosoft/vss/releases/download/$(VSS_VERSION)
VSS_SHA256_LINUX_AMD64 ?= d1065558a73e454d457aa080d4fa73f7560f4b94e2daaf3668df1acd719ad2d3
VSS_SHA256_DARWIN_ARM64 ?= 065cb2c56ee82b27b0cd622cdc3c69ac39de2ea8e1cfa64ce19663af569c8a0f
VSS_SHA256_WINDOWS_AMD64 ?= 400e3f962187ab7389d90c767d96db92d2590db48d9b5d3139d607279041758c

.PHONY: clean setup setup-mac setup-win build build-win serve serve-win

clean:
	rm -rf ./vss_* ./vss

# for linux (CI)
setup: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_linux_amd64.tar.gz
	echo "$(VSS_SHA256_LINUX_AMD64)  vss_linux_amd64.tar.gz" | sha256sum -c -
	tar -xvf vss_linux_amd64.tar.gz
	chmod +x vss

# for macOS (Apple Silicon)
setup-mac: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_darwin_arm64.tar.gz
	echo "$(VSS_SHA256_DARWIN_ARM64)  vss_darwin_arm64.tar.gz" | shasum -a 256 -c -
	tar -xvf vss_darwin_arm64.tar.gz
	chmod +x vss

setup-win: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_windows_amd64.zip
	echo "$(VSS_SHA256_WINDOWS_AMD64)  vss_windows_amd64.zip" | sha256sum -c -
	unzip -o vss_windows_amd64.zip

build:
	./vss build

build-win:
	./vss.exe build

# http://localhost:8080 でプレビュー
serve:
	./vss serve

serve-win:
	./vss.exe serve

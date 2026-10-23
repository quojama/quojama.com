# VSS のバージョンは固定する（latest だと破壊的変更がそのまま本番に入るため）
# 上げるときは VSS_VERSION と VSS_SHA256_* を一緒に更新する
# （ハッシュは gh api repos/veltiosoft/vss/releases/tags/<版> -q '.assets[] | "\(.name) \(.digest)"' で見られる）
VSS_VERSION ?= v0.19.1
VSS_RELEASE_URL = https://github.com/veltiosoft/vss/releases/download/$(VSS_VERSION)
VSS_SHA256_LINUX_AMD64 ?= 8885e4403c9b298ad420c1580d9f4f2ad629f7cc662b71c7fc12b6caaccf1520
VSS_SHA256_DARWIN_ARM64 ?= 1b5e9fb13c7eaa5868d4e5e6c52c6454398860b6ec54c4f1e0626f49eb9d7faa
VSS_SHA256_WINDOWS_AMD64 ?= f83cbecb589b9dbf1a68324f582a7363c786032d52b7afbb12fe4e3bf1e3ae8e

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

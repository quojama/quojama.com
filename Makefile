# VSS のバージョンは固定する（latest だと破壊的変更がそのまま本番に入るため）
# 上げるときは VSS_VERSION と VSS_SHA256_LINUX_AMD64 を一緒に更新する
VSS_VERSION ?= v0.18.0
VSS_RELEASE_URL = https://github.com/veltiosoft/vss/releases/download/$(VSS_VERSION)
VSS_SHA256_LINUX_AMD64 ?= d1065558a73e454d457aa080d4fa73f7560f4b94e2daaf3668df1acd719ad2d3

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
	tar -xvf vss_darwin_arm64.tar.gz
	chmod +x vss

# for macOS (Intel)
setup-mac-intel: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_darwin_amd64.tar.gz
	tar -xvf vss_darwin_amd64.tar.gz
	chmod +x vss

setup-win: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_windows_amd64.zip
	unzip vss_windows_amd64.zip

build:
	./vss build

build-win:
	./vss.exe build

# http://localhost:8080 でプレビュー
serve:
	./vss serve

serve-win:
	./vss.exe serve

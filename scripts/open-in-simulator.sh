#!/bin/bash
# iOSシミュレーターでしおりを開く。
# 使い方: sh scripts/open-in-simulator.sh [URL]
# 事前に npm run preview -- --port 4173 (または npm run dev) を起動しておくこと。
set -e
URL="${1:-http://localhost:4173/}"
if ! xcrun simctl list devices | grep -q "(Booted)"; then
  UDID=$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/{gsub(/ /,"",$2); print $2; exit}')
  if [ -z "$UDID" ]; then
    echo "利用可能なiPhoneシミュレーターが見つかりません" >&2
    exit 1
  fi
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID"
fi
open -a Simulator
xcrun simctl openurl booted "$URL"
echo "opened: $URL"

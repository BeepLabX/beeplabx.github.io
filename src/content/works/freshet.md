---
title: Freshet
order: 4
kind: WINDOWS APP
summary: winget으로 Windows 앱을 골라서 업데이트하고, 실제로 적용됐는지 확인해 이력으로 남깁니다. 설치 없이 ZIP을 풀어 실행합니다.
url: https://github.com/BeepLabX/Freshet/releases/latest
download: true
note: Windows 10/11 x64 · Portable
features:
  - 선택 업데이트
  - 적용 여부 확인
  - 이력 · CSV
effect: freshet
theme:
  mode: dark
  bg: '#090c12'
  fg: '#f1f3f7'
  muted: '#9da7b8'
  accent: '#4c94ff'
---

## 하는 일

winget이 찾은 업데이트 목록에서 앱을 골라 차례로 업데이트합니다. 설치가 끝나면 버전을 다시 조회해 완료, 앱 재시작 필요, 적용 확인 안 됨, 실패로 나눠 기록합니다.

## 보류와 숨김

지금 올리지 않을 앱은 보류하거나 목록에서 숨깁니다. 이력은 CSV로 내보낼 수 있습니다.

## 받기

Windows 10/11 x64와 winget이 필요합니다. ZIP을 풀고 `Freshet.exe`를 실행합니다. .NET 런타임은 EXE에 들어 있고, 설치 등록이나 서비스를 만들지 않아서 폴더를 지우면 삭제됩니다. 서명이 없는 EXE라 처음 실행할 때 SmartScreen 경고가 뜰 수 있습니다.

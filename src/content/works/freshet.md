---
title: Freshet
order: 4
kind: WINDOWS APP
summary: winget 업데이트를 골라서 실행하고, 실제 적용 여부를 확인해 이력으로 기록. 설치 없는 포터블 ZIP.
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

winget 업데이트 목록에서 고른 앱만 차례로 업데이트. 설치 후 버전을 다시 조회해 완료, 앱 재시작 필요, 적용 확인 안 됨, 실패로 구분.

## 보류와 숨김

지금 올리지 않을 앱은 보류 또는 숨김. 이력은 CSV로 내보내기.

## 받기

Windows 10/11 x64, winget 필요. ZIP을 풀고 `Freshet.exe` 실행. .NET 런타임 포함, 설치 등록과 서비스 없음, 폴더 삭제로 제거. 서명 없는 EXE라 첫 실행 때 SmartScreen 경고 가능.

---
title: 용의 보물창고
subtitle: Dragon's Hoard Defense
order: 3
kind: TOWER DEFENSE
summary: 아기 용이 되어 보물 더미를 용사들에게서 지키는 3D 타워 디펜스입니다. 보물이 체력이자 건설 자금입니다.
url: https://dtd.beeplab.workers.dev/
features:
  - 스테이지 6개
  - 타워 6종
  - 시련의 탑
effect: hoard
theme:
  mode: dark
  bg: '#090c12'
  fg: '#f1f3f7'
  muted: '#9da7b8'
  accent: '#ffcf4a'
---

## 보물이 곧 체력

타워를 지으면 보물이 줄어듭니다. 적은 보물을 훔쳐 왔던 길로 달아나고, 달아나는 도둑을 잡으면 코인을 되찾습니다.

## 용과 타워

용은 브레스를 쏘고 대시로 공격을 피합니다. 패드 위에 멈춰 서면 타워가 지어집니다. 웨이브를 깨고 얻은 비늘로 아기 용을 고룡까지 진화시킵니다.

## 만든 방식

Three.js와 TypeScript로 만들었습니다. 모델은 코드로 생성한 로우폴리이고, 배경음악도 코드로 합성합니다. 게임 로직을 렌더링과 분리해 두어서, 봇에게 수백 판을 돌리게 하고 그 결과로 난이도를 맞췄습니다.

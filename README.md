# BeepLabX

Web, Apps, Games.

[Portfolio](https://beeplabx.github.io) · [GitHub](https://github.com/BeepLabX)

## Selected projects

| 프로젝트 | 소개 | 링크 |
| --- | --- | --- |
| **Totillu** | 모양·색·표정을 골라 캐릭터를 만드는 웹 앱 | [열기](https://totillu.beeplab.workers.dev/) |
| **Lamplighter** | 빛을 모아 거리의 등불을 켜는 브라우저 게임 | [플레이](https://lamp.beeplab.workers.dev/) |
| **용의 보물창고** | 아기 용이 보물 더미를 지키는 3D 타워 디펜스 | [플레이](https://dtd.beeplab.workers.dev/) |
| **Freshet** | winget으로 Windows 앱을 골라 업데이트하는 포터블 앱 | [ZIP 받기](https://github.com/BeepLabX/Freshet/releases/latest) |

## About this site

이 저장소는 [BeepLabX 포트폴리오](https://beeplabx.github.io)의 소스 코드입니다.

**Astro · TypeScript · CSS · Playwright**

프로젝트 소개는 Markdown 콘텐츠 컬렉션으로 관리합니다. 정적 사이트로 빌드하고, GitHub Actions에서 검사와 브라우저 테스트를 거쳐 GitHub Pages에 배포합니다.

<details>
<summary>로컬 실행 및 검사</summary>

Node.js 22.12 이상이 필요합니다.

```sh
npm ci
npm run dev
```

```sh
npm run check
npm run build
npx playwright install chromium
npm test
```

`npm run preview`로 빌드 결과를 확인할 수 있습니다.

</details>

## License

코드는 MIT 라이선스입니다. 콘텐츠, 이미지와 글꼴의 라이선스는 [LICENSE](LICENSE)를 참고하세요.

const githubUser = 'BeepLabX';

export const profile = {
  brand: 'BeepLabX',
  githubUser,

  // <id>.github.io 저장소 기준 주소. 커스텀 도메인을 쓰면 여기만 바꾸세요.
  siteUrl: `https://${githubUser.toLowerCase()}.github.io`,
  repoUrl: `https://github.com/${githubUser}/${githubUser.toLowerCase()}.github.io`,

  intro: 'BeepLabX 포트폴리오. Web, Apps, Games.',
} as const;

export const githubUrl = `https://github.com/${profile.githubUser}`;

---
title: 'base router 설정'
tags: ['BUGFIX', 'react', 'tanstack-router']
created date: '2025-09-04'
edited data: '2025-09-04'
---

<br/>

> [!NOTE]+ 환경
>
> \- React 19
> \- Vite
> \- Tanstack Router
> \- Vercel

<br/>

SPA 환경에서 TanStack Router를 사용하여 애플리케이션을 개발하던 중, 브라우저 주소창에 /myapp/xxx 와 같은 서브 경로를 직접 입력하면 404 오류가 발생하는 것을 확인하였습니다. 그러나 라우터 링크를 통해 내부 페이지로 이동하는 것은 정상적으로 동작하였습니다. 네트워크 요청을 확인해본 결과, 브라우저가 해당 경로에 실제 정적 파일이 존재하는지 확인하다가 찾지 못해 404를 반환하고 있음을 알게 되었습니다.

<br/>

공식 문서(TanStack Router Docs, Vercel Rewrites)를 참고한 결과, SPA는 최초에 index.html을 로드한 뒤 클라이언트 라우터가 동작하기 때문에, 서버(또는 호스팅 플랫폼)에서 존재하지 않는 경로로의 요청을 index.html로 리라이트해야 함을 알게 되었습니다. 또한 애플리케이션을 루트가 아닌 /myapp 경로에 배포했기 때문에, 라우터 basepath와 빌드 경로 설정도 일관되게 맞추어야 함을 확인하였습니다.

<br/><br/>

이를 해결하기 위해 다음과 같이 수정하였습니다.

<br/>

1. TanStack Router basepath 지정

```ts
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  routeTree,
  basepath: '/myapp',
})
```

→ 라우터가 /myapp을 기준으로 경로를 인식하도록 수정하였습니다.

<br/>

2. Vite 설정 수정

```ts
// vite.config.ts
export default defineConfig({
  base: '/myapp/',
})
```

→ 빌드된 정적 자산(js, css 등)이 올바른 경로에서 로드되도록 하였습니다.

<br/>

3. Vercel 리라이트 설정 추가

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/myapp/(.*)",
      "destination": "/myapp/index.html"
    }
  ]
}
```

→ /myapp 이하의 모든 경로를 index.html로 전달하도록 하였습니다.

<br/><br/>

이 과정을 거친 후 브라우저 주소창에 /myapp/xxx 와 같은 경로를 직접 입력해도 Vercel이 index.html을 반환하게 되었고, TanStack Router가 정상적으로 초기화되어 해당 경로를 매칭할 수 있었습니다. 결과적으로 내부 링크 이동과 직접 주소 입력이 동일하게 동작하는 일관된 라우팅 경험을 제공할 수 있었습니다.

<br/>

이번 경험을 통해 CSR 기반 라우팅에서는 배포 환경에 맞는 index.html fallback 설정이 필수적임을 학습하였습니다. 특히 Vercel과 같은 정적 호스팅 환경에서는 vercel.json의 rewrite 규칙을 통해 라우팅 문제를 해결할 수 있음을 확인하였습니다. 또한 애플리케이션을 서브 경로에 배포할 경우 라우터 basepath, 빌드 base 설정, 호스팅 플랫폼의 리라이트 규칙을 반드시 일관되게 구성해야 함을 깨달았습니다.

# Todo Backend

Node.js와 MongoDB를 사용하는 Todo 백엔드입니다.

## 실행

먼저 패키지를 설치하고 `.env.example`을 복사해 `.env`를 만든 뒤,
`MONGODB_URI`를 실제 MongoDB 연결 주소로 변경합니다. PowerShell에서는 실행
정책의 영향을 피하기 위해 `npm.cmd`를 사용합니다.

```powershell
npm.cmd install
Copy-Item .env.example .env
```

```powershell
npm.cmd start
```

개발 중 파일 변경을 감지해 자동 재시작하려면:

```powershell
npm.cmd run dev
```

상태 확인:

```powershell
Invoke-RestMethod http://localhost:5000/health
```

테스트 실행:

```powershell
npm.cmd test
```

기본 포트는 5000입니다. 다른 포트를 사용하려면 실행 전에 `PORT` 환경 변수를 지정합니다.

```powershell
$env:PORT = 4000
npm.cmd start
```

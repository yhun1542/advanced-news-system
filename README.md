# EmarkNews - 완전 개선된 뉴스 포털

## 📰 프로젝트 소개

EmarkNews는 실시간 뉴스 수집 및 분석 시스템으로, 세계, 한국, 일본의 최신 뉴스를 대량으로 수집하여 사용자에게 제공하는 완전 개선된 뉴스 포털입니다.

## ✨ 주요 기능

- **대량 뉴스 수집**: 각 섹션당 20-30개의 최신 뉴스 수집
- **실시간 환율 정보**: USD/KRW, JPY/KRW 실시간 환율 제공
- **다중 API 지원**: NewsAPI, Naver API, 환율 API 통합
- **모바일 최적화**: 반응형 디자인으로 모든 기기 지원
- **캐싱 시스템**: 10분 캐시로 빠른 응답 속도
- **API 모니터링**: 실시간 API 성능 및 상태 모니터링
- **트렌딩 키워드**: 실시간 인기 키워드 분석

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 API 키를 설정하세요
```

### 3. 서버 실행
```bash
# 프로덕션 모드
npm start

# 개발 모드
npm run dev
```

### 4. 접속
- 로컬: http://localhost:3000
- API: http://localhost:3000/api/news

## 📡 API 엔드포인트

### GET /api/news
뉴스 데이터를 조회합니다.

**쿼리 파라미터:**
- `refresh=true`: 강제 새로고침
- `timestamp`: 특정 시점 데이터 요청

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "sections": {
      "world": [...],
      "korea": [...],
      "japan": [...]
    },
    "trending": [...],
    "exchangeRates": {
      "USD_KRW": 1340,
      "JPY_KRW": 9.2
    },
    "systemStatus": {...}
  }
}
```

### GET /api/status
시스템 상태를 조회합니다.

### POST /api/refresh
뉴스 데이터를 강제로 새로고침합니다.

### GET /health
헬스체크 엔드포인트입니다.

## 🔧 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `PORT` | 서버 포트 | 3000 |
| `NODE_ENV` | 실행 환경 | production |
| `NEWS_API_KEY` | NewsAPI 키 | - |
| `NAVER_CLIENT_ID` | 네이버 API 클라이언트 ID | - |
| `NAVER_CLIENT_SECRET` | 네이버 API 클라이언트 시크릿 | - |
| `OPENAI_API_KEY` | OpenAI API 키 (선택) | - |
| `SKYWORK_API_KEY` | Skywork AI API 키 (선택) | - |
| `EXCHANGE_API_KEY` | 환율 API 키 | free |

## 🏗️ 프로젝트 구조

```
news-system/
├── public/
│   └── index.html          # 프론트엔드 HTML
├── advanced-news-system.js # 뉴스 수집 시스템
├── server.js               # Express 서버
├── package.json            # 프로젝트 설정
├── .env                    # 환경 변수
├── .env.example            # 환경 변수 예시
└── README.md               # 프로젝트 문서
```

## 🌟 기술 스택

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **APIs**: NewsAPI, Naver Search API, Exchange Rate API
- **Styling**: Google Fonts, Font Awesome
- **Security**: Helmet.js, CORS
- **Performance**: Compression, Caching

## 📊 성능 특징

- **대량 수집**: 각 섹션당 최대 30개 뉴스 수집
- **캐싱**: 10분 캐시로 API 호출 최적화
- **Rate Limiting**: API별 요청 제한 관리
- **Retry Logic**: Exponential Backoff 재시도 로직
- **Error Handling**: 강력한 오류 처리 및 복구

## 🔒 보안

- Helmet.js를 통한 보안 헤더 설정
- CORS 정책 적용
- 환경 변수를 통한 민감 정보 관리
- Rate Limiting으로 API 남용 방지

## 📱 모바일 지원

- 완전 반응형 디자인
- 터치 친화적 인터페이스
- 모바일 최적화된 뉴스 카드
- 빠른 로딩 속도

## 🚀 배포

### Railway 배포
1. GitHub 저장소에 코드 푸시
2. Railway에서 GitHub 연결
3. 환경 변수 설정
4. 자동 배포 완료

### 환경 변수 설정 (Railway)
```
PORT=3000
NODE_ENV=production
NEWS_API_KEY=your_news_api_key
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

## 📈 모니터링

시스템은 다음 메트릭을 실시간으로 모니터링합니다:
- API 성공/실패율
- 평균 응답 시간
- Rate Limit 상태
- 캐시 히트율
- 메모리 사용량

## 🤝 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 문의해 주세요.

---

**EmarkNews Team** - 완전 개선된 뉴스 포털 시스템


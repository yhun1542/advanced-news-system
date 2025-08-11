
const axios = require('axios');
const cheerio = require('cheerio');

class TranslationFixedNewsSystem {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10분
        this.lastUpdate = null;
        this.isUpdating = false;
        
        // API 모니터링 시스템
        this.apiMetrics = {
            newsApi: { success: 0, failure: 0, totalTime: 0, lastError: null },
            naverApi: { success: 0, failure: 0, totalTime: 0, lastError: null },
            openAi: { success: 0, failure: 0, totalTime: 0, lastError: null },
            skyworkAi: { success: 0, failure: 0, totalTime: 0, lastError: null },
            exchangeApi: { success: 0, failure: 0, totalTime: 0, lastError: null }
        };
        
        // API 설정
        this.apis = {
            newsApi: process.env.NEWS_API_KEY || '44d9347a149b40ad87b3deb8bba95183',
            openAi: process.env.OPENAI_API_KEY,
            skyworkAi: process.env.SKYWORK_API_KEY,
            naverClientId: process.env.NAVER_CLIENT_ID || '4lsPsi_je8UoGGcfTP1w',
            naverClientSecret: process.env.NAVER_CLIENT_SECRET || 'J3BHRgyWPc'
        };

        // Rate Limiting 설정
        this.rateLimits = {
            naver: { requests: 0, resetTime: Date.now() + 60000, maxRequests: 20 },
            newsApi: { requests: 0, resetTime: Date.now() + 3600000, maxRequests: 800 },
            openAi: { requests: 0, resetTime: Date.now() + 60000, maxRequests: 50 },
            skywork: { requests: 0, resetTime: Date.now() + 60000, maxRequests: 80 }
        };

        // 기본 번역 사전 (AI 실패 시 사용)
        this.basicTranslations = {
            // 일반 단어
            'breaking': '속보',
            'news': '뉴스',
            'update': '업데이트',
            'report': '보고서',
            'analysis': '분석',
            'government': '정부',
            'president': '대통령',
            'minister': '장관',
            'company': '회사',
            'market': '시장',
            'economy': '경제',
            'business': '비즈니스',
            'technology': '기술',
            'science': '과학',
            'health': '건강',
            'sports': '스포츠',
            'culture': '문화',
            'entertainment': '엔터테인먼트',
            'politics': '정치',
            'international': '국제',
            'domestic': '국내',
            'global': '글로벌',
            'world': '세계',
            'country': '국가',
            'city': '도시',
            'people': '사람들',
            'public': '공공',
            'private': '민간',
            'official': '공식',
            'statement': '성명',
            'announcement': '발표',
            'decision': '결정',
            'agreement': '합의',
            'meeting': '회의',
            'conference': '회의',
            'summit': '정상회담',
            'trade': '무역',
            'investment': '투자',
            'finance': '금융',
            'bank': '은행',
            'stock': '주식',
            'price': '가격',
            'increase': '증가',
            'decrease': '감소',
            'growth': '성장',
            'development': '개발',
            'research': '연구',
            'study': '연구',
            'project': '프로젝트',
            'program': '프로그램',
            'policy': '정책',
            'law': '법',
            'regulation': '규제',
            'reform': '개혁',
            'change': '변화',
            'new': '새로운',
            'latest': '최신',
            'recent': '최근',
            'current': '현재',
            'future': '미래',
            'past': '과거',
            'year': '년',
            'month': '월',
            'week': '주',
            'day': '일',
            'today': '오늘',
            'yesterday': '어제',
            'tomorrow': '내일',
            
            // 일본 관련
            'japan': '일본',
            'japanese': '일본의',
            'tokyo': '도쿄',
            'osaka': '오사카',
            'kyoto': '교토',
            'ohtani': '오타니',
            'shohei': '쇼헤이',
            'baseball': '야구',
            'mlb': 'MLB',
            'dodgers': '다저스',
            'angels': '에인절스',
            
            // 한국 관련
            'korea': '한국',
            'korean': '한국의',
            'seoul': '서울',
            'busan': '부산',
            'samsung': '삼성',
            'lg': 'LG',
            'hyundai': '현대',
            'kia': '기아',
            
            // 미국/세계 관련
            'america': '미국',
            'american': '미국의',
            'usa': '미국',
            'china': '중국',
            'chinese': '중국의',
            'europe': '유럽',
            'european': '유럽의',
            'russia': '러시아',
            'russian': '러시아의',
            'ukraine': '우크라이나',
            'nato': 'NATO',
            'united nations': '유엔',
            'white house': '백악관',
            'congress': '의회',
            'senate': '상원',
            'house': '하원',
            
            // 기술/비즈니스
            'ai': 'AI',
            'artificial intelligence': '인공지능',
            'machine learning': '머신러닝',
            'blockchain': '블록체인',
            'cryptocurrency': '암호화폐',
            'bitcoin': '비트코인',
            'ethereum': '이더리움',
            'meta': '메타',
            'facebook': '페이스북',
            'google': '구글',
            'apple': '애플',
            'microsoft': '마이크로소프트',
            'amazon': '아마존',
            'tesla': '테슬라',
            'nvidia': '엔비디아',
            'intel': '인텔',
            'amd': 'AMD'
        };

        // 뉴스 소스 매핑
        this.sourceMapping = {
            'bbc-news': 'BBC News',
            'cnn': 'CNN',
            'reuters': 'Reuters',
            'associated-press': 'AP 통신',
            'the-guardian-uk': 'The Guardian',
            'the-new-york-times': 'New York Times',
            'bloomberg': 'Bloomberg',
            'financial-times': 'Financial Times',
            'wall-street-journal': 'Wall Street Journal',
            'abc-news': 'ABC News',
            'fox-news': 'Fox News',
            'nbc-news': 'NBC News',
            'usa-today': 'USA Today',
            'yonhap-news-agency': '연합뉴스',
            'nhk-world': 'NHK World',
            'japan-times': 'Japan Times',
            'asahi-shimbun': '아사히신문'
        };

        // 키워드 분류
        this.keywords = {
            urgent: ['긴급', '속보', '발생', '사고', '재해', '위기', 'breaking', 'urgent', 'alert', 'emergency', 'crisis'],
            important: ['중요', '발표', '결정', '승인', '합의', 'important', 'significant', 'major', 'key', 'crucial'],
            buzz: ['화제', '인기', '트렌드', '바이럴', '논란', 'viral', 'trending', 'popular', 'buzz', 'sensation'],
            korea: ['한국', '서울', '부산', '대구', '인천', 'korea', 'seoul', 'korean', '손흥민', '이강인'],
            japan: ['일본', '도쿄', '오사카', '교토', '오타니', '쇼헤이', 'japan', 'tokyo', 'japanese', 'ohtani', 'shohei'],
            japanSports: ['오타니', '쇼헤이', '다르비시', 'ohtani', 'shohei', 'darvish', 'baseball', 'mlb']
        };

        console.log('🚀 번역 기능 완전 복구된 뉴스 시스템 초기화 완료');
        console.log('🔧 AI API 상태:', {
            openAi: !!this.apis.openAi,
            skyworkAi: !!this.apis.skyworkAi
        });
    }

    // Exponential Backoff 재시도 로직
    async retryWithBackoff(apiCall, apiName, maxRetries = 3) {
        const startTime = Date.now();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📡 ${apiName} API 호출 시도 ${attempt}/${maxRetries}`);
                
                const result = await apiCall();
                
                const duration = Date.now() - startTime;
                this.updateApiMetrics(apiName, true, duration);
                
                console.log(`✅ ${apiName} API 호출 성공 (${duration}ms)`);
                return result;
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`❌ ${apiName} API 호출 실패 (시도 ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                    console.log(`⏳ ${delay}ms 후 재시도...`);
                    await this.sleep(delay);
                } else {
                    this.updateApiMetrics(apiName, false, duration, error.message);
                    throw error;
                }
            }
        }
    }

    // API 메트릭 업데이트
    updateApiMetrics(apiName, success, duration, errorMessage = null) {
        const metric = this.apiMetrics[apiName];
        if (!metric) return;

        if (success) {
            metric.success++;
        } else {
            metric.failure++;
            metric.lastError = errorMessage;
        }
        
        metric.totalTime += duration;
        
        console.log(`📊 ${apiName} 메트릭: 성공 ${metric.success}, 실패 ${metric.failure}`);
    }

    // Rate Limit 확인
    checkRateLimit(apiName) {
        const limit = this.rateLimits[apiName];
        if (!limit) return true;

        const now = Date.now();
        if (now > limit.resetTime) {
            limit.requests = 0;
            limit.resetTime = now + (apiName === 'naver' ? 60000 : apiName === 'newsApi' ? 3600000 : 60000);
        }

        if (limit.requests >= limit.maxRequests) {
            console.warn(`⚠️ ${apiName} API Rate Limit 도달`);
            return false;
        }

        limit.requests++;
        return true;
    }

    // 실시간 환율 정보 가져오기
    async fetchExchangeRates() {
        try {
            console.log('💱 실시간 환율 정보 수집 중...');
            
            const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
                timeout: 10000,
                headers: { 'User-Agent': 'EmarkNews/11.0.0' }
            });

            const rates = response.data.rates;
            const krw = rates.KRW || 1340;
            const jpy = rates.JPY || 145;
            const jpyToKrw = Math.round((krw / jpy) * 10) / 10;

            const exchangeRates = {
                USD_KRW: Math.round(krw),
                JPY_KRW: jpyToKrw,
                lastUpdate: new Date().toISOString(),
                source: 'ExchangeRate-API'
            };

            console.log('✅ 실시간 환율 수집 완료:', exchangeRates);
            return exchangeRates;

        } catch (error) {
            console.error('❌ 환율 정보 수집 실패:', error.message);
            return {
                USD_KRW: 1340,
                JPY_KRW: 9.2,
                lastUpdate: new Date().toISOString(),
                source: 'Default'
            };
        }
    }

    // 강제 캐시 무효화 지원
    async getNews(forceRefresh = false, timestamp = null) {
        const cacheKey = 'news_data';
        
        if (forceRefresh || timestamp || !this.cache.has(cacheKey) || this.isCacheExpired(cacheKey)) {
            console.log('🔄 번역 기능 포함 뉴스 데이터 수집 중...', forceRefresh ? '(강제 새로고침)' : '');
            
            if (this.isUpdating && !forceRefresh) {
                console.log('⚠️ 이미 업데이트 중입니다.');
                return this.cache.get(cacheKey)?.data || this.getDefaultNews();
            }

            this.isUpdating = true;
            
            try {
                const newsData = await this.collectAllNews();
                
                this.cache.set(cacheKey, {
                    data: newsData,
                    timestamp: Date.now()
                });
                
                this.lastUpdate = new Date().toISOString();
                console.log('✅ 번역 기능 포함 뉴스 데이터 수집 완료');
                
                return newsData;
            } catch (error) {
                console.error('❌ 뉴스 수집 실패:', error);
                return this.cache.get(cacheKey)?.data || this.getDefaultNews();
            } finally {
                this.isUpdating = false;
            }
        }

        return this.cache.get(cacheKey).data;
    }

    // 캐시 만료 확인
    isCacheExpired(key) {
        const cached = this.cache.get(key);
        if (!cached) return true;
        return Date.now() - cached.timestamp > this.cacheExpiry;
    }

    // 모든 뉴스 수집 (번역 기능 포함)
    async collectAllNews() {
        console.log('📡 번역 기능 포함 대량 뉴스 수집 시작...');
        
        const results = await Promise.allSettled([
            this.fetchWorldNews(),
            this.fetchKoreaNews(),
            this.fetchJapanNews(),
            this.fetchExchangeRates()
        ]);

        const worldNews = results[0].status === 'fulfilled' ? results[0].value : [];
        const koreaNews = results[1].status === 'fulfilled' ? results[1].value : [];
        const japanNews = results[2].status === 'fulfilled' ? results[2].value : [];
        const exchangeRates = results[3].status === 'fulfilled' ? results[3].value : null;

        results.forEach((result, index) => {
            const sections = ['세계뉴스', '한국뉴스', '일본뉴스', '환율정보'];
            if (result.status === 'rejected') {
                console.error(`❌ ${sections[index]} 수집 실패:`, result.reason.message);
            }
        });
        
        const trending = await this.generateTrendingKeywords([...worldNews, ...koreaNews, ...japanNews]);

        const result = {
            sections: {
                world: worldNews.slice(0, 25),
                korea: koreaNews.slice(0, 25),
                japan: japanNews.slice(0, 25)
            },
            trending,
            exchangeRates,
            systemStatus: {
                version: '11.0.0-translation-fixed',
                lastUpdate: this.lastUpdate,
                cacheSize: this.cache.size,
                features: ['enhanced-translation', 'ai-fallback', 'basic-translation', 'mobile-optimized', 'real-time-exchange'],
                apiMetrics: this.getApiMetricsReport(),
                apiSources: {
                    newsApi: !!this.apis.newsApi,
                    naverApi: !!(this.apis.naverClientId && this.apis.naverClientSecret),
                    openAi: !!this.apis.openAi,
                    skyworkAi: !!this.apis.skyworkAi,
                    exchangeApi: true
                }
            }
        };

        console.log('📊 번역 포함 수집 완료:', {
            world: result.sections.world.length,
            korea: result.sections.korea.length,
            japan: result.sections.japan.length,
            trending: result.trending.length
        });

        return result;
    }

    // 세계 뉴스 수집 (번역 포함)
    async fetchWorldNews() {
        const sources = [
            { endpoint: 'top-headlines', params: { category: 'general', language: 'en', pageSize: 25 } },
            { endpoint: 'everything', params: { q: 'world OR global OR international', language: 'en', pageSize: 20, sortBy: 'publishedAt' } },
            { endpoint: 'top-headlines', params: { category: 'business', language: 'en', pageSize: 15 } },
            { endpoint: 'top-headlines', params: { category: 'technology', language: 'en', pageSize: 15 } }
        ];

        let allArticles = [];
        
        for (const source of sources) {
            try {
                if (!this.checkRateLimit('newsApi')) {
                    console.warn('⚠️ NewsAPI Rate Limit 도달, 건너뛰기');
                    continue;
                }

                const articles = await this.retryWithBackoff(
                    () => this.fetchFromNewsAPI(source.endpoint, source.params),
                    'newsApi'
                );
                allArticles = allArticles.concat(articles);
                
                await this.sleep(200);
            } catch (error) {
                console.error(`❌ 세계뉴스 수집 실패 (${source.endpoint}):`, error.message);
            }
        }

        const uniqueArticles = this.removeDuplicates(allArticles);
        const recentArticles = this.filterRecentNews(uniqueArticles);
        
        // 번역 및 요약 처리
        const processedArticles = await this.processArticlesWithTranslation(recentArticles, 'world');

        console.log(`✅ 세계뉴스 ${processedArticles.length}개 수집 완료 (번역 포함)`);
        return processedArticles.slice(0, 20);
    }

    // 한국 뉴스 수집
    async fetchKoreaNews() {
        let allArticles = [];

        // Naver API에서 수집
        try {
            if (this.checkRateLimit('naver')) {
                const naverArticles = await this.retryWithBackoff(
                    () => this.fetchFromNaverAPI(),
                    'naverApi'
                );
                allArticles = allArticles.concat(naverArticles);
            }
        } catch (error) {
            console.error('❌ Naver API 수집 실패:', error.message);
        }

        // NewsAPI에서 한국 관련 뉴스 수집
        const newsApiSources = [
            { endpoint: 'everything', params: { q: 'Korea OR Korean OR Seoul', language: 'en', pageSize: 15, sortBy: 'publishedAt' } }
        ];

        for (const source of newsApiSources) {
            try {
                if (!this.checkRateLimit('newsApi')) continue;

                const articles = await this.retryWithBackoff(
                    () => this.fetchFromNewsAPI(source.endpoint, source.params),
                    'newsApi'
                );
                
                const koreanArticles = articles.filter(article => 
                    this.containsKeywords(article.title + ' ' + article.description, this.keywords.korea)
                );
                allArticles = allArticles.concat(koreanArticles);
                
                await this.sleep(200);
            } catch (error) {
                console.error(`❌ 한국뉴스 NewsAPI 수집 실패:`, error.message);
            }
        }

        const uniqueArticles = this.removeDuplicates(allArticles);
        const recentArticles = this.filterRecentNews(uniqueArticles);
        
        // 번역 및 요약 처리 (영문 기사만)
        const processedArticles = await this.processArticlesWithTranslation(recentArticles, 'korea');

        console.log(`✅ 한국뉴스 ${processedArticles.length}개 수집 완료`);
        return processedArticles.slice(0, 20);
    }

    // 일본 뉴스 수집 (번역 포함)
    async fetchJapanNews() {
        const sources = [
            { 
                endpoint: 'everything', 
                params: { 
                    q: 'Japan OR Japanese OR Tokyo OR Ohtani OR Shohei', 
                    language: 'en', 
                    pageSize: 20, 
                    sortBy: 'publishedAt',
                    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                } 
            },
            { 
                endpoint: 'top-headlines', 
                params: { 
                    country: 'jp', 
                    pageSize: 15 
                } 
            },
            { 
                endpoint: 'everything', 
                params: { 
                    q: 'MLB AND (Ohtani OR Shohei)', 
                    language: 'en', 
                    pageSize: 10, 
                    sortBy: 'publishedAt',
                    from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                } 
            }
        ];

        let allArticles = [];
        
        for (const source of sources) {
            try {
                if (!this.checkRateLimit('newsApi')) continue;

                const articles = await this.retryWithBackoff(
                    () => this.fetchFromNewsAPI(source.endpoint, source.params),
                    'newsApi'
                );
                
                const japanArticles = articles.filter(article => {
                    const content = (article.title + ' ' + article.description).toLowerCase();
                    return this.containsKeywords(content, this.keywords.japan) || 
                           this.containsKeywords(content, this.keywords.japanSports);
                });
                
                allArticles = allArticles.concat(japanArticles);
                
                await this.sleep(200);
            } catch (error) {
                console.error(`❌ 일본뉴스 수집 실패 (${source.endpoint}):`, error.message);
            }
        }

        const uniqueArticles = this.removeDuplicates(allArticles);
        const recentArticles = this.filterRecentNews(uniqueArticles);
        
        // 번역 및 요약 처리
        const processedArticles = await this.processArticlesWithTranslation(recentArticles, 'japan');

        console.log(`✅ 일본뉴스 ${processedArticles.length}개 수집 완료 (번역 포함)`);
        return processedArticles.slice(0, 20);
    }

    // Naver API 호출
    async fetchFromNaverAPI() {
        const queries = ['뉴스', '정치', '경제', '사회'];
        let allArticles = [];

        for (const query of queries) {
            try {
                if (!this.checkRateLimit('naver')) break;

                const config = {
                    params: {
                        query,
                        display: 10,
                        start: 1,
                        sort: 'date'
                    },
                    headers: {
                        'X-Naver-Client-Id': this.apis.naverClientId,
                        'X-Naver-Client-Secret': this.apis.naverClientSecret,
                        'User-Agent': 'EmarkNews/11.0.0'
                    },
                    timeout: 12000
                };

                const response = await axios.get('https://openapi.naver.com/v1/search/news.json', config);
                
                const articles = (response.data.items || []).map(item => ({
                    id: this.generateId(item.link),
                    title: this.cleanNaverText(item.title),
                    description: this.cleanNaverText(item.description),
                    url: item.link,
                    originalUrl: item.originallink || item.link,
                    image: null,
                    publishedAt: item.pubDate,
                    source: {
                        name: this.extractSourceFromNaverLink(item.link),
                        display: this.getSourceDisplay(this.extractSourceFromNaverLink(item.link), item.pubDate)
                    },
                    isKorean: true // 한국어 기사 표시
                }));

                allArticles = allArticles.concat(articles);
                await this.sleep(150);
                
            } catch (error) {
                console.error(`❌ Naver API 쿼리 실패 (${query}):`, error.message);
            }
        }

        return allArticles;
    }

    // NewsAPI 호출
    async fetchFromNewsAPI(endpoint, params) {
        const baseUrl = 'https://newsapi.org/v2';
        const url = `${baseUrl}/${endpoint}`;
        
        const validatedParams = this.validateNewsAPIParams(params);
        
        const config = {
            params: {
                ...validatedParams,
                apiKey: this.apis.newsApi
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'EmarkNews/11.0.0',
                'Connection': 'close'
            }
        };

        const response = await axios.get(url, config);
        
        if (response.data.status !== 'ok') {
            throw new Error(`NewsAPI 오류: ${response.data.message}`);
        }

        const articles = (response.data.articles || [])
            .filter(article => 
                article.title && 
                article.title !== '[Removed]' && 
                article.description && 
                article.description !== '[Removed]' &&
                article.url &&
                !article.url.includes('removed.com')
            )
            .map(article => ({
                id: this.generateId(article.url),
                title: article.title,
                description: article.description,
                url: article.url,
                originalUrl: article.url,
                image: article.urlToImage,
                publishedAt: article.publishedAt,
                source: {
                    name: article.source.name,
                    display: this.getSourceDisplay(article.source.name, article.publishedAt)
                },
                isKorean: false // 영문 기사 표시
            }));

        return articles;
    }

    // 번역 포함 기사 처리
    async processArticlesWithTranslation(articles, section) {
        const processed = [];

        for (const article of articles) {
            try {
                let translatedContent;
                
                // 한국어 기사인 경우 번역 건너뛰기
                if (article.isKorean) {
                    translatedContent = {
                        summary: this.createBasicSummary(article),
                        detailed: article.description,
                        fullContent: article.description + '\n\n더 자세한 내용은 원문을 참조하시기 바랍니다.'
                    };
                } else {
                    // 영문 기사 번역 및 요약
                    translatedContent = await this.translateAndSummarizeArticle(article, section);
                }
                
                const marks = this.analyzeMarks(article.title + ' ' + article.description);
                const stars = this.calculateQualityScore(article, marks);
                const category = this.classifyCategory(article.title + ' ' + article.description);
                const keywords = this.extractKeywords(article.title + ' ' + article.description);

                processed.push({
                    ...article,
                    summary: translatedContent.summary,
                    description: translatedContent.detailed,
                    fullContent: translatedContent.fullContent,
                    marks,
                    stars,
                    category,
                    keywords
                });
            } catch (error) {
                console.error('❌ 기사 처리 실패:', error.message);
                
                // 기본 처리
                processed.push({
                    ...article,
                    summary: this.createBasicSummary(article),
                    fullContent: article.description + '\n\n더 자세한 내용은 원문을 참조하시기 바랍니다.',
                    marks: [],
                    stars: 3,
                    category: '일반',
                    keywords: ['뉴스']
                });
            }
        }

        return processed;
    }

    // 강화된 번역 및 요약 시스템
    async translateAndSummarizeArticle(article, section) {
        const content = article.title + '\n' + article.description;
        
        console.log(`🔄 번역 시작: ${article.title.substring(0, 50)}...`);
        
        // 1단계: OpenAI 시도
        try {
            if (this.apis.openAi && this.checkRateLimit('openAi')) {
                console.log('🤖 OpenAI 번역 시도...');
                const result = await this.retryWithBackoff(
                    () => this.callOpenAITranslation(content),
                    'openAi'
                );
                const parsed = this.parseTranslationResult(result);
                console.log('✅ OpenAI 번역 성공');
                return parsed;
            }
        } catch (error) {
            console.error('❌ OpenAI 번역 실패:', error.message);
        }

        // 2단계: Skywork AI 시도
        try {
            if (this.apis.skyworkAi && this.checkRateLimit('skywork')) {
                console.log('🤖 Skywork AI 번역 시도...');
                const result = await this.retryWithBackoff(
                    () => this.callSkyworkAITranslation(content),
                    'skyworkAi'
                );
                const parsed = this.parseTranslationResult(result);
                console.log('✅ Skywork AI 번역 성공');
                return parsed;
            }
        } catch (error) {
            console.error('❌ Skywork AI 번역 실패:', error.message);
        }

        // 3단계: 기본 번역 시스템
        console.log('🔧 기본 번역 시스템 사용...');
        return this.basicTranslateAndSummarize(article);
    }

    // OpenAI 번역 호출
    async callOpenAITranslation(content) {
        const prompt = `다음 영문 뉴스를 한국어로 번역하고 모바일에서 읽기 쉽게 요약해주세요:

${content}

요구사항:
1. 제목과 내용을 자연스러운 한국어로 번역
2. 핵심 내용을 3-4개 포인트로 요약 (각 포인트는 한 줄로)
3. 상세한 설명을 2-3문장으로 작성
4. 완전한 번역 내용을 3-4문장으로 작성
5. ** 표시나 굵은 글씨 사용 금지
6. 모바일에서 읽기 쉽게 간결하고 명확하게 작성

형식:
요약: • 첫 번째 핵심 내용
• 두 번째 핵심 내용
• 세 번째 핵심 내용

상세: 더 자세한 설명 (2-3문장)

전문: 완전한 번역 내용 (3-4문장)`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${this.apis.openAi}`,
                'Content-Type': 'application/json'
            },
            timeout: 20000
        });

        return response.data.choices[0].message.content;
    }

    // Skywork AI 번역 호출
    async callSkyworkAITranslation(content) {
        const response = await axios.post('https://api.skywork.ai/v1/chat/completions', {
            model: 'skywork-lite',
            messages: [{
                role: 'user',
                content: `다음 영문 뉴스를 한국어로 번역하고 요약해주세요. 요약, 상세, 전문 형식으로 작성해주세요: ${content}`
            }],
            max_tokens: 600
        }, {
            headers: {
                'Authorization': `Bearer ${this.apis.skyworkAi}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        return response.data.choices[0].message.content;
    }

    // 기본 번역 시스템 (AI 실패 시 사용)
    basicTranslateAndSummarize(article) {
        console.log('🔧 기본 번역 시스템으로 처리 중...');
        
        const title = article.title;
        const description = article.description;
        
        // 기본 단어 번역
        let translatedTitle = this.basicTranslateText(title);
        let translatedDescription = this.basicTranslateText(description);
        
        // 요약 생성
        const sentences = translatedDescription.split('.').filter(s => s.trim().length > 10);
        let summary = '';
        
        if (sentences.length >= 2) {
            summary = sentences.slice(0, 3).map((s, i) => `• ${s.trim()}`).join('\n');
        } else {
            summary = `• ${translatedDescription.substring(0, 100)}...`;
        }
        
        // 상세 내용
        const detailed = translatedDescription.length > 200 ? 
            translatedDescription.substring(0, 200) + '...' : 
            translatedDescription;
        
        // 전문 내용
        const fullContent = `${translatedTitle}\n\n${translatedDescription}\n\n이 기사는 기본 번역 시스템으로 처리되었습니다. 더 정확한 번역을 위해서는 원문을 참조하시기 바랍니다.`;
        
        console.log('✅ 기본 번역 완료');
        
        return {
            summary,
            detailed,
            fullContent
        };
    }

    // 기본 텍스트 번역
    basicTranslateText(text) {
        let translated = text;
        
        // 기본 번역 사전 적용
        Object.entries(this.basicTranslations).forEach(([english, korean]) => {
            const regex = new RegExp(`\\b${english}\\b`, 'gi');
            translated = translated.replace(regex, korean);
        });
        
        return translated;
    }

    // 번역 결과 파싱
    parseTranslationResult(result) {
        const lines = result.split('\n').filter(line => line.trim());
        
        let summary = '';
        let detailed = '';
        let fullContent = '';
        let currentSection = '';

        for (const line of lines) {
            if (line.includes('요약:') || line.includes('Summary:')) {
                currentSection = 'summary';
                continue;
            } else if (line.includes('상세:') || line.includes('Detail:')) {
                currentSection = 'detailed';
                continue;
            } else if (line.includes('전문:') || line.includes('Full:')) {
                currentSection = 'full';
                continue;
            }

            if (currentSection === 'summary' && line.trim().startsWith('•')) {
                summary += line.trim() + '\n';
            } else if (currentSection === 'detailed') {
                detailed += line.trim() + ' ';
            } else if (currentSection === 'full') {
                fullContent += line.trim() + ' ';
            }
        }

        return {
            summary: summary.trim() || result.substring(0, 200) + '...',
            detailed: detailed.trim() || result.substring(0, 300) + '...',
            fullContent: fullContent.trim() || detailed.trim() || result
        };
    }

    // NewsAPI 파라미터 검증
    validateNewsAPIParams(params) {
        const validated = { ...params };
        
        if (validated.pageSize > 100) validated.pageSize = 100;
        
        if (validated.from && !this.isValidDate(validated.from)) {
            delete validated.from;
        }
        if (validated.to && !this.isValidDate(validated.to)) {
            delete validated.to;
        }
        
        if (validated.q && validated.q.length > 500) {
            validated.q = validated.q.substring(0, 500);
        }
        
        return validated;
    }

    // API 메트릭 리포트 생성
    getApiMetricsReport() {
        const report = {};
        
        Object.entries(this.apiMetrics).forEach(([apiName, metrics]) => {
            const total = metrics.success + metrics.failure;
            report[apiName] = {
                successRate: total > 0 ? Math.round((metrics.success / total) * 100) : 0,
                totalCalls: total,
                avgResponseTime: total > 0 ? Math.round(metrics.totalTime / total) : 0,
                lastError: metrics.lastError
            };
        });
        
        return report;
    }

    // 유틸리티 함수들
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    containsKeywords(text, keywords) {
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }

    removeDuplicates(articles) {
        const seen = new Set();
        return articles.filter(article => {
            const key = article.title.substring(0, 50);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    filterRecentNews(articles) {
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        return articles.filter(article => {
            const publishedDate = new Date(article.publishedAt);
            return publishedDate >= twoDaysAgo;
        });
    }

    createBasicSummary(article) {
        const description = article.description || '';
        const sentences = description.split('.').filter(s => s.trim().length > 10);
        
        if (sentences.length >= 2) {
            return sentences.slice(0, 3).map(s => `• ${s.trim()}`).join('\n');
        }
        
        return `• ${description.substring(0, 100)}...`;
    }

    analyzeMarks(content) {
        const marks = [];
        const lowerContent = content.toLowerCase();
        
        if (this.containsKeywords(lowerContent, this.keywords.urgent)) marks.push('긴급');
        if (this.containsKeywords(lowerContent, this.keywords.important)) marks.push('중요');
        if (this.containsKeywords(lowerContent, this.keywords.buzz)) marks.push('Buzz');
        
        return marks;
    }

    calculateQualityScore(article, marks) {
        let score = 3;
        
        if (marks.includes('긴급')) score += 1;
        if (marks.includes('중요')) score += 1;
        if (marks.includes('Buzz')) score += 0.5;
        if (article.image) score += 0.5;
        if (article.description && article.description.length > 100) score += 0.5;
        if (article.originalUrl && article.originalUrl !== article.url) score += 0.5;
        
        return Math.min(Math.round(score), 5);
    }

    classifyCategory(content) {
        const lowerContent = content.toLowerCase();
        
        if (this.containsKeywords(lowerContent, ['정치', 'politics', 'government'])) return '정치';
        if (this.containsKeywords(lowerContent, ['경제', 'economy', 'business', 'finance'])) return '경제';
        if (this.containsKeywords(lowerContent, ['스포츠', 'sports', 'game', 'match'])) return '스포츠';
        if (this.containsKeywords(lowerContent, ['기술', 'technology', 'tech', 'ai', 'digital'])) return '기술';
        if (this.containsKeywords(lowerContent, ['과학', 'science', 'research', 'study'])) return '과학';
        if (this.containsKeywords(lowerContent, ['문화', 'culture', 'art', 'entertainment'])) return '문화';
        if (this.containsKeywords(lowerContent, ['건강', 'health', 'medical', 'hospital'])) return '건강';
        
        return '일반';
    }

    extractKeywords(content) {
        const words = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
        const keywordCount = new Map();
        
        words.forEach(word => {
            if (!this.isStopWord(word)) {
                keywordCount.set(word, (keywordCount.get(word) || 0) + 1);
            }
        });
        
        return Array.from(keywordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    isStopWord(word) {
        const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return stopWords.includes(word.toLowerCase()) || word.length < 3;
    }

    getSourceDisplay(sourceName, publishedAt) {
        const mappedName = this.sourceMapping[sourceName.toLowerCase()] || sourceName;
        const date = new Date(publishedAt);
        const timeString = date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${mappedName} ${timeString}`;
    }

    extractSourceFromNaverLink(link) {
        if (!link) return 'Naver News';
        
        try {
            const url = new URL(link);
            const hostname = url.hostname;
            
            const sourceMap = {
                'chosun.com': '조선일보',
                'joongang.co.kr': '중앙일보',
                'donga.com': '동아일보',
                'hankyoreh.com': '한겨레',
                'khan.co.kr': '경향신문',
                'ytn.co.kr': 'YTN',
                'sbs.co.kr': 'SBS',
                'kbs.co.kr': 'KBS',
                'mbc.co.kr': 'MBC',
                'jtbc.co.kr': 'JTBC'
            };
            
            for (const [domain, source] of Object.entries(sourceMap)) {
                if (hostname.includes(domain)) {
                    return source;
                }
            }
            
            return hostname.replace('www.', '') || 'Naver News';
        } catch (error) {
            return 'Naver News';
        }
    }

    cleanNaverText(text) {
        return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
    }

    generateId(url) {
        return Buffer.from(url).toString('base64').substring(0, 16);
    }

    async generateTrendingKeywords(articles) {
        const keywordCount = new Map();
        
        articles.forEach(article => {
            const content = (article.title + ' ' + article.description).toLowerCase();
            const words = content.match(/\b\w{2,}\b/g) || [];
            
            words.forEach(word => {
                if (word.length > 2 && !this.isStopWord(word)) {
                    keywordCount.set(word, (keywordCount.get(word) || 0) + 1);
                }
            });
        });

        return Array.from(keywordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([keyword, count]) => [keyword, Math.min(count, 50)]);
    }

    // 기본 뉴스 데이터
    getDefaultNews() {
        const now = new Date().toISOString();
        
        return {
            sections: {
                world: [
                    {
                        id: 'default-world-1',
                        title: 'NASA 우주비행사 지구 귀환 성공',
                        summary: '• NASA 크루-10 미션 4명 우주비행사가 5개월간의 국제우주정거장 체류를 마치고 안전하게 지구로 귀환했습니다\n• 재진입 과정에서 3,000도 고온을 경험하며 17시간의 여행을 완료했습니다\n• 이번 미션에서는 다양한 과학 실험과 우주정거장 유지보수 작업을 성공적으로 수행했습니다',
                        description: 'NASA 크루-10 미션의 4명 우주비행사들이 국제우주정거장에서 5개월간의 장기 체류를 성공적으로 마치고 지구로 안전하게 귀환했습니다.',
                        fullContent: 'NASA 크루-10 미션의 4명 우주비행사들이 국제우주정거장에서 5개월간의 장기 체류를 성공적으로 마치고 지구로 안전하게 귀환했습니다. 이번 미션에서는 다양한 과학 실험과 우주정거장 유지보수 작업을 성공적으로 수행했습니다.',
                        url: 'https://www.nasa.gov/news/crew-10-return',
                        originalUrl: 'https://www.nasa.gov/news/crew-10-return',
                        image: null,
                        publishedAt: now,
                        source: { name: 'NASA', display: 'NASA ' + new Date().toLocaleString('ko-KR') },
                        marks: ['중요', 'Buzz'],
                        stars: 4,
                        category: '과학',
                        keywords: ['NASA', '우주', '과학', '귀환']
                    }
                ],
                korea: [
                    {
                        id: 'default-korea-1',
                        title: '손흥민 MLS 데뷔전에서 강렬한 인상',
                        summary: '• 손흥민 선수가 미국 메이저리그 사커 데뷔전에서 1골 1어시스트를 기록하며 화려한 활약을 펼쳤습니다\n• MLS 홈페이지에서 "손흥민의 시대가 시작됐다"고 극찬했습니다\n• 팬들과 언론은 그의 MLS 적응력과 리더십에 대해 높은 기대를 표하고 있습니다',
                        description: '손흥민 선수가 MLS 데뷔전에서 놀라운 활약을 보여주며 새로운 도전의 성공적인 시작을 알렸습니다.',
                        fullContent: '손흥민 선수가 MLS 데뷔전에서 놀라운 활약을 보여주며 새로운 도전의 성공적인 시작을 알렸습니다. 팬들과 언론은 그의 MLS 적응력과 리더십에 대해 높은 기대를 표하고 있습니다.',
                        url: 'https://www.mls.com/son-debut',
                        originalUrl: 'https://www.mls.com/son-debut',
                        image: null,
                        publishedAt: now,
                        source: { name: 'MLS', display: 'MLS ' + new Date().toLocaleString('ko-KR') },
                        marks: ['긴급', 'Buzz'],
                        stars: 5,
                        category: '스포츠',
                        keywords: ['손흥민', 'MLS', '스포츠', '데뷔']
                    }
                ],
                japan: [
                    {
                        id: 'default-japan-1',
                        title: '오타니 쇼헤이, 시즌 50홈런 달성',
                        summary: '• 오타니 쇼헤이가 2024시즌 50번째 홈런을 기록하며 역사적인 순간을 만들어냈습니다\n• 이는 일본 선수로는 최초로 MLB에서 50홈런을 달성한 기록입니다\n• 팬들과 언론은 그의 놀라운 성과에 대해 극찬을 아끼지 않고 있습니다',
                        description: '오타니 쇼헤이가 MLB에서 일본 선수 최초로 시즌 50홈런을 달성하는 역사적인 순간을 만들어냈습니다.',
                        fullContent: '오타니 쇼헤이가 MLB에서 일본 선수 최초로 시즌 50홈런을 달성하는 역사적인 순간을 만들어냈습니다. 팬들과 언론은 그의 놀라운 성과에 대해 극찬을 아끼지 않고 있습니다.',
                        url: 'https://www.mlb.com/ohtani-50-homeruns',
                        originalUrl: 'https://www.mlb.com/ohtani-50-homeruns',
                        image: null,
                        publishedAt: now,
                        source: { name: 'MLB', display: 'MLB ' + new Date().toLocaleString('ko-KR') },
                        marks: ['중요', 'Buzz'],
                        stars: 5,
                        category: '스포츠',
                        keywords: ['오타니', '쇼헤이', '홈런', '기록']
                    }
                ]
            },
            trending: [
                ['NASA', 25], ['손흥민', 22], ['오타니', 20], ['MLS', 18], 
                ['우주탐사', 15], ['스포츠', 12], ['과학', 10], ['기술', 8]
            ],
            exchangeRates: {
                USD_KRW: 1340,
                JPY_KRW: 9.2,
                lastUpdate: now,
                source: 'Default'
            },
            systemStatus: {
                version: '11.0.0-translation-fixed',
                lastUpdate: now,
                cacheSize: 0,
                features: ['enhanced-translation', 'ai-fallback', 'basic-translation', 'mobile-optimized'],
                apiMetrics: this.getApiMetricsReport(),
                apiSources: {
                    newsApi: !!this.apis.newsApi,
                    naverApi: !!(this.apis.naverClientId && this.apis.naverClientSecret),
                    openAi: !!this.apis.openAi,
                    skyworkAi: !!this.apis.skyworkAi,
                    exchangeApi: true
                }
            }
        };
    }

    // 시스템 상태 확인
    getSystemStatus() {
        return {
            status: 'running',
            version: '11.0.0-translation-fixed',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            lastUpdate: this.lastUpdate,
            cacheSize: this.cache.size,
            isUpdating: this.isUpdating,
            features: [
                'enhanced-translation-system',
                'ai-translation-with-fallback',
                'basic-translation-dictionary',
                'mobile-optimized-summaries',
                'real-time-exchange-rates',
                'multi-language-support',
                'error-recovery-mechanism'
            ],
            apiMetrics: this.getApiMetricsReport(),
            rateLimits: this.rateLimits,
            apiSources: {
                newsApi: !!this.apis.newsApi,
                naverApi: !!(this.apis.naverClientId && this.apis.naverClientSecret),
                openAi: !!this.apis.openAi,
                skyworkAi: !!this.apis.skyworkAi,
                exchangeApi: true
            }
        };
    }
}

module.exports = TranslationFixedNewsSystem;

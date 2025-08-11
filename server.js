const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const CompleteNewsSystemWithEnhancements = require('./advanced-news-system');

const app = express();
const PORT = process.env.PORT || 3000;

// 뉴스 시스템 인스턴스 생성
const newsSystem = new CompleteNewsSystemWithEnhancements();

// 미들웨어 설정
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:"]
        }
    }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// API 라우트
app.get('/api/news', async (req, res) => {
    try {
        console.log('📡 뉴스 API 요청 수신');
        const forceRefresh = req.query.refresh === 'true';
        const timestamp = req.query.timestamp;
        
        const newsData = await newsSystem.getNews(forceRefresh, timestamp);
        
        res.json({
            success: true,
            data: newsData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 뉴스 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '뉴스 데이터를 가져오는 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

// 시스템 상태 API
app.get('/api/status', (req, res) => {
    try {
        const status = newsSystem.getSystemStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('❌ 상태 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '시스템 상태를 가져오는 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

// 강제 새로고침 API
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('🔄 강제 새로고침 요청');
        const newsData = await newsSystem.getNews(true);
        
        res.json({
            success: true,
            data: newsData,
            message: '뉴스 데이터가 성공적으로 새로고침되었습니다.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ 새로고침 API 오류:', error);
        res.status(500).json({
            success: false,
            error: '뉴스 데이터 새로고침 중 오류가 발생했습니다.',
            message: error.message
        });
    }
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '10.0.0-complete-enhanced'
    });
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 핸들러
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: '요청한 리소스를 찾을 수 없습니다.',
        path: req.originalUrl
    });
});

// 에러 핸들러
app.use((error, req, res, next) => {
    console.error('❌ 서버 오류:', error);
    res.status(500).json({
        success: false,
        error: '내부 서버 오류가 발생했습니다.',
        message: process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
    });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EmarkNews 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`📱 로컬 접속: http://localhost:${PORT}`);
    console.log(`🌐 외부 접속: http://0.0.0.0:${PORT}`);
    console.log(`📊 API 엔드포인트:`);
    console.log(`   - GET /api/news - 뉴스 데이터 조회`);
    console.log(`   - GET /api/status - 시스템 상태 조회`);
    console.log(`   - POST /api/refresh - 강제 새로고침`);
    console.log(`   - GET /health - 헬스체크`);
    
    // 서버 시작 시 초기 뉴스 데이터 로드
    setTimeout(async () => {
        try {
            console.log('🔄 초기 뉴스 데이터 로딩 중...');
            await newsSystem.getNews();
            console.log('✅ 초기 뉴스 데이터 로딩 완료');
        } catch (error) {
            console.error('❌ 초기 뉴스 데이터 로딩 실패:', error.message);
        }
    }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM 신호 수신, 서버 종료 중...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT 신호 수신, 서버 종료 중...');
    process.exit(0);
});

module.exports = app;


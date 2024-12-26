import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import db from './db.js';

const app = express();
const BLOG_URL = 'https://silent-hunting.blogspot.com';

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// 1. إنشاء رابط مختصر
app.post('/api/shorten', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const existingUrl = await db.queryAsync(
            'SELECT * FROM urls WHERE original_url = ?',
            [url]
        );

        if (existingUrl.rows.length > 0) {
            return res.json({
                shortUrl: `http://localhost:3000/r/${existingUrl.rows[0].short_code}`,
                originalUrl: url,
                shortCode: existingUrl.rows[0].short_code
            });
        }

        const shortCode = nanoid(6);
        
        await db.queryAsync(
            'INSERT INTO urls (original_url, short_code) VALUES (?, ?)',
            [url, shortCode]
        );

        res.json({
            shortUrl: `http://localhost:3000/r/${shortCode}`,
            originalUrl: url,
            shortCode: shortCode
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. إعادة توجيه الرابط المختصر
app.get('/r/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;

        const result = await db.queryAsync(
            'UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?',
            [shortCode]
        );

        if (!result.changes) {
            return res.status(404).json({ error: 'URL not found' });
        }

        // إعادة التوجيه إلى المدونة مع إضافة معرف الرابط المختصر
        res.redirect(`${BLOG_URL}/search?sh_code=${shortCode}&redirect=true`);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. الحصول على إحصائيات الرابط
app.get('/api/stats/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;

        const result = await db.queryAsync(
            'SELECT * FROM urls WHERE short_code = ?',
            [shortCode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'URL not found' });
        }

        res.json({
            originalUrl: result.rows[0].original_url,
            shortCode: result.rows[0].short_code,
            clicks: result.rows[0].clicks,
            createdAt: result.rows[0].created_at
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// إضافة مسار للحصول على الرابط التالي
app.get('/api/next/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;

        // التحقق من صحة الرابط المختصر
        const urlCheck = await db.queryAsync(
            'SELECT * FROM urls WHERE short_code = ?',
            [shortCode]
        );

        if (urlCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid short code' });
        }

        // الحصول على رابط عشوائي جديد من المدونة
        const nextPost = await db.queryAsync(
            'SELECT post_url FROM blog_posts ORDER BY RANDOM() LIMIT 1'
        );

        if (nextPost.rows.length === 0) {
            return res.json({ nextUrl: BLOG_URL });
        }

        const nextUrl = new URL(nextPost.rows[0].post_url);
        nextUrl.searchParams.set('sh_code', shortCode);

        res.json({ nextUrl: nextUrl.toString() });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
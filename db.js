import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// إنشاء مجلد data إذا لم يكن موجوداً
const dataDir = resolve(__dirname, './data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(resolve(dataDir, 'urls.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to SQLite database');
    
    // إنشاء جدول URLs إذا لم يكن موجوداً
    db.run(`
        CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_url TEXT NOT NULL,
            short_code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            clicks INTEGER DEFAULT 0
        )
    `);
});

// تحويل طريقة query إلى Promise
db.queryAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        if (sql.trim().toLowerCase().startsWith('select')) {
            this.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve({ rows });
            });
        } else {
            this.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ rows: [], lastID: this.lastID, changes: this.changes });
            });
        }
    });
};

export default db; 
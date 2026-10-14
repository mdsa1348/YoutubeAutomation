<?php
// YT AutoPilot 3.0 — Unified Database Engine
// Supports MySQL (XAMPP default) with automatic fallback to SQLite (zero setup)

class Database {
    private static $pdo = null;
    private static $driver = 'unknown';

    public static function getConnection() {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        // 1. Try MySQL (XAMPP standard: localhost, root, empty password)
        try {
            $host = 'localhost';
            $user = 'root';
            $pass = '';
            $dbname = 'yt_autopilot';

            // Connect without dbname first to create it if missing
            $initPdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 2
            ]);
            $initPdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            self::$pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            self::$driver = 'mysql';
        } catch (Exception $e) {
            // 2. Fallback to SQLite (built into PHP, zero server required, persistent file)
            try {
                $dbFile = __DIR__ . '/autopilot.sqlite';
                self::$pdo = new PDO("sqlite:$dbFile", null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
                self::$driver = 'sqlite';
            } catch (Exception $sqle) {
                return null;
            }
        }

        if (self::$pdo) {
            self::migrate();
        }

        return self::$pdo;
    }

    public static function getDriver() {
        if (self::$pdo === null) {
            self::getConnection();
        }
        return self::$driver;
    }

    private static function migrate() {
        $p = self::$pdo;
        $isSqlite = self::$driver === 'sqlite';
        $autoInc = $isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT';

        // 1. Channels table
        $p->exec("CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY $autoInc,
            channel_id VARCHAR(100) UNIQUE,
            name VARCHAR(255) NOT NULL,
            handle VARCHAR(100),
            role VARCHAR(50) DEFAULT 'my_channel',
            subscribers BIGINT DEFAULT 0,
            total_views BIGINT DEFAULT 0,
            video_count INT DEFAULT 0,
            median_views BIGINT DEFAULT 0,
            niche VARCHAR(100) DEFAULT 'General',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 2. Video Pipeline Kanban table
        $p->exec("CREATE TABLE IF NOT EXISTS pipeline_videos (
            id INTEGER PRIMARY KEY $autoInc,
            title VARCHAR(255) NOT NULL,
            format VARCHAR(50) DEFAULT 'long',
            keyword VARCHAR(100),
            priority VARCHAR(20) DEFAULT 'medium',
            status VARCHAR(50) DEFAULT 'ideas',
            views BIGINT DEFAULT 0,
            ctr DECIMAL(5,2) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 3. Saved Scripts & Shorts table
        $p->exec("CREATE TABLE IF NOT EXISTS content_library (
            id INTEGER PRIMARY KEY $autoInc,
            type VARCHAR(50) DEFAULT 'script',
            title VARCHAR(255) NOT NULL,
            hook TEXT,
            body TEXT,
            voiceover TEXT,
            hashtags VARCHAR(255),
            duration VARCHAR(20),
            virality_score VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 4. Content Calendar table
        $p->exec("CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY $autoInc,
            scheduled_date DATE,
            day_of_month INT,
            type VARCHAR(50) DEFAULT 'long',
            title VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'planned',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 5. App Settings & API Keys table
        $p->exec("CREATE TABLE IF NOT EXISTS app_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // Seed default channels if empty
        $stmt = $p->query("SELECT COUNT(*) as cnt FROM channels");
        $row = $stmt->fetch();
        if ((int)$row['cnt'] === 0) {
            $p->exec("INSERT INTO channels (channel_id, name, handle, role, subscribers, total_views, video_count, median_views, niche) VALUES
                ('UCX6OQ3DkcsbYNE6H8uQQuVA', 'MrBeast', '@MrBeast', 'niche_leader', 342000000, 68000000000, 840, 142000000, 'Entertainment'),
                ('UCsBjURrPoezykLs9EqgamOA', 'Fireship', '@Fireship', 'top_competitor', 3400000, 420000000, 640, 380000, 'Tech & AI'),
                ('UCnUYZLuoywKbbfhI-HR0HZw', 'Matt Wolfe', '@mreflow', 'top_competitor', 680000, 52000000, 320, 92000, 'AI Tools'),
                ('UCV4Xv8gNl6XkC7o3zU1Gv4g', 'My Tech Channel', '@mychannel', 'my_channel', 142000, 12400000, 88, 48000, 'YouTube Automation')
            ");
        }

        // Seed default pipeline cards if empty
        $stmt2 = $p->query("SELECT COUNT(*) as cnt FROM pipeline_videos");
        $row2 = $stmt2->fetch();
        if ((int)$row2['cnt'] === 0) {
            $p->exec("INSERT INTO pipeline_videos (title, format, keyword, priority, status, views, ctr) VALUES
                ('I Automated My YouTube Channel with Claude MCP', 'long', 'claude mcp', 'high', 'scripting', 0, 0),
                ('5 AI Tools That Feel Illegal to Know in 2026', 'shorts', 'ai tools', 'high', 'ideas', 0, 0),
                ('n8n Full Automation Tutorial (Zero to Hero)', 'tutorial', 'n8n automation', 'medium', 'ideas', 0, 0),
                ('How to Make $10K/mo with Faceless Channels', 'long', 'faceless youtube', 'high', 'production', 0, 0),
                ('Claude 3.7 vs GPT-4.5 for Coding', 'long', 'claude 3.7', 'low', 'published', 84200, 8.4)
            ");
        }
    }
}

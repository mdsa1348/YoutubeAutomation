<?php
// YT AutoPilot 3.0 — Real Data API Bridge & Database Backend
// Supports MySQL / SQLite Database CRUD, Live YouTube API v3, RSS Feeds, and Groq Proxy

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';
$pdo = Database::getConnection();
$driver = Database::getDriver();

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$inputData = json_decode(file_get_contents('php://input'), true) ?? $_POST;

// Helper: curl GET
function httpGet($url, $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $res];
}

// ── 1. DB STATUS ──
if ($action === 'db_status') {
    if (!$pdo) {
        echo json_encode(['success' => false, 'status' => 'disconnected', 'driver' => 'none', 'error' => 'Database connection failed']);
        exit;
    }
    $chCount = (int)$pdo->query("SELECT COUNT(*) FROM channels")->fetchColumn();
    $pipeCount = (int)$pdo->query("SELECT COUNT(*) FROM pipeline_videos")->fetchColumn();
    $libCount = (int)$pdo->query("SELECT COUNT(*) FROM content_library")->fetchColumn();
    $calCount = (int)$pdo->query("SELECT COUNT(*) FROM calendar_events")->fetchColumn();

    echo json_encode([
        'success' => true,
        'status' => 'connected',
        'driver' => $driver,
        'stats' => [
            'channels' => $chCount,
            'pipeline_cards' => $pipeCount,
            'saved_content' => $libCount,
            'calendar_events' => $calCount
        ]
    ]);
    exit;
}

// ── 2. GET ALL DB DATA ──
if ($action === 'get_all') {
    if (!$pdo) {
        echo json_encode(['success' => false, 'error' => 'No database']);
        exit;
    }
    $channels = $pdo->query("SELECT * FROM channels ORDER BY id ASC")->fetchAll();
    $pipeline = $pdo->query("SELECT * FROM pipeline_videos ORDER BY id ASC")->fetchAll();
    $content = $pdo->query("SELECT * FROM content_library ORDER BY id DESC LIMIT 50")->fetchAll();
    $calendar = $pdo->query("SELECT * FROM calendar_events ORDER BY id ASC")->fetchAll();
    $settingsRaw = $pdo->query("SELECT setting_key, setting_value FROM app_settings")->fetchAll();
    $settings = [];
    foreach ($settingsRaw as $s) {
        $settings[$s['setting_key']] = $s['setting_value'];
    }

    echo json_encode([
        'success' => true,
        'driver' => $driver,
        'data' => [
            'channels' => $channels,
            'pipeline' => $pipeline,
            'content_library' => $content,
            'calendar' => $calendar,
            'settings' => $settings
        ]
    ]);
    exit;
}

// ── 3. CHANNELS CRUD ──
if ($action === 'save_channel') {
    $cid = $inputData['channel_id'] ?? '';
    $name = $inputData['name'] ?? '';
    $role = $inputData['role'] ?? 'my_channel';
    $subs = (int)($inputData['subscribers'] ?? 0);
    $views = (int)($inputData['total_views'] ?? 0);
    $vids = (int)($inputData['video_count'] ?? 0);
    $med = (int)($inputData['median_views'] ?? 0);
    $niche = $inputData['niche'] ?? 'General';
    $handle = $inputData['handle'] ?? '';

    if (empty($name)) {
        echo json_encode(['success' => false, 'error' => 'Name required']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO channels (channel_id, name, handle, role, subscribers, total_views, video_count, median_views, niche) 
        VALUES (:cid, :name, :handle, :role, :subs, :views, :vids, :med, :niche)");
    $stmt->execute([
        ':cid' => $cid ?: 'ch_' . time(),
        ':name' => $name,
        ':handle' => $handle,
        ':role' => $role,
        ':subs' => $subs,
        ':views' => $views,
        ':vids' => $vids,
        ':med' => $med,
        ':niche' => $niche
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

if ($action === 'delete_channel') {
    $id = (int)($inputData['id'] ?? $_GET['id'] ?? 0);
    if ($id) {
        $pdo->prepare("DELETE FROM channels WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Missing ID']);
    }
    exit;
}

// ── 4. PIPELINE CRUD ──
if ($action === 'save_pipeline_card') {
    $title = $inputData['title'] ?? '';
    $format = $inputData['format'] ?? 'long';
    $keyword = $inputData['keyword'] ?? '';
    $priority = $inputData['priority'] ?? 'medium';
    $status = $inputData['status'] ?? 'ideas';
    $views = (int)($inputData['views'] ?? 0);
    $ctr = (float)($inputData['ctr'] ?? 0);

    if (empty($title)) {
        echo json_encode(['success' => false, 'error' => 'Title required']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO pipeline_videos (title, format, keyword, priority, status, views, ctr)
        VALUES (:title, :format, :keyword, :priority, :status, :views, :ctr)");
    $stmt->execute([
        ':title' => $title,
        ':format' => $format,
        ':keyword' => $keyword,
        ':priority' => $priority,
        ':status' => $status,
        ':views' => $views,
        ':ctr' => $ctr
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

if ($action === 'update_pipeline_status') {
    $id = (int)($inputData['id'] ?? 0);
    $status = $inputData['status'] ?? 'ideas';
    if ($id) {
        $pdo->prepare("UPDATE pipeline_videos SET status = ? WHERE id = ?")->execute([$status, $id]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Missing ID']);
    }
    exit;
}

if ($action === 'delete_pipeline_card') {
    $id = (int)($inputData['id'] ?? $_GET['id'] ?? 0);
    if ($id) {
        $pdo->prepare("DELETE FROM pipeline_videos WHERE id = ?")->execute([$id]);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Missing ID']);
    }
    exit;
}

// ── 5. SAVE CONTENT (SCRIPTS & SHORTS) ──
if ($action === 'save_content') {
    $type = $inputData['type'] ?? 'script';
    $title = $inputData['title'] ?? 'Untitled Concept';
    $hook = $inputData['hook'] ?? '';
    $body = $inputData['body'] ?? '';
    $voiceover = $inputData['voiceover'] ?? '';
    $hashtags = $inputData['hashtags'] ?? '';
    $duration = $inputData['duration'] ?? '40s';
    $virality = $inputData['virality_score'] ?? '90/100';

    $stmt = $pdo->prepare("INSERT INTO content_library (type, title, hook, body, voiceover, hashtags, duration, virality_score)
        VALUES (:type, :title, :hook, :body, :voiceover, :hashtags, :duration, :virality)");
    $stmt->execute([
        ':type' => $type,
        ':title' => $title,
        ':hook' => $hook,
        ':body' => $body,
        ':voiceover' => $voiceover,
        ':hashtags' => $hashtags,
        ':duration' => $duration,
        ':virality' => $virality
    ]);
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

// ── 6. SETTINGS ──
if ($action === 'save_setting') {
    $key = $inputData['key'] ?? '';
    $val = $inputData['value'] ?? '';
    if ($key) {
        $stmt = $pdo->prepare("INSERT INTO app_settings (setting_key, setting_value) VALUES (:k, :v)
            ON DUPLICATE KEY UPDATE setting_value = :v2");
        if ($driver === 'sqlite') {
            $stmt = $pdo->prepare("INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (:k, :v)");
            $stmt->execute([':k' => $key, ':v' => $val]);
        } else {
            $stmt->execute([':k' => $key, ':v' => $val, ':v2' => $val]);
        }
        echo json_encode(['success' => true]);
        exit;
    }
    echo json_encode(['success' => false, 'error' => 'Missing key']);
    exit;
}

// ── 7. TEST GROQ API KEY ──
if ($action === 'test_groq') {
    $apiKey = $_GET['key'] ?? $inputData['key'] ?? '';
    if (empty($apiKey)) {
        echo json_encode(['success' => false, 'error' => 'API key is required']);
        exit;
    }
    $res = httpGet('https://api.groq.com/openai/v1/models', ["Authorization: Bearer $apiKey"]);
    if ($res['code'] === 200) {
        $data = json_decode($res['body'], true);
        echo json_encode(['success' => true, 'models' => array_column($data['data'] ?? [], 'id')]);
    } else {
        echo json_encode(['success' => false, 'error' => "Groq returned HTTP {$res['code']}", 'raw' => $res['body']]);
    }
    exit;
}

// ── 8. TEST YOUTUBE API KEY ──
if ($action === 'test_youtube') {
    $apiKey = $_GET['key'] ?? $inputData['key'] ?? '';
    if (empty($apiKey)) {
        echo json_encode(['success' => false, 'error' => 'YouTube API key is required']);
        exit;
    }
    $res = httpGet("https://www.googleapis.com/youtube/v3/videos?part=snippet&id=Ks-_Mh1QhMc&key=$apiKey");
    if ($res['code'] === 200) {
        echo json_encode(['success' => true, 'message' => 'YouTube Data API v3 key verified successfully!']);
    } else {
        $err = json_decode($res['body'], true);
        $msg = $err['error']['message'] ?? "HTTP {$res['code']}";
        echo json_encode(['success' => false, 'error' => $msg]);
    }
    exit;
}

// ── 9. CHANNEL RSS ──
if ($action === 'channel_rss') {
    $channelId = $_GET['channel_id'] ?? 'UCX6OQ3DkcsbYNE6H8uQQuVA'; // Default MrBeast
    $res = httpGet("https://www.youtube.com/feeds/videos.xml?channel_id=$channelId");
    
    if ($res['code'] !== 200 || empty($res['body'])) {
        echo json_encode(['success' => false, 'error' => "Failed to fetch YouTube feed (HTTP {$res['code']})"]);
        exit;
    }

    $xml = $res['body'];
    preg_match('/<title>([^<]+)<\/title>/', $xml, $chTitle);
    preg_match_all('/<entry>(.*?)<\/entry>/s', $xml, $entries);

    $videos = [];
    foreach ($entries[1] as $entry) {
        preg_match('/<title>([^<]+)<\/title>/', $entry, $t);
        preg_match('/<yt:videoId>([^<]+)<\/yt:videoId>/', $entry, $v);
        preg_match('/<published>([^<]+)<\/published>/', $entry, $p);
        preg_match('/count="(\d+)"/', $entry, $c);

        $vidId = $v[1] ?? '';
        $views = isset($c[1]) ? (int)$c[1] : 0;

        if ($vidId) {
            $videos[] = [
                'id' => $vidId,
                'title' => html_entity_decode($t[1] ?? 'Untitled', ENT_QUOTES | ENT_XML1, 'UTF-8'),
                'published' => $p[1] ?? '',
                'views' => $views,
                'thumbnail' => "https://i.ytimg.com/vi/$vidId/hqdefault.jpg",
                'url' => "https://www.youtube.com/watch?v=$vidId"
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'channel_title' => $chTitle[1] ?? 'YouTube Channel',
        'channel_id' => $channelId,
        'video_count' => count($videos),
        'videos' => $videos
    ]);
    exit;
}

// ── 10. RESOLVE CHANNEL (NO DUMMY DATA - REAL YOUTUBE STATS & VIDEOS) ──
if ($action === 'resolve_channel') {
    $rawInput = trim($_GET['handle'] ?? $_GET['channel_id'] ?? $inputData['handle'] ?? $inputData['channel_id'] ?? '');
    if (empty($rawInput)) {
        echo json_encode(['success' => false, 'error' => 'Channel handle or ID is required']);
        exit;
    }

    $cleanHandle = ltrim($rawInput, '@');
    $isDirectCid = (strpos($cleanHandle, 'UC') === 0 && strlen($cleanHandle) === 24);

    $targetUrl = $isDirectCid 
        ? "https://www.youtube.com/channel/$cleanHandle"
        : "https://www.youtube.com/@$cleanHandle";

    $pageRes = httpGet($targetUrl);
    $html = $pageRes['body'] ?? '';

    $channelId = $isDirectCid ? $cleanHandle : '';
    if (!$channelId) {
        if (preg_match('/"browseId":"(UC[a-zA-Z0-9_-]{22})"/', $html, $m)) {
            $channelId = $m[1];
        } elseif (preg_match('/"channelId":"(UC[a-zA-Z0-9_-]{22})"/', $html, $m)) {
            $channelId = $m[1];
        } elseif (preg_match('/\/channel\/(UC[a-zA-Z0-9_-]{22})/', $html, $m)) {
            $channelId = $m[1];
        }
    }

    $title = $cleanHandle;
    if (preg_match('/"channelProfileMicroformatDetails":\{.*?"name":"([^"]+)"/s', $html, $m)) {
        $title = $m[1];
    } elseif (preg_match('/<meta property="og:title" content="([^"]+)"/', $html, $m)) {
        $title = $m[1];
    }
    // Clean suffix like " - YouTube"
    $title = preg_replace('/\s*-\s*YouTube$/i', '', $title);

    $subs = 0;
    if (preg_match('/"userInteractionCount":"(\d+)"/', $html, $m)) {
        $subs = (int)$m[1];
    } elseif (preg_match('/"simpleText":"([0-9.,KMBkmb]+)\s+subscribers?"/i', $html, $m)) {
        $s = $m[1];
        if (stripos($s, 'M') !== false) $subs = (int)((float)$s * 1000000);
        elseif (stripos($s, 'K') !== false) $subs = (int)((float)$s * 1000);
        else $subs = (int)str_replace(',', '', $s);
    }

    $avatar = '';
    if (preg_match('/"avatar":\{.*?"url":"([^"]+)"/s', $html, $m)) {
        $avatar = $m[1];
    } elseif (preg_match('/"thumbnails":\[\{"url":"([^"]+)"/s', $html, $m)) {
        $avatar = $m[1];
    }

    $description = '';
    if (preg_match('/<meta property="og:description" content="([^"]+)"/', $html, $m)) {
        $description = html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    // Fetch video uploads from RSS feed
    $videos = [];
    $totalViews = 0;
    if ($channelId) {
        $feedRes = httpGet("https://www.youtube.com/feeds/videos.xml?channel_id=$channelId");
        $xml = $feedRes['body'] ?? '';
        if (!empty($xml)) {
            preg_match_all('/<entry>(.*?)<\/entry>/s', $xml, $entries);
            foreach ($entries[1] as $entry) {
                preg_match('/<title>([^<]+)<\/title>/', $entry, $t);
                preg_match('/<yt:videoId>([^<]+)<\/yt:videoId>/', $entry, $v);
                preg_match('/<published>([^<]+)<\/published>/', $entry, $p);
                preg_match('/count="(\d+)"/', $entry, $c);

                $vidId = $v[1] ?? '';
                $vViews = isset($c[1]) ? (int)$c[1] : 0;
                $totalViews += $vViews;
                if ($vidId) {
                    $videos[] = [
                        'id' => $vidId,
                        'title' => html_entity_decode($t[1] ?? 'Untitled', ENT_QUOTES | ENT_XML1, 'UTF-8'),
                        'published' => $p[1] ?? '',
                        'views' => $vViews,
                        'thumbnail' => "https://i.ytimg.com/vi/$vidId/hqdefault.jpg",
                        'url' => "https://www.youtube.com/watch?v=$vidId"
                    ];
                }
            }
        }
    }

    $videoCount = count($videos);
    $medianViews = 0;
    if ($videoCount > 0) {
        $viewsArr = array_column($videos, 'views');
        sort($viewsArr);
        $mid = floor($videoCount / 2);
        $medianViews = ($videoCount % 2 !== 0) ? $viewsArr[$mid] : ($viewsArr[$mid - 1] + $viewsArr[$mid]) / 2;
    }

    // Auto-save or update in Database if available
    if ($pdo && !empty($channelId)) {
        try {
            $stmt = $pdo->prepare("SELECT id FROM channels WHERE channel_id = ? OR handle = ?");
            $stmt->execute([$channelId, '@' . $cleanHandle]);
            $existing = $stmt->fetch();

            if ($existing) {
                $up = $pdo->prepare("UPDATE channels SET name = :name, subscribers = :subs, total_views = :views, video_count = :vids, median_views = :med WHERE id = :id");
                $up->execute([
                    ':name' => $title,
                    ':subs' => $subs,
                    ':views' => $totalViews,
                    ':vids' => $videoCount,
                    ':med' => (int)$medianViews,
                    ':id' => $existing['id']
                ]);
            } else {
                $ins = $pdo->prepare("INSERT INTO channels (channel_id, name, handle, role, subscribers, total_views, video_count, median_views, niche) 
                    VALUES (:cid, :name, :handle, 'my_channel', :subs, :views, :vids, :med, 'Gaming / Creator')");
                $ins->execute([
                    ':cid' => $channelId,
                    ':name' => $title,
                    ':handle' => '@' . $cleanHandle,
                    ':subs' => $subs,
                    ':views' => $totalViews,
                    ':vids' => $videoCount,
                    ':med' => (int)$medianViews
                ]);
            }
        } catch (Exception $e) {
            // DB auto-save optional
        }
    }

    echo json_encode([
        'success' => true,
        'channel_id' => $channelId,
        'name' => $title,
        'handle' => '@' . $cleanHandle,
        'subscribers' => $subs,
        'total_views' => $totalViews,
        'video_count' => $videoCount,
        'median_views' => (int)$medianViews,
        'avatar' => $avatar ?: '🔴',
        'description' => $description,
        'videos' => $videos
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ── 9. CHECK FFMPEG BINARY STATUS ──
if ($action === 'check_ffmpeg') {
    $output = @shell_exec('ffmpeg -version 2>&1');
    if ($output && stripos($output, 'ffmpeg version') !== false) {
        $lines = explode("\n", trim($output));
        echo json_encode([
            'success' => true,
            'installed' => true,
            'version' => $lines[0] ?? 'FFmpeg Ready',
            'message' => 'FFmpeg binary available in PATH'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'installed' => false,
            'version' => null,
            'message' => 'FFmpeg not detected in PATH. Export batch script (.bat) to run locally.'
        ]);
    }
    exit;
}

echo json_encode([
    'service' => 'YT AutoPilot 3.0 Backend Engine',
    'status' => 'online',
    'database' => $driver,
    'actions' => ['db_status', 'get_all', 'save_channel', 'delete_channel', 'save_pipeline_card', 'save_content', 'test_groq', 'test_youtube', 'channel_rss', 'resolve_channel', 'check_ffmpeg']
]);


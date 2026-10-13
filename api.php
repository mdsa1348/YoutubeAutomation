<?php
// YT AutoPilot 2.0 - Real Data API Bridge
// Supports live YouTube Data API v3, YouTube RSS feeds, and Groq AI proxy

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

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

// 1. ACTION: Test Groq API Key
if ($action === 'test_groq') {
    $apiKey = $_GET['key'] ?? '';
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

// 2. ACTION: Test YouTube API Key
if ($action === 'test_youtube') {
    $apiKey = $_GET['key'] ?? '';
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

// 3. ACTION: Fetch Real Channel Videos via RSS
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

echo json_encode([
    'service' => 'YT AutoPilot Real Data API Bridge',
    'status' => 'online',
    'actions' => ['test_groq', 'test_youtube', 'channel_rss']
]);

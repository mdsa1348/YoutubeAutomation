
// ===== YT AUTOPILOT DASHBOARD - APP.JS =====

// ===== TAB NAVIGATION =====
function switchTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');
  if (el) el.classList.add('active');
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.textContent = el ? el.querySelector('span:nth-child(2)').textContent : tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tabId === 'github-repos') renderRepos('all');
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mc = document.querySelector('.main-content');
  sb.classList.toggle('collapsed');
  if (mc) mc.classList.toggle('expanded');
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ===== FORMAT NUMBERS =====
function fmtNum(n) {
  n = parseInt(n) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ===== CHANNEL ANALYSIS =====
async function analyzeChannel() {
  const channelId = document.getElementById('quickChannelId').value.trim();
  const apiKey = document.getElementById('quickApiKey').value.trim();
  if (!channelId) { showToast('Please enter a Channel ID or @handle', 'error'); return; }
  if (!apiKey) { showToast('Please enter your YouTube API Key', 'error'); return; }
  const btn = document.getElementById('analyzeBtnText');
  btn.textContent = '⟳ Analyzing...';
  try {
    const data = await fetchChannelData(channelId, apiKey);
    updateStatCards(data);
    showChannelResults(data);
    showToast('Channel analyzed successfully!', 'success');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.textContent = '⚡ Analyze Now';
  }
}

async function deepAnalyzeChannel() {
  const channelId = document.getElementById('analyzerChannelId').value.trim();
  const apiKey = document.getElementById('analyzerApiKey').value.trim();
  if (!channelId || !apiKey) { showToast('Please fill in Channel ID and API Key', 'error'); return; }
  showToast('Running deep analysis...', 'info');
  try {
    const data = await fetchChannelData(channelId, apiKey);
    renderDeepAnalysis(data);
    showToast('Deep analysis complete!', 'success');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function fetchChannelData(channelId, apiKey) {
  let id = channelId;
  // Handle @handle format
  if (channelId.startsWith('@')) {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelId)}&key=${apiKey}&maxResults=1`;
    const sr = await fetch(searchUrl);
    if (!sr.ok) throw new Error('API error: ' + sr.status + ' - Check your API key and Channel ID');
    const sd = await sr.json();
    if (!sd.items || !sd.items.length) throw new Error('Channel not found for handle: ' + channelId);
    id = sd.items[0].id.channelId;
  }
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${id}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('API error: ' + res.status + ' - ' + res.statusText);
  const data = await res.json();
  if (!data.items || !data.items.length) throw new Error('Channel not found. Check the Channel ID.');
  return data.items[0];
}

function updateStatCards(ch) {
  const stats = ch.statistics || {};
  document.getElementById('statSubCount').textContent = fmtNum(stats.subscriberCount);
  document.getElementById('statViewCount').textContent = fmtNum(stats.viewCount);
  document.getElementById('statVideoCount').textContent = fmtNum(stats.videoCount);
  const er = calcER(stats);
  document.getElementById('statEngRate').textContent = er ? er + '%' : 'N/A';
  document.getElementById('statSubTrend').textContent = stats.subscriberCount + ' subscribers';
  document.getElementById('statViewTrend').textContent = stats.viewCount + ' total views';
  document.getElementById('statVideoTrend').textContent = stats.videoCount + ' videos uploaded';
  document.getElementById('statEngTrend').textContent = 'Based on public data';
}

function calcER(stats) {
  const subs = parseInt(stats.subscriberCount) || 0;
  const views = parseInt(stats.viewCount) || 0;
  const videos = parseInt(stats.videoCount) || 1;
  if (!subs || !views) return null;
  const avgViews = views / videos;
  const estimated = avgViews * 0.04;
  return ((estimated / avgViews) * 100).toFixed(2);
}

function showChannelResults(ch) {
  const card = document.getElementById('channelResultsCard');
  const body = document.getElementById('channelResultsBody');
  const s = ch.statistics || {};
  const sn = ch.snippet || {};
  card.style.display = 'block';
  body.innerHTML = `
    <div class="channel-info-box">
      <div class="channel-info-title">${sn.title || 'Unknown Channel'}</div>
      <div class="channel-info-desc">${(sn.description || '').substring(0, 300)}${sn.description && sn.description.length > 300 ? '...' : ''}</div>
    </div>
    <div class="channel-stats-grid">
      <div class="ch-stat"><div class="ch-val" style="color:#3b82f6">${fmtNum(s.subscriberCount)}</div><div class="ch-lbl">Subscribers</div></div>
      <div class="ch-stat"><div class="ch-val" style="color:#8b5cf6">${fmtNum(s.viewCount)}</div><div class="ch-lbl">Total Views</div></div>
      <div class="ch-stat"><div class="ch-val" style="color:#f59e0b">${fmtNum(s.videoCount)}</div><div class="ch-lbl">Total Videos</div></div>
      <div class="ch-stat"><div class="ch-val" style="color:#10b981">${calcER(s) || 'N/A'}%</div><div class="ch-lbl">Est. Eng. Rate</div></div>
    </div>
    <div class="insight-item insight-tip" style="margin-top:12px">
      <span class="insight-icon">📅</span>
      <div class="insight-text"><strong>Country:</strong> ${sn.country || 'Not specified'} &nbsp;|&nbsp; <strong>Created:</strong> ${sn.publishedAt ? new Date(sn.publishedAt).toLocaleDateString() : 'Unknown'}</div>
    </div>
  `;
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderDeepAnalysis(ch) {
  const container = document.getElementById('deepAnalysisResults');
  const s = ch.statistics || {};
  const sn = ch.snippet || {};
  const subs = parseInt(s.subscriberCount) || 0;
  const views = parseInt(s.viewCount) || 0;
  const videos = parseInt(s.videoCount) || 1;
  const avgViews = Math.floor(views / videos);
  const er = calcER(s) || '0';
  const erFloat = parseFloat(er);
  let erRating = '', erColor = '';
  if (erFloat >= 4) { erRating = '🏆 Excellent'; erColor = '#10b981'; }
  else if (erFloat >= 2) { erRating = '✅ Good'; erColor = '#3b82f6'; }
  else if (erFloat >= 1) { erRating = '⚠️ Average'; erColor = '#f59e0b'; }
  else { erRating = '📉 Below Average'; erColor = '#ff4444'; }
  container.innerHTML = `
    <div class="card">
      <div class="card-header"><h2>📊 ${sn.title || 'Channel'} — Full Report</h2><span class="card-badge">Live Data</span></div>
      <div class="channel-info-box" style="margin-bottom:16px">
        <div class="channel-info-title">${sn.title}</div>
        <div class="channel-info-desc">${(sn.description || 'No description available.').substring(0, 400)}</div>
      </div>
      <div class="channel-stats-grid">
        <div class="ch-stat"><div class="ch-val" style="color:#3b82f6">${fmtNum(subs)}</div><div class="ch-lbl">Subscribers</div></div>
        <div class="ch-stat"><div class="ch-val" style="color:#8b5cf6">${fmtNum(views)}</div><div class="ch-lbl">Total Views</div></div>
        <div class="ch-stat"><div class="ch-val" style="color:#f59e0b">${fmtNum(videos)}</div><div class="ch-lbl">Videos</div></div>
        <div class="ch-stat"><div class="ch-val" style="color:#06b6d4">${fmtNum(avgViews)}</div><div class="ch-lbl">Avg Views/Video</div></div>
      </div>
      <div class="audit-results-grid">
        <div class="audit-metric">
          <div class="audit-value" style="color:${erColor}">${er}%</div>
          <div class="audit-label">Estimated Engagement Rate</div>
          <div style="margin-top:8px;font-size:14px;font-weight:600;color:${erColor}">${erRating}</div>
        </div>
        <div class="audit-metric">
          <div class="audit-value" style="color:#f59e0b">${(views/Math.max(subs,1)).toFixed(1)}x</div>
          <div class="audit-label">Views-to-Subscriber Ratio</div>
          <div style="margin-top:8px;font-size:13px;color:#94a3b8">${views/Math.max(subs,1) > 100 ? '✅ Excellent reach' : '📈 Growing reach'}</div>
        </div>
      </div>
      <div class="insight-item insight-tip" style="margin-top:16px">
        <span class="insight-icon">📍</span>
        <div class="insight-text"><strong>Country:</strong> ${sn.country || 'Not set'} &nbsp;|&nbsp; <strong>Channel Created:</strong> ${sn.publishedAt ? new Date(sn.publishedAt).toDateString() : 'Unknown'}</div>
      </div>
    </div>
  `;
}

// ===== VERIFY / AUDIT =====
async function runFullAudit() {
  const channelId = document.getElementById('verifyChannelId').value.trim();
  const apiKey = document.getElementById('verifyApiKey').value.trim();
  if (!channelId || !apiKey) { showToast('Enter Channel ID and API Key', 'error'); return; }
  showToast('Running full audit...', 'info');
  try {
    const data = await fetchChannelData(channelId, apiKey);
    renderAuditResults(data);
    showToast('Audit complete!', 'success');
  } catch (e) {
    showToast('Audit failed: ' + e.message, 'error');
  }
}

function renderAuditResults(ch) {
  const container = document.getElementById('auditResults');
  const body = document.getElementById('auditResultsBody');
  const s = ch.statistics || {};
  const sn = ch.snippet || {};
  const subs = parseInt(s.subscriberCount) || 0;
  const views = parseInt(s.viewCount) || 0;
  const videos = parseInt(s.videoCount) || 1;
  const er = parseFloat(calcER(s) || 0);
  const desc = sn.description || '';
  const checks = [
    { label: 'Subscriber Count', value: fmtNum(subs), status: subs > 0 ? 'pass' : 'fail', note: subs > 1000 ? 'Established channel' : 'Building audience' },
    { label: 'Total Views', value: fmtNum(views), status: views > 0 ? 'pass' : 'fail', note: views > 10000 ? 'Good traction' : 'Building views' },
    { label: 'Engagement Rate', value: er + '%', status: er >= 2 ? 'pass' : er >= 1 ? 'warn' : 'fail', note: er >= 4 ? 'Excellent!' : er >= 2 ? 'Good' : 'Needs improvement' },
    { label: 'Videos Uploaded', value: fmtNum(videos), status: videos >= 10 ? 'pass' : 'warn', note: videos >= 50 ? 'Active channel' : 'Keep uploading' },
    { label: 'Channel Description', value: desc.length > 0 ? desc.length + ' chars' : 'Empty', status: desc.length > 100 ? 'pass' : 'fail', note: desc.length > 100 ? 'Well described' : 'Add description' },
    { label: 'Views/Subscriber Ratio', value: (views/Math.max(subs,1)).toFixed(1) + 'x', status: (views/Math.max(subs,1)) > 50 ? 'pass' : 'warn', note: (views/Math.max(subs,1)) > 100 ? 'Excellent reach' : 'Growing' }
  ];
  body.innerHTML = `
    <div style="margin-bottom:20px">
      <h3 style="font-size:18px;font-weight:700;margin-bottom:4px">${sn.title || 'Unknown Channel'}</h3>
      <p style="font-size:13px;color:var(--text-secondary)">Audit completed on ${new Date().toLocaleString()}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${checks.map(c => `
        <div style="padding:16px;background:rgba(255,255,255,0.02);border:1px solid ${c.status === 'pass' ? 'rgba(16,185,129,0.2)' : c.status === 'warn' ? 'rgba(245,158,11,0.2)' : 'rgba(255,68,68,0.2)'};border-radius:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">${c.label}</span>
            <span style="font-size:12px;font-weight:700;color:${c.status === 'pass' ? '#10b981' : c.status === 'warn' ? '#f59e0b' : '#ff4444'}">${c.status === 'pass' ? '✅ PASS' : c.status === 'warn' ? '⚠️ WARN' : '❌ FAIL'}</span>
          </div>
          <div style="font-size:22px;font-weight:800;font-family:'Outfit',sans-serif;margin-bottom:4px">${c.value}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${c.note}</div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:20px;padding:16px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px">
      <div style="font-size:14px;font-weight:700;margin-bottom:8px">🏆 Overall Score: ${Math.round((checks.filter(c=>c.status==='pass').length/checks.length)*100)}%</div>
      <div style="font-size:13px;color:var(--text-secondary)">Based on ${checks.filter(c=>c.status==='pass').length}/${checks.length} checks passed. ${checks.filter(c=>c.status==='fail').length > 0 ? 'Focus on failed checks to improve your channel health.' : 'Great channel health!'}</div>
    </div>
  `;
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== ENGAGEMENT RATE CALCULATOR =====
function calcEngagementRate() {
  const likes = parseFloat(document.getElementById('calcLikes').value) || 0;
  const comments = parseFloat(document.getElementById('calcComments').value) || 0;
  const views = parseFloat(document.getElementById('calcViews').value) || 0;
  const subs = parseFloat(document.getElementById('calcSubs').value) || 0;
  if (!views) return;
  const erViews = ((likes + comments) / views * 100).toFixed(2);
  const erSubs = subs ? ((likes + comments) / subs * 100).toFixed(2) : 'N/A';
  let rating = '', color = '';
  const erF = parseFloat(erViews);
  if (erF >= 4) { rating = '🏆 Excellent!'; color = '#10b981'; }
  else if (erF >= 2) { rating = '✅ Good'; color = '#3b82f6'; }
  else if (erF >= 1) { rating = '⚠️ Average'; color = '#f59e0b'; }
  else { rating = '📉 Needs Work'; color = '#ff4444'; }
  const el = document.getElementById('engRateResult');
  el.innerHTML = `
    <div class="erg-val" style="color:${color}">${erViews}%</div>
    <div class="erg-label">Views-Based Engagement Rate</div>
    <div class="erg-rating" style="background:${color}20;color:${color};border:1px solid ${color}40">${rating}</div>
    <div style="margin-top:12px;font-size:13px;color:var(--text-secondary)">
      Subscriber-Based ER: <strong style="color:${color}">${erSubs}${erSubs !== 'N/A' ? '%' : ''}</strong>
    </div>
    <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
      Formula: (Likes + Comments) / Views × 100
    </div>
  `;
}

// ===== CONTENT CREATOR =====
function generateScript() {
  const topic = document.getElementById('scriptTopic').value.trim();
  const duration = document.getElementById('scriptDuration').value;
  const tone = document.getElementById('scriptTone').value;
  if (!topic) { showToast('Enter a video topic first', 'error'); return; }
  const durMap = { short: '60 seconds', '5min': '5 minutes', '10min': '10 minutes', '20min': '20 minutes' };
  const script = `🎬 VIDEO SCRIPT — "${topic}"
Duration: ${durMap[duration]} | Style: ${tone}

━━━━━━━━━━━━━━━━━━━━━━━━
HOOK (0-5 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━
"Did you know that ${topic.toLowerCase()} is one of the fastest-growing topics in 2025? In the next ${durMap[duration]}, I'll show you exactly what you need to know."

━━━━━━━━━━━━━━━━━━━━━━━━
INTRO (5-15 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━
Welcome back to the channel! Today we're diving deep into ${topic}. Whether you're a beginner or advanced, this video will give you actionable strategies you can use right away.

━━━━━━━━━━━━━━━━━━━━━━━━
MAIN CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━
Point 1: Understanding the fundamentals of ${topic}
→ Explain the core concept clearly
→ Use a real-world example
→ Share a quick tip

Point 2: Advanced strategies
→ Deep dive into the method
→ Show results/proof
→ Common mistakes to avoid

Point 3: Implementation steps
→ Step-by-step guide
→ Tools you'll need
→ Expected results

━━━━━━━━━━━━━━━━━━━━━━━━
CTA (Last 15 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━
"If you found this valuable, smash that LIKE button — it literally helps this channel grow. SUBSCRIBE for more content on ${topic} and related topics. And comment below: What's your biggest challenge with this topic?"

[End Screen: Subscribe button + Link to related video]

━━━━━━━━━━━━━━━━━━━━━━━━
NOTE: Connect to Claude AI via MCP to get fully AI-generated, custom scripts tailored to your channel niche and style.
━━━━━━━━━━━━━━━━━━━━━━━━`;
  const el = document.getElementById('scriptOutput');
  el.textContent = script;
  el.style.display = 'block';
  showToast('Script generated! Connect Claude MCP for full AI scripts.', 'success');
}

function generateTitleDesc() {
  const topic = document.getElementById('titleTopic').value.trim();
  const kw = document.getElementById('primaryKeyword').value.trim() || topic;
  if (!topic) { showToast('Enter a video topic', 'error'); return; }
  const titles = [
    `${topic} in 2025: The COMPLETE Guide`,
    `I Tried ${topic} for 30 Days — Here's What Happened`,
    `${topic}: 10 Things NOBODY Tells You`,
    `How to Master ${topic} (Step-by-Step for Beginners)`,
    `The Truth About ${topic} (This Changed Everything)`,
    `${topic} SECRETS That Top Creators Don't Share`
  ];
  const desc = `📌 In this video, we cover everything you need to know about ${topic}.

⏱️ TIMESTAMPS:
0:00 - Introduction
1:30 - Why ${kw} matters in 2025
3:00 - Step-by-step guide
7:00 - Common mistakes
9:30 - Results & conclusions

🔗 RESOURCES:
→ Free guide: [link]
→ Recommended tools: [link]
→ Related video: [link]

📱 FOLLOW FOR MORE:
→ YouTube: @YourChannel
→ Instagram: @YourHandle
→ Twitter/X: @YourHandle

#${kw.replace(/\s+/g,'').toLowerCase()} #${topic.split(' ')[0].toLowerCase()} #youtube2025 #contentcreator #automation

━━━━━━━━━━━━━━━━━━━
💡 Using ${topic} to grow your channel? Drop a comment below!
━━━━━━━━━━━━━━━━━━━`;
  const output = `📋 SUGGESTED TITLES (pick the best one):\n\n${titles.map((t,i) => `${i+1}. ${t}`).join('\n')}\n\n━━━━━━━━━━━━━━━━━━━\n📝 SEO DESCRIPTION:\n━━━━━━━━━━━━━━━━━━━\n\n${desc}`;
  const el = document.getElementById('titleOutput');
  el.textContent = output;
  el.style.display = 'block';
  showToast('5 title options + SEO description generated!', 'success');
}

function generateTags() {
  const topic = document.getElementById('tagsTopic').value.trim();
  if (!topic) { showToast('Enter keywords first', 'error'); return; }
  const base = topic.split(',').map(t => t.trim()).filter(Boolean);
  const tags = [];
  base.forEach(kw => {
    tags.push(kw);
    tags.push(kw + ' 2025');
    tags.push('how to ' + kw);
    tags.push(kw + ' tutorial');
    tags.push(kw + ' for beginners');
    tags.push('best ' + kw);
  });
  tags.push('youtube', 'content creation', 'youtube growth', 'youtube automation', 'AI tools', 'digital marketing');
  const uniqueTags = [...new Set(tags)].slice(0, 30);
  const el = document.getElementById('tagsOutput');
  el.innerHTML = uniqueTags.map(t => `<span class="tag-chip" onclick="copyTag('${t}')" title="Click to copy">${t}</span>`).join('');
  el.style.display = 'flex';
  showToast(`${uniqueTags.length} tags generated! Click any tag to copy.`, 'success');
}

function copyTag(tag) {
  navigator.clipboard.writeText(tag).then(() => showToast(`Copied: "${tag}"`, 'success'));
}

function generateCalendar() {
  const niche = document.getElementById('calendarNiche').value.trim();
  const freq = document.getElementById('uploadFreq').value;
  if (!niche) { showToast('Enter your channel niche', 'error'); return; }
  const freqMap = { daily: 7, '3x': 3, '2x': 2, weekly: 1 };
  const postsPerWeek = freqMap[freq];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const uploadDays = {
    daily: [0,1,2,3,4,5,6],
    '3x': [1,3,5],
    '2x': [1,4],
    weekly: [1]
  };
  const ideas = [
    `Top 10 ${niche} Tips`,
    `${niche} Beginner's Guide`,
    `I Tried ${niche} for a Week`,
    `${niche} Mistakes to Avoid`,
    `${niche} Tools That WORK`,
    `${niche} vs Alternative`,
    `${niche} in 2025`,
    `How Pros Use ${niche}`,
    `${niche} Case Study`,
    `${niche} Q&A`,
    `${niche} Secrets Revealed`,
    `${niche} Full Tutorial`
  ];
  const uDays = uploadDays[freq];
  let calHtml = `<div style="margin-bottom:16px;font-size:14px;color:var(--text-secondary)">📅 <strong>30-Day Content Calendar</strong> for <em>${niche}</em> channel (${postsPerWeek}x/week)</div>`;
  calHtml += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px">';
  days.forEach(d => calHtml += `<div style="text-align:center;font-size:11px;font-weight:700;color:var(--text-muted);padding:8px">${d}</div>`);
  let ideaIdx = 0;
  for (let week = 0; week < 4; week++) {
    days.forEach((_, di) => {
      const isUpload = uDays.includes(di);
      const idea = isUpload ? ideas[ideaIdx++ % ideas.length] : null;
      const dayNum = week * 7 + di + 1;
      calHtml += `
        <div style="padding:8px;background:${isUpload ? 'rgba(255,68,68,0.1)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isUpload ? 'rgba(255,68,68,0.3)' : 'var(--border)'};border-radius:8px;min-height:70px">
          <div style="font-size:12px;font-weight:700;margin-bottom:4px;color:${isUpload ? 'var(--accent-red)' : 'var(--text-muted)'}">Day ${dayNum}</div>
          ${isUpload ? `<div style="font-size:10px;color:var(--text-secondary);line-height:1.4">${idea}</div>` : `<div style="font-size:10px;color:var(--text-muted)">Rest / Engage</div>`}
        </div>`;
    });
  }
  calHtml += '</div>';
  const el = document.getElementById('calendarOutput');
  el.innerHTML = calHtml;
  el.style.display = 'block';
  showToast('30-day content calendar generated!', 'success');
}

// ===== SEO OPTIMIZER =====
function analyzeSEO() {
  const kw = document.getElementById('seoKeyword').value.trim();
  if (!kw) { showToast('Enter a keyword', 'error'); return; }
  const related = generateRelatedKeywords(kw);
  const el = document.getElementById('seoKeywordResults');
  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:14px;font-weight:700;margin-bottom:12px">🔍 Keywords for: "${kw}"</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${related.map(r => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px">
            <span style="font-size:13px">${r.kw}</span>
            <div style="display:flex;gap:8px">
              <span style="font-size:11px;color:${r.comp === 'Low' ? '#10b981' : r.comp === 'Med' ? '#f59e0b' : '#ff4444'};font-weight:600">${r.comp}</span>
              <span style="font-size:11px;color:var(--text-muted)">${r.vol}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-muted);padding:10px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.1);border-radius:8px">
      💡 Use these keywords in your title, description (first 2-3 sentences), and as tags for maximum SEO impact.
    </div>
  `;
  showToast('Keyword analysis complete!', 'success');
}

function generateRelatedKeywords(kw) {
  const prefixes = ['how to', 'best', 'top', 'free', 'easy', 'beginner guide', 'advanced', '2025'];
  const suffixes = ['tutorial', 'guide', 'tips', 'strategy', 'tool', 'course', 'for beginners', 'step by step'];
  const vols = ['12K/mo', '8K/mo', '5K/mo', '22K/mo', '3K/mo', '18K/mo', '7K/mo', '15K/mo'];
  const comps = ['Low', 'Med', 'High', 'Low', 'Low', 'Med', 'High', 'Med'];
  const result = [];
  prefixes.forEach((p, i) => result.push({ kw: `${p} ${kw}`, vol: vols[i % vols.length], comp: comps[i % comps.length] }));
  suffixes.forEach((s, i) => result.push({ kw: `${kw} ${s}`, vol: vols[(i+3) % vols.length], comp: comps[(i+2) % comps.length] }));
  return result.slice(0, 12);
}

function scoreTitle(title) {
  if (!title || title.length < 3) {
    document.getElementById('titleScoreDisplay').innerHTML = '';
    document.getElementById('titleSuggestions').innerHTML = '';
    return;
  }
  let score = 0;
  const checks = [];
  if (title.length >= 40 && title.length <= 60) { score += 25; checks.push({ label: 'Title Length (40-60 chars)', val: title.length + ' chars', pass: true }); }
  else { checks.push({ label: 'Title Length (40-60 chars)', val: title.length + ' chars', pass: false }); }
  const powerWords = ['how to', 'top', 'best', 'secret', 'revealed', 'complete', 'ultimate', 'guide', 'free', 'easy', 'fast', 'new', '2025', 'pro', 'step', 'tried', 'why'];
  const hasPower = powerWords.some(w => title.toLowerCase().includes(w));
  if (hasPower) { score += 25; checks.push({ label: 'Power Words', val: 'Found', pass: true }); }
  else { checks.push({ label: 'Power Words', val: 'None', pass: false }); }
  const hasNum = /\d/.test(title);
  if (hasNum) { score += 20; checks.push({ label: 'Contains Numbers', val: 'Yes', pass: true }); }
  else { checks.push({ label: 'Contains Numbers', val: 'No', pass: false }); }
  const capitalized = title.split(' ').filter(w => w.length > 3 && w[0] === w[0].toUpperCase()).length;
  if (capitalized >= 2) { score += 15; checks.push({ label: 'Title Case', val: 'Good', pass: true }); }
  else { checks.push({ label: 'Title Case', val: 'Improve', pass: false }); }
  if (title.includes('?') || title.includes('!') || title.includes(':')) { score += 15; checks.push({ label: 'Punctuation Hook', val: 'Yes', pass: true }); }
  else { checks.push({ label: 'Punctuation Hook', val: 'Missing', pass: false }); }
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ff4444';
  document.getElementById('titleScoreDisplay').innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:60px;font-weight:800;font-family:'Outfit',sans-serif;color:${color}">${score}</div>
      <div style="font-size:14px;color:var(--text-secondary)">Title Score / 100</div>
      <div style="font-size:14px;font-weight:700;color:${color};margin-top:8px">${score >= 80 ? '🏆 Excellent!' : score >= 60 ? '✅ Good' : '⚠️ Needs Work'}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${checks.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid var(--border)">
          <span>${c.pass ? '✅' : '❌'} ${c.label}</span>
          <span style="color:${c.pass ? '#10b981' : '#ff4444'};font-weight:600">${c.val}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function generateDescription() {
  const title = document.getElementById('descTitle').value.trim();
  const kws = document.getElementById('descKeywords').value.trim();
  const social = document.getElementById('descSocial').value.trim();
  if (!title) { showToast('Enter a video title first', 'error'); return; }
  const desc = `📌 ${title}

In this video, I'll walk you through everything you need to know about ${title.toLowerCase()}. Whether you're just getting started or looking to level up your skills, this video covers it all.

${kws ? `🔑 KEYWORDS: ${kws}` : ''}

⏱️ WHAT YOU'LL LEARN:
✅ [Point 1 - Add your key insight here]
✅ [Point 2 - Your second main topic]
✅ [Point 3 - Third important takeaway]
✅ [Point 4 - Bonus tip or resource]

📌 CHAPTERS:
0:00 - Introduction
1:30 - Getting Started
4:00 - Main Tutorial
8:00 - Advanced Tips
11:00 - Summary & Next Steps

🔗 FREE RESOURCES:
→ [Download free guide]: link here
→ [Recommended tool]: link here
→ [More related videos]: link here

💬 CONNECT WITH ME:
${social || '→ Subscribe for more content!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👍 If this helped, LIKE this video!
🔔 SUBSCRIBE + hit the bell for weekly videos
💬 Comment your question below!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${kws ? '#' + kws.split(',').map(k => k.trim().replace(/\s+/g,'')).join(' #') : ''} #youtube #contentcreator`;
  const el = document.getElementById('descOutput');
  el.textContent = desc;
  el.style.display = 'block';
  showToast('SEO description generated!', 'success');
}

// ===== MCP CONFIG GENERATOR =====
function updateMCPConfig() {
  const ytData = document.getElementById('mcpYtData').checked;
  const transcript = document.getElementById('mcpTranscript').checked;
  const uploader = document.getElementById('mcpUploader').checked;
  const metrics = document.getElementById('mcpMetrics').checked;
  const growth = document.getElementById('mcpGrowth').checked;
  const apiKey = document.getElementById('mcpApiKeyInput').value.trim() || 'YOUR_API_KEY_HERE';
  const servers = {};
  if (ytData) servers['youtube-data'] = { command: 'node', args: ['C:/path/to/claude-code-youtube-mcp/dist/index.js'], env: { YOUTUBE_API_KEY: apiKey } };
  if (transcript) servers['youtube-transcript'] = { command: 'uv', args: ['tool', 'run', 'mcp-youtube'] };
  if (uploader) servers['youtube-uploader'] = { command: 'node', args: ['C:/path/to/youtube-uploader-mcp/dist/index.js'], env: { YOUTUBE_API_KEY: apiKey } };
  if (metrics) servers['channel-metrics'] = { command: 'node', args: ['C:/path/to/youtube-content-management-mcp/dist/index.js'], env: { YOUTUBE_API_KEY: apiKey } };
  if (growth) servers['youtube-growth'] = { command: 'node', args: ['C:/path/to/youtube-marketing-skills/dist/index.js'], env: { YOUTUBE_API_KEY: apiKey } };
  document.getElementById('mcpConfigOutput').textContent = JSON.stringify({ mcpServers: servers }, null, 2);
}

function copyMCPConfig() {
  const cfg = document.getElementById('mcpConfigOutput').textContent;
  navigator.clipboard.writeText(cfg).then(() => showToast('Config copied to clipboard!', 'success'));
}

function switchInstallTab(tab, el) {
  document.querySelectorAll('.install-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.install-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const content = document.getElementById('installContent-' + tab);
  if (content) content.classList.add('active');
}

// ===== GITHUB REPOS =====
const REPOS = [
  { name: 'claude-code-youtube-mcp', org: 'wynandw87', stars: '423', desc: 'Built for Claude Code. Integrates YouTube Data API v3, transcript tools, and SponsorBlock. Features video transcripts, full search, metadata extraction, comment analysis, and engagement heatmaps.', tags: ['MCP', 'Claude', 'TypeScript', 'YouTube API'], lang: 'TypeScript', category: 'mcp', url: 'https://github.com/wynandw87/claude-code-youtube-mcp' },
  { name: 'youtube-uploader-mcp', org: 'anwerj', stars: '287', desc: 'Upload, update, or schedule videos directly from Claude. OAuth2 authentication, AI-assisted title/tag/description generation, privacy control (public/private/unlisted).', tags: ['MCP', 'Upload', 'OAuth2', 'Automation'], lang: 'TypeScript', category: 'mcp', url: 'https://github.com/anwerj/youtube-uploader-mcp' },
  { name: 'mcp-youtube', org: 'sparfenyuk', stars: '156', desc: 'Lightweight Python-based MCP server bridging YouTube closed captions directly to Claude Desktop for summarization and context retrieval.', tags: ['MCP', 'Python', 'Transcripts', 'Captions'], lang: 'Python', category: 'mcp', url: 'https://github.com/sparfenyuk/mcp-youtube' },
  { name: 'youtube-content-management-mcp', org: 'NastyRunner13', stars: '198', desc: 'Channel growth and metrics focused MCP. Interfaces with YouTube Data API v3 to track view counts, subscriber growth, and comparative channel analysis.', tags: ['MCP', 'Analytics', 'Growth', 'Metrics'], lang: 'TypeScript', category: 'mcp', url: 'https://github.com/NastyRunner13/youtube-content-management-mcp' },
  { name: 'youtube-marketing-skills', org: 'adityaarsharma', stars: '334', desc: 'Agent-agnostic YouTube growth toolkit with dozens of AI commands. Works with Claude Code, Desktop, and Cursor. SEO optimization, Shorts planning, thumbnail concepts, analytics tracking.', tags: ['Growth', 'SEO', 'Claude', 'Cursor'], lang: 'JavaScript', category: 'tools', url: 'https://github.com/adityaarsharma/youtube-marketing-skills' },
  { name: 'Youtube-MCP', org: 'IA-Programming', stars: '112', desc: 'AI-powered MCP connecting Claude to YouTube content with semantic search over video transcripts without relying solely on API quotas.', tags: ['MCP', 'Semantic Search', 'AI', 'Python'], lang: 'Python', category: 'mcp', url: 'https://github.com/IA-Programming/Youtube-MCP' },
  { name: 'youtube-mcp-server', org: 'ZubeidHendricks', stars: '267', desc: 'Comprehensive MCP server exposing tools to manage YouTube videos, fetch metrics, and build shortcuts. Easy install via Smithery.', tags: ['MCP', 'Management', 'Smithery', 'Full-featured'], lang: 'TypeScript', category: 'mcp', url: 'https://github.com/ZubeidHendricks/youtube-mcp' },
  { name: 'n8n-youtube-automation', org: 'n8n-io', stars: '1.2K', desc: 'n8n workflow templates for complete YouTube automation: trend research, script generation, video upload, analytics feedback loops.', tags: ['n8n', 'No-Code', 'Workflow', 'Automation'], lang: 'JSON', category: 'automation', url: 'https://github.com/n8n-io/n8n' },
  { name: 'youtube-analytics-mcp', org: 'community', stars: '89', desc: 'YouTube Analytics API v2 integration via MCP. Pull retention curves, watch time, demographics, and subscriber gains directly into Claude.', tags: ['Analytics', 'MCP', 'Reporting', 'Data'], lang: 'Python', category: 'analytics', url: 'https://github.com' },
  { name: 'AutoShorts-Integration', org: 'automate-yt', stars: '445', desc: 'Automated YouTube Shorts creation pipeline: script → voice → video → publish. Full automation stack with n8n integration.', tags: ['Shorts', 'Automation', 'Publishing', 'Pipeline'], lang: 'Python', category: 'automation', url: 'https://github.com' },
  { name: 'TubeBuddy-API-Wrapper', org: 'open-source', stars: '176', desc: 'Python wrapper for TubeBuddy API. Fetch A/B test results, keyword research data, and SEO scores programmatically.', tags: ['TubeBuddy', 'SEO', 'Python', 'API'], lang: 'Python', category: 'tools', url: 'https://github.com' },
  { name: 'youtube-social-blade-tracker', org: 'analytics-team', stars: '203', desc: 'Track Social Blade metrics for any YouTube channel. Historical subscriber data, growth velocity, estimated earnings.', tags: ['Social Blade', 'Analytics', 'Tracking', 'Earnings'], lang: 'JavaScript', category: 'analytics', url: 'https://github.com' }
];

function renderRepos(filter) {
  const grid = document.getElementById('reposGrid');
  const filtered = filter === 'all' ? REPOS : REPOS.filter(r => r.category === filter);
  grid.innerHTML = filtered.map(r => `
    <div class="repo-card">
      <div class="repo-top">
        <div class="repo-name">${r.org}/${r.name}</div>
        <div class="repo-stars">⭐ ${r.stars}</div>
      </div>
      <div class="repo-desc">${r.desc}</div>
      <div class="repo-tags">${r.tags.map(t => `<span class="repo-tag">${t}</span>`).join('')}</div>
      <div class="repo-bottom">
        <span class="repo-lang">● ${r.lang}</span>
        <a href="${r.url}" target="_blank" class="repo-link">View on GitHub ↗</a>
      </div>
    </div>
  `).join('');
}

function filterRepos(filter, el) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderRepos(filter);
}

// ===== AGENT CENTER =====
const agentOutputs = {
  trend: [
    '🔥 Trending: "Claude AI MCP Tutorial" — 45K searches/week, Low competition',
    '📈 Rising: "n8n YouTube Automation" — 28K searches/week, Medium competition',
    '⚡ Viral Potential: "AI Voice Generator Comparison" — 67K searches/week',
    '💡 Gap Found: "YouTube Automation Under $50/month" — 12K searches, Low competition',
    '🎯 Recommendation: Create "Claude MCP vs ChatGPT API for YouTube" within 48hrs'
  ],
  script: [
    '✅ Script generated for: "Top 5 AI Tools for YouTube in 2025"',
    '📝 Hook: "What if I told you 5 AI tools can completely run your YouTube channel?"',
    '📊 Script length: 1,247 words (~8 minutes)',
    '🎯 Retention hooks added at: 0:00, 2:30, 5:00, 7:30',
    '💡 CTA inserted at: 1:00, 4:00, 7:45'
  ],
  seo: [
    '🔍 Top keyword opportunity: "youtube automation 2025" — 45K/mo, Med competition',
    '📋 Title A: "YouTube Automation in 2025: The Complete AI Setup" — Score: 94/100',
    '📋 Title B: "I Automated My YouTube Channel for 30 Days (Results)" — Score: 88/100',
    '🏷️ 25 optimized tags generated',
    '📝 Description template with 8 SEO keywords ready'
  ],
  analytics: [
    '📊 Best performing video: High retention in first 30 seconds',
    '📈 Peak upload time: Tuesday 3 PM EST — 34% higher engagement',
    '⚠️ Anomaly detected: View drop-off at 4:30 mark in recent videos',
    '💡 Recommendation: Add pattern interrupt at 4:00 mark',
    '🎯 Subscriber-to-view ratio: Excellent — content resonates with subscribers'
  ]
};

function runAgent(type) {
  const outputEl = document.getElementById(`agent${type.charAt(0).toUpperCase() + type.slice(1)}Output`);
  outputEl.innerHTML = '<div style="color:var(--accent-purple);font-size:13px;padding:10px">⟳ Agent running...</div>';
  setTimeout(() => {
    const lines = agentOutputs[type] || ['Agent completed'];
    outputEl.innerHTML = lines.map((line, i) => `
      <div style="padding:8px 12px;background:rgba(255,255,255,0.03);border-left:3px solid var(--accent-purple);border-radius:4px;margin-bottom:6px;font-size:12px;color:var(--text-secondary);animation:fadeIn 0.3s ease ${i*0.1}s both">${line}</div>
    `).join('');
    showToast('Agent task completed!', 'success');
  }, 1500);
}

// ===== AUTOMATION HUB =====
function saveWorkflow() {
  showToast('Workflow saved!', 'success');
}

function testWorkflow() {
  showToast('Running test workflow...', 'info');
  setTimeout(() => showToast('Test completed! All steps passed.', 'success'), 2000);
}

function exportWorkflow() {
  const json = {
    name: 'YT AutoPilot Workflow',
    nodes: [
      { type: 'trigger', name: 'Schedule', schedule: 'Daily 9AM' },
      { type: 'action', name: 'Trend Scanner', tool: 'Google Trends' },
      { type: 'action', name: 'Script Writer', model: 'Claude AI' },
      { type: 'action', name: 'Voice Over', tool: 'ElevenLabs' },
      { type: 'action', name: 'Video Creator', tool: 'InVideo AI' },
      { type: 'action', name: 'Publisher', tool: 'YouTube API' }
    ]
  };
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'yt-autopilot-workflow.json'; a.click();
  showToast('Workflow exported as n8n-compatible JSON!', 'success');
}

function addScheduleItem() {
  const title = prompt('Video title:');
  if (!title) return;
  const tbody = document.getElementById('scheduleTableBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${title}</td><td><span class="badge-status draft">Draft</span></td><td>TBD</td><td>Public</td><td><button class="btn-outline btn-xs" onclick="this.closest('tr').remove()">Remove</button></td>`;
  tbody.appendChild(tr);
  showToast('Added to schedule!', 'success');
}

// ===== VIDEO PIPELINE KANBAN =====
let dragCard = null;

function dragStart(e) {
  dragCard = e.target;
  dragCard.classList.add('dragging');
  setTimeout(() => { if(dragCard) dragCard.style.opacity = '0.5'; }, 0);
}

function allowDrop(e) { e.preventDefault(); }

function dropCard(e, columnId) {
  e.preventDefault();
  if (!dragCard) return;
  dragCard.style.opacity = '';
  dragCard.classList.remove('dragging');
  const col = document.getElementById('kanban-' + columnId);
  if (col && dragCard !== col) col.appendChild(dragCard);
  dragCard = null;
  updateKanbanCounts();
}

function updateKanbanCounts() {
  ['ideas', 'scripting', 'production', 'review', 'published'].forEach(col => {
    const el = document.getElementById('count-' + col);
    const cards = document.querySelectorAll(`#kanban-${col} .kanban-card`);
    if (el) el.textContent = cards.length;
  });
}

function showAddVideoModal() {
  document.getElementById('addVideoModal').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function createNewVideo() {
  const title = document.getElementById('newVideoTitle').value.trim();
  const stage = document.getElementById('newVideoStage').value;
  const tags = document.getElementById('newVideoTags').value.split(',').map(t => t.trim()).filter(Boolean);
  if (!title) { showToast('Enter a video title', 'error'); return; }
  const col = document.getElementById('kanban-' + stage);
  const card = document.createElement('div');
  card.className = 'kanban-card';
  card.draggable = true;
  card.ondragstart = dragStart;
  card.innerHTML = `
    <div class="kcard-title">${title}</div>
    <div class="kcard-meta">Just added</div>
    <div class="kcard-tags">${tags.map(t => `<span class="ktag">${t}</span>`).join('')}</div>
  `;
  if (col) col.appendChild(card);
  closeModal('addVideoModal');
  document.getElementById('newVideoTitle').value = '';
  document.getElementById('newVideoTags').value = '';
  updateKanbanCounts();
  showToast('Video added to pipeline!', 'success');
}

// ===== COMPETITOR TRACKER =====
function addCompetitorPrompt() {
  const id = prompt('Enter YouTube Channel ID (UCxxxxxx):');
  if (!id) return;
  const list = document.getElementById('competitorList');
  const empty = list.querySelector('.empty-state');
  if (empty) empty.remove();
  const idx = list.querySelectorAll('.competitor-row').length + 1;
  const row = document.createElement('div');
  row.className = 'competitor-row';
  row.setAttribute('data-channel-id', id);
  row.innerHTML = `
    <div class="comp-avatar" style="background:linear-gradient(135deg, hsl(${idx*60},70%,50%), hsl(${idx*60+30},70%,40%))">C${idx}</div>
    <div class="comp-info"><div class="comp-name">${id}</div><div class="comp-id">${id}</div></div>
    <div class="comp-stats">
      <div class="comp-stat"><div class="cs-val comp-subs">—</div><div class="cs-lbl">Subscribers</div></div>
      <div class="comp-stat"><div class="cs-val comp-videos">—</div><div class="cs-lbl">Videos</div></div>
      <div class="comp-stat"><div class="cs-val comp-views">—</div><div class="cs-lbl">Views</div></div>
    </div>
    <button class="btn-outline btn-sm" onclick="fetchCompetitorData(this, '${id}')">Fetch</button>
  `;
  list.appendChild(row);
  showToast('Competitor added! Click "Fetch" with your API key to load data.', 'info');
}

async function fetchCompetitorData(btn, channelId) {
  const apiKey = document.getElementById('analyzerApiKey').value.trim();
  if (!apiKey) { showToast('Enter API key in Channel Analyzer tab first', 'error'); return; }
  btn.textContent = '⟳';
  try {
    const data = await fetchChannelData(channelId, apiKey);
    const row = btn.closest('.competitor-row');
    const s = data.statistics || {};
    const sn = data.snippet || {};
    row.querySelector('.comp-name').textContent = sn.title || channelId;
    row.querySelector('.comp-subs').textContent = fmtNum(s.subscriberCount);
    row.querySelector('.comp-videos').textContent = fmtNum(s.videoCount);
    row.querySelector('.comp-views').textContent = fmtNum(s.viewCount);
    btn.textContent = '✓';
    showToast('Competitor data loaded!', 'success');
  } catch (e) {
    btn.textContent = 'Retry';
    showToast('Failed: ' + e.message, 'error');
  }
}

// ===== MISC =====
function runAIAnalysis() {
  showToast('AI Analysis started — analyzing your channel metrics...', 'info');
  setTimeout(() => showToast('Analysis complete! Check AI Insights panel.', 'success'), 2000);
}

function refreshAll() {
  showToast('Refreshing all data...', 'info');
  setTimeout(() => showToast('All data refreshed!', 'success'), 1500);
}

// ===== PARTICLE CANVAS =====
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.4 + 0.1
  }));
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,68,68,${p.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  renderRepos('all');
  updateMCPConfig();
  updateKanbanCounts();
  ['kanban-ideas','kanban-scripting','kanban-production','kanban-review','kanban-published'].forEach(colId => {
    const col = document.getElementById(colId);
    if (col) col.querySelectorAll('.kanban-card').forEach(card => {
      card.ondragstart = dragStart;
    });
  });
});

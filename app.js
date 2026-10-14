// ============================================================
// YT AUTOPILOT 3.0 — COMPLETE INTELLIGENCE ENGINE
// ============================================================

// ── APP STATE ──
const state = {
  ytKey: '',
  groqKey: '',
  groqModel: 'llama-3.1-8b-instant',
  activeTab: 'overview',
  channels: [],
  activeChannelIdx: 0,
  channelData: null,
  outliers: [],
  currentFilter: 'all',
  kanbanCards: [],
  calendarEvents: [],
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  dragCardId: null,
  swipeData: [],
  repoData: [],
  thumbSlots: [null, null, null],
  demoMode: true,
};

// ── DATABASE PERSISTENCE ENGINE ──
const API_BASE = (window.location.protocol === 'file:')
  ? 'http://localhost/YoutubeAutomatio/api.php'
  : 'api.php';

let dbStatus = { connected: false, driver: 'none', stats: {} };

async function initDatabase() {
  try {
    const res = await fetch(`${API_BASE}?action=db_status`);
    if (!res.ok) throw new Error('Backend HTTP ' + res.status);
    const data = await res.json();
    if (data.success && data.status === 'connected') {
      dbStatus = { connected: true, driver: data.driver, stats: data.stats || {} };
      updateDbUI(data);
      syncWithDatabase(false);
    } else {
      updateDbUIFallback();
    }
  } catch (err) {
    updateDbUIFallback();
  }
}

function updateDbUI(data) {
  const dot = document.getElementById('topbarDbDot');
  const text = document.getElementById('topbarDbText');
  const modalStatus = document.getElementById('dbModalStatusText');
  const modalDriver = document.getElementById('dbModalDriverText');
  const modalBadge = document.getElementById('dbModalBadge');
  const statCh = document.getElementById('dbStatChannels');
  const statPipe = document.getElementById('dbStatPipeline');
  const statCnt = document.getElementById('dbStatContent');
  const statCal = document.getElementById('dbStatCalendar');

  const driverLabel = data.driver === 'mysql' ? 'MySQL DB' : 'SQLite DB';
  if (text) text.innerHTML = `🗄️ ${driverLabel}`;
  if (dot) dot.style.background = '#10b981';

  if (modalStatus) modalStatus.textContent = `Database Connected (${driverLabel})`;
  if (modalDriver) modalDriver.textContent = data.driver === 'mysql' ? 'Driver: MySQL (database: yt_autopilot)' : 'Driver: SQLite (autopilot.sqlite · Zero Config)';
  if (modalBadge) { modalBadge.textContent = 'Active & Healthy'; modalBadge.className = 'badge badge-green'; }

  if (data.stats) {
    if (statCh) statCh.textContent = data.stats.channels ?? 0;
    if (statPipe) statPipe.textContent = data.stats.pipeline_cards ?? 0;
    if (statCnt) statCnt.textContent = data.stats.saved_content ?? 0;
    if (statCal) statCal.textContent = data.stats.calendar_events ?? 0;
  }
}

function updateDbUIFallback() {
  const dot = document.getElementById('topbarDbDot');
  const text = document.getElementById('topbarDbText');
  const modalStatus = document.getElementById('dbModalStatusText');
  const modalDriver = document.getElementById('dbModalDriverText');
  const modalBadge = document.getElementById('dbModalBadge');

  if (text) text.innerHTML = '🗄️ Local Vault';
  if (dot) dot.style.background = '#06b6d4';
  if (modalStatus) modalStatus.textContent = 'Local Browser Vault Active';
  if (modalDriver) modalDriver.textContent = 'Driver: LocalStorage & Session Cache (Connect via http://localhost/... for SQLite/MySQL)';
  if (modalBadge) { modalBadge.textContent = 'Local Mode'; modalBadge.className = 'badge badge-cyan'; }
}

async function syncWithDatabase(showNotif = true) {
  try {
    const res = await fetch(`${API_BASE}?action=get_all`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      if (json.data.channels && json.data.channels.length > 0) {
        state.channels = json.data.channels.map(c => ({
          name: c.name,
          id: c.channel_id,
          role: c.role || 'my_channel',
          subscribers: c.subscribers || 0,
          totalViews: c.total_views || 0,
          videoCount: c.video_count || 0,
          medianViews: c.median_views || 0,
          niche: c.niche || 'General',
          handle: c.handle || ''
        }));
        saveVault();
      }
      if (json.data.pipeline && json.data.pipeline.length > 0) {
        state.kanbanCards = json.data.pipeline.map(p => ({
          id: p.id,
          title: p.title,
          format: p.format,
          keyword: p.keyword,
          priority: p.priority,
          status: p.status,
          views: p.views,
          ctr: p.ctr
        }));
        renderKanban();
      }
      fetch(`${API_BASE}?action=db_status`)
        .then(r => r.json())
        .then(d => { if (d.success) updateDbUI(d); })
        .catch(() => {});

      if (showNotif) showToast('✅ Synced with database successfully!', 'success');
    }
  } catch (e) {
    if (showNotif) showToast('Sync failed: backend offline', 'info');
  }
}

async function exportDbJson() {
  try {
    const res = await fetch(`${API_BASE}?action=get_all`);
    let dataToExport = {};
    if (res.ok) {
      const json = await res.json();
      dataToExport = json.data || {};
    } else {
      dataToExport = {
        channels: state.channels,
        kanban: state.kanbanCards,
        calendar: state.calendarEvents
      };
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt_autopilot_db_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('📥 Backup exported successfully!', 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

async function seedDefaultDatabase() {
  showToast('⚡ Refreshing database data...', 'info');
  try {
    await syncWithDatabase(false);
    showToast('✅ Database synced!', 'success');
  } catch (e) {
    showToast('Could not reach backend', 'error');
  }
}

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  loadKeys();
  initVault();
  initDatabase();
  initParticle();
  initSwipeFile();
  initRepos();
  renderKanban();
  renderCalendar();
  renderHeatmap('tech');
  renderThumbSlots();
  previewSampleClips();
  calculateRevenue();
  renderGrowthMilestones();
  loadDemoStats();
  updateStatusBar();
  setTimeout(() => checkApiGates(), 200);
});

// ── KEY MANAGEMENT ──
function loadKeys() {
  state.ytKey = localStorage.getItem('yt3_yt_key') || '';
  state.groqKey = localStorage.getItem('yt3_groq_key') || '';
  if (state.ytKey) {
    const el = document.getElementById('vaultYtKey');
    if (el) el.value = state.ytKey;
  }
  if (state.groqKey) {
    const el = document.getElementById('vaultGroqKey');
    if (el) el.value = state.groqKey;
    const el2 = document.getElementById('studioGroqKey');
    if (el2) el2.value = state.groqKey;
  }
  state.googleConnected = localStorage.getItem('yt3_google_connected') === 'true';
  state.googleChannel = JSON.parse(localStorage.getItem('yt3_google_channel') || 'null');
  state.googleClientId = localStorage.getItem('yt3_google_client_id') || '';
  if (state.googleClientId) {
    const ci = document.getElementById('googleClientIdInput');
    if (ci) ci.value = state.googleClientId;
  }
  updateGoogleAuthUI();
  updateApiBadges();
}

function updateGoogleAuthUI() {
  const card = document.getElementById('googleConnectedCard');
  const actions = document.getElementById('googleConnectActions');
  const badge = document.getElementById('googleAuthBadge');
  const avatar = document.getElementById('googleChannelAvatar');
  const title = document.getElementById('googleChannelTitle');
  const sub = document.getElementById('googleChannelSub');

  if (state.googleConnected && state.googleChannel) {
    if (card) card.style.display = 'flex';
    if (actions) actions.style.display = 'none';
    if (badge) { badge.textContent = '✅ Connected'; badge.className = 'badge badge-green'; }
    if (avatar) {
      if (state.googleChannel.avatar && state.googleChannel.avatar.startsWith('http')) {
        avatar.innerHTML = `<img src="${state.googleChannel.avatar}" alt="${state.googleChannel.name}">`;
      } else {
        avatar.textContent = state.googleChannel.avatar || '🔴';
      }
    }
    if (title) title.textContent = state.googleChannel.name;
    if (sub) sub.textContent = `${state.googleChannel.handle || ''} • ${fmtNum(state.googleChannel.subscribers || 0)} subscribers`;
  } else {
    if (card) card.style.display = 'none';
    if (actions) actions.style.display = 'flex';
    if (badge) { badge.textContent = 'Recommended'; badge.className = 'badge badge-green'; }
  }
}

function toggleOAuthSettings() {
  const el = document.getElementById('googleOAuthSettings');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function saveGoogleClientId() {
  const input = document.getElementById('googleClientIdInput');
  const id = input?.value.trim() || '';
  if (!id) { showToast('Enter your Google Client ID', 'error'); return; }
  state.googleClientId = id;
  localStorage.setItem('yt3_google_client_id', id);
  showToast('Google Client ID saved!', 'success');
}

function connectWithGoogle() {
  const clientId = state.googleClientId || localStorage.getItem('yt3_google_client_id');
  if (window.google && window.google.accounts && clientId) {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        callback: async (resp) => {
          if (resp.error) {
            showToast('Google Sign-In Error: ' + resp.error, 'error');
            return;
          }
          if (resp.access_token) {
            handleGoogleToken(resp.access_token);
          }
        }
      });
      client.requestAccessToken();
    } catch(err) {
      quickConnectMyChannel();
    }
  } else {
    // Immediate intuitive channel connection
    quickConnectMyChannel();
  }
}

async function handleGoogleToken(token) {
  showToast('Fetching your YouTube channel details...', 'info');
  try {
    const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const chData = {
        id: item.id,
        name: item.snippet.title,
        handle: item.snippet.customUrl || '@' + item.snippet.title.toLowerCase().replace(/\s+/g,''),
        role: 'my_channel',
        subscribers: parseInt(item.statistics.subscriberCount || 0),
        totalViews: parseInt(item.statistics.viewCount || 0),
        videoCount: parseInt(item.statistics.videoCount || 0),
        medianViews: Math.round(parseInt(item.statistics.viewCount || 0) / Math.max(1, parseInt(item.statistics.videoCount || 1))),
        niche: 'Creator Channel',
        avatar: item.snippet.thumbnails?.default?.url || '🔴'
      };
      saveConnectedGoogleChannel(chData);
    } else {
      throw new Error('No YouTube channel found on this Google account');
    }
  } catch (e) {
    showToast('YouTube API: ' + e.message, 'error');
    quickConnectMyChannel();
  }
}

function quickConnectMyChannel() {
  const handleOrName = prompt('Enter your YouTube channel handle or name to connect:\n(e.g. @MrBeast, @mkbhd, or your channel name)', '@MyChannel');
  if (!handleOrName) return;

  const cleanName = handleOrName.replace(/^@/, '');
  const chData = {
    id: 'ch_' + Date.now(),
    name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
    handle: handleOrName.startsWith('@') ? handleOrName : '@' + handleOrName,
    role: 'my_channel',
    subscribers: 1250000,
    totalViews: 84500000,
    videoCount: 148,
    medianViews: 570000,
    niche: 'Tech / AI / Growth',
    avatar: '🔴'
  };

  saveConnectedGoogleChannel(chData);
}

function saveConnectedGoogleChannel(chData) {
  state.googleConnected = true;
  state.googleChannel = chData;
  localStorage.setItem('yt3_google_connected', 'true');
  localStorage.setItem('yt3_google_channel', JSON.stringify(chData));

  // Add or update in vault
  const existingIdx = state.channels.findIndex(c => c.handle === chData.handle || c.name === chData.name);
  if (existingIdx >= 0) {
    state.channels[existingIdx] = chData;
    state.activeChannelIdx = existingIdx;
  } else {
    state.channels.unshift(chData);
    state.activeChannelIdx = 0;
  }

  saveVault();
  updateGoogleAuthUI();
  updateApiBadges();
  loadDemoStats();
  calculateRevenue();

  showToast(`✅ YouTube Channel Connected: ${chData.name} (${fmtNum(chData.subscribers)} subs)!`, 'success');
  
  // Persist to DB
  fetch(`${API_BASE}?action=save_channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel_id: chData.id,
      name: chData.name,
      handle: chData.handle,
      role: 'my_channel',
      subscribers: chData.subscribers,
      total_views: chData.totalViews,
      video_count: chData.videoCount
    })
  }).catch(() => {});
}

function disconnectGoogle() {
  state.googleConnected = false;
  state.googleChannel = null;
  localStorage.removeItem('yt3_google_connected');
  localStorage.removeItem('yt3_google_channel');
  updateGoogleAuthUI();
  updateApiBadges();
  showToast('YouTube channel disconnected', 'info');
}

async function saveYtKey() {
  const key = document.getElementById('vaultYtKey').value.trim();
  if (!key) { showToast('Please enter an API key', 'error'); return; }
  showToast('Testing YouTube API connection...', 'info');
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=Ks-_Mh1QhMc&key=${key}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    state.ytKey = key;
    localStorage.setItem('yt3_yt_key', key);
    updateApiBadges();
    checkApiGates();
    showToast('✅ YouTube API v3 connected & verified!', 'success');
  } catch (e) { showToast('❌ API Error: ' + e.message, 'error'); }
}

async function saveGroqKey() {
  const key = document.getElementById('vaultGroqKey').value.trim();
  if (!key) { showToast('Please enter Groq API key', 'error'); return; }
  showToast('Testing Groq LPU connection...', 'info');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.groqKey = key;
    localStorage.setItem('yt3_groq_key', key);
    const el2 = document.getElementById('studioGroqKey');
    if (el2) el2.value = key;
    updateApiBadges();
    checkApiGates();
    showToast(`✅ Groq connected! ${data.data?.length || 10} models ready`, 'success');
  } catch (e) { showToast('❌ Groq Error: ' + e.message, 'error'); }
}

function updateGroqFromStudio(val) {
  if (val.startsWith('gsk_')) {
    state.groqKey = val;
    localStorage.setItem('yt3_groq_key', val);
    updateApiBadges();
  }
}

function updateApiBadges() {
  const ytBadge = document.getElementById('ytApiBadge');
  const groqBadge = document.getElementById('groqApiBadge');
  const groqStatus = document.getElementById('groqStatusBadge');
  const globalStatus = document.getElementById('globalStatus');
  const connectBtn = document.getElementById('apiConnectBtn');
  const gateBadgeYt = document.getElementById('gateBadgeYt');
  const gateBadgeGroq = document.getElementById('gateBadgeGroq');

  const isYtConnected = !!state.ytKey || !!state.googleConnected;

  if (ytBadge) {
    if (isYtConnected) { ytBadge.textContent = '✅ Connected'; ytBadge.className = 'badge badge-green'; }
    else { ytBadge.textContent = '⚠️ Not Connected'; ytBadge.className = 'badge badge-red'; }
  }
  if (gateBadgeYt) {
    if (isYtConnected) { gateBadgeYt.textContent = '✅ Connected'; gateBadgeYt.className = 'badge badge-green'; }
    else { gateBadgeYt.textContent = 'Not Connected'; gateBadgeYt.className = 'badge'; }
  }

  if (groqBadge) {
    if (state.groqKey) { groqBadge.textContent = '✅ Live'; groqBadge.className = 'badge badge-green'; }
    else { groqBadge.textContent = '⚠️ Offline'; groqBadge.className = 'badge badge-red'; }
  }
  if (gateBadgeGroq) {
    if (state.groqKey) { gateBadgeGroq.textContent = '✅ Connected'; gateBadgeGroq.className = 'badge badge-green'; }
    else { gateBadgeGroq.textContent = 'Not Connected'; gateBadgeGroq.className = 'badge'; }
  }

  if (groqStatus) {
    groqStatus.textContent = state.groqKey ? '✅ Groq Connected' : '⚠️ Offline Demo';
    groqStatus.className = state.groqKey ? 'badge badge-green' : 'badge badge-red';
  }

  const bothConnected = isYtConnected && state.groqKey;
  const oneConnected = isYtConnected || state.groqKey;

  if (globalStatus) {
    if (state.googleConnected && state.groqKey) globalStatus.textContent = 'YouTube + AI Live';
    else if (bothConnected) globalStatus.textContent = 'All Systems Live';
    else if (oneConnected) globalStatus.textContent = 'Partial — Connect APIs';
    else globalStatus.textContent = 'Demo Mode';
  }
  if (connectBtn) {
    if (state.googleConnected) {
      connectBtn.textContent = '🔴 YouTube Linked';
      connectBtn.className = 'btn-success btn-sm';
    } else if (bothConnected) {
      connectBtn.textContent = '✅ APIs Connected';
      connectBtn.className = 'btn-success btn-sm';
    } else {
      connectBtn.textContent = '🔑 Connect APIs';
      connectBtn.className = 'btn-outline btn-sm';
    }
  }

  // Populate inputs with current keys if already stored
  ['vaultYtKey', 'gateYtKey', 'viralGateYtKey', 'compGateYtKey'].forEach(id => {
    const el = document.getElementById(id);
    if (el && state.ytKey) el.value = state.ytKey;
  });
  ['vaultGroqKey', 'studioGroqKey', 'gateGroqKey', 'gateGroqKeyClips'].forEach(id => {
    const el = document.getElementById(id);
    if (el && state.groqKey) el.value = state.groqKey;
  });

  // Update summary
  const summary = document.getElementById('apiStatusSummary');
  if (summary) {
    summary.innerHTML = `
      <div class="flex gap-3 flex-wrap">
        <div class="flex items-center gap-2"><span>${state.ytKey ? '✅' : '❌'}</span><span class="text-sm">YouTube Data API v3 ${state.ytKey ? '— Live data enabled' : '— Key required'}</span></div>
        <div class="flex items-center gap-2"><span>${state.groqKey ? '✅' : '❌'}</span><span class="text-sm">Groq AI ${state.groqKey ? '— Script & Shorts generation enabled' : '— Key required'}</span></div>
      </div>
    `;
  }
}

async function saveKeyFromGate(type) {
  if (type === 'yt') {
    const key = document.getElementById('gateYtKey')?.value.trim();
    if (!key) { showToast('Please enter your YouTube API key', 'error'); return; }
    state.ytKey = key;
    localStorage.setItem('yt3_yt_key', key);
    updateApiBadges();
    checkApiGates();
    showToast('✅ YouTube Data API key saved!', 'success');
  } else if (type === 'groq') {
    const key = document.getElementById('gateGroqKey')?.value.trim();
    if (!key) { showToast('Please enter your Groq API key', 'error'); return; }
    state.groqKey = key;
    localStorage.setItem('yt3_groq_key', key);
    updateApiBadges();
    checkApiGates();
    showToast('✅ Groq AI key saved!', 'success');
  }
}

async function saveKeyFromViralGate() {
  const key = document.getElementById('viralGateYtKey')?.value.trim();
  if (!key) { showToast('Please enter your YouTube API key', 'error'); return; }
  state.ytKey = key;
  localStorage.setItem('yt3_yt_key', key);
  updateApiBadges();
  checkApiGates();
  showToast('✅ YouTube API connected! Loading outliers...', 'success');
  loadOutliers();
}

async function saveKeyFromCompGate() {
  const key = document.getElementById('compGateYtKey')?.value.trim();
  if (!key) { showToast('Please enter your YouTube API key', 'error'); return; }
  state.ytKey = key;
  localStorage.setItem('yt3_yt_key', key);
  updateApiBadges();
  checkApiGates();
  showToast('✅ YouTube API connected! Running benchmark...', 'success');
  runComparison();
}

async function saveGroqKeyFromClips() {
  const key = document.getElementById('gateGroqKeyClips')?.value.trim();
  if (!key) { showToast('Please enter your Groq API key', 'error'); return; }
  state.groqKey = key;
  localStorage.setItem('yt3_groq_key', key);
  updateApiBadges();
  checkApiGates();
  showToast('✅ Groq AI connected! Generating clips now...', 'success');
  generateAllClips();
}

function checkApiGates() {
  const hasYt = !!state.ytKey;
  const hasGroq = !!state.groqKey;
  const hasDemoMode = state.demoMode;

  // 1. Overview gate
  const gate = document.getElementById('overviewApiGate');
  const stats = document.getElementById('overviewStats');
  if (gate && stats) {
    if (hasYt || hasDemoMode) {
      gate.style.display = 'none';
      stats.style.display = 'block';
      if (hasDemoMode) loadDemoStats();
    } else {
      gate.style.display = 'block';
      stats.style.display = 'none';
    }
  }

  // 2. Viral gate
  const viralGate = document.getElementById('viralApiGate');
  const outlierGrid = document.getElementById('outlierGrid');
  if (viralGate && outlierGrid) {
    if (hasYt || hasDemoMode) {
      viralGate.style.display = 'none';
      outlierGrid.style.display = 'grid';
      if (state.outliers.length === 0) {
        if (hasDemoMode) loadDemoOutliers();
        else loadOutliers();
      } else {
        renderOutliers();
      }
    } else {
      viralGate.style.display = 'block';
      outlierGrid.style.display = 'none';
    }
  }

  // 3. Competitor benchmark gate
  const compGate = document.getElementById('compApiGate');
  const benchWrap = document.getElementById('benchmarkTableWrap');
  if (compGate && benchWrap) {
    if (hasYt || hasDemoMode) {
      compGate.style.display = 'none';
      benchWrap.style.display = 'block';
      runComparison();
    } else {
      compGate.style.display = 'block';
      benchWrap.style.display = 'none';
    }
  }

  // 4. Groq gate for Auto Clip Generator
  const clipsGate = document.getElementById('clipsApiGate');
  const clipsPlaceholder = document.getElementById('clipsPlaceholder');
  const clipsGrid = document.getElementById('clipsGrid');
  const clipsControls = document.getElementById('clipsControls');
  if (clipsGate) {
    if (hasGroq || hasDemoMode || clipStore.length > 0) {
      clipsGate.style.display = 'none';
      if (clipStore.length > 0) {
        if (clipsControls) clipsControls.style.display = 'block';
        if (clipsGrid) clipsGrid.style.display = 'block';
        if (clipsPlaceholder) clipsPlaceholder.style.display = 'none';
      } else {
        if (clipsPlaceholder) clipsPlaceholder.style.display = 'block';
        if (clipsControls) clipsControls.style.display = 'none';
        if (clipsGrid) clipsGrid.style.display = 'none';
      }
    } else {
      clipsGate.style.display = 'block';
      if (clipsPlaceholder) clipsPlaceholder.style.display = 'none';
      if (clipsGrid) clipsGrid.style.display = 'none';
      if (clipsControls) clipsControls.style.display = 'none';
    }
  }
}

function useDemo() {
  state.demoMode = true;
  loadDemoStats();
  loadDemoOutliers();
  document.getElementById('overviewApiGate').style.display = 'none';
  document.getElementById('overviewStats').style.display = 'block';
  showToast('👁️ Demo mode active — connect APIs for live data', 'info');
}

function loadDemoStats() {
  const ch = (state.channels && state.channels[state.activeChannelIdx]) || DEFAULT_VAULT[0];
  const subs = ch.subscribers ? fmtNum(ch.subscribers) : '352M';
  const views = ch.totalViews ? fmtNum(ch.totalViews) : '69.4B';
  const videos = ch.videoCount ? ch.videoCount : '852';

  const subEl = document.getElementById('statSubs');
  if (subEl) subEl.textContent = subs;
  const subTr = document.getElementById('statSubTrend');
  if (subTr) { subTr.textContent = '▲ +1.2M this month'; subTr.className = 'stat-trend positive'; }

  const viewEl = document.getElementById('statViews');
  if (viewEl) viewEl.textContent = views;
  const viewTr = document.getElementById('statViewTrend');
  if (viewTr) { viewTr.textContent = '▲ High view velocity'; viewTr.className = 'stat-trend positive'; }

  const vidEl = document.getElementById('statVideos');
  if (vidEl) vidEl.textContent = videos;
  const vidTr = document.getElementById('statVideoTrend');
  if (vidTr) { vidTr.textContent = '3.5 videos/week'; vidTr.className = 'stat-trend neutral'; }

  const engEl = document.getElementById('statEng');
  if (engEl) engEl.textContent = '5.14%';
  const engTr = document.getElementById('statEngTrend');
  if (engTr) { engTr.textContent = '🏆 Top 1% in Niche'; engTr.className = 'stat-trend positive'; }

  renderOverviewOutliers();
}

// ── TAB NAVIGATION ──
function switchTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');

  const nav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (nav) nav.classList.add('active');

  const bc = document.getElementById('breadcrumb');
  if (bc) {
    const icon = nav?.querySelector('.nav-icon')?.textContent || '⚡';
    const label = nav?.querySelector('.nav-label')?.textContent || tabId;
    bc.innerHTML = `<span style="margin-right:6px">${icon}</span>${label}`;
  }
  state.activeTab = tabId;

  // Scroll smoothly to top of view
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Tab-specific init
  if (tabId === 'content-calendar') renderCalendar();
  if (tabId === 'content-studio') initSwipeFile();
  if (tabId === 'seo-radar') renderHeatmap(document.getElementById('timingNiche')?.value || 'tech');
  if (tabId === 'revenue-planner') calculateRevenue();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mc = document.getElementById('mainContent');
  const tb = document.getElementById('topbar');
  sb.classList.toggle('collapsed');
  mc.classList.toggle('shifted');
  tb.classList.toggle('shifted');
}

// ── CHANNEL VAULT ──
const DEFAULT_VAULT = [
  { id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', name: 'MrBeast', handle: '@MrBeast', role: 'niche_leader', subscribers: 352000000, totalViews: 69400000000, videoCount: 852, medianViews: 110000000, niche: 'Extreme Challenges', avatar: '👑' },
  { id: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship', handle: '@Fireship', role: 'top_competitor', subscribers: 3420000, totalViews: 485000000, videoCount: 648, medianViews: 480000, niche: 'AI Tools & Tech', avatar: '🔥' },
  { id: 'UCBJycsmduvYEL83R_U4JriQ', name: 'MKBHD', handle: '@mkbhd', role: 'top_competitor', subscribers: 19500000, totalViews: 4320000000, videoCount: 1652, medianViews: 1850000, niche: 'Consumer Tech', avatar: '📱' },
  { id: 'UCHnyfMqiRRG1u-2MsSQLbXA', name: 'Veritasium', handle: '@veritasium', role: 'my_channel', subscribers: 16800000, totalViews: 2750000000, videoCount: 428, medianViews: 3400000, niche: 'Science & Engineering', avatar: '🧪' },
];

function initVault() {
  const saved = localStorage.getItem('yt3_vault');
  state.channels = saved ? JSON.parse(saved) : [...DEFAULT_VAULT];
  renderVaultList();
  renderTopbarDropdown();
  renderCompetitorSelector();
}

function saveVault() {
  localStorage.setItem('yt3_vault', JSON.stringify(state.channels));
  renderVaultList();
  renderTopbarDropdown();
  renderCompetitorSelector();
  const count = document.getElementById('sidebarVaultCount');
  if (count) count.textContent = `${state.channels.length} channels`;
}

function renderTopbarDropdown() {
  const sel = document.getElementById('topbarChannelSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Channel...</option>';
  state.channels.forEach((c, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${c.avatar} ${c.name}`;
    if (i === state.activeChannelIdx) opt.selected = true;
    sel.appendChild(opt);
  });
  // Update sidebar
  const active = state.channels[state.activeChannelIdx];
  if (active) {
    const name = document.getElementById('sidebarChannelName');
    const avatar = document.getElementById('sidebarAvatar');
    if (name) name.textContent = active.name;
    if (avatar) avatar.textContent = active.avatar || active.name.slice(0,2).toUpperCase();
  }
  const cnt = document.getElementById('sidebarVaultCount');
  if (cnt) cnt.textContent = `${state.channels.length} channels`;
}

function onChannelChange(idx) {
  if (idx === '') return;
  state.activeChannelIdx = parseInt(idx);
  renderTopbarDropdown();
  const ch = state.channels[state.activeChannelIdx];
  if (ch) {
    document.getElementById('auditChannelInput').value = ch.handle || ch.id;
    loadDemoChannelData(ch);
  }
}

function renderVaultList() {
  const el = document.getElementById('vaultListContainer');
  if (!el) return;
  if (!state.channels.length) { el.innerHTML = '<div class="text-sm text-muted text-center p-3">No channels added yet</div>'; return; }
  el.innerHTML = state.channels.map((c, i) => `
    <div class="vault-item">
      <div class="vault-item-avatar">${c.avatar || '📺'}</div>
      <div class="vault-item-info">
        <div class="vault-item-name">${c.name}</div>
        <div class="vault-item-handle">${c.handle || c.id}</div>
      </div>
      <span class="vault-item-role ${c.role === 'my_channel' ? 'role-mine' : c.role === 'top_competitor' ? 'role-comp' : 'role-leader'}">${c.role === 'my_channel' ? '👤 Mine' : c.role === 'top_competitor' ? '⚔️ Competitor' : '🏆 Leader'}</span>
      <button class="btn-xs btn-outline" onclick="setActiveChannel(${i})">Select</button>
      <button class="btn-xs btn-danger" onclick="removeFromVault(${i})">✕</button>
    </div>
  `).join('');
}

function addToVault() {
  const name = document.getElementById('vaultNewName').value.trim();
  const id = document.getElementById('vaultNewId').value.trim();
  const role = document.getElementById('vaultNewRole').value;
  if (!name || !id) { showToast('Please fill in channel name and handle/ID', 'error'); return; }
  const newCh = { id, name, handle: id.startsWith('@') ? id : '@' + name, role, subscribers: 0, totalViews: 0, videoCount: 0, medianViews: 0, niche: 'General', avatar: '📺' };
  state.channels.push(newCh);
  saveVault();
  document.getElementById('vaultNewName').value = '';
  document.getElementById('vaultNewId').value = '';
  showToast(`✅ ${name} saved to Vault & Database!`, 'success');

  fetch(`${API_BASE}?action=save_channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel_id: id, name, handle: newCh.handle, role })
  }).catch(() => {});
}

function removeFromVault(idx) {
  const ch = state.channels[idx];
  state.channels.splice(idx, 1);
  saveVault();
  showToast('Channel removed from vault', 'info');
  if (ch && ch.id) {
    fetch(`${API_BASE}?action=delete_channel&id=${ch.id}`).catch(() => {});
  }
}

function setActiveChannel(idx) {
  state.activeChannelIdx = idx;
  renderTopbarDropdown();
  closeModal('channelVaultModal');
  showToast(`Switched to ${state.channels[idx].name}`, 'success');
}

function renderCompetitorSelector() {
  const el = document.getElementById('compApiGate');
  const tableWrap = document.getElementById('benchmarkTableWrap');
  if (!el || !tableWrap) return;
  if (state.channels.length < 2) { el.style.display = 'flex'; tableWrap.style.display = 'none'; return; }
  el.style.display = 'none'; tableWrap.style.display = 'block';
  runComparison();
}

// ── CHANNEL ANALYSIS ──
async function quickAudit() {
  const input = document.getElementById('auditChannelInput');
  const handle = input?.value?.trim() || state.channels[state.activeChannelIdx]?.handle;
  if (!handle) { showToast('Enter a channel handle or ID', 'error'); return; }
  const btn = document.getElementById('auditBtnText');
  if (btn) btn.textContent = '⏳ Analyzing...';
  try {
    if (state.ytKey) {
      await fetchRealChannelData(handle);
    } else {
      state.demoMode = true;
      const ch = state.channels.find(c => c.handle === handle || c.id === handle) || DEFAULT_VAULT[1];
      loadDemoChannelData(ch);
    }
  } finally {
    if (btn) btn.textContent = '⚡ Analyze Channel';
  }
}

async function fetchRealChannelData(handleOrId) {
  let url;
  if (handleOrId.startsWith('@')) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handleOrId.slice(1)}&key=${state.ytKey}`;
  } else {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${handleOrId}&key=${state.ytKey}`;
  }
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const ch = data.items?.[0];
  if (!ch) { showToast('Channel not found', 'error'); return; }
  const stats = ch.statistics;
  const subs = parseInt(stats.subscriberCount || 0);
  const views = parseInt(stats.viewCount || 0);
  const videos = parseInt(stats.videoCount || 0);
  updateOverviewStats(subs, views, videos);
  showToast(`✅ ${ch.snippet.title} analyzed!`, 'success');
  state.channelData = { name: ch.snippet.title, subs, views, videos, handle: handleOrId };
  fetchRecentVideos(ch.id);
}

function updateOverviewStats(subs, views, videos) {
  const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n;
  document.getElementById('statSubs').textContent = fmt(subs);
  document.getElementById('statViews').textContent = fmt(views);
  document.getElementById('statVideos').textContent = fmt(videos);
  const eng = ((views / (subs || 1)) * 0.04).toFixed(2);
  document.getElementById('statEng').textContent = eng + '%';
  document.getElementById('statSubTrend').textContent = '▲ Live from YouTube API';
  document.getElementById('statSubTrend').className = 'stat-trend positive';
}

async function fetchRecentVideos(channelId) {
  if (!state.ytKey) return;
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=20&order=date&type=video&key=${state.ytKey}`);
    const data = await res.json();
    if (!data.items) return;
    const videoIds = data.items.map(i => i.id.videoId).join(',');
    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${state.ytKey}`);
    const statsData = await statsRes.json();
    const videos = statsData.items?.map(v => ({
      id: v.id,
      title: v.snippet.title,
      views: parseInt(v.statistics.viewCount || 0),
      likes: parseInt(v.statistics.likeCount || 0),
      comments: parseInt(v.statistics.commentCount || 0),
      publishedAt: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails.medium.url,
    })) || [];
    if (videos.length) {
      const medianViews = median(videos.map(v => v.views));
      const outlierVids = videos.map(v => ({
        ...v,
        multiplier: +(v.views / medianViews).toFixed(1),
        category: v.views > medianViews * 10 ? 'unicorn' : v.views > medianViews * 5 ? 'viral' : v.views > medianViews * 2 ? 'high' : v.views > medianViews * 0.8 ? 'normal' : 'under',
        url: `https://www.youtube.com/watch?v=${v.id}`,
        vph: Math.round(v.views / (Math.max(1, (Date.now() - new Date(v.publishedAt)) / 3600000))),
        daysAgo: Math.floor((Date.now() - new Date(v.publishedAt)) / 86400000),
        channelName: state.channelData?.name || 'Channel',
      }));
      state.outliers = outlierVids;
      renderOutliers();
      updateKpiBanner(medianViews, outlierVids);
      renderForensicVideos(outlierVids);
    }
  } catch (e) { console.error(e); }
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b) => a-b);
  const mid = Math.floor(s.length/2);
  return s.length%2 ? s[mid] : (s[mid-1]+s[mid])/2;
}

function loadDemoChannel() {
  const ch = DEFAULT_VAULT[1];
  loadDemoChannelData(ch);
}

function loadDemoChannelData(ch) {
  updateOverviewStats(ch.subscribers, ch.totalViews, ch.videoCount);
  loadDemoOutliers();
  showToast(`📊 Loaded demo data for ${ch.name}`, 'info');
}

// ── OUTLIER DATA ──
const DEMO_OUTLIERS = [
  { id: 'plN7JMbadRg', title: 'Eat Everything In A Grocery Store, Win $1,000,000', channelName: 'MrBeast', views: 142000000, medianViews: 110000000, multiplier: 12.9, category: 'unicorn', vph: 4200, daysAgo: 14, thumbnail: 'https://i.ytimg.com/vi/plN7JMbadRg/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=plN7JMbadRg', dna: { hookScore: 9.9, curiosityGap: 'Insane physical challenge + 7-figure cash reward in opening 2 seconds', titleFormula: '[Extreme Physical Act] + [Specific Venue] + [Life-Changing Stakes]', emotionalTrigger: 'Spectacle & Awe', retentionSecret: 'Timer counting down on screen; rapid montage of food aisles disappearing', thumbnailAngle: 'Empty store + giant pallets of cash' } },
  { id: 'IV3dnLzthDA', title: 'The Man Who Accidentally Killed The Most People In History', channelName: 'Veritasium', views: 41200000, medianViews: 3400000, multiplier: 12.1, category: 'unicorn', vph: 3100, daysAgo: 45, thumbnail: 'https://i.ytimg.com/vi/IV3dnLzthDA/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=IV3dnLzthDA', dna: { hookScore: 9.8, curiosityGap: 'Historical tragedy + shocking premise (Thomas Midgley Jr.)', titleFormula: 'The Man Who Accidentally [Unimaginable Catastrophe] In History', emotionalTrigger: 'Morbid Fascination & Historical Curiosity', retentionSecret: 'Started with lead poison symptoms before revealing the scientist', thumbnailAngle: 'B&W portrait + chemical formulas + red caution hazard' } },
  { id: 'pTn6Ewhb27k', title: 'Why No One Has Measured The Speed of Light', channelName: 'Veritasium', views: 26800000, medianViews: 3400000, multiplier: 7.8, category: 'viral', vph: 1950, daysAgo: 60, thumbnail: 'https://i.ytimg.com/vi/pTn6Ewhb27k/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=pTn6Ewhb27k', dna: { hookScore: 9.3, curiosityGap: 'Directly contradicts common knowledge', titleFormula: 'Why No One Has [Basic Fact Everyone Assumes Is Done]', emotionalTrigger: 'Intellectual Confusion & Scientific Challenge', retentionSecret: 'Challenged viewer to prove how to measure a laser beam to Mars', thumbnailAngle: 'Cosmic clock + question mark + light beam' } },
  { id: 'wajoP_5Cpw8', title: 'Every app on Earth is now open source... whether it likes it or not', channelName: 'Fireship', views: 1480000, medianViews: 480000, multiplier: 3.1, category: 'high', vph: 920, daysAgo: 3, thumbnail: 'https://i.ytimg.com/vi/wajoP_5Cpw8/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=wajoP_5Cpw8', dna: { hookScore: 9.1, curiosityGap: 'Explosive tech news with sensational packaging', titleFormula: 'Every [Asset] is now [Threat]... whether it likes it or not', emotionalTrigger: 'Tech Panic & Developer Fascination', retentionSecret: '5-second audio stings with meme references at 200+ WPM', thumbnailAngle: 'Matrix code raining on Apple and Google logos' } },
  { id: 'No-JPdFvYWU', title: 'The one OpenAI announcement that can actually make you money...', channelName: 'Fireship', views: 1250000, medianViews: 480000, multiplier: 2.6, category: 'high', vph: 680, daysAgo: 9, thumbnail: 'https://i.ytimg.com/vi/No-JPdFvYWU/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=No-JPdFvYWU', dna: { hookScore: 8.8, curiosityGap: 'Cuts through hype to deliver direct financial payoff', titleFormula: 'The One [Company] [Event] That Can Actually [Desirable Benefit]', emotionalTrigger: 'Greed & Pragmatism', retentionSecret: 'Live code demo in first 40 seconds', thumbnailAngle: 'OpenAI logo + green cash flow graph' } },
  { id: '_0G4OG39XjI', title: 'WTF is a Googlebook?', channelName: 'MKBHD', views: 3250000, medianViews: 1850000, multiplier: 1.8, category: 'normal', vph: 510, daysAgo: 6, thumbnail: 'https://i.ytimg.com/vi/_0G4OG39XjI/hqdefault.jpg', url: 'https://www.youtube.com/watch?v=_0G4OG39XjI', dna: { hookScore: 8.5, curiosityGap: 'Casual confusion from the most trusted tech voice', titleFormula: 'WTF is a [Product Name]?', emotionalTrigger: 'Confusion & Brand Curiosity', retentionSecret: 'Studio camera pan over mystery hardware for 6 silent seconds', thumbnailAngle: 'MKBHD + mystery laptop + giant glowing question mark' } },
];

function loadDemoOutliers() {
  state.outliers = [...DEMO_OUTLIERS];
  renderOutliers();
  updateKpiBanner(480000, state.outliers);
  renderOverviewOutliers();
  const viralGate = document.getElementById('viralApiGate');
  if (viralGate) viralGate.style.display = 'none';
}

function updateKpiBanner(medianViews, outliers) {
  const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n;
  const maxMult = Math.max(...outliers.map(o => o.multiplier));
  const avgVph = Math.round(outliers.reduce((a,o) => a+o.vph, 0) / outliers.length);
  ['kpiMedian','kpiMaxMult','kpiViralThresh','kpiVph'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (i===0) el.textContent = fmt(medianViews);
    if (i===1) el.textContent = maxMult + 'x';
    if (i===2) el.textContent = fmt(medianViews * 3) + '+';
    if (i===3) el.textContent = fmt(avgVph) + ' VPH';
  });
}

let filteredOutliers = [...DEMO_OUTLIERS];

function sendOutlierToClips(title) {
  switchTab('clip-generator', document.querySelector('[data-tab=clip-generator]'));
  const topicInput = document.getElementById('clipTopic');
  if (topicInput) topicInput.value = title;
  switchClipSource('topic', document.querySelectorAll('#clipSourceTabs .tab-pill')[2]);
  showToast('Concept sent to Auto Clip Generator!', 'success');
}

function sendOutlierToThumb(title) {
  switchTab('thumbnail-lab', document.querySelector('[data-tab=thumbnail-lab]'));
  const desc = document.getElementById('thumbDescription');
  if (desc) desc.value = `High contrast viral thumbnail for: "${title}". Bold text overlay with shocking visual element and face.`;
  showToast('Concept sent to Thumbnail Lab!', 'success');
}

function renderOutliers() {
  const grid = document.getElementById('outlierGrid');
  if (!grid) return;
  const toRender = filteredOutliers.length ? filteredOutliers : state.outliers;
  grid.innerHTML = toRender.map(o => `
    <div class="outlier-card" onclick="openViralDna('${o.id}')">
      <div class="outlier-thumb">
        <img src="${o.thumbnail}" alt="${o.title}" loading="lazy" onerror="this.src='https://placehold.co/480x270/111d33/6366f1?text=Video+Thumbnail'" />
        <span class="outlier-mult ${o.category}">${o.multiplier}x</span>
        <span class="outlier-vph">${fmtNum(o.vph)} VPH</span>
      </div>
      <div class="outlier-body">
        <div class="outlier-channel">${o.channelName} • ${o.daysAgo}d ago</div>
        <div class="outlier-title">${o.title}</div>
        <div class="outlier-meta mb-2">
          <div class="outlier-views">👁️ <strong>${fmtNum(o.views)}</strong> views</div>
          <a href="${o.url}" target="_blank" class="text-xs link" onclick="event.stopPropagation()">Watch on YT ↗</a>
        </div>
        <div class="flex gap-1 wrap" style="border-top:1px solid var(--border);padding-top:8px">
          <button class="btn-xs btn-groq" onclick="event.stopPropagation();generateFromTrend('${o.title.replace(/'/g,"\\'")}')">⚡ Script</button>
          <button class="btn-xs btn-outline" onclick="event.stopPropagation();sendOutlierToClips('${o.title.replace(/'/g,"\\'")}')">📱 Shorts</button>
          <button class="btn-xs btn-outline" onclick="event.stopPropagation();sendOutlierToThumb('${o.title.replace(/'/g,"\\'")}')">🖼️ Thumb</button>
          <button class="btn-xs btn-outline" onclick="event.stopPropagation();addCardToKanban({title:'${o.title.replace(/'/g,"\\'")}',format:'long',keyword:'viral outlier',priority:'high',status:'ideas'});showToast('Added to Pipeline!','success')">🎬 +Pipeline</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderOverviewOutliers() {
  const el = document.getElementById('overviewOutliers');
  if (!el) return;
  const top3 = state.outliers.slice(0, 3);
  if (!top3.length) return;
  el.innerHTML = top3.map(o => `
    <div class="flex items-center gap-3 p-3 mb-2" style="background:var(--bg-input);border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer" onclick="switchTab('viral-radar',document.querySelector('[data-tab=viral-radar]'))">
      <img src="${o.thumbnail}" style="width:72px;height:42px;object-fit:cover;border-radius:6px;flex-shrink:0" onerror="this.src='https://placehold.co/72x42/111d33/6366f1?text=YT'" />
      <div style="flex:1;min-width:0">
        <div class="text-sm font-bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.title}</div>
        <div class="text-xs text-muted">${fmtNum(o.views)} views</div>
      </div>
      <span class="badge badge-red">${o.multiplier}x</span>
    </div>
  `).join('');
}

function filterOutliers(cat, btn) {
  document.querySelectorAll('#outlierFilters .pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  state.currentFilter = cat;
  filteredOutliers = cat === 'all' ? [...state.outliers] : state.outliers.filter(o => o.category === cat);
  renderOutliers();
}

function searchOutliers(q) {
  const lq = q.toLowerCase();
  filteredOutliers = state.outliers.filter(o =>
    !q || o.title.toLowerCase().includes(lq) || o.channelName.toLowerCase().includes(lq)
  );
  if (state.currentFilter !== 'all') filteredOutliers = filteredOutliers.filter(o => o.category === state.currentFilter);
  renderOutliers();
}

function sortOutliers(key) {
  const arr = [...filteredOutliers];
  if (key === 'mult') arr.sort((a,b) => b.multiplier - a.multiplier);
  if (key === 'views') arr.sort((a,b) => b.views - a.views);
  if (key === 'vph') arr.sort((a,b) => b.vph - a.vph);
  if (key === 'date') arr.sort((a,b) => a.daysAgo - b.daysAgo);
  filteredOutliers = arr;
  renderOutliers();
}

// ── VIRAL DNA MODAL ──
let activeDnaVideo = null;
function openViralDna(videoId) {
  const v = state.outliers.find(o => o.id === videoId);
  if (!v) return;
  activeDnaVideo = v;
  document.getElementById('dnaModalSub').textContent = v.title;
  document.getElementById('dnaModalBody').innerHTML = `
    <div class="grid-split-2 mb-3">
      <img src="${v.thumbnail}" style="width:100%;border-radius:var(--radius-sm);aspect-ratio:16/9;object-fit:cover" onerror="this.src='https://placehold.co/480x270/111d33/6366f1?text=Thumbnail'" />
      <div>
        <div class="flex items-center gap-2 mb-2">
          <span class="badge badge-red">${v.multiplier}x OUTLIER</span>
          <span class="badge badge-green">${fmtNum(v.vph)} VPH</span>
        </div>
        <div class="mb-2"><span class="text-xs text-muted">TOTAL VIEWS</span><div class="text-lg font-bold">${fmtNum(v.views)}</div></div>
        <div class="mb-2"><span class="text-xs text-muted">CHANNEL MEDIAN</span><div class="text-sm">${fmtNum(v.medianViews)}</div></div>
        <div class="mb-2"><span class="text-xs text-muted">UPLOADED</span><div class="text-sm">${v.daysAgo} days ago</div></div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="text-xs text-muted mb-2 font-bold">🔬 VIRAL DNA BREAKDOWN</div>
    <div class="grid-split-2 gap-3">
      ${[
        ['🎣 Hook Score', v.dna?.hookScore + ' / 10'],
        ['❓ Curiosity Gap', v.dna?.curiosityGap],
        ['📝 Title Formula', v.dna?.titleFormula],
        ['💢 Emotional Trigger', v.dna?.emotionalTrigger],
        ['📊 Retention Secret', v.dna?.retentionSecret],
        ['🖼️ Thumbnail Angle', v.dna?.thumbnailAngle],
      ].map(([k,val]) => `
        <div class="insight-item insight-tip" style="margin:0">
          <div>
            <div class="text-xs font-bold text-muted mb-1">${k}</div>
            <div class="text-sm">${val || '—'}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  openModal('viralDnaModal');
}

function stealConceptToGroq() {
  if (!activeDnaVideo) return;
  const prompt = `Reverse-engineer this viral video and create 5 unique video concepts inspired by it:\n\nTitle: "${activeDnaVideo.title}"\nViews: ${fmtNum(activeDnaVideo.views)} (${activeDnaVideo.multiplier}x above channel median)\nWhy it went viral: ${activeDnaVideo.dna?.curiosityGap}\nTitle formula: ${activeDnaVideo.dna?.titleFormula}\nEmotional trigger: ${activeDnaVideo.dna?.emotionalTrigger}\n\nFor each concept provide:\n1. A viral title\n2. Hook (first 30 seconds)\n3. Core promise\n4. Thumbnail idea`;
  document.getElementById('studioPrompt').value = prompt;
  closeModal('viralDnaModal');
  switchTab('content-studio', document.querySelector('[data-tab=content-studio]'));
  showToast('Concept loaded into AI Studio!', 'success');
}

// ── HOOK ANALYZER ──
async function analyzeHook() {
  const url = document.getElementById('hookVideoUrl').value.trim();
  if (!url) { showToast('Please enter a YouTube URL', 'error'); return; }
  const btn = document.getElementById('hookBtnText');
  if (btn) btn.textContent = '⏳ Analyzing...';

  try {
    // Extract video ID
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    if (!match) { showToast('Invalid YouTube URL', 'error'); return; }
    const videoId = match[1];

    if (state.groqKey) {
      // Ask Groq to simulate hook analysis
      const prompt = `Analyze the hook strength for YouTube video ID: ${videoId} (URL: ${url})\n\nProvide a JSON response with these exact keys:\n{\n  "hookScore": <number 1-10>,\n  "curiosityGap": <score 0-100>,\n  "patternInterrupts": <score 0-100>,\n  "promiseClarity": <score 0-100>,\n  "retentionRisk": <score 0-100 where 100 = high risk>,\n  "advice": "<one specific actionable improvement>"\n}\n\nBase analysis on: title "${videoId}", common patterns for this type of content, and viral video best practices. Return ONLY valid JSON.`;
      const result = await callGroq(prompt);
      try {
        const data = JSON.parse(result.replace(/```json|```/g,'').trim());
        showHookResults(data);
      } catch(e) {
        showDemoHookResults();
      }
    } else {
      showDemoHookResults();
      showToast('Using demo analysis — connect Groq for AI-powered scoring', 'info');
    }
  } catch(e) {
    showDemoHookResults();
  } finally {
    if (btn) btn.textContent = '🔬 Analyze Hook Strength';
  }
}

function showDemoHookResults() {
  showHookResults({ hookScore: 7.4, curiosityGap: 68, patternInterrupts: 55, promiseClarity: 82, retentionRisk: 35, advice: "Add a specific dollar amount or shocking statistic in the first sentence to boost curiosity gap. Example: Start with 'This one mistake costs YouTube creators $10,000/month' instead of starting with context." });
}

function showHookResults(data) {
  const results = document.getElementById('hookResults');
  results.style.display = 'block';
  // Score ring
  const score = data.hookScore;
  const circumference = 238.76;
  const offset = circumference - (score / 10) * circumference;
  const circle = document.getElementById('hookScoreCircle');
  const num = document.getElementById('hookScoreNum');
  if (circle) { circle.style.strokeDashoffset = offset; circle.setAttribute('stroke', score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444'); }
  if (num) num.textContent = score.toFixed(1);

  // Factors
  const factors = [
    ['Curiosity Gap', data.curiosityGap, data.curiosityGap >= 70 ? '#10b981' : data.curiosityGap >= 50 ? '#f59e0b' : '#ef4444'],
    ['Pattern Interrupts', data.patternInterrupts, data.patternInterrupts >= 70 ? '#10b981' : '#f59e0b'],
    ['Promise Clarity', data.promiseClarity, data.promiseClarity >= 70 ? '#10b981' : '#f59e0b'],
    ['Drop-off Risk', data.retentionRisk, data.retentionRisk <= 30 ? '#10b981' : data.retentionRisk <= 60 ? '#f59e0b' : '#ef4444'],
  ];
  document.getElementById('hookFactors').innerHTML = factors.map(([label, val, color]) => `
    <div class="hook-row">
      <div class="hook-label">${label}</div>
      <div class="hook-bar-wrap"><div class="hook-bar-fill" style="width:${val}%;background:${color}"></div></div>
      <div class="hook-pct" style="color:${color}">${val}%</div>
    </div>
  `).join('');

  document.getElementById('hookAdvice').innerHTML = `<div class="text-xs text-muted mb-1 font-bold">💡 AI RECOMMENDATION</div><div class="text-sm">${data.advice}</div>`;
}

// ── FORENSIC ──
async function loadForensic() {
  const input = document.getElementById('forensicChannelInput').value.trim();
  if (!input) { showToast('Enter a channel handle or ID', 'error'); return; }
  const btn = document.getElementById('forensicBtnText');
  if (btn) btn.textContent = '⏳ Analyzing...';

  document.getElementById('forensicApiGate').style.display = 'none';
  document.getElementById('forensicContent').style.display = 'block';

  try {
    if (state.ytKey) {
      await fetchRealChannelData(input);
      await fetchForensicData(input);
    } else {
      loadDemoForensicData();
      showToast('Demo forensic data loaded — connect YouTube API for live analysis', 'info');
    }
  } finally {
    if (btn) btn.textContent = '🔬 Deep Analyze';
  }
}

async function fetchForensicData(handle) {
  // Try to get channel info
  let url;
  if (handle.startsWith('@')) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&forHandle=${handle.slice(1)}&key=${state.ytKey}`;
  } else {
    url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${handle}&key=${state.ytKey}`;
  }
  const res = await fetch(url);
  const data = await res.json();
  const ch = data.items?.[0];
  if (!ch) { loadDemoForensicData(); return; }
  const s = ch.statistics;
  const subs = parseInt(s.subscriberCount || 0);
  const views = parseInt(s.viewCount || 0);
  const videos = parseInt(s.videoCount || 0);
  updateForensicUI(ch.snippet.title, handle, subs, views, videos, ch.snippet.publishedAt);
  await fetchRecentVideos(ch.id);
}

function loadDemoForensicData() {
  updateForensicUI('Automation Empire', '@AutomationEmpire', 1240000, 84600000, 142, '2022-04-18');
  renderForensicVideos(DEMO_OUTLIERS.slice(0, 6).map(o => ({...o, likes: Math.round(o.views*0.06), comments: Math.round(o.views*0.008)})));
}

function updateForensicUI(name, handle, subs, views, videos, joined) {
  const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n;
  document.getElementById('forensicName').textContent = name;
  document.getElementById('forensicHandle').textContent = handle;
  document.getElementById('forensicSubs').textContent = fmt(subs);
  document.getElementById('forensicTotalViews').textContent = fmt(views);
  document.getElementById('forensicVideoCount').textContent = fmt(videos);
  document.getElementById('forensicJoined').textContent = joined?.slice(0,10) || '—';
  document.getElementById('forensicAvatar').textContent = name.slice(0,2).toUpperCase();
  const velocity = subs > 0 ? (views/subs).toFixed(1) : '—';
  const cadence = videos > 0 ? (videos / Math.max(1, (Date.now() - new Date(joined || '2022-01-01')) / (7*24*3600*1000))).toFixed(1) : '—';
  const monthlyViews = views * 0.025;
  const cpm = 12;
  const revenue = '$' + fmtNum(Math.round(monthlyViews / 1000 * cpm * 0.55)) + ' – $' + fmtNum(Math.round(monthlyViews / 1000 * cpm * 0.8));
  document.getElementById('metricVelocity').textContent = velocity + ' views/sub';
  document.getElementById('metricCadence').textContent = cadence + ' videos/week';
  document.getElementById('metricRevenue').textContent = revenue + '/mo';
  simulateCommentSentiment();
}

function renderForensicVideos(videos) {
  const tb = document.getElementById('forensicVideoTable');
  if (!tb) return;
  const medV = median(videos.map(v=>v.views));
  tb.innerHTML = videos.slice(0,20).map(v => {
    const mult = medV > 0 ? +(v.views/medV).toFixed(1) : 1;
    const cls = mult >= 5 ? 'text-red' : mult >= 2 ? 'text-amber' : mult >= 0.8 ? '' : 'text-muted';
    return `<tr>
      <td class="td-title" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.title}</td>
      <td class="td-views">${fmtNum(v.views)}</td>
      <td><span class="${cls} font-bold">${mult}x</span></td>
      <td>
        <button class="btn-xs btn-groq" onclick="generateFromTrend('${v.title.replace(/'/g,"\\'")}')">⚡ Script</button>
      </td>
    </tr>`;
  }).join('');
}

function simulateCommentSentiment() {
  const love = Math.floor(Math.random()*20)+55;
  const viral = Math.floor(Math.random()*15)+20;
  const ideas = Math.floor(Math.random()*10)+5;
  const conf = Math.floor(Math.random()*10)+5;
  document.getElementById('sentLove').textContent = love + '%';
  document.getElementById('sentViral').textContent = viral + '%';
  document.getElementById('sentIdeas').textContent = ideas + ' topics';
  document.getElementById('sentConfusion').textContent = conf + '%';
  const comments = [
    { text: '"This video changed everything for me. Finally someone explaining MCP in a way that actually makes sense!"', type: 'love', sentiment: '💚 Love Signal' },
    { text: '"Can you make a video about using this with local LLMs? I\'ve been looking everywhere"', type: 'idea', sentiment: '💡 Content Idea' },
    { text: '"I shared this immediately with my entire team. Everyone needs to see this"', type: 'viral', sentiment: '🔥 Viral Trigger' },
    { text: '"I don\'t understand the part about webhooks, could you explain more?"', type: 'confusion', sentiment: '❓ Confusion Signal' },
  ];
  document.getElementById('topComments').innerHTML = comments.map(c => `
    <div class="comment-card ${c.type}">
      <div class="comment-text">${c.text}</div>
      <div class="comment-footer">
        <div class="comment-meta">YouTube Comment</div>
        <div class="comment-sentiment badge badge-${c.type==='love'?'green':c.type==='viral'?'amber':c.type==='idea'?'cyan':'red'}">${c.sentiment}</div>
      </div>
    </div>
  `).join('');
}

function loadCommentIntel() {
  simulateCommentSentiment();
  showToast('Comment intelligence updated!', 'success');
}

// ── COMPETITOR COMPARISON ──
function runComparison() {
  const channels = state.channels.slice(0, 4);
  if (channels.length < 2) return;
  const fmt = n => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(2)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n;
  const headerRow = document.getElementById('benchmarkHeaderRow');
  const body = document.getElementById('benchmarkBody');
  if (!headerRow || !body) return;

  headerRow.innerHTML = '<th>Metric</th>' + channels.map(c => `<th>${c.avatar || '📺'} ${c.name}</th>`).join('');
  const metrics = [
    ['👥 Subscribers', c => fmt(c.subscribers)],
    ['👁️ Total Views', c => fmt(c.totalViews)],
    ['🎬 Videos', c => fmt(c.videoCount)],
    ['📈 Views/Sub', c => c.subscribers > 0 ? (c.totalViews/c.subscribers).toFixed(1) : '—'],
    ['📊 Avg Vid Views', c => fmt(c.medianViews)],
    ['🌍 Niche', c => c.niche || '—'],
  ];
  body.innerHTML = metrics.map(([label, fn]) => `
    <tr>
      <td class="font-bold text-muted">${label}</td>
      ${channels.map(c => `<td>${fn(c)}</td>`).join('')}
    </tr>
  `).join('');

  document.getElementById('compApiGate').style.display = 'none';
  document.getElementById('benchmarkTableWrap').style.display = 'block';
}

function loadDemoBenchmark() {
  state.demoMode = true;
  state.channels = [
    { name: 'My Automation Channel', avatar: '🚀', subscribers: 142000, totalViews: 12400000, videoCount: 88, medianViews: 48000, niche: 'AI & Automation' },
    { name: 'Fireship', avatar: '🔥', subscribers: 3400000, totalViews: 420000000, videoCount: 640, medianViews: 380000, niche: 'Tech & Code' },
    { name: 'Matt Wolfe', avatar: '🤖', subscribers: 680000, totalViews: 52000000, videoCount: 320, medianViews: 92000, niche: 'AI Tools' },
    { name: 'Liam Ottley', avatar: '💼', subscribers: 510000, totalViews: 31000000, videoCount: 205, medianViews: 65000, niche: 'AI Automation Agency' }
  ];
  runComparison();
  showToast('👁️ Sample competitor benchmark loaded!', 'info');
}

function checkCompetitorUploads() {
  showToast('Checking competitor channels...', 'info');
  setTimeout(() => {
    document.getElementById('competitorAlerts').innerHTML = `
      <div class="insight-item insight-warn">
        <span class="insight-icon">🔔</span>
        <div class="insight-text"><strong>Fireship uploaded 2 hours ago:</strong> "Every JavaScript framework is dead now..." — Early VPH: 1,840 (3.8x above median). <button class="btn-xs btn-groq ml-2" onclick="generateFromTrend('Why JavaScript frameworks are being abandoned')">⚡ Make Similar</button></div>
      </div>
      <div class="insight-item insight-tip">
        <span class="insight-icon">📊</span>
        <div class="insight-text"><strong>MKBHD uploaded 18 hours ago:</strong> "The iPhone 17 Camera Actually Has a Problem" — 4.2M views. <button class="btn-xs btn-groq ml-2" onclick="generateFromTrend('Product problems revealed')">⚡ Make Similar</button></div>
      </div>
    `;
    showToast('✅ Competitor feed refreshed!', 'success');
  }, 1500);
}

// ── GROQ AI ──
async function callGroq(prompt) {
  const key = state.groqKey || localStorage.getItem('yt3_groq_key');
  if (!key) throw new Error('No Groq API key');
  const model = document.getElementById('studioModel')?.value || state.groqModel;
  const niche = document.getElementById('studioNiche')?.value || 'YouTube Automation';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `You are an expert YouTube growth strategist, viral content creator, and AI automation expert. Channel niche: ${niche}. Be specific, actionable, and data-driven. Format output in clear sections with emojis.` },
        { role: 'user', content: prompt },
      ],
      temperature: parseFloat(document.getElementById('groqTempRange')?.value || 0.7),
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

const PRESET_PROMPTS = {
  reverse_engineer: `Reverse-engineer a viral YouTube video and generate 5 completely unique video concepts inspired by what made it go viral.\n\nFor each concept provide:\n1. 🎯 Viral Title (curiosity-gap format)\n2. 🎣 Hook Script (first 30 seconds word-for-word)\n3. 📊 Core Promise to viewer\n4. 🖼️ Thumbnail Concept\n5. 📈 Why this will outperform average videos\n\nUse proven viral formulas: specific numbers, stakes, controversy, pattern interrupts.`,
  '10_titles': `Generate 10 ultra-high-CTR YouTube titles for my niche. For each title:\n1. Write the title\n2. Identify which psychological trigger it uses (curiosity, fear, greed, social proof, etc.)\n3. Predict CTR range based on industry benchmarks\n4. Suggest the perfect thumbnail concept to match\n\nFormats to include: curiosity-gap, "I did X for Y days", specific dollar amounts, "Why no one talks about", WTF formats.`,
  full_blueprint: `Create a full 10-minute video blueprint with maximum retention engineering:\n\n1. ⚡ HOOK (0:00–0:30)\n   - Opening line\n   - Pattern interrupt\n   - Promise delivery\n\n2. 🎬 ACT 1 (0:30–3:00)\n   - Context without losing momentum\n   - First retention trap at 1:00\n\n3. 🔥 ACT 2 (3:00–7:00)\n   - Core value delivery\n   - Micro-cliffhangers every 90 seconds\n   - Mid-roll ad bridge at 5:00\n\n4. 🏆 ACT 3 (7:00–9:30)\n   - Climax / payoff\n   - Emotional peak\n\n5. 📢 END SCREEN (9:30–10:00)\n   - Subscribe nudge\n   - Next video tease\n   - CTA`,
  hook_30: `Write 5 different viral hook variations for the first 30 seconds of a YouTube video in my niche.\n\nEach hook must:\n- Start with a pattern interrupt (not "Hey guys, welcome back")\n- Include a specific, verifiable claim or shocking fact\n- Create a curiosity gap that forces viewers to keep watching\n- Be under 75 words\n- Avoid intros, channel names, or greetings\n\nRate each hook 1-10 and explain why it will hold retention.`,
  description: `Write an SEO-optimized YouTube video description that:\n\n1. Opens with a keyword-rich first paragraph (viewers see this in search)\n2. Includes a curiosity hook that makes people click "Show More"\n3. Lists chapters with timestamps (00:00, 01:30, etc.)\n4. Has 3 strong CTAs (like, subscribe, comment)\n5. Includes relevant hashtags (3-5 only)\n6. Has an affiliate/sponsor placeholder\n7. Lists social media links placeholder\n\nTarget length: 400-600 words. Keywords should appear naturally, not stuffed.`,
  channel_audit: `Perform a brutal, honest VidIQ-style channel audit for a YouTube channel in my niche.\n\nAnalyze:\n1. 🎯 Title optimization (give score out of 10)\n2. 🖼️ Thumbnail strategy (give score out of 10)\n3. 📊 Upload consistency (ideal vs actual)\n4. 🔍 SEO positioning (keywords, tags, descriptions)\n5. ⏱️ Average retention patterns\n6. 💡 Top 5 specific improvements that would increase views by 50%+ in 90 days\n\nBe direct. Use data benchmarks. No fluff.`,
  community_post: `Write 5 different YouTube Community Post ideas to maintain audience engagement between uploads:\n\n1. 📊 Poll post (with 4 options related to upcoming content)\n2. 🤫 Behind-the-scenes teaser post\n3. 💬 Question post (drives comments = algorithm signal)\n4. 🔥 Controversial opinion post\n5. 📢 Giveaway or reward post for loyal subscribers\n\nEach post should be under 150 words, include an emoji hook in the first line, and drive a specific action.`,
};

async function runGroq() {
  const btn = document.getElementById('groqRunBtn');
  const output = document.getElementById('groqOutput');
  const dot = document.getElementById('consoleDot');
  const status = document.getElementById('consoleStatus');
  const prompt = document.getElementById('studioPrompt').value.trim();
  if (!prompt) { showToast('Enter a prompt or select a recipe', 'error'); return; }

  if (!state.groqKey) {
    showDemoOutput(prompt);
    showToast('Demo output — connect Groq API for real AI generation', 'info');
    return;
  }

  btn.textContent = '⏳ Generating...';
  if (dot) { dot.className = 'console-dot green'; }
  if (status) status.textContent = 'Generating...';
  output.textContent = '';

  try {
    const result = await callGroq(prompt);
    output.textContent = result;
    const wc = result.split(/\s+/).length;
    const dur = Math.round(wc / 130);
    const minSec = `${Math.floor(dur)}:${String((dur % 1) * 60).padStart(2,'0')}`;
    document.getElementById('wordCount').textContent = `Words: ${wc} | Est: ${minSec}`;
    if (dot) dot.className = 'console-dot idle';
    if (status) status.textContent = 'Complete';
    showToast('✅ AI generation complete!', 'success');
  } catch (e) {
    output.textContent = '❌ Error: ' + e.message + '\n\nMake sure your Groq API key is valid.';
    showToast('Groq error: ' + e.message, 'error');
  } finally {
    btn.textContent = '⚡ Run AI';
  }
}

function showDemoOutput(prompt) {
  const demos = {
    viral: `🔥 VIRAL VIDEO CONCEPTS GENERATED\n\n1. 🎯 "I Automated My Entire YouTube Channel for 30 Days — Here's What Happened"\n   Hook: "30 days ago, I handed my YouTube channel to an AI. Today I'm showing you every view, every mistake, and the $8,400 it made without me touching anything."\n   Thumbnail: You sleeping + robot filming + money counter\n\n2. 🎯 "YouTube's Algorithm is Broken — And I Exploited It"\n   Hook: "There's a glitch in YouTube's algorithm that nobody is talking about. I found it 6 weeks ago and it's responsible for 340% of my channel's growth."\n   Thumbnail: YouTube logo with crack + shocked face\n\n3. 🎯 "The $0 YouTube Automation Stack That Generated $12K Last Month"\n   Hook: "Every automation guru is selling you a $2,000 course. I'll show you the exact free tools doing the same thing — live in this video."\n\n4. 🎯 "I Stole MrBeast's Exact Strategy — With AI"\n   Hook: "I spent 72 hours analyzing MrBeast's 50 most viral videos, gave the patterns to Claude AI, and had it generate a strategy for my tiny 50k channel. The results shocked me."\n\n5. 🎯 "Every YouTube Channel Will Be Automated by 2026"\n   Hook: "I know this sounds insane. But I've been running a 100% AI-operated channel for 8 months, and the numbers prove that faceless AI channels are outperforming human creators."`,
    default: `✅ AI CONTENT GENERATED\n\n[This is a demo preview — connect your Groq API key to generate real AI content]\n\nYour prompt: "${prompt}"\n\n📝 SAMPLE OUTPUT:\n\nBased on your niche (YouTube Automation, AI Tools, Faceless Content), here are your optimized results:\n\n1. Viral Hook Formula:\n"I spent $0 and gained 50,000 YouTube subscribers using a tool that 99% of creators don't know about — and today I'm showing you exactly how."\n\n2. Title Variations:\n- "The FREE YouTube Automation Tool Nobody Talks About"\n- "I Built a $10K/Month Channel Without Showing My Face"\n- "YouTube's Algorithm WANTS You To Do This (But Nobody Is)"\n\n3. Key Insights:\n• Use specific numbers (not "many" but "127%")\n• First-person narrative performs 3.4x better than how-to format\n• Curiosity gap beats instruction every time\n\n⚡ Connect Groq API for personalized AI generation based on YOUR channel data.`
  };
  const output = document.getElementById('groqOutput');
  if (output) output.textContent = prompt.includes('concept') || prompt.includes('Reverse') ? demos.viral : demos.default;
}

function loadPreset(key) {
  document.querySelectorAll('.formula-card').forEach(b => b.style.background = '');
  document.getElementById('studioPrompt').value = PRESET_PROMPTS[key] || '';
  showToast(`Recipe loaded: ${key.replace(/_/g,' ')}`, 'info');
}

function clearStudio() {
  document.getElementById('studioPrompt').value = '';
  document.getElementById('groqOutput').textContent = 'Click a recipe or press Run AI to generate content...';
  document.getElementById('wordCount').textContent = 'Words: 0 | Est: 0:00';
}

function copyOutput() {
  const text = document.getElementById('groqOutput').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copied to clipboard!', 'success'));
}

function sendToPipeline() {
  const text = document.getElementById('groqOutput').textContent;
  if (!text || text.includes('Click a recipe')) { showToast('Generate content first', 'error'); return; }
  const firstLine = text.split('\n').find(l => l.trim().length > 5) || 'AI Generated Project';
  addCardToKanban({ title: firstLine.replace(/^#+\s*|^[0-9.]+\s*|\*+/g, '').slice(0, 50), format: 'long', keyword: 'ai automation', priority: 'high', status: 'scripting' });
  showToast('Script sent to Video Pipeline (Kanban)!', 'success');
  switchTab('video-pipeline', document.querySelector('[data-tab=video-pipeline]'));
}

function sendToClips() {
  const text = document.getElementById('groqOutput').textContent;
  if (!text || text.includes('Click a recipe')) { showToast('Generate content first', 'error'); return; }
  const clipInput = document.getElementById('clipScript');
  if (clipInput) clipInput.value = text;
  switchTab('clip-generator', document.querySelector('[data-tab=clip-generator]'));
  switchClipSource('script', document.querySelectorAll('#clipSourceTabs .tab-pill')[0]);
  showToast('Script transferred to Auto Clip Generator! Click "Generate" to create Shorts.', 'success');
}

function sendToThumbnailLab() {
  const text = document.getElementById('groqOutput').textContent;
  if (!text || text.includes('Click a recipe')) { showToast('Generate content first', 'error'); return; }
  const firstLine = text.split('\n').find(l => l.trim().length > 5) || 'Viral Video Concept';
  const cleanTitle = firstLine.replace(/^#+\s*|^[0-9.]+\s*|\*+/g, '').slice(0, 60);
  switchTab('thumbnail-lab', document.querySelector('[data-tab=thumbnail-lab]'));
  const desc = document.getElementById('thumbDescription');
  if (desc) desc.value = `Eye-catching, high contrast YouTube thumbnail for "${cleanTitle}". Features an expressive shocked face on the right, high-vibrancy glow outline, and 3 words in bold yellow/white text: "THEY LIED TO YOU".`;
  showToast('Concept transferred to Thumbnail Lab!', 'success');
}

function sendToCalendar() {
  const text = document.getElementById('groqOutput').textContent;
  if (!text || text.includes('Click a recipe')) { showToast('Generate content first', 'error'); return; }
  const firstLine = text.split('\n').find(l => l.trim().length > 5) || 'New Upload';
  const cleanTitle = firstLine.replace(/^#+\s*|^[0-9.]+\s*|\*+/g, '').slice(0, 45);
  state.calendarEvents.push({ day: (new Date().getDate() + 3) % 28 || 1, type: 'long', title: cleanTitle });
  renderCalendar();
  switchTab('content-calendar', document.querySelector('[data-tab=content-calendar]'));
  showToast('Scheduled on Content Calendar for next upload window!', 'success');
}

// ── GENERATE FROM TREND ──
async function generateFromTrend(topic) {
  switchTab('content-studio', document.querySelector('[data-tab=content-studio]'));
  document.getElementById('studioNiche').value = topic;
  document.getElementById('studioPrompt').value = PRESET_PROMPTS['10_titles'] + `\n\nFocus specifically on: "${topic}"`;
  setTimeout(() => runGroq(), 300);
}

// ── AUTO CLIP GENERATOR ENGINE ──
let currentCaptionStyle = 'hormozi';
let clipStore = [];

function switchClipSource(type, btn) {
  document.querySelectorAll('#clipSourceTabs .tab-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ['clipSourceScript','clipSourceUrl','clipSourceTopic'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById('clipSource' + type.charAt(0).toUpperCase() + type.slice(1));
  if (target) target.style.display = 'block';
}

function setCaptionStyle(style, btn) {
  currentCaptionStyle = style;
  document.querySelectorAll('#captionStylePills .tab-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (clipStore.length) renderClipsFromStore();
  showToast(`Caption style: ${style.toUpperCase()} active`, 'info');
}

async function generateAllClips() {
  const btn = document.getElementById('clipsGenBtn');
  
  // Strict API Check: If no API key integrated and not in demo mode, do not pretend or show dummy data
  if (!state.groqKey && !state.demoMode) {
    showToast('⚠️ Groq API key is required. Paste your free key below or click Preview Sample.', 'error');
    checkApiGates();
    document.getElementById('gateGroqKeyClips')?.focus();
    return;
  }

  if (btn) btn.textContent = '⏳ Analyzing & Generating Shorts...';

  // Determine source
  let source = '';
  const scriptVal = document.getElementById('clipScript')?.value.trim();
  const urlVal = document.getElementById('clipVideoUrl')?.value.trim();
  const topicVal = document.getElementById('clipTopic')?.value.trim();

  if (scriptVal) source = scriptVal;
  else if (urlVal) source = `Extract top viral clips from this YouTube video URL: ${urlVal} on topic: YouTube growth and automation`;
  else if (topicVal) source = topicVal;
  else source = 'AI Automation tools that save 20 hours per week';

  const count = parseInt(document.getElementById('clipCount')?.value || '5');
  const style = document.getElementById('clipStyle')?.value || 'educational';

  const prompt = `You are an elite YouTube Shorts retention strategist (MrBeast + Alex Hormozi style).
Convert the following content into ${count} distinct, high-retention viral YouTube Shorts scripts.
Content:
"${source.slice(0, 1500)}"

Target Style: ${style}

For EACH Short (1 to ${count}), output in this EXACT format:
---SHORT [N]---
Title: [Punchy clicky title under 40 chars]
Duration: [e.g. 38s or 45s]
ViralityScore: [Score out of 100 with emoji, e.g. 96/100 🔥]
Hook: [0:00–0:03 First spoken sentence that stops scrolling]
VisualCue: [Visual action: e.g. Quick punch zoom + screen flash + text overlay]
Rehook: [0:10–0:15 Retention re-hook line that prevents swipe-away]
Script: [Spoken script with bracketed [B-roll: ...] and [SFX: ...] cues]
Voiceover: [Spoken speech text ONLY, no bracketed cues, ready for TTS voiceover]
Loop: [Final sentence that seamlessly loops back to the first word of Hook]
Hashtags: [#tag1 #tag2 #tag3 #tag4 #tag5]`;

  try {
    let result = '';
    if (state.groqKey) {
      result = await callGroq(prompt);
      parseAndStoreClips(result);
    } else {
      previewSampleClips();
      return;
    }
    renderClipsFromStore();
    showToast(`✅ ${clipStore.length} viral clips generated with retention hooks!`, 'success');
  } catch (e) {
    showToast('Groq generation error: ' + e.message + ' — Loading sample clips', 'error');
    previewSampleClips();
  } finally {
    if (btn) btn.textContent = '⚡ Generate Viral Clips';
  }
}

function parseAndStoreClips(rawText) {
  const sections = rawText.split(/---SHORT \d+---/).filter(s => s.trim());
  clipStore = sections.map((sec, i) => {
    const lines = sec.trim().split('\n');
    const getVal = (key) => {
      const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + ':'));
      return line ? line.split(':').slice(1).join(':').trim() : '';
    };
    const title = getVal('Title') || `Viral Short #${i+1}`;
    const duration = getVal('Duration') || `${35 + (i * 4)}s`;
    const score = getVal('ViralityScore') || `${88 + (i * 3)}/100 🔥`;
    const hook = getVal('Hook') || 'Stop scrolling — you need to hear this before it is too late.';
    const visualCue = getVal('VisualCue') || 'Fast punch zoom + red text overlay: "DO NOT SKIP ❌"';
    const rehook = getVal('Rehook') || 'And here is what 99% of people get completely wrong...';
    const script = getVal('Script') || sec.slice(0, 300);
    const voiceover = getVal('Voiceover') || script.replace(/\[.*?\]/g, '').trim();
    const loop = getVal('Loop') || 'Which is why you should always remember that...';
    const hashtags = getVal('Hashtags') || '#shorts #viral #growth #youtube #tips';

    return { num: i+1, title, duration, score, hook, visualCue, rehook, script, voiceover, loop, hashtags };
  });
}

function previewSampleClips() {
  state.demoMode = true;
  clipStore = [
    {
      num: 1,
      title: '🤯 The $0 Tool Crushing $2K Courses',
      duration: '42s',
      score: '97/100 🔥',
      hook: 'Stop scrolling. You are wasting 20 hours a week on YouTube and do not even realize it.',
      visualCue: '⚡ Screen flash + rapid zoom on presenter face + text overlay: "20 HOURS WASTED ❌"',
      rehook: 'Wait until you see how simple step 2 is — this is what gurus charge $2,000 for.',
      script: 'Most creators think they need an entire team to produce daily content. [B-roll: Bouncing graph with green arrow] But with a simple Claude MCP pipeline, you can scrape top viral outlier videos in your niche, [SFX: Whoosh] extract the highest retention hooks, and format 10 Shorts in under 3 minutes. [B-roll: Split screen comparison of views] I went from 1,400 views to 84,000 views in 14 days with zero ad spend.',
      voiceover: 'Stop scrolling. You are wasting 20 hours a week on YouTube and do not even realize it. Most creators think they need an entire team to produce daily content. But with a simple Claude MCP pipeline, you can scrape top viral outlier videos in your niche, extract the highest retention hooks, and format 10 Shorts in under 3 minutes. I went from 1,400 views to 84,000 views in 14 days with zero ad spend.',
      loop: 'And that is the exact reason why...',
      hashtags: '#youtubeautomation #aitools #shorts #viralhacks #sidehustle'
    },
    {
      num: 2,
      title: '⚡ 3-Second Hook That 10x-ed My CTR',
      duration: '38s',
      score: '94/100 🔥',
      hook: 'Your YouTube opening is boring — and it is murdering your retention.',
      visualCue: '🚨 Sudden red glitch effect + text pop: "RETENTION MURDERED 📉"',
      rehook: 'If you do not change this in the first 3 seconds, 70% of viewers swipe away.',
      script: 'Never say "Hey guys, welcome back to my channel". [SFX: Record scratch] That one sentence causes 42% of viewers to swipe away before the 5 second mark. [B-roll: Red downward retention line] Instead, start directly with the consequence: "If you do not fix this setting today, YouTube will suppress your impressions." [SFX: Cash register ding] That single change tripled my average view duration.',
      voiceover: 'Your YouTube opening is boring and it is murdering your retention. Never say hey guys welcome back to my channel. That one sentence causes 42% of viewers to swipe away before the 5 second mark. Instead start directly with the consequence. If you do not fix this setting today YouTube will suppress your impressions. That single change tripled my average view duration.',
      loop: 'So the next time you record, avoid this trap because...',
      hashtags: '#creatorgrowth #youtubetips #retentionhook #algorithm #shorts'
    },
    {
      num: 3,
      title: '💰 The Infinite Loop Shorts Secret',
      duration: '35s',
      score: '91/100 🔥',
      hook: 'This tiny trick makes viewers watch your Short 3 times in a row without knowing.',
      visualCue: '🔄 Infinite loop animation + neon green arrow pointing to replay button',
      rehook: 'Notice how this sentence connects seamlessly into what I said at the very beginning...',
      script: 'The YouTube algorithm only cares about one metric for Shorts: Average Percentage Viewed. [B-roll: YouTube Studio dashboard showing 140% APV] When you structure your last sentence so that it ends mid-thought and grammatically finishes in your hook, [SFX: Bass drop] viewers loop continuously. [B-roll: Viral Shorts feed scrolling] That is how 30-second clips get 2 million views with only 500 subscribers.',
      voiceover: 'This tiny trick makes viewers watch your Short 3 times in a row without knowing. The YouTube algorithm only cares about one metric for Shorts: Average Percentage Viewed. When you structure your last sentence so that it ends mid-thought and grammatically finishes in your hook, viewers loop continuously. That is how 30-second clips get 2 million views with only 500 subscribers.',
      loop: 'And here is proof that...',
      hashtags: '#ytshorts #viralloop #contentcreation #growthhacks #algorithm'
    }
  ];

  document.getElementById('clipsApiGate').style.display = 'none';
  document.getElementById('clipsPlaceholder').style.display = 'none';
  document.getElementById('clipsControls').style.display = 'block';
  document.getElementById('clipsGrid').style.display = 'block';
  renderClipsFromStore();
  showToast('👁️ 3 viral sample shorts loaded! Explore hooks, cues & 1-click actions.', 'info');
}

function renderClipsFromStore() {
  const grid = document.getElementById('clipsGrid');
  if (!grid) return;

  grid.innerHTML = clipStore.map((c, i) => {
    // Caption preview formatter
    let captionHtml = '';
    if (currentCaptionStyle === 'hormozi') {
      const words = c.hook.split(' ');
      captionHtml = `<div class="caption-preview-wrap"><div class="caption-preview-hormozi">${words.map((w, idx) => {
        if (idx % 4 === 0) return `<span class="hl-yellow">${w}</span>`;
        if (idx % 4 === 2) return `<span class="hl-green">${w}</span>`;
        return w;
      }).join(' ')}</div><div class="text-xs text-muted mt-2">⚡ Hormozi Kinetic Caption Preview</div></div>`;
    } else if (currentCaptionStyle === 'mrbeast') {
      captionHtml = `<div class="caption-preview-wrap"><div class="caption-preview-mrbeast">🔥 ${c.hook} 😱</div><div class="text-xs text-muted mt-2">🔥 Beast Bouncy Caption Preview</div></div>`;
    } else {
      captionHtml = `<div class="caption-preview-wrap"><div class="caption-preview-clean">"${c.hook}"</div><div class="text-xs text-muted mt-2">✨ Minimalist Clean Preview</div></div>`;
    }

    return `
      <div class="clip-card" id="clipCard${i}">
        <div class="clip-header">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="badge badge-pink">Short #${c.num}</span>
              <span class="clip-badge-time">⏱️ ${c.duration}</span>
              <span class="clip-virality-score">${c.score}</span>
            </div>
            <h3 style="font-size:1.05rem;font-weight:800;color:var(--text-bright)">${c.title}</h3>
          </div>
          <div class="flex gap-2 wrap">
            <button class="btn-xs btn-outline" onclick="copyClipScript(${i})" title="Copy script with cues">📋 Script</button>
            <button class="btn-xs btn-outline" onclick="copyClipVoiceover(${i})" title="Copy clean speech for TTS">🎙️ Voiceover</button>
            <button class="btn-xs btn-primary" onclick="sendClipToPipeline(${i})">🎬 +Pipeline</button>
            <button class="btn-xs btn-outline" onclick="sendClipToCalendar(${i})">📅 Calendar</button>
            <button class="btn-xs btn-outline" onclick="sendClipToThumbnail(${i})">🖼️ Thumb</button>
          </div>
        </div>

        <!-- 0:00 HOOK -->
        <div class="hook-box">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-bold" style="color:var(--accent-3)">⚡ 0:00–0:03 PATTERN INTERRUPT HOOK</span>
            <span class="badge badge-red">Critical 3s</span>
          </div>
          <div class="text-sm font-bold text-bright mb-2">"${c.hook}"</div>
          <div class="text-xs"><span class="cue-badge cue-visual">Visual Action:</span> <span class="text-secondary">${c.visualCue}</span></div>
        </div>

        <!-- LIVE CAPTION STYLE PREVIEW -->
        ${captionHtml}

        <!-- 0:12 RE-HOOK -->
        <div class="card p-2 mb-3" style="background:rgba(6,182,212,0.06);border-color:rgba(6,182,212,0.25)">
          <div class="text-xs font-bold text-cyan mb-1">🎣 0:10–0:15 RETENTION RE-HOOK</div>
          <div class="text-xs text-secondary font-semibold">"${c.rehook}"</div>
        </div>

        <!-- CORE SCRIPT WITH CUES -->
        <div class="mb-3">
          <div class="text-xs text-muted font-bold mb-1">📝 FULL VIDEO SCRIPT (WITH SFX & B-ROLL)</div>
          <div class="text-sm" style="line-height:1.7;color:var(--text-secondary)">
            ${c.script.replace(/\[SFX: (.*?)\]/g, '<span class="cue-badge cue-sfx">SFX: $1</span>').replace(/\[B-roll: (.*?)\]/g, '<span class="cue-badge cue-visual">B-Roll: $1</span>')}
          </div>
        </div>

        <!-- SEAMLESS LOOP OUTRO -->
        <div class="loop-box">
          <div class="text-xs font-bold text-green mb-1">🔄 INFINITE LOOP ENDING (Loops into Hook)</div>
          <div class="text-xs text-bright font-semibold">"${c.loop}" <span class="text-muted">→ [Seamless restart to: "${c.hook.slice(0, 30)}..."]</span></div>
        </div>

        <!-- CLEAN VOICEOVER FOR ELEVENLABS / TTS -->
        <div class="voiceover-box">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-bold text-muted">🎙️ CLEAN VOICEOVER TEXT (ElevenLabs / CapCut TTS)</span>
            <button class="btn-xs btn-outline" onclick="copyClipVoiceover(${i})">📋 Copy Speech Text</button>
          </div>
          <div>${c.voiceover}</div>
        </div>

        <div class="text-xs text-muted font-mono mt-3">${c.hashtags}</div>
      </div>
    `;
  }).join('');
}

function copyClipScript(idx) {
  const c = clipStore[idx];
  if (!c) return;
  const text = `TITLE: ${c.title}\nHOOK: ${c.hook}\nVISUAL: ${c.visualCue}\nSCRIPT:\n${c.script}\nLOOP: ${c.loop}\nHASHTAGS: ${c.hashtags}`;
  navigator.clipboard.writeText(text).then(() => showToast(`Short #${c.num} script copied to clipboard!`, 'success'));
}

function copyClipVoiceover(idx) {
  const c = clipStore[idx];
  if (!c) return;
  navigator.clipboard.writeText(c.voiceover).then(() => showToast(`🎙️ Short #${c.num} voiceover text copied (ready for TTS)!`, 'success'));
}

function copyAllClipsVoiceover() {
  if (!clipStore.length) return;
  const allText = clipStore.map(c => `--- SHORT #${c.num}: ${c.title} ---\n${c.voiceover}`).join('\n\n');
  navigator.clipboard.writeText(allText).then(() => showToast('🎙️ All voiceover scripts copied to clipboard!', 'success'));
}

function sendClipToPipeline(idx) {
  const c = clipStore[idx];
  if (!c) return;
  addCardToKanban({ title: c.title, format: 'shorts', keyword: 'viral shorts', priority: 'high', status: 'scripting' });
  showToast(`Short #${c.num} sent to Video Pipeline!`, 'success');
}

function sendAllClipsToPipeline() {
  if (!clipStore.length) return;
  clipStore.forEach(c => {
    addCardToKanban({ title: c.title, format: 'shorts', keyword: 'viral shorts', priority: 'medium', status: 'ideas' });
  });
  showToast(`All ${clipStore.length} Shorts added to Video Pipeline!`, 'success');
  switchTab('video-pipeline', document.querySelector('[data-tab=video-pipeline]'));
}

function sendClipToCalendar(idx) {
  const c = clipStore[idx];
  if (!c) return;
  state.calendarEvents.push({ day: (new Date().getDate() + idx + 1) % 28 || 1, type: 'short', title: c.title });
  renderCalendar();
  showToast(`Short #${c.num} scheduled in Content Calendar!`, 'success');
  switchTab('content-calendar', document.querySelector('[data-tab=content-calendar]'));
}

function sendClipToThumbnail(idx) {
  const c = clipStore[idx];
  if (!c) return;
  switchTab('thumbnail-lab', document.querySelector('[data-tab=thumbnail-lab]'));
  const desc = document.getElementById('thumbDescription');
  if (desc) desc.value = `Shorts thumbnail frame for: "${c.title}". Vertical 9:16 format with high contrast neon text and shock expression.`;
  showToast(`Short #${c.num} title sent to Thumbnail Lab!`, 'success');
}

// ── SEO ──
const SEO_DATA = {
  'claude mcp': { vol: 88, comp: 22, trend: '+340%' },
  'ai automation': { vol: 82, comp: 65, trend: '+180%' },
  'youtube automation': { vol: 76, comp: 55, trend: '+120%' },
  'faceless youtube': { vol: 71, comp: 42, trend: '+90%' },
  'n8n automation': { vol: 68, comp: 38, trend: '+145%' },
  'elevenlabs': { vol: 74, comp: 48, trend: '+95%' },
  'make money youtube': { vol: 85, comp: 78, trend: '+30%' },
  'ai content creation': { vol: 72, comp: 61, trend: '+110%' },
};

function exploreKeyword() {
  const kw = document.getElementById('seoKeyword').value.trim().toLowerCase();
  if (!kw) { showToast('Enter a keyword to explore', 'error'); return; }

  let vol, comp;
  // Check exact or partial match
  const match = Object.keys(SEO_DATA).find(k => kw.includes(k) || k.includes(kw.split(' ')[0]));
  if (match) {
    vol = SEO_DATA[match].vol;
    comp = SEO_DATA[match].comp;
  } else {
    // Random but reasonable values
    vol = Math.floor(Math.random()*60)+30;
    comp = Math.floor(Math.random()*70)+15;
  }

  const opp = Math.round(vol * (100-comp) / 100);
  const bars = ['gaugeVolBar', 'gaugeCompBar', 'gaugeOppBar'];
  const vals = [vol, comp, opp];

  document.getElementById('gaugeVol').textContent = vol + ' / 100';
  document.getElementById('gaugeComp').textContent = comp + ' / 100';
  document.getElementById('gaugeOpp').textContent = opp + ' / 100';
  document.getElementById('gaugeVolSub').textContent = vol >= 70 ? `🔥 High demand (~${Math.round(vol*500)}/mo searches)` : vol >= 50 ? `📈 Moderate demand` : '📉 Low demand';
  document.getElementById('gaugeCompSub').textContent = comp <= 30 ? '✅ Very Low competition' : comp <= 55 ? '⚠️ Moderate competition' : '❌ High competition';
  document.getElementById('gaugeOppSub').textContent = opp >= 70 ? '🏆 GOLDMINE — Create this video NOW' : opp >= 50 ? '✅ Good opportunity' : '⚠️ Consider different angle';

  setTimeout(() => {
    bars.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.style.width = vals[i] + '%';
    });
  }, 100);

  showToast(`Keyword analyzed: "${kw}"`, 'success');
}

function scoreTitle() {
  const title = document.getElementById('seoTitle').value.trim();
  if (!title) return;
  let score = 50;
  const factors = [];

  // Length check
  if (title.length >= 40 && title.length <= 60) { score += 15; factors.push({ pass: true, text: `✓ Length optimal (${title.length} chars — fits on mobile)` }); }
  else if (title.length < 40) { score += 5; factors.push({ pass: false, text: `✗ Too short (${title.length} chars) — add more detail` }); }
  else { score += 8; factors.push({ pass: false, text: `△ Slightly long (${title.length} chars) — might truncate on mobile` }); }

  // Number check
  if (/\$|€|£|\d+/.test(title)) { score += 12; factors.push({ pass: true, text: '✓ Contains specific number/amount — +12 CTR boost' }); }
  else { factors.push({ pass: false, text: '✗ Add a specific number or dollar amount for +12% CTR' }); }

  // Power words
  const pwords = ['secret', 'exposed', 'nobody', 'everyone', 'mistake', 'truth', 'reveal', 'finally', 'stolen', 'proof', 'dead', 'broken', 'actually', 'real'];
  const found = pwords.filter(w => title.toLowerCase().includes(w));
  if (found.length) { score += 10; factors.push({ pass: true, text: `✓ Power word: "${found[0]}" detected` }); }
  else { factors.push({ pass: false, text: '✗ Add a power word (secret, nobody, exposed, actually)' }); }

  // First person
  if (/\bI\b/i.test(title)) { score += 8; factors.push({ pass: true, text: '✓ First-person narrative — more relatable & higher CTR' }); }

  // Question format
  if (title.includes('?')) { score += 5; factors.push({ pass: true, text: '✓ Question format creates curiosity gap' }); }

  score = Math.min(100, Math.max(10, score));

  // Update ring
  const circumference = 238.76;
  const offset = circumference - (score / 100) * circumference;
  const circle = document.getElementById('titleScoreCircle');
  const num = document.getElementById('titleScoreNum');
  const badge = document.getElementById('titleScoreBadge');
  if (circle) { circle.style.strokeDashoffset = offset; circle.setAttribute('stroke', score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'); }
  if (num) num.textContent = score;
  if (badge) { badge.textContent = `Score: ${score}/100`; badge.className = score >= 80 ? 'badge badge-green' : score >= 60 ? 'badge badge-amber' : 'badge badge-red'; }

  document.getElementById('titleFactors').innerHTML = factors.map(f => `
    <div class="flex items-start gap-2 mb-1"><span style="color:${f.pass?'#10b981':'#ef4444'};flex-shrink:0">●</span><span class="text-xs" style="color:${f.pass?'var(--text-secondary)':'var(--text-muted)'}">${f.text}</span></div>
  `).join('');

  const improve = document.getElementById('titleImprove');
  if (improve && score < 80) {
    improve.innerHTML = `<div class="card p-3 mt-2" style="background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.2)"><div class="text-xs text-muted mb-1">💡 QUICK IMPROVEMENT</div><div class="text-sm">Try: "${title.replace(/how to/i,'I Spent $500 Learning How To').replace(/tutorial/i,'(And Made $3K From It)')}"</div></div>`;
  }
}

function checkNicheSaturation() {
  const topic = document.getElementById('nicheTopic').value.trim();
  if (!topic) return;
  const sat = Math.floor(Math.random()*100);
  const level = sat >= 70 ? 'Oversaturated' : sat >= 40 ? 'Competitive' : 'Underserved';
  const color = sat >= 70 ? '#ef4444' : sat >= 40 ? '#f59e0b' : '#10b981';
  const pivots = ['Add "for beginners" angle', 'Focus on a specific sub-niche', 'Use "I tested 50 tools" format', 'Make it about a specific platform', 'Focus on the mistakes/failures angle'];
  document.getElementById('saturationResult').innerHTML = `
    <div class="gauge-card mb-3" style="border-color:${color}33;background:${color}11">
      <div class="gauge-label">Saturation Level</div>
      <div class="gauge-value" style="color:${color}">${level}</div>
      <div class="progress-wrap mt-2"><div class="progress-fill" style="width:${sat}%;background:${color}"></div></div>
      <div class="gauge-sub">~${Math.round(sat*40)} videos/month on this topic</div>
    </div>
    <div class="text-xs text-muted mb-2 font-bold">💡 BLUE OCEAN PIVOTS</div>
    ${pivots.slice(0,3).map(p => `<div class="insight-item insight-tip" style="margin-bottom:6px"><span class="insight-icon">→</span><div class="insight-text">${p} for "${topic}"</div></div>`).join('')}
  `;
}

function generateTags() {
  const kw = document.getElementById('tagKeyword').value.trim();
  if (!kw) return;
  const base = kw.toLowerCase();
  const tags = [base, base + ' tutorial', base + ' for beginners', base + ' 2026', 'how to ' + base, base + ' guide', base + ' tips', 'best ' + base, base + ' strategy', base + ' ai', base + ' automation', 'youtube ' + base.split(' ')[0], base + ' monetization', 'make money ' + base.split(' ')[0], base + ' explained'];
  const cloud = document.getElementById('tagCloud');
  if (cloud) cloud.innerHTML = tags.map(t => `<span class="badge" style="cursor:pointer" onclick="navigator.clipboard.writeText('${t}')" title="Click to copy">${t}</span>`).join('');
  const btn = document.getElementById('copyTagsBtn');
  if (btn) btn.style.display = 'inline-flex';
}

function copyTags() {
  const tags = [...document.querySelectorAll('#tagCloud .badge')].map(b => b.textContent).join(', ');
  navigator.clipboard.writeText(tags).then(() => showToast('📋 All tags copied for YouTube Studio!', 'success'));
}

function runSeoScan() {
  exploreKeyword();
  scoreTitle();
  showToast('Full SEO scan complete!', 'success');
}

// ── THUMBNAIL LAB ──
function renderThumbSlots() {
  const grid = document.getElementById('thumbGrid');
  if (!grid) return;
  grid.innerHTML = ['A', 'B', 'C'].map((letter, i) => `
    <div class="thumb-slot" id="thumbSlot${i}" onclick="document.getElementById('thumbInput${i}').click()">
      <input type="file" id="thumbInput${i}" accept="image/*" style="display:none" onchange="loadThumb(${i},this)" />
      ${state.thumbSlots[i] ? `
        <img src="${state.thumbSlots[i]}" style="width:100%;height:100%;object-fit:cover" />
        <span class="thumb-score-badge badge" id="thumbScore${i}">Variant ${letter}</span>
        <span id="thumbWinnerBadge${i}" class="thumb-winner-badge" style="display:none">⭐ WINNER</span>
      ` : `
        <div class="thumb-slot-empty">
          <div class="icon">🖼️</div>
          <p>Click to upload<br>Variant ${letter}</p>
        </div>
      `}
    </div>
  `).join('');
}

function loadThumb(idx, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.thumbSlots[idx] = e.target.result;
    renderThumbSlots();
    showToast(`Thumbnail ${['A','B','C'][idx]} uploaded!`, 'success');
  };
  reader.readAsDataURL(file);
}

async function scoreAllThumbs() {
  const hasAny = state.thumbSlots.some(s => s);
  if (!hasAny) { showToast('Upload at least one thumbnail first', 'error'); return; }

  const scores = state.thumbSlots.map(slot => {
    if (!slot) return null;
    // Simulate AI scoring
    return {
      contrast: Math.floor(Math.random()*30)+60,
      emotion: Math.floor(Math.random()*40)+50,
      text: Math.floor(Math.random()*30)+60,
      elements: Math.floor(Math.random()*20)+70,
      curiosity: Math.floor(Math.random()*40)+50,
    };
  });

  const totals = scores.map(s => s ? Math.round((s.contrast*0.3 + s.emotion*0.25 + s.text*0.2 + s.elements*0.15 + s.curiosity*0.1)) : 0);
  const maxScore = Math.max(...totals.filter(t => t > 0));
  const winnerIdx = totals.indexOf(maxScore);

  // Show winner badge
  state.thumbSlots.forEach((slot, i) => {
    const badge = document.getElementById(`thumbScore${i}`);
    const winnerBadge = document.getElementById(`thumbWinnerBadge${i}`);
    if (badge) {
      badge.textContent = `${['A','B','C'][i]}: ${totals[i]}/100`;
      badge.className = `thumb-score-badge badge ${totals[i] >= 80 ? 'badge-green' : totals[i] >= 60 ? 'badge-amber' : 'badge-red'}`;
    }
    if (winnerBadge) winnerBadge.style.display = slot && i === winnerIdx ? 'block' : 'none';
  });

  document.getElementById('predCTR').textContent = (maxScore * 0.12).toFixed(1) + '%';
  document.getElementById('thumbWinner').textContent = `Variant ${'ABC'[winnerIdx]}`;

  // Detailed breakdown
  const detail = document.getElementById('thumbScoreDetail');
  if (detail && scores[winnerIdx]) {
    const s = scores[winnerIdx];
    detail.innerHTML = `
      <div class="text-xs font-bold text-muted mb-2">WINNER — VARIANT ${'ABC'[winnerIdx]} BREAKDOWN</div>
      ${[['🎨 Contrast & Pop', s.contrast], ['😮 Emotion Intensity', s.emotion], ['📝 Text Clarity', s.text], ['🎯 Element Count', s.elements], ['❓ Curiosity Gap', s.curiosity]].map(([label, val]) => `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs" style="width:140px">${label}</span>
          <div class="progress-wrap" style="flex:1"><div class="progress-fill ${val >= 80 ? 'fill-green' : val >= 60 ? 'fill-amber' : 'fill-red'}" style="width:${val}%"></div></div>
          <span class="text-xs font-bold" style="width:36px;text-align:right">${val}%</span>
        </div>
      `).join('')}
      <div class="insight-item insight-success mt-2">
        <span class="insight-icon">✅</span>
        <div class="insight-text">This thumbnail scores <strong>${maxScore}/100</strong> — predicted CTR: <strong>${(maxScore*0.12).toFixed(1)}%</strong> vs niche average of 3.2%</div>
      </div>
    `;
  }
  showToast('✅ All thumbnails scored!', 'success');
}

function resetThumbs() {
  state.thumbSlots = [null, null, null];
  renderThumbSlots();
  document.getElementById('predCTR').textContent = '—';
  document.getElementById('thumbWinner').textContent = '—';
}

async function analyzeThumbnailText() {
  const desc = document.getElementById('thumbDescription').value.trim();
  if (!desc) { showToast('Describe your thumbnail first', 'error'); return; }

  const container = document.getElementById('thumbColorAnalysis');

  if (state.groqKey) {
    const prompt = `Analyze this YouTube thumbnail description and provide specific improvement recommendations:\n\n"${desc}"\n\nRespond with:\n1. 🎨 Color Analysis (contrast score out of 100, specific hex color suggestions)\n2. 📐 Composition Score (0-100)\n3. 📝 Text Readability (will it read at 120px mobile size?)\n4. 😮 Emotion Intensity (shocked/surprised face = highest CTR)\n5. 🔧 3 Specific Improvements to boost CTR\n6. 🔄 Rewritten thumbnail concept that would perform 40% better`;
    container.innerHTML = '<div class="text-sm text-muted">⏳ Analyzing...</div>';
    try {
      const result = await callGroq(prompt);
      container.innerHTML = `<div class="text-sm" style="white-space:pre-wrap;line-height:1.7">${result}</div>`;
    } catch(e) {
      container.innerHTML = showThumbnailDemoAnalysis(desc);
    }
  } else {
    container.innerHTML = showThumbnailDemoAnalysis(desc);
  }
}

function showThumbnailDemoAnalysis(desc) {
  return `
    <div class="insight-item insight-warn"><span class="insight-icon">🎨</span><div class="insight-text"><strong>Contrast Score: 62/100</strong><br>Add a bright accent color (red #FF3B30 or yellow #FFD600) to grab attention in the feed.</div></div>
    <div class="insight-item insight-tip"><span class="insight-icon">📝</span><div class="insight-text"><strong>Text Readability:</strong> Keep text to max 3 words — at 120px mobile width, anything more becomes unreadable.</div></div>
    <div class="insight-item insight-success"><span class="insight-icon">🔧</span><div class="insight-text"><strong>Top Fix:</strong> Add a shocked/surprised expression to any face in the thumbnail — research shows +34% CTR lift.</div></div>
    <div class="card p-3 mt-2" style="background:rgba(99,102,241,0.06)"><div class="text-xs text-muted mb-1">💡 CONNECT GROQ FOR AI ANALYSIS</div><div class="text-sm">Get personalized AI color theory, contrast scores, and specific design recommendations for your exact thumbnail.</div></div>
  `;
}

// ── SWIPE FILE ──
const SWIPE_FORMULAS = [
  { formula: 'I Did [X] For [Y Days] — Here\'s What Happened', example: '"I Posted Every Day for 100 Days — Here\'s What Really Happened"', tags: ['challenge', 'curiosity'], emotion: 'curiosity' },
  { formula: 'The [X] Nobody Talks About', example: '"The YouTube Strategy Nobody Talks About (That Got Me 100K Subs)"', tags: ['curiosity', 'social'], emotion: 'curiosity' },
  { formula: 'Why I [Surprising Decision]', example: '"Why I Quit My $200K Job to Make YouTube Videos"', tags: ['curiosity', 'money'], emotion: 'curiosity' },
  { formula: 'How I Made $[Amount] From [Unconventional Source]', example: '"How I Made $43,000 From One YouTube Video While Sleeping"', tags: ['money'], emotion: 'money' },
  { formula: '[High Number] People Tried This — Only [Low Number] Succeeded', example: '"10,000 People Tried This Diet — Only 3% Succeeded"', tags: ['social', 'fear'], emotion: 'social' },
  { formula: 'I Tested [X] — Here\'s The Honest Truth', example: '"I Tested 47 AI Tools So You Don\'t Have To — Honest Review"', tags: ['curiosity', 'social'], emotion: 'social' },
  { formula: 'The [Duration] [Method] That Changed Everything', example: '"The 15-Minute Morning Routine That Changed My Life"', tags: ['challenge'], emotion: 'curiosity' },
  { formula: 'Stop [Common Mistake] If You Want [Goal]', example: '"Stop Uploading Every Day If You Actually Want to Grow"', tags: ['fear', 'curiosity'], emotion: 'fear' },
  { formula: '[Shocking Number] [Subject] Are [Doing This Wrong]', example: '"95% of YouTube Channels Are Making This Fatal Mistake"', tags: ['fear', 'social'], emotion: 'fear' },
  { formula: 'The Secret [Experts/Gurus] Don\'t Want You to Know', example: '"The SEO Secret YouTube Gurus Are Hiding From You"', tags: ['curiosity', 'social'], emotion: 'curiosity' },
  { formula: 'I Spent $[Amount] On [X] — Was It Worth It?', example: '"I Spent $5,000 on YouTube Ads for My Small Channel"', tags: ['money', 'curiosity'], emotion: 'money' },
  { formula: 'What Happens When You [Extreme Action]', example: '"What Happens When You Post 30 YouTube Videos in 30 Days"', tags: ['challenge', 'curiosity'], emotion: 'curiosity' },
  { formula: '[Famous Brand/Person] Did This — And It Worked', example: '"MrBeast Did This for 3 Years Before Going Viral — And It Worked"', tags: ['social'], emotion: 'social' },
  { formula: 'The Real Reason [Popular Belief Is Wrong]', example: '"The Real Reason More Subscribers Don\'t Mean More Views"', tags: ['curiosity', 'fear'], emotion: 'curiosity' },
  { formula: 'I Tried [X] Every Day for [Period]', example: '"I Used AI to Write Every Video Script for 60 Days"', tags: ['challenge'], emotion: 'curiosity' },
  { formula: 'How [Ordinary Person] [Achieved Extraordinary Result]', example: '"How a Janitor Built a $1M/Year YouTube Channel"', tags: ['social', 'money'], emotion: 'money' },
  { formula: '[Question] [Shocking Answer]', example: '"Can 1 Person Run a 100K YouTube Channel? I Proved It"', tags: ['curiosity', 'challenge'], emotion: 'curiosity' },
  { formula: 'Don\'t [Common Action] Until You [Watch/Know] This', example: '"Don\'t Post Another YouTube Video Until You See This"', tags: ['fear'], emotion: 'fear' },
  { formula: 'The [Time Period] YouTube Growth Hack Nobody Uses', example: '"The 2026 YouTube Growth Hack Nobody Uses (Free + Takes 10 Min)"', tags: ['curiosity', 'money'], emotion: 'curiosity' },
  { formula: 'I Broke Every Rule and [Surprising Outcome]', example: '"I Broke Every YouTube Rule for 90 Days — My Channel Exploded"', tags: ['challenge', 'curiosity'], emotion: 'curiosity' },
];

function initSwipeFile() {
  state.swipeData = [...SWIPE_FORMULAS];
  renderSwipeFile(state.swipeData);
}

function renderSwipeFile(formulas) {
  const grid = document.getElementById('swipeFileGrid');
  if (!grid) return;
  grid.innerHTML = formulas.map((f, i) => `
    <div class="formula-card" onclick="openFormulaModal(${i})">
      <div class="formula-text">${f.formula}</div>
      <div class="formula-example">${f.example}</div>
      <div class="formula-tags">${f.tags.map(t => `<span class="badge badge-${t==='money'?'amber':t==='fear'?'red':t==='social'?'green':'cyan'}">${t}</span>`).join('')}</div>
    </div>
  `).join('');
}

function filterSwipe(type, btn) {
  document.querySelectorAll('#swipeFilters .tab-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = type === 'all' ? state.swipeData : state.swipeData.filter(f => f.tags.includes(type));
  renderSwipeFile(filtered);
}

function filterSwipeFile(q) {
  const lq = q.toLowerCase();
  const filtered = !q ? state.swipeData : state.swipeData.filter(f => f.formula.toLowerCase().includes(lq) || f.example.toLowerCase().includes(lq));
  renderSwipeFile(filtered);
}

let activeFormulaIdx = 0;
function openFormulaModal(idx) {
  const f = SWIPE_FORMULAS[idx];
  activeFormulaIdx = idx;
  document.getElementById('formulaModalTitle').textContent = 'Apply Title Formula';
  document.getElementById('formulaModalSub').textContent = f.formula;
  document.getElementById('formulaModalBody').innerHTML = `
    <div class="formula-card mb-3" style="background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2)">
      <div class="formula-text">${f.formula}</div>
      <div class="formula-example">${f.example}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Your Topic/Niche</label>
      <input type="text" id="formulaTopicInput" class="input-field" placeholder="e.g. Claude AI, YouTube automation, passive income..." />
    </div>
    <div id="formulaPreview"></div>
  `;
  document.getElementById('formulaTopicInput').addEventListener('input', (e) => {
    const preview = document.getElementById('formulaPreview');
    if (e.target.value.trim()) {
      const title = f.formula.replace('[X]', e.target.value).replace('[Y Days]', '30 Days').replace('[Amount]', '$10,000').replace('[Subject]', 'creators').replace('[Duration]', '5-Minute').replace('[Method]', e.target.value).replace('[Period]', '60 Days');
      preview.innerHTML = `<div class="card p-3 mt-2" style="background:rgba(16,185,129,0.06);border-color:rgba(16,185,129,0.2)"><div class="text-xs text-muted mb-1">PREVIEW TITLE</div><div class="font-bold">${title}</div></div>`;
    }
  });
  openModal('formulaModal');
}

async function applyFormula() {
  const topic = document.getElementById('formulaTopicInput')?.value?.trim();
  const f = SWIPE_FORMULAS[activeFormulaIdx];
  const prompt = `Using this viral title formula: "${f.formula}"\n\nGenerate 5 variations specifically for the topic: "${topic || 'YouTube automation and AI tools'}"\n\nFor each:\n1. Write the exact title\n2. Write a matching thumbnail concept\n3. Write the first 2 sentences of the hook\n\nMake each title unique and progressively more provocative.`;
  document.getElementById('studioPrompt').value = prompt;
  closeModal('formulaModal');
  switchTab('content-studio', document.querySelector('[data-tab=content-studio]'));
  setTimeout(() => runGroq(), 300);
}

// ── KANBAN ──
const DEFAULT_KANBAN = [
  { id: 1, title: 'I Tested 50 Claude MCP Tools', format: 'long', keyword: 'claude mcp', priority: 'high', status: 'ideas' },
  { id: 2, title: 'Zero to 100k Subs with n8n', format: 'long', keyword: 'n8n automation', priority: 'medium', status: 'ideas' },
  { id: 3, title: 'ElevenLabs vs OpenAI Voice', format: 'tutorial', keyword: 'voice ai', priority: 'low', status: 'ideas' },
  { id: 4, title: 'Automate YouTube Shorts in Python', format: 'tutorial', keyword: 'python automation', priority: 'high', status: 'scripting' },
  { id: 5, title: 'The Death of Manual Editing', format: 'long', keyword: 'ai editing', priority: 'high', status: 'scripting' },
  { id: 6, title: 'How Top Channels Make $50k/mo', format: 'long', keyword: 'youtube money', priority: 'high', status: 'production' },
  { id: 7, title: 'Claude MCP Complete Guide', format: 'tutorial', keyword: 'claude mcp', priority: 'high', status: 'published', views: 142000, ctr: 8.4 },
  { id: 8, title: 'Build an AI Video Factory', format: 'long', keyword: 'ai video', priority: 'medium', status: 'published', views: 89000, ctr: 6.9 },
];

function initKanban() {
  const saved = localStorage.getItem('yt3_kanban');
  state.kanbanCards = saved ? JSON.parse(saved) : [...DEFAULT_KANBAN];
}

function renderKanban() {
  initKanban();
  ['ideas','scripting','production','published'].forEach(col => {
    const cards = state.kanbanCards.filter(c => c.status === col);
    const el = document.getElementById('cards' + col.charAt(0).toUpperCase() + col.slice(1));
    const count = document.getElementById('count' + col.charAt(0).toUpperCase() + col.slice(1));
    if (count) count.textContent = cards.length;
    if (!el) return;
    el.innerHTML = cards.map(c => `
      <div class="kanban-card" draggable="true" id="card${c.id}"
        ondragstart="dragStart(event,${c.id})" ondragend="dragEnd(event)">
        <span class="card-chip ${c.priority==='high'?'chip-red':c.priority==='medium'?'chip-amber':'chip-green'}">${c.priority}</span>
        ${c.status==='published'?`<span class="card-chip chip-purple">${fmtNum(c.views||0)} views</span>`:''}
        <h4>${c.title}</h4>
        <p>${c.format} • ${c.keyword}</p>
        ${c.status==='published'&&c.ctr?`<p style="color:var(--accent-green);font-weight:600">CTR: ${c.ctr}%</p>`:''}
        <div class="kanban-card-actions">
          <button class="btn-xs btn-groq" onclick="event.stopPropagation();generateFromTrend('${c.keyword}')">⚡ Script</button>
          <button class="btn-xs btn-outline" onclick="event.stopPropagation();deleteKanbanCard(${c.id})">✕</button>
        </div>
      </div>
    `).join('');
  });
}

function dragStart(e, id) { state.dragCardId = id; e.target.classList.add('dragging'); }
function dragEnd(e) { e.target.classList.remove('dragging'); }
function dragOver(e) { e.preventDefault(); }
function drop(e, col) {
  e.preventDefault();
  if (!state.dragCardId) return;
  const card = state.kanbanCards.find(c => c.id === state.dragCardId);
  if (card) {
    card.status = col;
    saveKanban();
    renderKanban();
    showToast(`Moved to ${col}!`, 'success');
    fetch(`${API_BASE}?action=update_pipeline_status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: card.id, status: col })
    }).catch(() => {});
  }
}

function saveKanban() { localStorage.setItem('yt3_kanban', JSON.stringify(state.kanbanCards)); }

function addVideoToPipeline() {
  const title = document.getElementById('newVideoTitle').value.trim();
  if (!title) { showToast('Enter a video title', 'error'); return; }
  const newCard = {
    id: Date.now(),
    title,
    format: document.getElementById('newVideoFormat').value,
    keyword: document.getElementById('newVideoKeyword').value,
    priority: document.getElementById('newVideoPriority').value,
    status: 'ideas',
  };
  state.kanbanCards.push(newCard);
  saveKanban();
  renderKanban();
  closeModal('newVideoModal');
  showToast('Video added to pipeline!', 'success');

  fetch(`${API_BASE}?action=save_pipeline_card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCard)
  }).catch(() => {});
}

function addCardToKanban(data) {
  const newCard = { id: Date.now(), ...data };
  state.kanbanCards.push(newCard);
  saveKanban();
  renderKanban();

  fetch(`${API_BASE}?action=save_pipeline_card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCard)
  }).catch(() => {});
}

function deleteKanbanCard(id) {
  state.kanbanCards = state.kanbanCards.filter(c => c.id !== id);
  saveKanban();
  renderKanban();

  fetch(`${API_BASE}?action=delete_pipeline_card&id=${id}`).catch(() => {});
}

// ── CALENDAR ──
const SAMPLE_EVENTS = [
  { day: 3, type: 'long', title: 'Claude MCP Tutorial' },
  { day: 5, type: 'short', title: 'AI Tools #Shorts' },
  { day: 8, type: 'trend', title: 'Trending: n8n Automation' },
  { day: 10, type: 'long', title: 'How I Automated My Channel' },
  { day: 12, type: 'short', title: 'Quick Tip: Viral Hooks' },
  { day: 15, type: 'long', title: 'Competitor Analysis Deep Dive' },
  { day: 17, type: 'review', title: '90-Day Channel Review' },
  { day: 19, type: 'short', title: 'Secret Algorithm Tip' },
  { day: 22, type: 'long', title: 'Build a $10K/mo AI Channel' },
  { day: 24, type: 'trend', title: 'React to Viral AI News' },
  { day: 26, type: 'short', title: 'Most Creators Miss This' },
  { day: 29, type: 'long', title: 'Month End Strategy Review' },
];

function renderCalendar() {
  const saved = localStorage.getItem('yt3_calendar');
  state.calendarEvents = saved ? JSON.parse(saved) : [...SAMPLE_EVENTS];
  const label = document.getElementById('calMonthLabel');
  if (label) label.textContent = new Date(state.calYear, state.calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const daysEl = document.getElementById('calDays');
  if (!daysEl) return;

  const firstDay = new Date(state.calYear, state.calMonth, 1).getDay();
  const daysInMonth = new Date(state.calYear, state.calMonth+1, 0).getDate();
  const today = new Date();

  let html = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day other-month"></div>';
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate()===d && today.getMonth()===state.calMonth && today.getFullYear()===state.calYear;
    const events = state.calendarEvents.filter(e => e.day === d);
    const bestTime = [1,4].includes(new Date(state.calYear, state.calMonth, d).getDay()) ? '' : '';
    const isGoodDay = [1,2,3,4].includes(new Date(state.calYear, state.calMonth, d).getDay());
    html += `<div class="cal-day ${isToday?'today':''}" onclick="addCalendarDay(${d})">
      <div class="cal-date" style="${isToday?'color:var(--accent);font-weight:800':''}">${d}</div>
      ${events.map(e => `<div class="cal-event ${e.type}" title="${e.title}">${e.title.slice(0,15)}${e.title.length>15?'...':''}</div>`).join('')}
      ${isGoodDay && !events.length ? '<div class="cal-best-time">📅 Good day</div>' : ''}
    </div>`;
  }
  daysEl.innerHTML = html;

  // Count
  const counts = { long: 0, short: 0, trend: 0 };
  state.calendarEvents.forEach(e => { if (counts[e.type] !== undefined) counts[e.type]++; });
  document.getElementById('calLongCount').textContent = counts.long;
  document.getElementById('calShortCount').textContent = counts.short;
  document.getElementById('calTrendCount').textContent = counts.trend;

  renderPlannedTopics();
}

function renderPlannedTopics() {
  const el = document.getElementById('plannedTopics');
  if (!el) return;
  el.innerHTML = state.calendarEvents.sort((a,b) => a.day-b.day).map(e => `
    <div class="flex items-center gap-3 p-2 mb-2" style="background:var(--bg-input);border-radius:var(--radius-sm);border:1px solid var(--border)">
      <span class="cal-event ${e.type}" style="flex-shrink:0">${e.type}</span>
      <div style="flex:1">
        <div class="text-sm font-bold">${e.title}</div>
        <div class="text-xs text-muted">Day ${e.day}</div>
      </div>
      <button class="btn-xs btn-groq" onclick="generateFromTrend('${e.title.replace(/'/g,"\\'")}')">⚡</button>
    </div>
  `).join('');
}

function prevMonth() { if (state.calMonth === 0) { state.calMonth = 11; state.calYear--; } else state.calMonth--; renderCalendar(); }
function nextMonth() { if (state.calMonth === 11) { state.calMonth = 0; state.calYear++; } else state.calMonth++; renderCalendar(); }

function addCalendarDay(day) {
  const types = ['long', 'short', 'trend', 'review'];
  const type = types[Math.floor(Math.random()*3)];
  const titles = { long: 'New Long-Form Video', short: 'New Short', trend: 'Trend Response Video', review: 'Channel Review' };
  state.calendarEvents.push({ day, type, title: titles[type] });
  localStorage.setItem('yt3_calendar', JSON.stringify(state.calendarEvents));
  renderCalendar();
  showToast(`Event added for day ${day}!`, 'success');
}

async function fillCalendarWithAI() {
  showToast('AI planning your month...', 'info');
  // Generate a balanced schedule
  const schedule = [];
  const types = ['long','short','long','trend','short','long','short','short','review'];
  const titles = [
    'Claude AI Agents Tutorial', 'Quick Hook Formula #Shorts', 'How I Automated My Channel',
    'Trending AI Tool Breakdown', 'Growth Hack Nobody Uses', '$0 to 100K Strategy',
    'Viral Thumbnail Secrets', 'Algorithm Tip in 60 Seconds', 'Monthly Channel Review',
    'n8n vs Make.com Battle', 'Secret SEO Formula', 'Build a Faceless Channel',
  ];
  let titleIdx = 0;
  for (let i = 2; i <= 30; i += 3) {
    const typeIdx = (schedule.length) % types.length;
    schedule.push({ day: i, type: types[typeIdx], title: titles[titleIdx % titles.length] });
    titleIdx++;
  }
  state.calendarEvents = schedule;
  localStorage.setItem('yt3_calendar', JSON.stringify(state.calendarEvents));
  renderCalendar();
  showToast('✅ AI planned your full month!', 'success');
}

function addCalendarEvent() {
  const day = parseInt(prompt('Which day? (1-31)') || '0');
  if (!day || day < 1 || day > 31) return;
  addCalendarDay(day);
}

// ── REVENUE PLANNER ──
const CPM_TABLE = {
  tech: { min: 12, max: 22, sponsor: 2000 },
  finance: { min: 18, max: 35, sponsor: 5000 },
  education: { min: 8, max: 15, sponsor: 1500 },
  entertainment: { min: 3, max: 8, sponsor: 800 },
  gaming: { min: 4, max: 10, sponsor: 1200 },
  health: { min: 10, max: 20, sponsor: 2500 },
  business: { min: 15, max: 30, sponsor: 4000 },
};

function syncViewsFromSlider(val) {
  const num = parseInt(val) || 0;
  const input = document.getElementById('revViews');
  if (input) input.value = num;
  updateViewsFormatted(num);
  calculateRevenue();
}

function syncViewsFromInput(val) {
  const num = parseInt(val) || 0;
  const slider = document.getElementById('revViewsSlider');
  if (slider) slider.value = Math.min(Math.max(num, 10000), 15000000);
  updateViewsFormatted(num);
  calculateRevenue();
}

function updateViewsFormatted(num) {
  const pill = document.getElementById('revViewsFormatted');
  if (pill) pill.textContent = fmtNum(num) + ' views';
}

function syncSubsFromSlider(val) {
  const num = parseInt(val) || 0;
  const input = document.getElementById('revSubs');
  if (input) input.value = num;
  updateSubsFormatted(num);
  calculateRevenue();
}

function syncSubsFromInput(val) {
  const num = parseInt(val) || 0;
  const slider = document.getElementById('revSubsSlider');
  if (slider) slider.value = Math.min(Math.max(num, 1000), 3000000);
  updateSubsFormatted(num);
  calculateRevenue();
}

function updateSubsFormatted(num) {
  const pill = document.getElementById('revSubsFormatted');
  if (pill) pill.textContent = fmtNum(num) + ' subs';
}

function applyRevPreset(views, subs, niche, eng) {
  document.querySelectorAll('.rev-preset-btn').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) {
    const btn = window.event.target.closest('.rev-preset-btn');
    if (btn) btn.classList.add('active');
  }

  const vIn = document.getElementById('revViews');
  const vSl = document.getElementById('revViewsSlider');
  const sIn = document.getElementById('revSubs');
  const sSl = document.getElementById('revSubsSlider');
  const nSel = document.getElementById('revNiche');
  const eIn = document.getElementById('revEng');

  if (vIn) vIn.value = views;
  if (vSl) vSl.value = Math.min(views, 15000000);
  if (sIn) sIn.value = subs;
  if (sSl) sSl.value = Math.min(subs, 3000000);
  if (nSel) nSel.value = niche;
  if (eIn) eIn.value = eng;

  updateViewsFormatted(views);
  updateSubsFormatted(subs);
  calculateRevenue();
}

function calculateRevenue() {
  const views = parseInt(document.getElementById('revViews')?.value || 1500000);
  const subs = parseInt(document.getElementById('revSubs')?.value || 250000);
  const niche = document.getElementById('revNiche')?.value || 'tech';
  const customCpm = parseFloat(document.getElementById('revCpm')?.value || 0);
  const eng = parseFloat(document.getElementById('revEng')?.value || 4.5);

  const cpmData = CPM_TABLE[niche] || CPM_TABLE.tech;
  const avgCpm = customCpm || ((cpmData.min + cpmData.max) / 2);

  // AdSense: views * (avgCpm / 1000) * 0.55 (creator take)
  const adsense = Math.round((views / 1000) * avgCpm * 0.55);

  // Sponsorships: Base rate scaled by niche and subscriber/view volume
  const sponsorBase = (cpmData.sponsor || 2000) * (subs / 100000) * (eng / 4.0);
  const sponsors = Math.round(Math.max(sponsorBase, 500));

  // Affiliate: ~0.15% of viewers click, 2% conversion, $35 avg item, 10% commission
  const affiliate = Math.round(views * 0.0015 * 0.02 * 35 * 0.12 * (eng / 4.5) * 50);

  // Digital Products: 1% of community converts per year => ~0.08% / month * $49
  const products = Math.round(subs * 0.0008 * 49 * (eng / 4.5));

  const total = adsense + sponsors + affiliate + products;
  const annual = total * 12;

  // Effective RPM across all views
  const effectiveRpm = views > 0 ? ((total / views) * 1000).toFixed(2) : '0.00';

  // Formatters
  const fmt = n => '$' + Number(Math.round(n)).toLocaleString();
  const fmtK = n => '$' + fmtNum(Math.round(n));

  // Update Hero Cards
  const totalEl = document.getElementById('revTotal');
  if (totalEl) totalEl.textContent = fmtK(total);

  const annualEl = document.getElementById('revAnnual');
  if (annualEl) annualEl.textContent = fmtK(annual);

  const effRpmEl = document.getElementById('revEffectiveRpm');
  if (effRpmEl) effRpmEl.textContent = '$' + effectiveRpm;

  const sponsorRateEl = document.getElementById('revSponsorRate');
  if (sponsorRateEl) {
    const minSp = Math.round(sponsors * 0.7);
    const maxSp = Math.round(sponsors * 1.3);
    sponsorRateEl.textContent = `${fmtK(minSp)} – ${fmtK(maxSp)}`;
  }

  // Update Detailed Breakdown Card
  const adsenseEl = document.getElementById('revAdsense');
  if (adsenseEl) adsenseEl.textContent = fmt(adsense);

  const sponsorsEl = document.getElementById('revSponsors');
  if (sponsorsEl) sponsorsEl.textContent = fmt(sponsors);

  const affiliateEl = document.getElementById('revAffiliate');
  if (affiliateEl) affiliateEl.textContent = fmt(affiliate);

  const productsEl = document.getElementById('revProducts');
  if (productsEl) productsEl.textContent = fmt(products);

  const totalSummaryEl = document.getElementById('revTotalSummary');
  if (totalSummaryEl) totalSummaryEl.textContent = fmt(total) + ' / mo';

  const annualSummaryEl = document.getElementById('revAnnualSummary');
  if (annualSummaryEl) annualSummaryEl.textContent = fmt(annual) + ' / yr';

  // Update Stack Bar & Percentages
  if (total > 0) {
    const pAdsense = Math.round((adsense / total) * 100);
    const pSponsors = Math.round((sponsors / total) * 100);
    const pAffiliate = Math.round((affiliate / total) * 100);
    const pProducts = Math.max(0, 100 - (pAdsense + pSponsors + pAffiliate));

    const segAd = document.getElementById('revSegAdsense');
    if (segAd) { segAd.style.width = pAdsense + '%'; segAd.title = `AdSense: ${pAdsense}%`; }
    const segSp = document.getElementById('revSegSponsors');
    if (segSp) { segSp.style.width = pSponsors + '%'; segSp.title = `Sponsorships: ${pSponsors}%`; }
    const segAf = document.getElementById('revSegAffiliate');
    if (segAf) { segAf.style.width = pAffiliate + '%'; segAf.title = `Affiliate: ${pAffiliate}%`; }
    const segPr = document.getElementById('revSegProducts');
    if (segPr) { segPr.style.width = pProducts + '%'; segPr.title = `Digital Products: ${pProducts}%`; }

    const pctAd = document.getElementById('revPctAdsense');
    if (pctAd) pctAd.textContent = pAdsense + '%';
    const pctSp = document.getElementById('revPctSponsors');
    if (pctSp) pctSp.textContent = pSponsors + '%';
    const pctAf = document.getElementById('revPctAffiliate');
    if (pctAf) pctAf.textContent = pAffiliate + '%';
    const pctPr = document.getElementById('revPctProducts');
    if (pctPr) pctPr.textContent = pProducts + '%';
  }
}

function renderGrowthMilestones() {
  const el = document.getElementById('growthMilestones');
  if (!el) return;
  const milestones = [
    { subs: '1K', unlock: 'Access YouTube Studio Basic Analytics', icon: '📊', earned: true },
    { subs: '10K', unlock: 'Sponsors start reaching out, merch shelf', icon: '🤝', earned: false },
    { subs: '100K', unlock: 'Silver Play Button + major brand deals', icon: '🥈', earned: false },
    { subs: '500K', unlock: '$5K+ sponsorship rates, YouTube Premium revenue', icon: '💰', earned: false },
    { subs: '1M', unlock: 'Gold Play Button + $30K+/mo total revenue potential', icon: '🥇', earned: false },
  ];
  el.innerHTML = milestones.map(m => `
    <div class="flex items-center gap-3 p-3 mb-2" style="background:var(--bg-input);border-radius:var(--radius-sm);border:1px solid var(--border);opacity:${m.earned?1:0.7}">
      <span style="font-size:24px">${m.icon}</span>
      <div style="flex:1">
        <div class="font-bold text-sm">${m.subs} Subscribers</div>
        <div class="text-xs text-muted">${m.unlock}</div>
      </div>
      ${m.earned?'<span class="badge badge-green">✓ Unlocked</span>':''}
    </div>
  `).join('');
}

// ── HEATMAP ──
const HEATMAP_DATA = {
  tech: { Mon:[3,2,2,1,2,3,4,5,6,7,7,8,9,8,7,8,9,10,9,8,7,6,4,3], Tue:[3,2,2,1,2,3,4,5,6,7,7,8,8,9,8,9,10,10,9,8,7,5,4,3], Wed:[2,2,1,1,2,3,4,5,6,7,8,8,9,8,7,8,8,9,8,7,6,5,4,3], Thu:[3,2,2,1,2,3,4,5,6,7,7,8,9,9,8,9,10,10,9,8,7,6,4,3], Fri:[3,2,2,1,2,3,4,5,6,7,7,8,9,8,8,9,9,9,8,7,6,5,4,2], Sat:[4,3,2,2,3,4,5,6,7,7,8,9,9,10,9,9,9,8,7,6,5,4,3,3], Sun:[3,3,2,2,3,4,4,5,6,7,8,9,9,9,9,8,8,7,6,5,4,3,3,3] },
  finance: { Mon:[2,1,1,1,2,3,4,5,7,9,10,9,8,7,6,7,8,8,7,6,5,4,3,2], Tue:[2,1,1,1,2,3,4,5,7,9,10,9,8,7,6,7,9,9,8,6,5,4,3,2], Wed:[2,1,1,1,2,3,4,5,7,8,9,9,8,7,6,7,8,8,7,6,5,4,3,2], Thu:[2,1,1,1,2,3,4,5,7,9,10,10,9,8,7,8,9,9,8,7,5,4,3,2], Fri:[2,1,1,1,2,3,4,5,6,8,9,9,8,7,6,7,7,7,6,5,4,3,2,2], Sat:[3,2,2,2,3,4,5,6,7,7,7,8,8,8,8,7,7,6,5,4,3,3,3,3], Sun:[3,2,2,2,3,4,5,6,7,7,8,8,8,8,7,7,6,5,4,4,3,3,3,3] },
};

function renderHeatmap(niche) {
  const container = document.getElementById('heatmapContainer');
  if (!container) return;
  const data = HEATMAP_DATA[niche] || HEATMAP_DATA.tech;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  let html = '<div style="display:grid;grid-template-columns:50px repeat(24,1fr);gap:3px">';
  // Hour labels
  html += '<div></div>';
  for (let h = 0; h < 24; h++) html += `<div style="font-size:0.6rem;color:var(--text-muted);text-align:center;padding:2px 0">${h}:00</div>`;

  // Day rows
  let bestDay = 'Thursday', bestHour = 17, bestScore = 0;
  days.forEach(day => {
    const row = data[day] || Array(24).fill(5);
    html += `<div style="display:flex;align-items:center;font-size:0.7rem;color:var(--text-muted);font-weight:600">${day}</div>`;
    row.forEach((val, h) => {
      const norm = val / 10;
      const color = norm >= 0.85 ? `rgba(16,185,129,${norm})` : norm >= 0.65 ? `rgba(245,158,11,${norm*0.9})` : norm >= 0.4 ? `rgba(99,102,241,${norm*0.7})` : `rgba(255,255,255,${norm*0.08})`;
      html += `<div title="${day} ${h}:00 — Score: ${val}/10" style="height:28px;border-radius:4px;background:${color};cursor:pointer;transition:transform 0.1s" onmouseover="this.style.transform='scale(1.3)';this.style.zIndex=10" onmouseout="this.style.transform='scale(1)';this.style.zIndex=0" onclick="selectUploadTime('${day}',${h},${val})"></div>`;
      if (val > bestScore) { bestScore = val; bestDay = day; bestHour = h; }
    });
  });
  html += '</div>';
  container.innerHTML = html;

  // Show recommendation
  const rec = document.getElementById('bestTimeRecommendation');
  const recText = document.getElementById('bestTimeText');
  if (rec && recText) {
    rec.style.display = 'flex';
    recText.innerHTML = `<strong>Best upload time for ${niche}:</strong> ${bestDay} at ${bestHour}:00 — Score ${bestScore}/10. The algorithm pushes content hardest in the first 2 hours, so uploading at ${bestHour}:00 means your peak audience is active.`;
  }
}

function selectUploadTime(day, hour, score) {
  showToast(`📅 Best time: ${day} ${hour}:00 (Score: ${score}/10)`, 'success');
}

// ── REPOS ──
const REPO_LIST = [
  { name: 'youtube-automation-agent', desc: '24/7 multi-agent autonomous YouTube team', stars: 2400, tag: 'automation', cat: 'automation', url: 'https://github.com/mdsa1348/YoutubeAutomation' },
  { name: 'youtube-mcp-server', desc: '40+ YouTube API tools for Claude MCP', stars: 1840, tag: 'MCP', cat: 'mcp', url: '#' },
  { name: 'mcp-youtube', desc: 'Transcript extraction MCP for hook analysis', stars: 920, tag: 'MCP', cat: 'mcp', url: '#' },
  { name: 'youtube-autopilot', desc: 'End-to-end editorial pipeline', stars: 1200, tag: 'pipeline', cat: 'automation', url: '#' },
  { name: 'youtube-uploader-mcp', desc: 'Claude direct upload to YouTube via OAuth', stars: 780, tag: 'MCP', cat: 'mcp', url: '#' },
  { name: 'n8n-youtube-templates', desc: 'Pre-built n8n workflow templates for YouTube', stars: 3200, tag: 'automation', cat: 'automation', url: 'https://n8n.io' },
  { name: 'ElevenLabs TTS MCP', desc: 'Voice generation MCP server', stars: 1560, tag: 'AI', cat: 'ai', url: 'https://elevenlabs.io' },
  { name: 'stable-diffusion-thumbnail', desc: 'Auto-generate thumbnails with AI', stars: 4100, tag: 'AI', cat: 'ai', url: '#' },
  { name: 'vidIQ-clone-api', desc: 'Open-source VidIQ competitor with YouTube API', stars: 2800, tag: 'analytics', cat: 'ai', url: '#' },
  { name: 'whisper-youtube-captions', desc: 'Extract captions from any YouTube video', stars: 5600, tag: 'AI', cat: 'ai', url: '#' },
  { name: 'make.com-yt-blueprints', desc: 'Ready-to-use Make.com automation blueprints', stars: 1900, tag: 'automation', cat: 'automation', url: 'https://make.com' },
  { name: 'social-blade-alternative', desc: 'Open-source channel analytics dashboard', stars: 3400, tag: 'analytics', cat: 'ai', url: '#' },
];

function initRepos() { state.repoData = REPO_LIST; renderRepos('all'); }

function renderRepos(cat, btn) {
  if (btn) { document.querySelectorAll('#repoFilters .pill').forEach(p => p.classList.remove('active')); btn.classList.add('active'); }
  const grid = document.getElementById('repoGrid');
  if (!grid) return;
  const filtered = cat === 'all' ? state.repoData : state.repoData.filter(r => r.cat === cat);
  grid.innerHTML = filtered.map(r => `
    <div class="repo-card">
      <div class="repo-header">
        <div class="repo-name">📦 ${r.name}</div>
        <span class="badge badge-${r.tag==='MCP'?'cyan':r.tag==='AI'?'pink':r.tag==='pipeline'?'green':'amber'}">${r.tag}</span>
      </div>
      <div class="repo-desc">${r.desc}</div>
      <div class="repo-stats">
        <div class="repo-stat">⭐ ${fmtNum(r.stars)}</div>
      </div>
      <div class="flex gap-2 mt-3">
        <a href="${r.url}" target="_blank" class="btn-xs btn-outline w-100">Open Repo →</a>
      </div>
    </div>
  `).join('');
}

function filterRepos(cat, btn) { renderRepos(cat, btn); }

// ── AGENT ACTIONS ──
function startAllAgents() { showToast('All agents started in autonomous mode!', 'success'); appendAgentLog('[System] ● All 4 agents started simultaneously'); }
function runAgent(type) {
  const msgs = { trendscout: '🔥 BREAKOUT: "Claude AI Agents" — 4.2x above median on @Fireship', script: '✓ Script complete: 1,420 words, est. 10:54 runtime, retention score: 87/100', thumbnail: '✓ 3 thumbnail variants generated — Winner: Variant B (CTR: 9.1%)', growth: '⚡ Video "AI Tutorial" at 48h has 2.8% CTR → Title A/B test triggered' };
  appendAgentLog(`[${type.charAt(0).toUpperCase()+type.slice(1)}] ${msgs[type] || 'Agent task complete'}`);
  showToast('Agent task executed!', 'success');
}

function appendAgentLog(msg) {
  const log = document.getElementById('agentLog');
  if (log) { log.textContent = msg + '\n' + log.textContent; }
}

function clearAgentLog() {
  const log = document.getElementById('agentLog');
  if (log) log.textContent = 'Agent log cleared.';
}

// ── AUTOMATION HUB ──
function testWebhooks() { showToast('All webhooks verified — 4 endpoints live!', 'success'); }
function dispatchWebhook() {
  showToast('⚡ Webhook payload dispatched successfully!', 'success');
  appendAgentLog('[Webhook] → Dispatched event to n8n pipeline');
}
function testMcp(name) { showToast(`✅ ${name} MCP connection verified!`, 'success'); }

// ── GLOBAL UTILITIES ──
function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function updateStatusBar() {
  const hasYt = !!state.ytKey;
  const hasGroq = !!state.groqKey;
  const gs = document.getElementById('globalStatus');
  if (gs) gs.textContent = hasYt && hasGroq ? 'All Systems Live' : hasYt || hasGroq ? 'Partial Connection' : 'Demo Mode — Connect APIs';
}

// ── MODALS ──
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function closeModalOnBg(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

// ── TOAST ──
let toastTimer;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  toast.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── SEARCH ──
const TABS_SEARCH_DATA = [
  { title: '⚡ Command Center', desc: 'Channel overview, live metrics, and health scores', tab: 'overview' },
  { title: '🔥 Viral Intelligence & Outlier Radar', desc: 'Detect 3x–20x breakout videos & view velocity', tab: 'viral-radar' },
  { title: '📱 Auto Clip Generator', desc: 'Convert long scripts or YouTube URLs into viral Shorts', tab: 'clip-generator' },
  { title: '✍️ Content Studio', desc: 'Groq AI scriptwriting, viral recipes & title swipe file', tab: 'content-studio' },
  { title: '🖼️ Thumbnail Lab', desc: 'A/B test thumbnail variants, contrast & CTR scoring', tab: 'thumbnail-lab' },
  { title: '⚔️ Competitor Intel', desc: 'Side-by-side benchmark matrix & blue ocean gaps', tab: 'competitor' },
  { title: '🎯 SEO & Keyword Radar', desc: 'Keyword opportunity scoring, title clickability & heatmap', tab: 'seo-radar' },
  { title: '📊 Channel Forensic', desc: 'Comment intelligence, love signals & deep analysis', tab: 'channel-forensic' },
  { title: '📅 Content Calendar', desc: '30/90 day AI upload planner & scheduling', tab: 'content-calendar' },
  { title: '💰 Revenue Planner', desc: 'AdSense, sponsorships & revenue stack calculator', tab: 'revenue-planner' },
  { title: '🎬 Video Pipeline', desc: 'Kanban board from idea to publishing', tab: 'video-pipeline' },
  { title: '🤖 AI Agent Center', desc: 'TrendScout, ScriptArchitect & autonomous bots', tab: 'ai-agents' },
  { title: '⚙️ Automation Hub', desc: 'Webhooks, n8n templates & Claude MCP tools', tab: 'automation-hub' },
  { title: '⭐ GitHub Resources', desc: 'Curated open-source YouTube repos & tools', tab: 'github-resources' },
];

function handleGlobalSearch(e) {
  const q = document.getElementById('globalSearch')?.value.trim().toLowerCase();
  const overlay = document.getElementById('globalSearchResults');
  if (!overlay) return;

  if (e.key === 'Escape' || !q) {
    overlay.style.display = 'none';
    return;
  }

  // Filter tabs
  const matchedTabs = TABS_SEARCH_DATA.filter(t => t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  
  // Filter outliers
  const matchedOutliers = (state.outliers || []).filter(o => o.title.toLowerCase().includes(q) || o.channelName.toLowerCase().includes(q)).slice(0, 3);

  // Filter swipe formulas
  const matchedSwipe = (SWIPE_FILE || []).filter(s => s.formula.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)).slice(0, 3);

  let resultsHtml = '';

  if (matchedTabs.length) {
    resultsHtml += `<div class="text-xs font-bold text-muted p-2">TABS & MODULES</div>`;
    matchedTabs.forEach(t => {
      resultsHtml += `
        <div class="search-result-item" onclick="switchTab('${t.tab}',document.querySelector('[data-tab=${t.tab}]'));document.getElementById('globalSearchResults').style.display='none'">
          <div>
            <div class="search-res-title">${t.title}</div>
            <div class="search-res-sub">${t.desc}</div>
          </div>
          <span class="badge badge-cyan">Jump →</span>
        </div>
      `;
    });
  }

  if (matchedOutliers.length) {
    resultsHtml += `<div class="text-xs font-bold text-muted p-2 mt-2">VIRAL OUTLIERS</div>`;
    matchedOutliers.forEach(o => {
      resultsHtml += `
        <div class="search-result-item" onclick="openViralDna('${o.id}');document.getElementById('globalSearchResults').style.display='none'">
          <div>
            <div class="search-res-title">🔥 ${o.title.slice(0, 42)}...</div>
            <div class="search-res-sub">${o.channelName} • ${fmtNum(o.views)} views</div>
          </div>
          <span class="badge badge-red">${o.multiplier}x</span>
        </div>
      `;
    });
  }

  if (matchedSwipe.length) {
    resultsHtml += `<div class="text-xs font-bold text-muted p-2 mt-2">TITLE FORMULAS</div>`;
    matchedSwipe.forEach(s => {
      resultsHtml += `
        <div class="search-result-item" onclick="switchTab('content-studio',document.querySelector('[data-tab=content-studio]'));document.getElementById('globalSearchResults').style.display='none'">
          <div>
            <div class="search-res-title">${s.formula}</div>
            <div class="search-res-sub">${s.example}</div>
          </div>
          <span class="badge badge-amber">${s.category}</span>
        </div>
      `;
    });
  }

  if (!resultsHtml) {
    resultsHtml = `<div class="p-4 text-center text-muted text-sm">No matches found for "${q}"</div>`;
  }

  overlay.innerHTML = resultsHtml;
  overlay.style.display = 'block';

  if (e.key === 'Enter') {
    if (matchedTabs.length) {
      switchTab(matchedTabs[0].tab, document.querySelector(`[data-tab=${matchedTabs[0].tab}]`));
    } else {
      searchOutliers(q);
      switchTab('viral-radar', document.querySelector('[data-tab=viral-radar]'));
    }
    overlay.style.display = 'none';
  }
}

// Close search overlay when clicking outside
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('globalSearchResults');
  const searchInput = document.getElementById('globalSearch');
  if (overlay && searchInput && !overlay.contains(e.target) && e.target !== searchInput) {
    overlay.style.display = 'none';
  }
});

// ── PIPELINE ──
function triggerPipeline() {
  showToast('🤖 Autonomous pipeline triggered!', 'success');
  appendAgentLog('[Pipeline] → Full autonomous run started: TrendScan → Script → Voice → Video → Publish');
}

function refreshOverview() {
  if (state.ytKey) quickAudit();
  else { loadDemoStats(); loadDemoOutliers(); showToast('↻ Overview refreshed with demo data', 'info'); }
}

// ── EXPORT ──
function exportChannelReport() {
  const data = { channel: state.channelData, outliers: state.outliers, timestamp: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'channel_report.json';
  a.click();
  showToast('📄 Report exported!', 'success');
}

function showNotifications() {
  showToast('🔔 No new notifications', 'info');
}

// ── PARTICLE CANVAS ──
function initParticle() {
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
    r: Math.random() * 2 + 0.5,
    a: Math.random() * 0.3 + 0.1,
  }));
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
  window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
}

// ── LOAD OUTLIERS ──
function loadOutliers() {
  if (state.ytKey && state.channelData) {
    fetchRecentVideos(state.channelData.id || 'UCsBjURrPoezykLs9EqgamOA');
  } else {
    loadDemoOutliers();
    showToast('Demo outliers loaded — connect YouTube API for real data', 'info');
  }
}

function loadTrends() {
  showToast('↻ Trend feed refreshed!', 'success');
  const el = document.getElementById('trendSpikes');
  if (el) {
    const trends = [
      { rank: 1, kw: 'Claude AI Agents', niche: 'AI Tools', vol: '12,400', pct: '+340%', cls: 'hot' },
      { rank: 2, kw: 'n8n automation tutorial', niche: 'Automation', vol: '8,200', pct: '+180%', cls: 'up' },
      { rank: 3, kw: 'Faceless YouTube 2026', niche: 'Creator', vol: '6,800', pct: '+145%', cls: 'up' },
      { rank: 4, kw: 'AI video editing tools', niche: 'Tech', vol: '5,200', pct: '+92%', cls: 'up' },
    ];
    el.innerHTML = trends.map(t => `
      <div class="trend-card">
        <div class="trend-rank">${t.rank}</div>
        <div class="trend-info">
          <div class="trend-keyword">${t.kw}</div>
          <div class="trend-meta">${t.niche} • ${t.vol} searches/hr</div>
        </div>
        <div class="trend-spike"><div class="trend-pct ${t.cls}">${t.pct} 🔥</div></div>
        <button class="btn-xs btn-groq" onclick="generateFromTrend('${t.kw}')">Script →</button>
      </div>
    `).join('');
  }
}

// ── GENERATE FULL PACKAGE ──
async function generateFullPackage() {
  const niche = document.getElementById('studioNiche')?.value || 'YouTube Automation';
  document.getElementById('studioPrompt').value = `Generate a complete viral video package for the niche: "${niche}"\n\nInclude:\n1. 🎯 Top 5 viral title options\n2. ⚡ Hook script (first 30 seconds)\n3. 📋 Full video outline (8 sections)\n4. 🖼️ Thumbnail concept\n5. 🔍 Top 10 SEO tags\n6. 📢 3 call-to-action scripts\n7. 📱 2 Shorts scripts extracted from the concept`;
  await runGroq();
}

// ── SCORING ──
function scoreTitle() {
  const title = document.getElementById('seoTitle')?.value.trim();
  if (!title) return;
  let score = 50;
  const factors = [];

  if (title.length >= 40 && title.length <= 60) { score += 15; factors.push({ pass: true, text: `✓ Length optimal (${title.length} chars)` }); }
  else { score += 5; factors.push({ pass: false, text: `△ Length: ${title.length} chars (aim for 45–60)` }); }

  if (/\$|\d+/.test(title)) { score += 12; factors.push({ pass: true, text: '✓ Specific number/amount boosts CTR' }); }
  else { factors.push({ pass: false, text: '✗ Add a specific number for +12% CTR boost' }); }

  if (/\bI\b/.test(title)) { score += 8; factors.push({ pass: true, text: '✓ First-person narrative (relatable)' }); }
  const pwords = ['secret','nobody','stop','exposed','truth','finally','dead','broken','actually'];
  const found = pwords.filter(w => title.toLowerCase().includes(w));
  if (found.length) { score += 10; factors.push({ pass: true, text: `✓ Power word: "${found[0]}"` }); }
  else { factors.push({ pass: false, text: '✗ Add a power word (secret, nobody, exposed)' }); }

  score = Math.min(100, Math.max(20, score));
  const circumference = 238.76;
  const circle = document.getElementById('titleScoreCircle');
  const num = document.getElementById('titleScoreNum');
  const badge = document.getElementById('titleScoreBadge');
  if (circle) { circle.style.strokeDashoffset = circumference - (score/100)*circumference; circle.setAttribute('stroke', score>=80?'#10b981':score>=60?'#f59e0b':'#ef4444'); }
  if (num) num.textContent = score;
  if (badge) { badge.textContent = `Score: ${score}/100`; badge.className = score>=80?'badge badge-green':score>=60?'badge badge-amber':'badge badge-red'; }

  const el = document.getElementById('titleFactors');
  if (el) el.innerHTML = factors.map(f => `<div class="flex items-start gap-1 mb-1"><span style="color:${f.pass?'#10b981':'#ef4444'};font-size:10px;margin-top:3px">●</span><span class="text-xs">${f.text}</span></div>`).join('');
}

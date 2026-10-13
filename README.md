# 🚀 YT AutoPilot 2.0 — Complete YouTube Automation & Intelligence Command Center

An all-in-one AI-powered command center, multi-channel analytics dashboard, and multi-agent execution suite for YouTube automation channels, creators, and agency pipelines. Built with **5 integrated open-source GitHub automation repositories**, Claude MCP servers, Groq ultra-fast LPU inference (<300ms), YouTube Data API v3 inspection, and VidIQ-style keyword opportunity meters.

![GitHub repo size](https://img.shields.io/github/repo-size/mdsa1348/YoutubeAutomation)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Claude MCP](https://img.shields.io/badge/MCP-Claude%20Ready-purple.svg)
![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange.svg)

---

## 📂 5 Integrated & Vendored GitHub Repositories (in `/repos/`)

The repository directly vendors and integrates the following 5 complete open-source codebases:

| Repository | Path | Core Functionality |
|---|---|---|
| **`youtube-automation-agent`** (Tubegent) | [`/repos/youtube-automation-agent/`](repos/youtube-automation-agent/) | 24/7 autonomous multi-agent channel management team (Strategy, Scripting, Thumbnails, SEO, Production). |
| **`youtube-mcp-server`** | [`/repos/youtube-mcp-server/`](repos/youtube-mcp-server/) | Claude Model Context Protocol server exposing 40+ YouTube Data API v3 tools directly to Claude Desktop. |
| **`mcp-youtube`** | [`/repos/mcp-youtube/`](repos/mcp-youtube/) | Python MCP server fetching closed captions & word-for-word transcripts for viral hook extraction. |
| **`youtube-autopilot`** | [`/repos/youtube-autopilot/`](repos/youtube-autopilot/) | End-to-end editorial pipeline for trend detection, AI scripting, and programmatic video rendering. |
| **`youtube-uploader-mcp`** | [`/repos/youtube-uploader-mcp/`](repos/youtube-uploader-mcp/) | MCP uploader daemon enabling Claude to directly upload, schedule, and update YouTube video metadata. |

---

## 🌟 Key Dashboard Features

| Tab | Feature | Description |
|---|---|---|
| ⚡ **Overview** | Channel KPI Command Center | Real-time views, subscriber velocity, estimated revenue benchmarks, and quick audit. |
| 🔥 **Viral & Outlier Radar** | ViewStats / 1of10 Engine | Detect 3x to 15x breakout videos across any channel. Deconstruct curiosity hooks & steal concepts to Groq. |
| ⚔️ **Competitor Benchmark** | VidIQ Competitor Tracker | Side-by-side normalized performance matrix across 4 channels + Blue Ocean topic gap discovery. |
| ⚡ **Groq AI Studio** | Ultra-Fast Llama 3.3 Engine | Sub-second (<300ms) viral ideation, 60-second Shorts scripts, and high-CTR title packaging. |
| 📊 **Channel Forensic** | Deep YouTube API Inspection | Live channel breakdown with subscriber-to-view ratios, upload pacing, and top video performance. |
| 🤖 **Claude MCP Hub** | Model Context Protocol Tools | Ready-to-use configurations for YouTube Data MCP, ElevenLabs TTS, Whisper, Canva, and n8n daemons. |
| 🎯 **SEO & Keywords** | VidIQ Opportunity Meter | Search Volume vs Competition matrix, real-time Title Clickability Scorer (0-100), and 1-click Studio tags. |
| 🎬 **Pipeline Kanban** | Visual Video Production Board | Drag-and-drop production workflow across *Idea*, *Scripting*, *Voiceover & Edit*, and *Published*. |
| ⚙️ **Automation Hub** | End-to-End Workflow Connectors | Webhook triggers and pipeline blueprints for n8n, Make.com, Zapier, ElevenLabs voice cloning, and auto-uploaders. |
| 📚 **GitHub Resources** | Local Execution & Repo Hub | Interactive catalog linking directly to local `/repos/` tools and top open-source automation libraries. |

---

## 🚀 Quick Start Guide

### 1. Run the Web Dashboard
This dashboard runs out of the box with zero compilation:

- **Option A (XAMPP / Localhost)**:
  Access in your browser:
  ```bash
  http://localhost/YoutubeAutomatio/
  ```

- **Option B (Python Local Server)**:
  ```bash
  python -m http.server 8000
  # Visit: http://localhost:8000
  ```

- **Option C (Direct File)**:
  Double click [`index.html`](index.html).

---

### 2. Run Local Multi-Agent Tools

Install dependencies for all integrated tools:
```bash
pip install -r requirements.txt
```

Inspect and run local agents:
```bash
# List all 5 imported repositories:
python run_local_agents.py --list

# Run Tubegent Multi-Agent Channel System:
python run_local_agents.py --run tubegent

# Launch YouTube MCP Server:
python run_local_agents.py --run mcp
```

---

### 3. Claude Desktop MCP Configuration

To connect the local YouTube tools directly into **Claude Desktop**:
Copy the configuration in [`mcp_config/claude_desktop_config.json`](mcp_config/claude_desktop_config.json) into your Claude Desktop configuration file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

---

## 🔄 Auto-Push to GitHub

- **One-Click Manual Push**: Double-click [`auto_push.bat`](auto_push.bat).
- **Continuous Background Watcher**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\auto_watch_push.ps1
  ```

---

## 📄 License
MIT License © 2026 YT AutoPilot Team

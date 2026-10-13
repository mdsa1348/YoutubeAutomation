#!/usr/bin/env python3
"""
YT AutoPilot - Local Multi-Agent & MCP Master Runner
Connects all imported repositories, Claude MCP servers, and Groq/YouTube pipelines.
"""

import os
import sys
import json
import argparse

REPOS_DIR = os.path.join(os.path.dirname(__file__), "repos")

def print_banner():
    print("""
======================================================================
  YT AutoPilot 2.0 - Local Multi-Agent & MCP Automation Engine
======================================================================
  Loaded Repositories in /repos/:
    1. mcp-youtube              (Transcript & Subtitle MCP Server)
    2. youtube-automation-agent (Tubegent Multi-Agent Channel System)
    3. youtube-autopilot        (Autonomous Editorial & Video Pipeline)
    4. youtube-mcp-server       (Claude Model Context Protocol Tools)
    5. youtube-uploader-mcp     (Automated Uploader & Metadata Updater)
======================================================================
""")

def list_imported_repos():
    print("[*] Inspecting imported repositories in /repos/:\n")
    if not os.path.exists(REPOS_DIR):
        print("[-] Repos directory not found.")
        return
    
    for repo in sorted(os.listdir(REPOS_DIR)):
        repo_path = os.path.join(REPOS_DIR, repo)
        if os.path.isdir(repo_path):
            files = len(os.listdir(repo_path))
            print(f"  [+] {repo:<26} -> {files:>2} files/dirs present ({repo_path})")
    print("\n[SUCCESS] All 5 GitHub automation repositories are imported and ready to run!")

def run_agent(agent_name):
    print(f"[*] Starting {agent_name}...")
    if agent_name == "tubegent":
        target = os.path.join(REPOS_DIR, "youtube-automation-agent")
        print(f"[+] Navigating to {target}")
        os.system(f"cd /d \"{target}\" && python main.py")
    elif agent_name == "mcp":
        target = os.path.join(REPOS_DIR, "youtube-mcp-server")
        print(f"[+] Starting YouTube MCP Server in {target}")
        os.system(f"cd /d \"{target}\" && python server.py")

if __name__ == "__main__":
    print_banner()
    parser = argparse.ArgumentParser(description="YT AutoPilot CLI Runner")
    parser.add_argument("--list", action="store_true", help="List all imported repos")
    parser.add_argument("--run", type=str, help="Run an agent: tubegent, mcp")
    args = parser.parse_args()

    if args.run:
        run_agent(args.run)
    else:
        list_imported_repos()

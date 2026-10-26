#!/usr/bin/env python3
"""
AutomatXpress — Infrastructure Map Launcher
Run: python3 view_infrastructure.py
Opens the interactive OS/infrastructure map in your browser.
"""

import os
import sys
import time
import signal
import threading
import webbrowser
import http.server
import socketserver
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────
PORT = 8765
HTML_FILE = Path(__file__).parent / "files" / "OS_INFRASTRUCTURE_MAP.html"

# ── Colors ──────────────────────────────────────────────────────────────────
RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
CYAN   = "\033[36m"
GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
BLUE   = "\033[34m"
PURPLE = "\033[35m"
WHITE  = "\033[97m"

def c(color, text):
    return f"{color}{text}{RESET}"

def banner():
    print()
    print(c(CYAN, BOLD + "  ⚡ AutomatXpress  —  Infrastructure Map" + RESET))
    print(c(DIM,  "  WhatsApp AI Sales Automation Platform"))
    print(c(DIM,  "  ─" * 38))
    print()

def check_file():
    if not HTML_FILE.exists():
        print(c(RED, f"  ✗ Not found: {HTML_FILE}"))
        print(c(DIM, "    Run Claude Code to regenerate the infrastructure map."))
        sys.exit(1)
    size_kb = HTML_FILE.stat().st_size / 1024
    print(c(GREEN,  f"  ✓ Map file      ") + c(WHITE, str(HTML_FILE.name)) + c(DIM, f"  ({size_kb:.1f} KB)"))

def status_summary():
    print()
    print(c(BOLD, "  Status snapshot"))
    print(c(DIM, "  ─" * 38))

    items = [
        (GREEN,  "✓", "WhatsApp (YCloud)",      "LIVE"),
        (GREEN,  "✓", "Groq AI (llama-3.3-70b)","LIVE"),
        (GREEN,  "✓", "Supabase Postgres",       "LIVE · ap-south-1"),
        (GREEN,  "✓", "Upstash Redis",           "LIVE · TLS"),
        (GREEN,  "✓", "KYC state machine",       "6-step · AES-256-GCM Aadhaar"),
        (GREEN,  "✓", "Reservation V2",          "5-state · audit trail"),
        (GREEN,  "✓", "Admin dashboard",         "Next.js · Vercel"),
        (YELLOW, "⚠", "Cashfree payments",       "SANDBOX — placeholder keys"),
        (YELLOW, "⚠", "messageQueue",            "in-memory only"),
        (YELLOW, "⚠", "virtualInventory",        "ownerConfirm() not routed"),
        (YELLOW, "⚠", "discountHandler",         "approve/reject not routed"),
        (RED,    "✗", "/api/admin/simulate",     "NO AUTH — anyone can call"),
        (RED,    "✗", ".env in git",             "CRITICAL — rotate all keys"),
    ]

    for color, icon, name, note in items:
        print(f"  {c(color, icon)}  {c(WHITE, name):<32}{c(DIM, note)}")

    print()
    counts = {"live": 7, "warn": 4, "crit": 2}
    print(
        f"  {c(GREEN, f'{counts[\"live\"]} live')}  "
        f"{c(YELLOW, f'{counts[\"warn\"]} partial')}  "
        f"{c(RED, f'{counts[\"crit\"]} critical')}"
    )

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Serve from the files/ directory, suppress access logs."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HTML_FILE.parent), **kwargs)

    def log_message(self, fmt, *args):
        pass  # silence per-request logs

    def log_error(self, fmt, *args):
        pass

def find_free_port(start=8765):
    import socket
    for port in range(start, start + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return port
            except OSError:
                continue
    return start

def run():
    banner()
    check_file()
    status_summary()

    port = find_free_port(PORT)
    url  = f"http://localhost:{port}/OS_INFRASTRUCTURE_MAP.html"

    # Start server in daemon thread so it dies with the main process
    httpd = socketserver.TCPServer(("", port), QuietHandler)
    httpd.allow_reuse_address = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    print()
    print(c(DIM, "  ─" * 38))
    print(c(CYAN, f"  🌐  {url}"))
    print(c(DIM,  "  Serving on port " + str(port) + " · press Ctrl+C to stop"))
    print(c(DIM, "  ─" * 38))
    print()

    # Open browser after a short delay so the server is ready
    def open_browser():
        time.sleep(0.4)
        webbrowser.open(url)
        print(c(GREEN, "  ✓ Opened in browser"))
        print()

    threading.Thread(target=open_browser, daemon=True).start()

    # Keep alive until Ctrl+C
    def on_signal(sig, frame):
        print()
        print(c(DIM, "  Stopped."))
        httpd.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    while True:
        time.sleep(1)

if __name__ == "__main__":
    run()

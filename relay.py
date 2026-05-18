#!/usr/bin/env python3
"""
Utopia relay — runs on your VPS and forwards requests to an upstream UAM endpoint.

Usage:
    RELAY_TOKEN=<chosen-secret> UAM_UPSTREAM_URL=<url> python3 relay.py

Optional env vars:
    RELAY_PORT        Port to listen on (default: 22825)
    UAM_UPSTREAM_URL  Upstream UAM endpoint URL (required)
    UTOPIA_API_TOKEN  Utopia API token from UAM config (omit if not required)
"""

import http.server
import urllib.request
import urllib.error
import json
import os

RELAY_PORT = int(os.environ.get("RELAY_PORT", "22825"))
RELAY_TOKEN = os.environ.get("RELAY_TOKEN", "")
UTOPIA_API_TOKEN = os.environ.get("UTOPIA_API_TOKEN", "")
UAM_UPSTREAM_URL = os.environ.get("UAM_UPSTREAM_URL", "").rstrip("/")


class RelayHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[relay] {self.address_string()} - {format % args}")

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        token = self.headers.get("X-Relay-Token", "")
        if not RELAY_TOKEN or token != RELAY_TOKEN:
            self.send_json(403, {"error": "forbidden"})
            return
        if not UAM_UPSTREAM_URL:
            self.send_json(500, {"error": "missing upstream", "message": "Set UAM_UPSTREAM_URL on the VPS"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length > 0 else b"{}"
            payload = json.loads(body)
        except Exception as e:
            self.send_json(400, {"error": f"bad request: {e}"})
            return

        try:
            req_body = json.dumps(payload).encode()
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            if UTOPIA_API_TOKEN:
                headers["X-Auth-Token"] = UTOPIA_API_TOKEN

            req = urllib.request.Request(
                UAM_UPSTREAM_URL,
                data=req_body,
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                status = resp.status
                raw = resp.read()
        except urllib.error.HTTPError as e:
            raw = e.read()
            status = e.code
        except Exception as e:
            self.send_json(502, {"error": f"upstream error: {e}"})
            return

        try:
            parsed = json.loads(raw)
            self.send_json(status, parsed)
        except Exception:
            self.send_response(status)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

    def do_GET(self):
        self.send_json(200, {"status": "utopia-relay running", "upstreamConfigured": bool(UAM_UPSTREAM_URL)})


if __name__ == "__main__":
    if not RELAY_TOKEN:
        print("[relay] WARNING: RELAY_TOKEN is not set — all requests will be rejected (403)")
    if not UAM_UPSTREAM_URL:
        print("[relay] WARNING: UAM_UPSTREAM_URL is not set — POST requests will return 500")
    server = http.server.ThreadingHTTPServer(("0.0.0.0", RELAY_PORT), RelayHandler)
    print(f"[relay] Listening on 0.0.0.0:{RELAY_PORT}")
    server.serve_forever()

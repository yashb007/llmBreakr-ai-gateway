#!/bin/sh
# Runs the gateway API (server/) and the admin dashboard (web/) as two
# processes in one container. If either exits, stop the other so the
# container exits non-zero and gets restarted.
set -e

node server/index.js &
SERVER_PID=$!

PORT=3000 node web/server.js &
WEB_PID=$!

trap 'kill $SERVER_PID $WEB_PID 2>/dev/null' EXIT INT TERM

wait -n "$SERVER_PID" "$WEB_PID" 2>/dev/null || wait "$SERVER_PID" "$WEB_PID"

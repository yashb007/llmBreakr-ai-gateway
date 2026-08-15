#!/bin/sh
# Runs the gateway API (server/) and the admin dashboard (web/) as two
# processes in one container. If either exits, kill the other and exit
# non-zero so the container actually stops (and gets restarted by Docker's
# restart policy) instead of silently running half-alive.
set -e

node server/index.js &
SERVER_PID=$!

PORT=3000 node web/server.js &
WEB_PID=$!

while kill -0 "$SERVER_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 1
done

kill "$SERVER_PID" "$WEB_PID" 2>/dev/null
exit 1

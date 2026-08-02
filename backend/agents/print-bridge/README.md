# Local Print Bridge Agent

This agent runs **inside the restaurant LAN** and connects outbound (WebSocket) to your cloud/VPS backend. That way local ESC/POS printers (e.g. `192.168.1.50:9100`) stay reachable even when the app is hosted remotely.

## Setup

1. In Admin → **Printers**, register a Print Bridge agent and copy the API key.
2. Edit `bridge.config.json`:

```json
{
  "url": "wss://your-domain.example/ws/print-bridge",
  "api_key": "pb_...."
}
```

3. Start the agent on a always-on PC/RPi in the restaurant:

```bash
cd backend/agents/print-bridge
node agent.js --config ./bridge.config.json
```

Or via env:

```bash
PRINT_BRIDGE_URL=wss://your-domain.example/ws/print-bridge \
PRINT_BRIDGE_API_KEY=pb_.... \
node agent.js
```

4. In Admin, add a printer with the local IP and select this agent.
5. Use **Test verbinding** / **Test print**.

## Security

- API key authenticates the agent (hashed at rest).
- Agent can only operate printers for its own `company_id`.
- Prefer `wss://` (TLS) in production.
- Keep the agent host firewalled; it only needs outbound HTTPS/WSS + LAN access to printers.

## Offline behavior

If the agent or printer is offline, print jobs stay `PENDING` and are retried automatically when the agent reconnects.

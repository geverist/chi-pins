# Jukebox Setup Guide

This guide will help you set up the Jukebox feature to play music from your local media server on Sonos speakers.

## Prerequisites

1. A local media server (Plex, Jellyfin, or custom)
2. Sonos speakers on the same network
3. Node.js installed on the kiosk machine

## Architecture

```
Chi-Pins Jukebox → Media Server (music library) → Sonos HTTP API → Sonos Speakers
```

## Step 1: Set Up Media Server

### Option A: Plex Media Server

1. Install Plex: https://www.plex.tv/media-server-downloads/
2. Add your music library to Plex
3. Get your Plex token:
   - Sign in to Plex Web
   - Play any item
   - Click the "..." menu → "Get Info" → "View XML"
   - Look for `X-Plex-Token` in the URL

### Option B: Jellyfin

1. Install Jellyfin: https://jellyfin.org/downloads/
2. Add your music library
3. Create an API key:
   - Dashboard → API Keys → Add API Key

### Option C: Custom Media Server

Create a simple REST API with these endpoints:

```
GET /api/music/library?limit=50&offset=0&search=&genre=&artist=
Response: {
  tracks: [{
    id: string,
    title: string,
    artist: string,
    album: string,
    duration: number,
    genre: string,
    artworkUrl: string,
    uri: string
  }],
  total: number,
  offset: number,
  limit: number
}
```

## Step 2: Set Up Sonos HTTP API

The easiest way to control Sonos is using `node-sonos-http-api`:

### Installation

```bash
# Clone the repo
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api

# Install dependencies
npm install

# Start the server
npm start
```

The API will run on `http://localhost:5005`

### Configuration

Edit `settings.json` to configure:

```json
{
  "port": 5005,
  "https": false,
  "auth": {
    "enabled": false
  }
}
```

### Test the API

```bash
# List speakers
curl http://localhost:5005/zones

# Play a track
curl http://localhost:5005/[ROOM_NAME]/play

# Pause
curl http://localhost:5005/[ROOM_NAME]/pause
```

## Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# Media Server (Plex example)
MEDIA_SERVER_URL=http://localhost:32400
MEDIA_SERVER_API_KEY=your_plex_token

# Sonos HTTP API
SONOS_API_URL=http://localhost:5005
SONOS_API_KEY=
SONOS_SPEAKER_ID=Dining%20Room  # URL-encoded room name
```

## Step 4: Adapt API Endpoints (if needed)

The provided endpoints in `/api/jukebox-library.js` and `/api/sonos-control.js` are templates. You may need to adapt them for your specific media server and Sonos setup.

### For Plex Media Server

Update `/api/jukebox-library.js`:

```javascript
const response = await fetch(`${MEDIA_SERVER_URL}/library/sections/[MUSIC_SECTION_ID]/all?X-Plex-Token=${MEDIA_SERVER_API_KEY}`, {
  headers: {
    'Accept': 'application/json',
  },
});
```

### For Jellyfin

```javascript
const response = await fetch(`${MEDIA_SERVER_URL}/Items?includeItemTypes=Audio&recursive=true&api_key=${MEDIA_SERVER_API_KEY}`, {
  headers: {
    'Accept': 'application/json',
  },
});
```

## Step 5: Deploy and Test

### Development

```bash
npm run dev
```

Open the app and click **🎵 Jukebox** in the footer.

### Production (Vercel)

1. Add environment variables in Vercel dashboard
2. Deploy the app
3. Ensure the kiosk machine can reach:
   - Media server (local network)
   - Sonos API (local network)

**Note**: The serverless functions run on Vercel's servers, but they need to reach your **local** media server and Sonos API. You have a few options:

#### Option 1: Tailscale/VPN
- Set up Tailscale on both the kiosk and Vercel
- Use Tailscale IPs in environment variables

#### Option 2: Run API Locally
- Instead of serverless functions, run a local Node.js server on the kiosk
- Proxy requests from the frontend to `http://localhost:3001`

#### Option 3: Expose Local Services (Not Recommended for Production)
- Use ngrok or similar to expose local services
- Only for testing!

## User Flow

1. **Browse Library**
   - Click "🎵 Jukebox" in footer
   - Search by song, artist, or genre
   - Filter by genre categories

2. **Play Music**
   - Click "▶" to play immediately
   - Click "+" to add to queue
   - View "Now Playing" on the right

3. **Control Playback**
   - Play/Pause/Skip controls
   - Volume slider
   - View upcoming queue

## API Endpoints

### GET /api/jukebox-library

Fetch music from media server.

**Query Params:**
- `search` - Search term
- `genre` - Filter by genre
- `artist` - Filter by artist
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

### POST /api/sonos-control

Control Sonos playback.

**Actions:**
- `play` - Play current or specific track
- `pause` - Pause playback
- `next` - Skip to next track
- `previous` - Go to previous track
- `add-to-queue` - Add track to queue
- `set-volume` - Set volume level

### GET /api/sonos-status

Get current playback status and queue.

## Troubleshooting

### "Media server not configured"
- Check `MEDIA_SERVER_URL` in environment variables
- Verify the media server is running

### "Sonos not configured"
- Check `SONOS_API_URL` and `SONOS_SPEAKER_ID`
- Verify node-sonos-http-api is running
- Test: `curl http://localhost:5005/zones`

### Library not loading
- Check media server API response format
- Verify API key is correct
- Look at browser console for errors

### Music won't play
- Ensure Sonos can access media files
- Check file URIs are accessible from Sonos
- For Plex: Files must be in library and accessible

### Volume control not working
- Verify speaker ID is correct (case-sensitive)
- Check Sonos HTTP API is responding
- Test: `curl -X POST http://localhost:5005/[ROOM]/volume/50`

## Advanced: Custom Media Server

If you want to build a custom media server, here's a minimal Node.js example:

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

const app = express();
const MUSIC_DIR = '/path/to/music';

app.get('/api/music/library', async (req, res) => {
  const { search, genre, limit = 50, offset = 0 } = req.query;

  // Scan music directory
  const files = await scanMusicFiles(MUSIC_DIR);

  // Filter and paginate
  let filtered = files;
  if (search) {
    filtered = files.filter(f =>
      f.title.includes(search) || f.artist.includes(search)
    );
  }
  if (genre) {
    filtered = filtered.filter(f => f.genre === genre);
  }

  const paginated = filtered.slice(offset, offset + limit);

  res.json({
    tracks: paginated,
    total: filtered.length,
    offset,
    limit
  });
});

app.listen(3001);
```

## Security Notes

- Media server and Sonos API should only be accessible on local network
- Don't expose your Plex token or API keys publicly
- Use VPN/Tailscale for remote access
- Consider authentication for production deployments

## Support

- Sonos HTTP API: https://github.com/jishi/node-sonos-http-api
- Plex API: https://www.plex.tv/integrations/
- Jellyfin API: https://jellyfin.org/docs/

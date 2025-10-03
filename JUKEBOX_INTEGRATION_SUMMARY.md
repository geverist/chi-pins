# Jukebox Integration - Implementation Summary

## What Was Built

A complete jukebox system for Chicago Mike's that connects to your local media server and controls Sonos speakers, allowing customers to:
1. Browse your music library
2. Search by song, artist, or genre
3. Play songs immediately or add to queue
4. View now playing with album artwork
5. Control playback (play/pause/skip)
6. Adjust volume
7. See upcoming queue

## Files Created

### Backend API Endpoints (Vercel Serverless Functions)
- `/api/jukebox-library.js` - Fetches music library from media server (Plex/Jellyfin/custom)
- `/api/sonos-control.js` - Controls Sonos playback (play/pause/skip/volume/queue)
- `/api/sonos-status.js` - Gets current playback status and queue

### Frontend Components
- `src/components/Jukebox.jsx` - Main jukebox interface with library browser
- `src/components/NowPlaying.jsx` - Now playing display with playback controls

### UI Integration
- Added "🎵 Jukebox" button to footer (left of "🍕 Order Now")
- Full-screen modal interface split into library (left) and now playing (right)

### Configuration & Documentation
- Updated `.env.example` with media server and Sonos variables
- `JUKEBOX_SETUP.md` - Detailed setup guide
- `JUKEBOX_INTEGRATION_SUMMARY.md` - This file

## User Flow

1. **Open Jukebox**
   - Customer clicks "🎵 Jukebox" in footer
   - Library loads from your media server

2. **Browse & Search**
   - Search bar for songs/artists
   - Genre filter buttons
   - Scrollable track list with album art

3. **Play Music**
   - "▶" button - Play immediately
   - "+" button - Add to queue
   - Songs play on Sonos speakers

4. **Control Playback**
   - Now Playing panel shows current track with album art
   - Play/Pause/Previous/Next controls
   - Volume slider
   - Progress bar with time
   - View upcoming queue (next 10 tracks)

5. **Real-time Updates**
   - Status polls every 5 seconds
   - Shows live playback state
   - Updates queue automatically

## Technical Stack

- **Frontend**: React (Vite)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Media Server**: Plex / Jellyfin / Custom API
- **Sonos Control**: node-sonos-http-api
- **Audio Playback**: Sonos speakers on local network

## Architecture

```
Customer → Chi-Pins Jukebox UI → Vercel API Functions
                                      ↓
                          Media Server (music files)
                                      ↓
                          Sonos HTTP API → Sonos Speakers
```

## Environment Variables Required

```bash
# Media Server (Plex example)
MEDIA_SERVER_URL=http://localhost:32400
MEDIA_SERVER_API_KEY=your_plex_token

# Sonos Control (node-sonos-http-api)
SONOS_API_URL=http://localhost:5005
SONOS_API_KEY=
SONOS_SPEAKER_ID=Dining%20Room
```

## Setup Requirements

### 1. Media Server
Choose one:
- **Plex** - Easy setup, great metadata
- **Jellyfin** - Open source alternative
- **Custom API** - Build your own

### 2. Sonos HTTP API
Install `node-sonos-http-api`:
```bash
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api
npm install
npm start
```

### 3. Network Considerations

**Important**: The serverless functions need to access your **local** media server and Sonos API. Options:

- **Option 1 (Recommended)**: Run a local proxy server on kiosk
- **Option 2**: Use Tailscale/VPN to connect Vercel to local network
- **Option 3**: Deploy entire app locally on kiosk (not Vercel)

For a kiosk setup, **Option 3** is likely best:
```bash
# Run locally on kiosk
npm run build
npm run preview -- --host --port 4173
```

## Features

### Library Browser
- ✅ Search by song/artist
- ✅ Filter by genre
- ✅ Scrollable track list
- ✅ Album artwork
- ✅ Artist and album info
- ✅ Instant play or queue

### Now Playing
- ✅ Current track display
- ✅ Album artwork
- ✅ Progress bar with time
- ✅ Play/pause/skip controls
- ✅ Volume control
- ✅ Queue display (next 10 tracks)
- ✅ Real-time status updates

### Playback Controls
- ✅ Play now (replaces queue)
- ✅ Add to queue
- ✅ Play/pause
- ✅ Next/previous track
- ✅ Volume adjustment (0-100%)
- ✅ Queue management

## API Endpoints

### GET /api/jukebox-library
Fetch music from media server.

**Query Params:**
- `search` - Search songs/artists
- `genre` - Filter by genre
- `artist` - Filter by artist
- `limit` - Results per page (default: 50)
- `offset` - Pagination

**Response:**
```json
{
  "tracks": [
    {
      "id": "track-123",
      "title": "Song Name",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 240,
      "genre": "Rock",
      "artworkUrl": "https://...",
      "uri": "file:///music/song.mp3"
    }
  ],
  "total": 500,
  "offset": 0,
  "limit": 50
}
```

### POST /api/sonos-control
Control Sonos playback.

**Request:**
```json
{
  "action": "play" | "pause" | "next" | "previous" | "add-to-queue" | "set-volume",
  "trackUri": "file:///music/song.mp3",  // for play/add-to-queue
  "volume": 50,  // for set-volume
  "position": "end"  // for add-to-queue
}
```

### GET /api/sonos-status
Get current playback status.

**Response:**
```json
{
  "playbackState": "PLAYING" | "PAUSED" | "STOPPED",
  "currentTrack": {
    "title": "Song Name",
    "artist": "Artist Name",
    "album": "Album Name",
    "artworkUrl": "https://..."
  },
  "volume": 50,
  "position": 30,
  "duration": 240,
  "queue": [...]
}
```

## Next Steps for Production

### 1. Choose Deployment Strategy

**Option A: Local Deployment (Recommended for Kiosk)**
```bash
# On kiosk machine
npm run build
npm run start  # Runs on port 4173
```

**Option B: Vercel + VPN**
- Set up Tailscale on kiosk
- Add Tailscale IPs to environment variables
- Deploy to Vercel

### 2. Set Up Media Server
- Install Plex or Jellyfin
- Add music library
- Get API token

### 3. Set Up Sonos API
```bash
git clone https://github.com/jishi/node-sonos-http-api.git
cd node-sonos-http-api
npm install
npm start
```

### 4. Configure Environment
- Add media server URL and API key
- Add Sonos API URL and speaker ID
- Test endpoints

### 5. Test Everything
- Browse library
- Play tracks
- Control playback
- Check volume
- Verify queue

## Features Not Yet Implemented

Optional enhancements for future development:

- **Playlist support** - Create and save playlists
- **Favorites** - Mark favorite tracks
- **Album view** - Browse by album
- **Artist view** - Browse by artist
- **Recently played** - Show listening history
- **Lyrics display** - Show synchronized lyrics
- **Crossfade** - Smooth transitions between tracks
- **Equalizer** - Audio settings
- **Multiple room support** - Control different Sonos zones
- **Voting system** - Let customers vote on next track

## Security Notes

- Media server should only be accessible on local network
- Sonos API should not be exposed to internet
- Use VPN for remote access
- Consider rate limiting to prevent abuse
- Don't expose API keys in client code

## Troubleshooting

### Library not loading
- Check `MEDIA_SERVER_URL` is reachable
- Verify API key is correct
- Check browser console for errors

### Playback not working
- Verify Sonos HTTP API is running
- Check speaker ID is correct
- Ensure Sonos can access media files

### No album artwork
- Verify media server has artwork embedded
- Check artwork URLs are accessible
- Use Plex for best artwork support

## Cost

- **$0** - All components are free and open source
- Plex Pass optional ($5/month for premium features)
- Requires existing Sonos speakers

## Support Resources

- Sonos HTTP API: https://github.com/jishi/node-sonos-http-api
- Plex API: https://www.plex.tv/integrations/
- Jellyfin API: https://jellyfin.org/docs/

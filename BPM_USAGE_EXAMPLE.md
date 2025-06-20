# BPM Monitoring from XLF Files - Usage Example

## What's New? 🎵

Your DDJ Audio Visualizer now tracks BPM (beats per minute) from your XLF files and displays it in real-time!

## How It Works:

1. **Load XLF File**: Upload your rekordbox XML file as usual
2. **Load Tracks to Decks**: Use the new "Load to A" / "Load to B" buttons 
3. **See Live BPM**: Watch the BPM display update in real-time
4. **Track Active BPM**: See which deck is playing and its current BPM

## Example JavaScript Code:

```javascript
// Get current BPM from your controller
const currentBPMDeckA = ddjController.getCurrentBPMDeckA(); // e.g., 128
const currentBPMDeckB = ddjController.getCurrentBPMDeckB(); // e.g., 140

// Get playing status
const playingBPM = ddjController.getCurrentPlayingBPM();
console.log(playingBPM);
// Output: { deckA: 128, deckB: null, active: 128 }

// Load a track to a deck (this updates BPM automatically)
const track = { 
  id: "123", 
  name: "Example Song", 
  artist: "Example Artist", 
  bpm: 130 
};
ddjController.loadTrackToDeckA(track);
```

## What You'll See:

- **🎵 Live BPM from XLF** section showing:
  - Deck A BPM with play indicator
  - Deck B BPM with play indicator  
  - Current Active BPM (shows which deck is playing)

- **🎧 Load Tracks to Decks** section showing:
  - List of first 5 tracks from your XLF
  - "Load to A" and "Load to B" buttons for each track
  - BPM displayed for each track

## How to Test:

1. Start your app: `npm start`
2. Load a rekordbox XML file
3. Click "Load to A" on any track
4. Press play on your DDJ-FLX4 Deck A
5. Watch the BPM display show "▶️ PLAYING" and the active BPM!

Does it work? 
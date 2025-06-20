# 🎛️ DDJ-FLX4 Audio Visualizer

An epic 3D audio visualizer that connects to your Pioneer DDJ-FLX4 controller and reads your rekordbox music collection for the ultimate DJ visual experience!

## ✨ Features

- **🎛️ Real-time MIDI Control**: DDJ-FLX4 crossfader, channel faders, EQ knobs, and performance pads
- **📊 3D Visualizations**: Reactive cubes, particle systems, and EQ bars
- **🎵 rekordbox Integration**: Import your music collection with track data, BPM, and hot cues
- **⚡ Live Updates**: Visualizations respond instantly to your controller movements
- **🎨 Dynamic Colors**: EQ settings control hue, saturation, and brightness
- **💫 Performance Pads**: 16 pads trigger particle effects and visual changes

## 🚀 Quick Start

### 1. Connect Your DDJ-FLX4
- Plug your DDJ-FLX4 into your computer via USB
- Make sure it's powered on and recognized by your system
- The app will automatically detect and connect to your controller

### 2. Export Your rekordbox Collection
1. Open rekordbox on your computer
2. Go to **File** → **Export Collection in xml format**
3. Save the XML file somewhere you can find it
4. This contains all your track data, BPM, hot cues, and more!

### 3. Run the Visualizer
```bash
# Install dependencies (already done during setup)
npm install

# Start the development server
npm start
```

### 4. Load Your Music Collection
- Click "📁 Load rekordbox Collection" in the control panel
- Select the XML file you exported from rekordbox  
- Wait for it to parse your tracks (might take a moment for large collections)

### 5. Start Mixing!
- Move your crossfader and watch the main cube rotate
- Adjust EQ knobs to change colors and intensity
- Hit performance pads to trigger particle effects
- Channel faders control the scale of visual elements

## 🎛️ Controller Mapping

### DDJ-FLX4 Controls:
- **Crossfader**: Controls rotation direction of main cube
- **Channel Faders (A/B)**: Control scale/size of visual elements
- **EQ Knobs**:
  - High: Affects hue (color)
  - Mid: Affects saturation (color intensity)  
  - Low: Affects lightness (brightness)
- **Performance Pads**: Trigger particle system effects (16 pads total)
- **Play/Cue Buttons**: Future features (coming soon!)
- **Jog Wheels**: Future features (coming soon!)

## 🎵 rekordbox Data Support

The visualizer extracts the following data from your rekordbox collection:

### Track Information:
- Track name, artist, album, genre
- BPM and key signature
- Duration and file path
- Date added to collection

### Performance Data:
- **Hot Cues**: Position, color, and names
- **Memory Cues**: Markers and comments  
- **Beat Grids**: Tempo changes and beat positions
- **Energy Analysis**: Estimated energy levels by song section
- **Song Structure**: Intro, verse, chorus, bridge, outro detection

### Search & Intelligence:
- Search tracks by name, artist, genre, or key
- BPM range filtering for beatmatching
- Harmonic mixing with compatible key suggestions using Camelot wheel
- Energy-based track recommendations

## 🛠️ Troubleshooting

### Controller Not Connecting?
1. **Check USB Connection**: Make sure DDJ-FLX4 is plugged in and powered on
2. **Browser Permissions**: Click "Retry Connection" and allow MIDI access when prompted
3. **MIDI Drivers**: On Windows, you might need to install Pioneer drivers
4. **Check Device Manager**: Ensure the controller appears as a MIDI device
5. **Try Different Browser**: Chrome and Edge work best for Web MIDI

### rekordbox XML Not Loading?
1. **Correct Export**: Use "Export Collection in xml format" not "Export Playlist"
2. **File Size**: Large collections (>10k tracks) might take 30+ seconds
3. **Valid XML**: Make sure the file exported completely without errors
4. **Browser Console**: Open DevTools to see any parsing errors

### Performance Issues?
1. **Close Other Apps**: Free up system resources
2. **Reduce Particles**: The particle count can be adjusted in the code
3. **Update Graphics Drivers**: Especially important for WebGL performance
4. **Use Chrome**: Generally has the best WebGL performance

## 🎨 Customization

### Visual Effects:
The visualizer supports multiple effect types:
- **Strobe**: Fast flashing effects
- **Pulse**: Breathing/pulsing animations  
- **Wave**: Sine wave distortions
- **Particle**: Dynamic particle systems
- **Tunnel**: 3D tunnel effects
- **Sphere**: Spherical transformations

### Color Schemes:
Colors are dynamically generated based on:
- EQ settings from your controller
- Track key signatures (each key has a color)
- BPM ranges (tempo affects intensity)
- Energy analysis from rekordbox data

## 🔧 Development

### Project Structure:
```
src/
├── components/          # React components
│   └── visualizer-scene.tsx
├── controllers/         # MIDI controller classes  
│   └── ddj-flx4-controller.ts
├── parsers/            # XML parsing utilities
│   └── rekordbox-parser.ts
├── types/              # TypeScript definitions
│   └── index.ts
└── App.tsx             # Main application
```

### Key Technologies:
- **React**: UI framework
- **Three.js**: 3D graphics engine
- **React Three Fiber**: React bindings for Three.js
- **WebMIDI**: Browser MIDI API for controller communication
- **fast-xml-parser**: XML parsing for rekordbox data

### Adding New Effects:
1. Define effect type in `types/index.ts`
2. Implement in `visualizer-scene.tsx`
3. Map to controller inputs in `ddj-flx4-controller.ts`

## 🎯 Future Features

### Coming Soon:
- **🎧 Audio Analysis**: Real-time frequency analysis from audio input
- **🎮 Jog Wheel Support**: Scratching effects and tempo control
- **💾 Preset System**: Save and load visual effect presets
- **📱 Mobile Support**: Touch controls for tablets and phones
- **🌈 More Effects**: Laser, tunnel, matrix, and geometric patterns
- **🎪 Beat Sync**: Auto-sync effects to detected BPM
- **🎨 Theme System**: Different visual themes and color palettes

### Advanced Features:
- **🤖 AI Beat Detection**: Smart beat detection from audio
- **🎼 Harmonic Visualization**: Visual representation of harmonic mixing
- **📊 Performance Analytics**: Track your mixing statistics
- **🔄 Live Streaming**: Stream visualizer output to OBS/streaming software

## 🐛 Known Issues

- Particle system might lag on older computers
- Some MIDI controllers need manual driver installation on Windows
- Large rekordbox collections (>20k tracks) may take time to parse
- WebGL performance varies by browser and graphics card

## 🤝 Contributing

Want to make this even more epic? Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your DDJ-FLX4
5. Submit a pull request

## 📄 License

MIT License - Go wild and create amazing visuals!

---

**🎵 Now drop that beat and watch the magic happen! 🎵**

*Made with ❤️ for DJs who love both music and code*

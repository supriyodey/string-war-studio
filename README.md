# 🧵 String War Studio (YouTube Shorts & TikTok Video Generator)

A complete, interactive studio and template generator for creating viral **"String War / Tug-of-War Battle Royale"** vertical videos (like the one featured in [YouTube Shorts](https://www.youtube.com/shorts/SP7c-wjZfgQ)).

---

## 🌟 Key Features

1. **Interactive Web Application Studio**:
   - Live interactive 9:16 vertical simulation at 60 FPS in a sleek phone frame.
   - **Upload any custom pictures/photos** for each player with automatic square/circular cropping.
   - **Custom color pickers** for glowing neon borders and matching elastic strings.
   - **Custom audio upload** (MP3/WAV background music) or built-in procedural rhythmic synth beat.
   - **Rich Sound Engine**: Dynamic musical plucking sounds, clashing impacts, string cutting snaps, dramatic elimination explosions, and victory fanfares.
   - **1-Click "Record & Export Video"**: Direct browser export to 1080x1920 HD vertical video (.webm / .mp4) ready to upload to YouTube Shorts, TikTok, and Instagram Reels!

2. **Pre-Built Preset Packs**:
   - **World Leaders**: Trump, Macron, Biden, Meloni, Modi, Xi Jinping, Starmer, Putin (identical to the YouTube Short).
   - **Tech Billionaires**: Elon Musk, Mark Zuckerberg, Jeff Bezos, Bill Gates, Sam Altman, Jensen Huang.
   - **Anime Legends**: Goku, Naruto, Luffy, Ichigo, Saitama, Levi.
   - **Animal Kingdom**: Lion, Tiger, Bear, Wolf, Gorilla, Eagle.

3. **Template Save & Load**:
   - Export your custom matches as JSON files.
   - Load saved templates with 1 click.

4. **Python Headless Batch Renderer (`generate_video.py`)**:
   - Automated batch rendering using Python & `ffmpeg`.
   - Produces broadcast-ready 1080x1920 60FPS MP4 files without opening a browser.

---

## 🚀 Quick Start Guide

### Option 1: Open the Web Studio in Your Browser

The local server is already running! Simply open your browser to:
```
http://localhost:3000
```
*(Or simply open `index.html` in Chrome, Edge, or Firefox!)*

### Option 2: Run Headless Video Generation via Python

To render a 1080x1920 MP4 directly from command line:
```powershell
py generate_video.py --output "MyStringWarVideo.mp4" --duration 35.0
```
To include custom audio:
```powershell
py generate_video.py --output "MyStringWarVideo.mp4" --audio "path/to/music.mp3" --duration 40.0
```

---

## 🎨 How to Customize Pictures, Sounds & Rules

### 1. Uploading Pictures / Photos
- Look at the **Contestants** section on the left sidebar.
- Hover over any player's avatar and click the **📷** icon.
- Select any JPG, PNG, or WEBP photo.
- The studio automatically clips and crops it into a glowing circular orb!

### 2. Adding Sounds and Music
- Go to the **Sounds & Music** section.
- Click **"📂 Upload MP3 / WAV Music"** to use your own background track.
- If you don't upload music, the studio automatically generates a rhythmic synth soundtrack using the Web Audio API.
- Adjust the **BGM Volume** and **SFX Volume** sliders to taste.

### 3. Setting Up the Battle & Title
- **Top Main Title**: e.g., `"WHO WILL WIN?"`, `"BATTLE OF THE TITANS"`.
- **Subtitle / Call to Action**: e.g., `"COMMENT YOUR LEADER"`, `"VOTE IN THE COMMENTS"`.
- **Initial Strings**: Number of strings each contestant starts with (default: 80).
- **Physics Speed**: Speed up or slow down the battle pace.

### 4. Exporting Your Video
- Click **"⏺ Record & Export Video"**.
- The match will automatically start recording at 60 FPS in 1080x1920 resolution.
- Once the battle completes and a winner is crowned, the video will automatically download to your computer!

---

## 📁 File Structure

```
string-war-studio/
├── index.html          # Web Studio UI & canvas preview
├── style.css           # Modern dark-mode styling & phone mockup frame
├── app.js              # Physics engine, collisions, elimination system & video recorder
├── audio-synth.js      # Web Audio synthesizer (plucks, collisions, snaps, fanfare)
├── presets.js          # Preloaded contestant packs (World Leaders, Tech, Anime, Animals)
├── generate_video.py   # Python batch renderer with ffmpeg
└── README.md           # Documentation & instructions
```

"""
String War Headless Video Generator (Python + ffmpeg)
Render complete 1080x1920 60FPS vertical YouTube Shorts videos from templates.
"""

import os
import sys
import json
import math
import random
import subprocess
import argparse
from PIL import Image, ImageDraw, ImageFont

def get_ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def create_circular_avatar(image_path_or_color, size=92, name=""):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if os.path.exists(image_path_or_color):
        try:
            src = Image.open(image_path_or_color).convert("RGBA")
            min_dim = min(src.size)
            left = (src.width - min_dim) // 2
            top = (src.height - min_dim) // 2
            src = src.crop((left, top, left + min_dim, top + min_dim))
            src = src.resize((size, size), Image.Resampling.LANCZOS)
            
            mask = Image.new("L", (size, size), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.ellipse((0, 0, size, size), fill=255)
            img.paste(src, (0, 0), mask=mask)
            return img
        except Exception as e:
            print(f"Warning: could not load image {image_path_or_color}: {e}")
            
    # Fallback colored circle with text
    draw.ellipse((0, 0, size, size), fill="#1e2235")
    draw.ellipse((0, 0, size, size), outline=image_path_or_color if image_path_or_color.startswith("#") else "#ffffff", width=4)
    initials = name[:2].upper() if name else "P"
    draw.text((size // 2, size // 2), initials, fill="#ffffff", anchor="mm")
    return img

def dist_point_to_segment(cx, cy, x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(cx - x1, cy - y1), 0.0, x1, y1
    t = max(0.0, min(1.0, ((cx - x1) * dx + (cy - y1) * dy) / l2))
    px = x1 + t * dx
    py = y1 + t * dy
    return math.hypot(cx - px, cy - py), t, px, py

class HeadlessSimulation:
    def __init__(self, contestants, title="WHO WILL WIN?", subtitle="COMMENT YOUR LEADER", duration=30.0, fps=60):
        self.width = 1080
        self.height = 1920
        self.cx = self.width // 2
        self.cy = 1120
        self.inner_radius = 375
        self.outer_radius = 490
        self.duration = duration
        self.fps = fps
        self.total_frames = int(duration * fps)
        self.title = title
        self.subtitle = subtitle
        
        self.contestants = contestants
        self.init_contestants()
        
    def init_contestants(self):
        n = len(self.contestants)
        start_r = self.inner_radius * 0.55
        arc_span = (math.pi * 2 / n) * 0.92
        
        for i, c in enumerate(self.contestants):
            c["alive"] = True
            c["count"] = c.get("strings", 40)
            angle = (i / n) * math.pi * 2 - math.pi / 2
            c["sector_angle"] = angle
            c["arc_span"] = arc_span
            c["x"] = self.cx + math.cos(angle) * start_r
            c["y"] = self.cy + math.sin(angle) * start_r
            
            speed = 380 + random.random() * 80
            launch_angle = angle + math.pi + (random.random() - 0.5) * 0.85
            c["vx"] = math.cos(launch_angle) * speed
            c["vy"] = math.sin(launch_angle) * speed
            c["radius"] = 44
            c["touch_cooldown"] = 0
            
            # Initial strings anchored on inner circle
            c["strings"] = []
            half_arc = arc_span / 2
            for s in range(c["count"]):
                t = (s / (c["count"] - 1 if c["count"] > 1 else 1)) * 2 - 1
                a_angle = angle + t * half_arc
                c["strings"].append({
                    "ax": self.cx + math.cos(a_angle) * self.inner_radius,
                    "ay": self.cy + math.sin(a_angle) * self.inner_radius,
                    "alive": True
                })

    def step(self, dt, current_time):
        alive = [c for c in self.contestants if c["alive"]]
        if len(alive) <= 1:
            return alive[0] if alive else None
            
        sub_steps = 4
        sub_dt = dt / sub_steps
        
        for _ in range(sub_steps):
            for idx, c in enumerate(alive):
                fx = 0.0
                fy = 0.0
                active_strings = [s for s in c["strings"] if s["alive"]]
                
                # Spring forces
                if active_strings:
                    avg_ax = sum(s["ax"] for s in active_strings) / len(active_strings)
                    avg_ay = sum(s["ay"] for s in active_strings) / len(active_strings)
                    dist_to_anchor = math.hypot(avg_ax - c["x"], avg_ay - c["y"])
                    sf = dist_to_anchor * 0.42
                    fx += ((avg_ax - c["x"]) / (dist_to_anchor or 1)) * sf
                    fy += ((avg_ay - c["y"]) / (dist_to_anchor or 1)) * sf
                    
                # Swirl agitation
                to_cx = self.cx - c["x"]
                to_cy = self.cy - c["y"]
                perp_x = -to_cy
                perp_y = to_cx
                perp_l = math.hypot(perp_x, perp_y) or 1
                swirl = 1 if (idx % 2 == 0) else -1
                fx += (perp_x / perp_l) * 95 * swirl
                fy += (perp_y / perp_l) * 95 * swirl
                
                c["vx"] += fx * sub_dt
                c["vy"] += fy * sub_dt
                
                v = math.hypot(c["vx"], c["vy"])
                if v < 310 and v > 0.01:
                    c["vx"] *= (310 / v)
                    c["vy"] *= (310 / v)
                elif v > 760:
                    c["vx"] *= (760 / v)
                    c["vy"] *= (760 / v)
                    
                c["x"] += c["vx"] * sub_dt
                c["y"] += c["vy"] * sub_dt
                
                if c["touch_cooldown"] > 0:
                    c["touch_cooldown"] -= sub_dt
                    
                # INNER CIRCLE BOUNCE & STRING CREATION ON CONTACT
                dist = math.hypot(c["x"] - self.cx, c["y"] - self.cy)
                max_d = self.inner_radius - c["radius"]
                if dist >= max_d and dist > 0:
                    nx = (c["x"] - self.cx) / dist
                    ny = (c["y"] - self.cy) / dist
                    c["x"] = self.cx + nx * max_d
                    c["y"] = self.cy + ny * max_d
                    dot = c["vx"] * nx + c["vy"] * ny
                    if dot > 0:
                        c["vx"] -= 1.96 * dot * nx
                        c["vy"] -= 1.96 * dot * ny
                        c["vx"] += (-ny) * (random.random() - 0.5) * 60
                        c["vy"] += (nx) * (random.random() - 0.5) * 60
                        
                        # NEW STRING CREATED FROM TOUCH POINT
                        if c["touch_cooldown"] <= 0 and len(active_strings) < 160:
                            c["touch_cooldown"] = 0.05
                            c["strings"].append({
                                "ax": self.cx + nx * self.inner_radius,
                                "ay": self.cy + ny * self.inner_radius,
                                "alive": True
                            })
                            
            # Ball-to-ball collisions
            for i in range(len(alive)):
                for j in range(i + 1, len(alive)):
                    c1 = alive[i]
                    c2 = alive[j]
                    dx = c2["x"] - c1["x"]
                    dy = c2["y"] - c1["y"]
                    d = math.hypot(dx, dy)
                    min_d = c1["radius"] + c2["radius"]
                    if d < min_d and d > 0:
                        nx = dx / d
                        ny = dy / d
                        overlap = min_d - d
                        c1["x"] -= nx * overlap * 0.5
                        c1["y"] -= ny * overlap * 0.5
                        c2["x"] += nx * overlap * 0.5
                        c2["y"] += ny * overlap * 0.5
                        
                        kx = c1["vx"] - c2["vx"]
                        ky = c1["vy"] - c2["vy"]
                        p = (nx * kx + ny * ky)
                        c1["vx"] -= p * nx * 0.96
                        c1["vy"] -= p * ny * 0.96
                        c2["vx"] += p * nx * 0.96
                        c2["vy"] += p * ny * 0.96
                        
            # STRING CUTTING
            for i in range(len(alive)):
                cutter = alive[i]
                for j in range(len(alive)):
                    if i == j:
                        continue
                    target = alive[j]
                    for s in target["strings"]:
                        if not s["alive"]:
                            continue
                        d, t, px, py = dist_point_to_segment(
                            cutter["x"], cutter["y"],
                            target["x"], target["y"],
                            s["ax"], s["ay"]
                        )
                        if d < cutter["radius"] and 0.12 < t < 0.98:
                            s["alive"] = False
                            # Cutter steals string
                            new_ang = cutter["sector_angle"] + (random.random() - 0.5) * cutter["arc_span"]
                            cutter["strings"].append({
                                "ax": self.cx + math.cos(new_ang) * self.inner_radius,
                                "ay": self.cy + math.sin(new_ang) * self.inner_radius,
                                "alive": True
                            })
                            
            for c in alive:
                alive_count = len([s for s in c["strings"] if s["alive"]])
                if alive_count <= 0:
                    c["alive"] = False
                    
        return None

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def render_video(output_mp4, audio_wav=None, duration=35.0):
    ffmpeg_exe = get_ffmpeg_exe()
    print(f"Using ffmpeg: {ffmpeg_exe}")
    
    contestants = [
        {"name": "Donald Trump", "color": "#FFD700", "strings": 40},
        {"name": "Emmanuel Macron", "color": "#3B82F6", "strings": 40},
        {"name": "Joe Biden", "color": "#EC4899", "strings": 40},
        {"name": "Giorgia Meloni", "color": "#84CC16", "strings": 40},
        {"name": "Narendra Modi", "color": "#22C55E", "strings": 40},
        {"name": "Xi Jinping", "color": "#06B6D4", "strings": 40},
        {"name": "Keir Starmer", "color": "#A855F7", "strings": 40},
        {"name": "Vladimir Putin", "color": "#EF4444", "strings": 40}
    ]
    
    fps = 60
    sim = HeadlessSimulation(contestants, duration=duration, fps=fps)
    
    avatars = {}
    for c in contestants:
        avatars[c["name"]] = create_circular_avatar(c["color"], size=88, name=c["name"])
        
    cmd = [
        ffmpeg_exe, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{sim.width}x{sim.height}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-"
    ]
    
    if audio_wav and os.path.exists(audio_wav):
        cmd.extend(["-i", audio_wav, "-shortest"])
        
    cmd.extend([
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-pix_fmt", "yuv420p",
        "-crf", "20",
        output_mp4
    ])
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    dt = 1.0 / fps
    total_frames = int(duration * fps)
    
    print(f"Rendering {total_frames} frames to {output_mp4}...")
    
    for frame_idx in range(total_frames):
        t = frame_idx * dt
        sim.step(dt, t)
        
        img = Image.new("RGB", (sim.width, sim.height), (8, 8, 12))
        draw = ImageDraw.Draw(img)
        
        # Outer circle guideline
        draw.ellipse(
            (sim.cx - sim.outer_radius, sim.cy - sim.outer_radius,
             sim.cx + sim.outer_radius, sim.cy + sim.outer_radius),
            outline=(60, 65, 80), width=2
        )
        
        # Inner circle active boundary
        draw.ellipse(
            (sim.cx - sim.inner_radius, sim.cy - sim.inner_radius,
             sim.cx + sim.inner_radius, sim.cy + sim.inner_radius),
            outline=(255, 255, 255), width=5
        )
        
        # Strings
        for c in sim.contestants:
            if c["alive"]:
                color = hex_to_rgb(c["color"])
                active_strings = [s for s in c["strings"] if s["alive"]]
                for s in active_strings:
                    draw.line([(c["x"], c["y"]), (s["ax"], s["ay"])], fill=color, width=1)
                    
        # Contestants
        for c in sim.contestants:
            if c["alive"]:
                r = c["radius"]
                av = avatars[c["name"]]
                img.paste(av, (int(c["x"] - r), int(c["y"] - r)), mask=av)
                draw.ellipse(
                    (int(c["x"] - r), int(c["y"] - r), int(c["x"] + r), int(c["y"] + r)),
                    outline=hex_to_rgb(c["color"]), width=4
                )
                active_count = len([s for s in c["strings"] if s["alive"]])
                draw.text((int(c["x"]), int(c["y"] + r + 6)), str(active_count), fill="#ffffff", anchor="mt")
                
        # BIGGER Header text (66px, y=195)
        draw.text((sim.width // 2, 195), sim.title, fill="#ffffff", anchor="mm")
        
        # BIGGER Roster bar & Alive counter (y=285)
        alive_count = len([c for c in sim.contestants if c["alive"]])
        draw.text((sim.width // 2, 285), f"{alive_count} LEFT", fill="#ff2a5f", anchor="mm")
        
        # Subtitle (y=360)
        draw.text((sim.width // 2, 360), sim.subtitle, fill="#cccccc", anchor="mm")
        
        proc.stdin.write(img.tobytes())
        
        if frame_idx % 120 == 0:
            print(f"Progress: {frame_idx}/{total_frames} frames ({(frame_idx/total_frames)*100:.1f}%)")
            
    proc.stdin.close()
    proc.wait()
    print(f"Video saved successfully: {output_mp4}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Render String War YouTube Short video")
    parser.add_argument("--output", default="StringWar_Render.mp4", help="Output MP4 file path")
    parser.add_argument("--audio", default=None, help="Background audio file (WAV or MP3)")
    parser.add_argument("--duration", type=float, default=30.0, help="Duration in seconds")
    args = parser.parse_args()
    
    render_video(args.output, args.audio, args.duration)

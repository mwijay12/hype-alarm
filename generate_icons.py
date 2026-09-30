import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_hyperalarm_icon(size=512):
    # Create image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    scale = size / 512.0
    
    # Coordinates helper
    def s(val):
        return val * scale

    # 1. Background Squircle with subtle gradient
    # We will draw on an oversized image or directly with anti-aliasing
    margin = s(24)
    radius = s(104)
    rect = [margin, margin, size - margin, size - margin]
    
    # Create squircle mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(rect, radius=int(radius), fill=255)
    
    # Background gradient: Deep Obsidian / Cosmic Navy (#050814 -> #0F172A)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        ratio = y / size
        # Top: rgb(6, 11, 25), Bottom: rgb(15, 23, 42)
        r = int(6 + (15 - 6) * ratio)
        g = int(11 + (23 - 11) * ratio)
        b = int(25 + (42 - 25) * ratio)
        line_draw = ImageDraw.Draw(bg)
        line_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        
    # Radial Glow in Center (#2563EB with opacity)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    center_x, center_y = size // 2, int(size * 0.48)
    glow_radius = int(s(180))
    for r_i in range(glow_radius, 0, -3):
        alpha = int(45 * (1 - r_i / glow_radius))
        glow_draw.ellipse(
            [center_x - r_i, center_y - r_i, center_x + r_i, center_y + r_i],
            fill=(37, 99, 235, alpha)
        )
    bg.alpha_composite(glow)
    
    # Outer Neon Border Ring on squircle
    border_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_img)
    border_draw.rounded_rectangle(rect, radius=int(radius), outline=(59, 130, 246, 160), width=int(s(4)))
    # Top edge cyan highlight
    border_draw.arc([margin, margin, margin + radius*2, margin + radius*2], start=180, end=270, fill=(6, 182, 212, 220), width=int(s(5)))
    border_draw.line([margin + radius, margin, size - margin - radius, margin], fill=(6, 182, 212, 220), width=int(s(5)))
    border_draw.arc([size - margin - radius*2, margin, size - margin, margin + radius*2], start=270, end=360, fill=(6, 182, 212, 220), width=int(s(5)))
    
    # Combine bg and squircle
    icon_base = Image.composite(bg, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask)
    icon_base.alpha_composite(border_img)
    
    # 2. Outer Pulse/Soundwave Energy Arcs (Hype Waves)
    wave_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    wave_draw = ImageDraw.Draw(wave_img)
    
    # Left waves
    wave_draw.arc([s(58), s(160), s(170), s(320)], start=120, end=240, fill=(14, 165, 233, 160), width=int(s(6)))
    wave_draw.arc([s(35), s(130), s(195), s(350)], start=125, end=235, fill=(59, 130, 246, 90), width=int(s(4)))
    
    # Right waves
    wave_draw.arc([s(342), s(160), s(454), s(320)], start=-60, end=60, fill=(14, 165, 233, 160), width=int(s(6)))
    wave_draw.arc([s(317), s(130), s(477), s(350)], start=-55, end=55, fill=(59, 130, 246, 90), width=int(s(4)))
    
    icon_base.alpha_composite(wave_img)
    
    # 3. Alarm Bell Details: Top Bells / Ears & Hammer
    elements = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    el_draw = ImageDraw.Draw(elements)
    
    # Top Bell / Ear Left
    # Angled ellipse
    ear_l = [s(115), s(105), s(195), s(175)]
    el_draw.ellipse(ear_l, fill=(30, 58, 138, 255), outline=(96, 165, 250, 230), width=int(s(4)))
    # Ear highlight
    el_draw.ellipse([s(130), s(115), s(175), s(145)], fill=(59, 130, 246, 200))
    
    # Top Bell / Ear Right
    ear_r = [s(317), s(105), s(397), s(175)]
    el_draw.ellipse(ear_r, fill=(30, 58, 138, 255), outline=(96, 165, 250, 230), width=int(s(4)))
    # Ear highlight
    el_draw.ellipse([s(337), s(115), s(382), s(145)], fill=(59, 130, 246, 200))
    
    # Center Hammer / Top Knob
    el_draw.rounded_rectangle([s(240), s(90), s(272), s(130)], radius=int(s(6)), fill=(59, 130, 246, 255), outline=(147, 197, 253, 255), width=int(s(2)))
    el_draw.ellipse([s(242), s(80), s(270), s(108)], fill=(96, 165, 250, 255), outline=(255, 255, 255, 200), width=int(s(2)))
    
    # Bottom Legs / Stands
    # Left Leg
    leg_l = [s(145), s(375), s(185), s(430)]
    el_draw.rounded_rectangle(leg_l, radius=int(s(8)), fill=(30, 58, 138, 255), outline=(59, 130, 246, 200), width=int(s(3)))
    # Right Leg
    leg_r = [s(327), s(375), s(367), s(430)]
    el_draw.rounded_rectangle(leg_r, radius=int(s(8)), fill=(30, 58, 138, 255), outline=(59, 130, 246, 200), width=int(s(3)))
    
    icon_base.alpha_composite(elements)
    
    # 4. Main Bell Body (Large circular dome)
    body_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    body_draw = ImageDraw.Draw(body_img)
    
    bell_box = [s(126), s(126), s(386), s(386)]
    # Main outer body with electric blue gradient
    body_draw.ellipse(bell_box, fill=(15, 23, 42, 255), outline=(37, 99, 235, 255), width=int(s(8)))
    
    # Inner glowing bezel
    inner_box = [s(138), s(138), s(374), s(374)]
    body_draw.ellipse(inner_box, fill=(11, 19, 43, 255), outline=(59, 130, 246, 180), width=int(s(3)))
    
    # Clock face subtle tick marks
    face_cx, face_cy = s(256), s(256)
    face_r = s(100)
    for hour in range(12):
        angle = math.radians(hour * 30 - 90)
        # 12, 3, 6, 9 are longer
        t_len = s(10) if hour % 3 == 0 else s(5)
        w = int(s(3)) if hour % 3 == 0 else int(s(2))
        x1 = face_cx + (face_r - t_len) * math.cos(angle)
        y1 = face_cy + (face_r - t_len) * math.sin(angle)
        x2 = face_cx + face_r * math.cos(angle)
        y2 = face_cy + face_r * math.sin(angle)
        color = (147, 197, 253, 220) if hour % 3 == 0 else (59, 130, 246, 120)
        body_draw.line([(x1, y1), (x2, y2)], fill=color, width=w)
    
    icon_base.alpha_composite(body_img)
    
    # 5. Dynamic Energetic Lightning Bolt (The "Hype" Spark in Center)
    bolt_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bolt_draw = ImageDraw.Draw(bolt_img)
    
    # Precision coordinates for modern sharp lightning bolt
    # Center is at (256, 256)
    pts = [
        (s(268), s(165)),  # Top tip
        (s(222), s(252)),  # Middle left
        (s(254), s(252)),  # Middle indent
        (s(236), s(338)),  # Bottom sharp tip
        (s(290), s(240)),  # Middle right
        (s(256), s(240)),  # Middle indent
    ]
    
    # Outer cyan glow for bolt
    bolt_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bglow_draw = ImageDraw.Draw(bolt_glow)
    bglow_draw.polygon(pts, fill=(6, 182, 212, 140))
    bolt_glow = bolt_glow.filter(ImageFilter.GaussianBlur(radius=int(s(8))))
    icon_base.alpha_composite(bolt_glow)
    
    # Bolt gradient / fill (Pure White to Electric Cyan)
    bolt_draw.polygon(pts, fill=(255, 255, 255, 255), outline=(6, 182, 212, 255))
    
    # Inner energy streak on bolt
    inner_pts = [
        (s(265), s(185)),
        (s(232), s(250)),
        (s(255), s(250)),
        (s(245), s(315)),
        (s(278), s(244)),
        (s(257), s(244)),
    ]
    bolt_draw.polygon(inner_pts, fill=(186, 230, 253, 255))
    
    icon_base.alpha_composite(bolt_img)
    
    # 6. Specular Top Glare / Gloss for 3D Premium Feel
    glare_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glare_draw = ImageDraw.Draw(glare_img)
    glare_box = [s(160), s(142), s(352), s(245)]
    glare_draw.ellipse(glare_box, fill=(255, 255, 255, 28))
    icon_base.alpha_composite(glare_img)
    
    return icon_base

def generate_all_icons():
    base_dir = r"c:\Users\MWIJAY TECH\Desktop\PROJECTS\Hype Alarm"
    tauri_icons_dir = os.path.join(base_dir, "src-tauri", "icons")
    public_dir = os.path.join(base_dir, "public")
    
    os.makedirs(tauri_icons_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    print("Generating master 512x512 icon...")
    master_512 = create_hyperalarm_icon(512)
    master_512.save(os.path.join(tauri_icons_dir, "icon.png"), "PNG")
    master_512.save(os.path.join(public_dir, "app-icon.png"), "PNG")
    
    # Sizes needed for Tauri and Windows
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
        "StoreLogo.png": 50,
    }
    
    for filename, sz in sizes.items():
        resized = master_512.resize((sz, sz), Image.Resampling.LANCZOS)
        resized.save(os.path.join(tauri_icons_dir, filename), "PNG")
        if sz == 32:
            resized.save(os.path.join(public_dir, "favicon-32x32.png"), "PNG")
            
    # Windows Multi-Resolution .ICO
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_path = os.path.join(tauri_icons_dir, "icon.ico")
    master_512.save(ico_path, format="ICO", sizes=ico_sizes)
    master_512.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    
    print("All icons successfully generated!")

if __name__ == "__main__":
    generate_all_icons()

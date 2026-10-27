#!/usr/bin/env python3
"""
YT AutoPilot — High-CTR Thumbnail & Cover Generator
Generates high-contrast, retention-engineered thumbnails using PIL.
Supports 1080x1920 (Shorts cover) and 1280x720 (Standard thumbnail).
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient_background(width: int, height: int, color_top=(15, 23, 42), color_bottom=(76, 29, 149)):
    """Creates a smooth linear gradient background."""
    base = Image.new('RGB', (width, height), color_top)
    top = Image.new('RGB', (width, height), color_bottom)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        mask_data.extend([int(255 * (y / height))] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def get_font(size: int):
    """Attempts to find a bold punchy font on Windows, with clean fallback."""
    font_paths = [
        "C:\\Windows\\Fonts\\impact.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\seguisb.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def generate_thumbnail(
    title: str,
    output_path: str,
    badge_text: str = "TOP SECRET",
    format_type: str = "shorts", # "shorts" (1080x1920) or "standard" (1280x720)
    accent_color = (255, 220, 0) # High-CTR yellow
) -> str:
    """
    Renders high-CTR thumbnail with bold text, drop shadow, and pill badge.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    if format_type == "shorts":
        width, height = 1080, 1920
        title_font_size = 96
        badge_font_size = 48
    else:
        width, height = 1280, 720
        title_font_size = 80
        badge_font_size = 36

    img = create_gradient_background(width, height, color_top=(10, 15, 30), color_bottom=(45, 10, 80))
    draw = ImageDraw.Draw(img)

    # 1. Subtle glowing mesh accent
    draw.ellipse([width * 0.1, height * 0.15, width * 0.9, height * 0.45], fill=(99, 102, 241, 40))

    # 2. Draw Top Pill Badge
    badge_font = get_font(badge_font_size)
    badge_upper = badge_text.upper()
    bbox = badge_font.getbbox(badge_upper)
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    
    badge_y = int(height * 0.32) if format_type == "shorts" else int(height * 0.18)
    badge_x = (width - bw) // 2
    pad_x, pad_y = 28, 14
    
    # Draw pill box
    draw.rounded_rectangle(
        [badge_x - pad_x, badge_y - pad_y, badge_x + bw + pad_x, badge_y + bh + pad_y],
        radius=20,
        fill=(239, 68, 68) # Red alert badge
    )
    draw.text((badge_x, badge_y), badge_upper, font=badge_font, fill=(255, 255, 255))

    # 3. Draw Bold Main Title
    title_font = get_font(title_font_size)
    
    # Word wrap (max 3-4 words per line)
    words = title.upper().split()
    lines = []
    curr = []
    for w in words:
        curr.append(w)
        if len(curr) >= 3:
            lines.append(" ".join(curr))
            curr = []
    if curr:
        lines.append(" ".join(curr))
    lines = lines[:4] # Max 4 lines

    # Calculate starting Y
    start_y = badge_y + bh + pad_y + (60 if format_type == "shorts" else 35)
    line_spacing = title_font_size + 20

    for i, line in enumerate(lines):
        l_bbox = title_font.getbbox(line)
        lw = l_bbox[2] - l_bbox[0]
        lx = (width - lw) // 2
        ly = start_y + i * line_spacing

        # Deep black drop shadow
        for dx, dy in [(-4, -4), (4, -4), (-4, 4), (4, 4), (0, 6), (6, 0), (-6, 0), (0, -6)]:
            draw.text((lx + dx, ly + dy), line, font=title_font, fill=(0, 0, 0))

        # Main text color (highlight last line with accent yellow)
        text_color = accent_color if (i == len(lines) - 1 or len(lines) == 1) else (255, 255, 255)
        draw.text((lx, ly), line, font=title_font, fill=text_color)

    # 4. Save Image
    img.save(output_path, "JPEG", quality=95)
    return output_path

if __name__ == "__main__":
    out_shorts = os.path.join(os.path.dirname(__file__), "..", "output", "thumbnails", "sample_shorts_thumb.jpg")
    out_std = os.path.join(os.path.dirname(__file__), "..", "output", "thumbnails", "sample_std_thumb.jpg")
    
    print("[*] Generating Thumbnails...")
    generate_thumbnail("SECRET AI TOOL WILL CHANGE EVERYTHING", out_shorts, badge_text="DO NOT IGNORE", format_type="shorts")
    generate_thumbnail("5 ILLEGAL AI WEBSITES IN 2026", out_std, badge_text="100% FREE", format_type="standard")
    print(f"[+] Saved thumbnails: {out_shorts}, {out_std}")

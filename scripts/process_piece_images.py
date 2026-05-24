from collections import deque
from pathlib import Path

from PIL import Image

GENERATED_DIR = Path("/Users/ben/.cursor/projects/Users-ben-Documents-GitHub-ChessSpoof/assets")
OUTPUT_DIR = Path("/Users/ben/Documents/GitHub/ChessSpoof/ChessSpoof/assets/PNGs")

PIECE_FILES = {
    "WhitePawn.png": GENERATED_DIR / "WhiteGranitePawn.png",
    "WhiteKnight.png": GENERATED_DIR / "WhiteGraniteKnight.png",
    "WhiteBishop.png": GENERATED_DIR / "WhiteGraniteBishop.png",
    "WhiteQueen.png": GENERATED_DIR / "WhiteGraniteQueen.png",
    "WhiteKing.png": GENERATED_DIR / "WhiteGraniteKing.png",
    "WhiteRook.png": GENERATED_DIR / "WhiteGraniteRook-v2.png",
    "BlackPawn.png": GENERATED_DIR / "BlackGranitePawn.png",
    "BlackKnight.png": GENERATED_DIR / "BlackGraniteKnight.png",
    "BlackBishop.png": GENERATED_DIR / "BlackGraniteBishop.png",
    "BlackQueen.png": GENERATED_DIR / "BlackGraniteQueen.png",
    "BlackKing.png": GENERATED_DIR / "BlackGraniteKing.png",
    "BlackRook.png": GENERATED_DIR / "BlackGraniteRook.png",
}


def remove_background(img: Image.Image, tolerance: int = 28) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size

    def is_likely_background(rgb):
        r, g, b = rgb
        brightness = (r + g + b) / 3
        is_neutral = max(r, g, b) - min(r, g, b) < 35
        return is_neutral and brightness > 165

    def matches_reference(rgb, reference):
        r, g, b = rgb
        return (
            abs(r - reference[0]) <= tolerance
            and abs(g - reference[1]) <= tolerance
            and abs(b - reference[2]) <= tolerance
        )

    corner_colors = [
        pixels[0, 0][:3],
        pixels[width - 1, 0][:3],
        pixels[0, height - 1][:3],
        pixels[width - 1, height - 1][:3],
    ]

    def is_background(rgb):
        if is_likely_background(rgb):
            return True
        return any(matches_reference(rgb, color) for color in corner_colors)

    seen = set()
    queue = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        if not is_background(pixels[x, y][:3]):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height:
                queue.append((nx, ny))

    return img


def crop_and_pad(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    padded = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    padded.paste(img, (pad, pad), img)
    return padded


def process_piece(src: Path, dest: Path) -> None:
    img = Image.open(src)
    img = remove_background(img)
    img = crop_and_pad(img)
    img.save(dest)
    print(f"Saved {dest.name}: {img.size}")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for filename, source in PIECE_FILES.items():
        if not source.exists():
            raise FileNotFoundError(f"Missing source image: {source}")
        process_piece(source, OUTPUT_DIR / filename)


if __name__ == "__main__":
    main()

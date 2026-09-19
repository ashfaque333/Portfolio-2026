# Ashfaque Salahudeen — portfolio (landing scene)

Plain HTML/CSS/JS, no build step, no dependencies.

## Run locally
    python -m http.server 8000     # then open http://localhost:8000
(Use a local server, not double-clicking index.html — the arch mask needs http.)

## Deploy on Vercel
Push this folder to GitHub → vercel.com → Add New Project → import the repo →
Framework Preset "Other", no build command, output directory = root. Done.

## How the layout works
The hero is a 1440×853 stage. Every layer is positioned in design pixels
(`--x --y --w --h` on each `.l` element) and scaled by `--hu`, so it scales as one
composition. Under ~1000px wide the stage keeps a 560px minimum height and crops
from the sides, keeping the truck centred.

## Assets to drop in (optional — gradients are used until then)
assets/hero/sky.webp     the SKY layer (1440×721)
assets/hero/water.webp   the WATER layer (1440×254)
assets/hero/boat-1.webp  the right-hand boat (falls back to a mirrored boat.webp)

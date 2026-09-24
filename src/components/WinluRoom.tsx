import { useEffect, useRef, useState } from 'react';

const TILE = 48;
const WIDTH = 18;
const HEIGHT = 12;
const ROOM_WIDTH = WIDTH * TILE;
const ROOM_HEIGHT = HEIGHT * TILE;
// Source coordinates in the 768 px preview of Spacestation_Inside_C.
const FURNITURE = [
  { x: 48, y: 16, w: 144, h: 48, roomX: 2, roomY: 3 }, // bridge console
  { x: 384, y: 280, w: 96, h: 48, roomX: 13, roomY: 4 }, // bed
];
const DECORATIONS = [
  { x: 480, y: 560, w: 48, h: 80, roomX: 3, roomY: 7 },
  { x: 624, y: 448, w: 64, h: 64, roomX: 14, roomY: 8 },
];

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load ${file.name}`));
    };
    image.src = url;
  });
}

export default function WinluRoom() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [floor, setFloor] = useState<HTMLImageElement | null>(null);
  const [walls, setWalls] = useState<HTMLImageElement | null>(null);
  const [furniture, setFurniture] = useState<HTMLImageElement | null>(null);
  const [decorations, setDecorations] = useState<HTMLImageElement | null>(null);
  const [position, setPosition] = useState({ x: 9, y: 7 });
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const delta: Record<string, [number, number]> = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      };
      const direction = delta[event.key];
      if (!direction) return;
      event.preventDefault();
      setPosition(({ x, y }) => {
        const nextX = Math.max(1, Math.min(WIDTH - 2, x + direction[0]));
        const nextY = Math.max(3, Math.min(HEIGHT - 2, y + direction[1]));
        const occupies = ({ roomX, roomY, w, h }: typeof FURNITURE[number]) =>
          nextX >= roomX && nextX < roomX + Math.ceil(w / TILE) &&
          nextY >= roomY && nextY < roomY + Math.ceil(h / TILE);
        const blocked = (furniture && FURNITURE.some(occupies)) ||
          (decorations && DECORATIONS.some(occupies));
        return blocked ? { x, y } : { x: nextX, y: nextY };
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [furniture, decorations]);

  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#101923';
    context.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);
    if (floor && walls) {
      // Match the source sheet's native pixels. Image attachments may be reduced
      // from the original 2496 x 1920 atlas to 2048 x 1575 for preview.
      const floorScale = floor.width / 2048;
      const floorTileSize = floor.width === 2496 ? 48 : 40;
      const floorTile = document.createElement('canvas');
      floorTile.width = floorTileSize;
      floorTile.height = floorTileSize;
      floorTile.getContext('2d')?.drawImage(
        floor,
        Math.round(743 * floorScale), Math.round(28 * floor.height / 1575),
        floorTileSize, floorTileSize,
        0, 0, floorTileSize, floorTileSize,
      );
      const pattern = context.createPattern(floorTile, 'repeat');
      if (pattern) {
        context.fillStyle = pattern;
        context.fillRect(TILE, 3 * TILE, ROOM_WIDTH - 2 * TILE, ROOM_HEIGHT - 4 * TILE);
      }
      // Six 144 px panels span the 864 px room at their native resolution.
      for (let x = 0; x < WIDTH; x += 3) {
        context.drawImage(walls, 384, 0, 144, 144, x * TILE, 0, 144, 144);
      }
      // Side and bottom rails visibly mark the collision boundary.
      context.fillStyle = '#263d4b';
      context.fillRect(0, 3 * TILE, TILE, (HEIGHT - 3) * TILE);
      context.fillRect((WIDTH - 1) * TILE, 3 * TILE, TILE, (HEIGHT - 3) * TILE);
      context.fillRect(0, (HEIGHT - 1) * TILE, ROOM_WIDTH, TILE);
      context.fillStyle = '#7196a5';
      context.fillRect(TILE, (HEIGHT - 1) * TILE, ROOM_WIDTH - 2 * TILE, 4);
      if (furniture) {
        for (const item of FURNITURE) {
          context.drawImage(furniture,
            item.x, item.y, item.w, item.h,
            item.roomX * TILE, item.roomY * TILE, item.w, item.h);
        }
      }
      if (decorations) {
        for (const item of DECORATIONS) {
          context.drawImage(decorations,
            item.x, item.y, item.w, item.h,
            item.roomX * TILE, item.roomY * TILE, item.w, item.h);
        }
      }
    } else {
      context.fillStyle = '#b7d6db';
      context.font = '20px sans-serif';
      context.fillText('Choose Inside_A2 and Spaceship_walls PNGs to load the room', 75, 270);
    }
    const centerX = position.x * TILE + TILE / 2;
    const centerY = position.y * TILE + TILE / 2;
    context.fillStyle = '#12262b';
    context.beginPath();
    context.ellipse(centerX, centerY + 15, 15, 5, 0, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = '#58dbed';
    context.beginPath();
    context.arc(centerX, centerY - 3, 12, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = '#172a35';
    context.fillRect(centerX - 6, centerY - 6, 4, 4);
    context.fillRect(centerX + 3, centerY - 6, 4, 4);
  }, [floor, walls, furniture, decorations, position]);

  const choose = async (file: File | undefined, which: 'floor' | 'walls' | 'furniture' | 'decorations') => {
    if (!file) return;
    try {
      const image = await readImage(file);
      const valid = which === 'floor'
        ? (image.width === 2496 && image.height === 1920) || (image.width === 2048 && image.height === 1575)
        : which === 'walls' ? image.width === 720 && image.height === 1344
        : image.width === 768 && image.height === 768;
      if (!valid) {
        throw new Error(`Wrong sheet: expected ${which === 'floor' ? 'Godot_Spacestation_Inside_A2' : which === 'walls' ? 'Spaceship_walls' : which === 'furniture' ? '768×768 Spacestation_Inside_C' : '768×768 Spacestation_Inside_D'}, got ${image.width}×${image.height}.`);
      }
      (which === 'floor' ? setFloor : which === 'walls' ? setWalls : which === 'furniture' ? setFurniture : setDecorations)(image);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open image.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Winlu room prototype</h1>
            <p className="text-slate-300">Load Inside_A2 and Spaceship_walls locally, then walk with WASD or arrow keys.</p></div>
          <a className="text-cyan-300 underline" href="/ai-town/">Back to AI Town</a>
        </div>
        <div className="mb-4 flex flex-wrap gap-4">
          <label>Godot_Spacestation_Inside_A2.png <input className="block" type="file" accept="image/png" onChange={(e) => void choose(e.target.files?.[0], 'floor')} /></label>
          <label>Spaceship_walls.png <input className="block" type="file" accept="image/png" onChange={(e) => void choose(e.target.files?.[0], 'walls')} /></label>
          <label>Spacestation_Inside_C.png <input className="block" type="file" accept="image/png" onChange={(e) => void choose(e.target.files?.[0], 'furniture')} /></label>
          <label>Spacestation_Inside_D.png <input className="block" type="file" accept="image/png" onChange={(e) => void choose(e.target.files?.[0], 'decorations')} /></label>
        </div>
        {error && <p role="alert" className="mb-3 text-rose-300">{error}</p>}
        <canvas ref={canvas} width={ROOM_WIDTH} height={ROOM_HEIGHT} className="max-w-full border-4 border-slate-600 [image-rendering:pixelated]" />
        <p className="mt-3 text-slate-400">Prototype only: the player stops at the walls. AI Town agents still use their current map.</p>
      </div>
    </main>
  );
}

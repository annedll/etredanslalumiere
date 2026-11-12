// Injected by Usin. Do not edit.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type ImageSize = "small" | "medium" | "large" | "full";
export type EditedImage = { blob: Blob; size: ImageSize; width: number; height: number };

const ASPECTS = [
  { label: "Paysage 16:9", value: 16 / 9 },
  { label: "Carré", value: 1 },
  { label: "Portrait 4:5", value: 4 / 5 },
  { label: "Bannière 3:1", value: 3 },
  { label: "Original", value: 0 },
];
const SIZES: { label: string; value: ImageSize }[] = [
  { label: "Petite", value: "small" },
  { label: "Moyenne", value: "medium" },
  { label: "Grande", value: "large" },
  { label: "Pleine largeur", value: "full" },
];

/** Tailwind classes for the chosen display size. */
export function imageSizeClass(size: ImageSize | string | null | undefined): string {
  switch (size) {
    case "small":
      return "block h-auto w-full max-w-xs";
    case "medium":
      return "block h-auto w-full max-w-md";
    case "large":
      return "block h-auto w-full max-w-2xl";
    default:
      return "block h-auto w-full";
  }
}

/** Uploads to the public "public-assets" bucket and returns the public URL. */
export async function uploadImage(
  supabase: { storage: { from: (b: string) => { upload: (p: string, f: Blob, o?: object) => Promise<{ error: { message: string } | null }>; getPublicUrl: (p: string) => { data: { publicUrl: string } } } } },
  blob: Blob,
  folder = "images",
): Promise<string> {
  const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".webp";
  const bucket = supabase.storage.from("public-assets");
  const { error } = await bucket.upload(path, blob, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
  if (error) throw new Error("Envoi de l'image impossible : " + error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
}

const FRAME = 440;

/** Modal editor. aspect: initial ratio (e.g. 16/9), 0 = keep the original ratio. */
export function ImageEditor(props: {
  open: boolean;
  onClose: () => void;
  onSave: (image: EditedImage) => void | Promise<void>;
  aspect?: number;
  size?: ImageSize;
  title?: string;
}) {
  const { open, onClose, onSave } = props;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState(props.aspect ?? 16 / 9);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<ImageSize>(props.size ?? "full");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const ratio = aspect || (img ? img.naturalWidth / img.naturalHeight : 16 / 9);
  const frameW = ratio >= 1 ? FRAME : FRAME * ratio;
  const frameH = frameW / ratio;
  const base = img ? Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) : 1;
  const scale = base * zoom;
  const imgW = img ? img.naturalWidth * scale : 0;
  const imgH = img ? img.naturalHeight * scale : 0;

  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(frameW - imgW, p.x)),
    y: Math.min(0, Math.max(frameH - imgH, p.y)),
  });

  useEffect(() => {
    if (img) setPos((p) => clamp(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, aspect, img]);

  function load(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return setError("Choisissez une image (JPG, PNG, WebP…).");
    setError(null);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      const s = Math.max(frameW / image.naturalWidth, frameH / image.naturalHeight);
      setPos({ x: (frameW - image.naturalWidth * s) / 2, y: (frameH - image.naturalHeight * s) / 2 });
    };
    image.src = url;
  }

  function onPointerDown(e: ReactPointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }
  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }));
  }

  async function save() {
    if (!img) return;
    setBusy(true);
    setError(null);
    try {
      const sw = frameW / scale;
      const sh = frameH / scale;
      const outW = Math.round(Math.min(1920, sw));
      const outH = Math.round(outW / ratio);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      canvas.getContext("2d")!.drawImage(img, -pos.x / scale, -pos.y / scale, sw, sh, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
      if (!blob) throw new Error("Conversion de l'image impossible.");
      await onSave({ blob, size, width: outW, height: outH });
      setImg(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-semibold">{props.title ?? "Modifier l'image"}</p>
        {!img ? (
          <div
            className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              load(e.dataTransfer.files[0]);
            }}
          >
            <span className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white">Importer une image</span>
            <span>ou glissez-la ici</span>
          </div>
        ) : (
          <>
            <div className="mx-auto overflow-hidden rounded-lg bg-slate-100" style={{ width: frameW, height: frameH, maxWidth: "100%", touchAction: "none" }}>
              <img
                src={img.src}
                alt=""
                draggable={false}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => (drag.current = null)}
                style={{ width: imgW, height: imgH, transform: "translate(" + pos.x + "px," + pos.y + "px)", maxWidth: "none", cursor: "grab", userSelect: "none" }}
              />
            </div>
            <p className="text-center text-xs text-slate-500">Faites glisser l'image pour la cadrer.</p>
            <label className="flex items-center gap-3 text-sm">
              Zoom
              <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((a) => (
                <button key={a.label} type="button" onClick={() => setAspect(a.value)} className={"rounded-full border px-3 py-1 text-xs " + (aspect === a.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300")}>
                  {a.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Taille sur la page :</span>
              {SIZES.map((s) => (
                <button key={s.value} type="button" onClick={() => setSize(s.value)} className={"rounded-full border px-3 py-1 text-xs " + (size === s.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300")}>
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between gap-2">
          <button type="button" onClick={() => (img ? input.current?.click() : onClose())} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
            {img ? "Autre image" : "Annuler"}
          </button>
          {img && (
            <button type="button" onClick={save} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

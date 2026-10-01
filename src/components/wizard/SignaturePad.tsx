"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isAllowedExtension, SIGNATURE_MAX_BYTES } from "@/lib/upload-policy";

const MAX_SIGNATURE_DIM = 1400;

type SignatureMode = "draw" | "upload";

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read_error"));
    reader.readAsDataURL(file);
  });
}

/** Downscales a dataUrl image to a PNG no larger than MAX_SIGNATURE_DIM. */
function toPngDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIGNATURE_DIM / Math.max(img.width, img.height));
      if (scale === 1) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<SignatureMode>("draw");
  const { t } = useI18n();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (value) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f2842";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
    canvasRef.current?.setPointerCapture?.(e.pointerId);
  }, []);

  const move = useCallback((e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
  }, []);

  const end = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  const pickFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > SIGNATURE_MAX_BYTES) {
      window.alert(t("validation.fileTooLarge"));
      return;
    }
    if (!isAllowedExtension(file.name)) {
      window.alert(t("validation.unsupportedType"));
      return;
    }
    const dataUrl = (await readImage(file).catch(() => null)) ?? null;
    if (!dataUrl) return;
    const png = await toPngDataUrl(dataUrl);
    setMode("upload");
    onChange(png);
  };

  return (
    <div>
      <div className="mb-2 flex w-fit gap-1 rounded-xl border border-navy-800/10 bg-navy-800/5 p-1">
        <button
          type="button"
          onClick={() => setMode("draw")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
            mode === "draw" ? "bg-navy-800 text-white shadow-sm" : "text-ink-muted hover:text-ink"
          )}
        >
          {t("s11.signatureDraw")}
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors",
            mode === "upload" ? "bg-navy-800 text-white shadow-sm" : "text-ink-muted hover:text-ink"
          )}
        >
          {t("s11.signatureUpload")}
        </button>
      </div>

      {mode === "draw" ? (
        <div>
          <div className="relative overflow-hidden rounded-xl border border-navy-800/15 bg-white">
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="h-36 w-full cursor-crosshair touch-none"
            />
            <span className="pointer-events-none absolute left-4 top-3 text-xs text-ink-muted/50">
              {t("s11.signatureHint")}
            </span>
          </div>
          <div className="mt-2">
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              {t("s11.signatureClear")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-navy-800/20 bg-white p-4">
          {value ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- dataUrl preview */}
              <img
                src={value}
                alt=""
                className="h-16 w-auto max-w-[260px] shrink-0 self-start rounded-lg border border-navy-800/10 bg-white object-contain px-2 py-1"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  {t("s11.signatureUploadChoose")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange("")}
                >
                  {t("s11.signatureClear")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl px-4 py-6 text-center transition-colors hover:bg-bone-50"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-navy-700"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[13px] font-medium text-navy-800">
                {t("s11.signatureUploadChoose")}
              </span>
            </button>
          )}
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
            {t("s11.signatureUploadHint")}
          </p>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              void pickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useRef, useState } from "react";
import { createBitmap } from "./createBitmap";
import { loadPresetColorTable, type ColorTable } from "./colorTable";
import { floydSteinbergDither } from "./floydSteinbergDither";

export default function AppLoader() {
  const [colorTable, setColorTable] = useState<ColorTable>([]);

  useEffect(() => {
    loadPresetColorTable().then(setColorTable);
  }, []);

  if (colorTable.length === 0) {
    return <div>Loading color table...</div>;
  }

  return <App colorTable={colorTable} />;
}

// Size to fit the e-ink photo frame.
const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 480;

function App({ colorTable }: { colorTable: ColorTable }) {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [frameSize, setFrameSize] = useState({
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  });
  const [framePosition, setFramePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<"edit" | "preview">("edit");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!sourceImage) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderEdit = () => {
      const scaledWidth = sourceImage.width * scale;
      const scaledHeight = sourceImage.height * scale;
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // 1) draw the image
      ctx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);

      // 2) build a path: full-canvas rect minus the inner frame rect
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, scaledWidth, scaledHeight);
      ctx.rect(
        framePosition.x,
        framePosition.y,
        frameSize.width,
        frameSize.height
      );

      // 3) fill with "evenodd" so the inner rect is punched out
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fill("evenodd");
      ctx.restore();
    };

    const renderPreview = () => {
      renderEdit();
      const selection = ctx.getImageData(
        framePosition.x,
        framePosition.y,
        frameSize.width,
        frameSize.height
      );

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dithered = floydSteinbergDither(selection, colorTable);
      ctx.putImageData(dithered, 0, 0);
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (view === "edit") {
      renderEdit();
    } else {
      renderPreview();
    }
  }, [sourceImage, scale, framePosition, frameSize, view, colorTable]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();

    const file = e.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event?.target?.result !== "string") return;

      const img = new Image();
      img.onload = () => {
        setSourceImage(img);
        setSourceFileName(file.name);
        setFramePosition({ x: 0, y: 0 });
        setFrameSize({ width: 800, height: 480 });
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setScale(1);
        setView("edit");
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);

    e.target.value = ""; // Reset file input
  };

  const rotateFrame = () => {
    setFrameSize((prev) => ({
      width: prev.height,
      height: prev.width,
    }));
  };

  const zoom = (direction: -1 | 1) => {
    setScale((prev) => {
      const newScale = prev + direction * 0.1;
      if (newScale < 0.1) return 0.1; // Prevent zooming out too much
      return newScale;
    });
  };

  const download = () => {
    const width = frameSize.width;
    const height = frameSize.height;

    const imageData = canvasRef.current
      ?.getContext("2d")
      ?.getImageData(0, 0, width, height);

    if (!imageData) {
      alert("No image data to download.");
      return;
    }

    const buffer = createBitmap(width, height, imageData);

    const blob = new Blob([buffer], { type: "image/bmp" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = targetFileName(sourceFileName, "bmp", width, height);
    a.click();
    URL.revokeObjectURL(url);
  };

  const targetFileName = (
    originalName: string,
    extension: string,
    width: number,
    height: number
  ) => {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    return `${nameWithoutExt}_${width}_${height}.${extension}`;
  };

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    // mouse coords in the content’s coordinate system
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    setDragOffset({ x: x - framePosition.x, y: y - framePosition.y });
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove: React.MouseEventHandler = (e) => {
    if (!isDragging || !sourceImage) return;

    const container = e.currentTarget;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    const rawX = x - dragOffset.x;
    const rawY = y - dragOffset.y;
    const maxX = sourceImage.width * scale - frameSize.width;
    const maxY = sourceImage.height * scale - frameSize.height;
    setFramePosition({
      x: Math.max(0, Math.min(rawX, maxX)),
      y: Math.max(0, Math.min(rawY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="app">
      {view === "edit" ? (
        <div className="toolbar">
          <button
            onClick={(e) => {
              e.currentTarget.nextElementSibling?.dispatchEvent(
                new MouseEvent("click", {
                  bubbles: true,
                  cancelable: true,
                  composed: true,
                })
              );
            }}
          >
            Open Image
          </button>
          <input
            type="file"
            accept="image/jpeg"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button disabled={!sourceImage} onClick={rotateFrame}>
            Rotate Frame
          </button>
          <button disabled={!sourceImage} onClick={() => zoom(-1)}>
            Zoom Out
          </button>
          <button disabled={!sourceImage} onClick={() => zoom(1)}>
            Zoom In
          </button>
          <button disabled={!sourceImage} onClick={() => setView("preview")}>
            Preview
          </button>
        </div>
      ) : (
        <div className="toolbar">
          <button onClick={() => setView("edit")}>Edit</button>
          <button onClick={download}>Download</button>
        </div>
      )}

      <div
        className="container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            pointerEvents: "none",
            width: sourceImage ? sourceImage.width * scale : "100%",
            height: sourceImage ? sourceImage.height * scale : "100%",
          }}
        />
      </div>
    </div>
  );
}

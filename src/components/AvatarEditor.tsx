/**
 * @file AvatarEditor.tsx
 * @description Komponenta za urejanje profilne slike z drag & drop pozicioniranjem
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

interface AvatarEditorProps {
  imageFile: File;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function AvatarEditor({ imageFile, onSave, onCancel, isSaving }: AvatarEditorProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const CONTAINER_SIZE = 250;
  const OUTPUT_SIZE = 200;

  // Load image from file
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });

      // Calculate initial scale to fit image in container
      const minDimension = Math.min(img.width, img.height);
      const initialScale = CONTAINER_SIZE / minDimension;
      setScale(Math.max(initialScale, 0.1));

      // Center the image
      setPosition({
        x: (CONTAINER_SIZE - img.width * initialScale) / 2,
        y: (CONTAINER_SIZE - img.height * initialScale) / 2,
      });
    };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Calculate bounds
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;

    // Limit movement so image always covers the container
    const minX = Math.min(0, CONTAINER_SIZE - scaledWidth);
    const maxX = Math.max(0, CONTAINER_SIZE - scaledWidth);
    const minY = Math.min(0, CONTAINER_SIZE - scaledHeight);
    const maxY = Math.max(0, CONTAINER_SIZE - scaledHeight);

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging, dragStart, imageSize, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;

    const minX = Math.min(0, CONTAINER_SIZE - scaledWidth);
    const maxX = Math.max(0, CONTAINER_SIZE - scaledWidth);
    const minY = Math.min(0, CONTAINER_SIZE - scaledHeight);
    const maxY = Math.max(0, CONTAINER_SIZE - scaledHeight);

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging, dragStart, imageSize, scale]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setScale(prev => {
      const newScale = Math.max(0.1, Math.min(3, prev + delta));

      // Adjust position to keep image centered during zoom
      const scaledWidth = imageSize.width * newScale;
      const scaledHeight = imageSize.height * newScale;

      const minX = Math.min(0, CONTAINER_SIZE - scaledWidth);
      const maxX = Math.max(0, CONTAINER_SIZE - scaledWidth);
      const minY = Math.min(0, CONTAINER_SIZE - scaledHeight);
      const maxY = Math.max(0, CONTAINER_SIZE - scaledHeight);

      setPosition(pos => ({
        x: Math.max(minX, Math.min(maxX, pos.x)),
        y: Math.max(minY, Math.min(maxY, pos.y)),
      }));

      return newScale;
    });
  }, [imageSize]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  const handleSave = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx || !imageRef.current) return;

    // Calculate the visible area in the original image coordinates
    const sourceX = -position.x / scale;
    const sourceY = -position.y / scale;
    const sourceSize = CONTAINER_SIZE / scale;

    // Draw the cropped and scaled image
    ctx.drawImage(
      imageRef.current,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [position, scale, onSave]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Uredi sliko</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center gap-4">
          <p className="text-sm text-gray-500 text-center">
            Povlecite sliko za pozicioniranje
          </p>

          {/* Image container with circular mask */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full bg-gray-200 select-none"
            style={{
              width: CONTAINER_SIZE,
              height: CONTAINER_SIZE,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Preview"
                className="absolute pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'top left',
                  maxWidth: 'none',
                }}
                draggable={false}
              />
            )}

            {/* Circular overlay guide */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.5)',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ZoomOut size={20} />
            </button>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={scale}
              onChange={(e) => {
                const newScale = parseFloat(e.target.value);
                setScale(newScale);

                const scaledWidth = imageSize.width * newScale;
                const scaledHeight = imageSize.height * newScale;
                const minX = Math.min(0, CONTAINER_SIZE - scaledWidth);
                const maxX = Math.max(0, CONTAINER_SIZE - scaledWidth);
                const minY = Math.min(0, CONTAINER_SIZE - scaledHeight);
                const maxY = Math.max(0, CONTAINER_SIZE - scaledHeight);

                setPosition(pos => ({
                  x: Math.max(minX, Math.min(maxX, pos.x)),
                  y: Math.max(minY, Math.min(maxY, pos.y)),
                }));
              }}
              className="w-32"
            />
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ZoomIn size={20} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50"
            >
              Prekliči
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Shranjujem...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Shrani
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

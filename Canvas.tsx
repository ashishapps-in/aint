
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Tool, BrushType, CanvasRef, BrushSettings, Point } from '../types';

interface CanvasProps {
  tool: Tool;
  brushType: BrushType;
  color: string;
  color2: string;
  brushSize: number;
  zoom: number;
  brushSettings: BrushSettings;
  onStateChange: (dataUrl: string) => void;
  onColorPick: (color: string) => void;
  onZoomChange: (newZoom: number) => void;
  onMouseMove: (pos: Point) => void;
}

const Canvas = forwardRef<CanvasRef, CanvasProps>(({ tool, brushType, color, color2, brushSize, zoom, brushSettings, onStateChange, onColorPick, onZoomChange, onMouseMove }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [tempImageData, setTempImageData] = useState<string | null>(null);
  const [polyPoints, setPolyPoints] = useState<{x: number, y: number}[]>([]);
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    undo: () => {},
    redo: () => {},
    clear: () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.fillStyle = color2;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        onStateChange(canvasRef.current.toDataURL());
      }
    },
    loadFromDataUrl: (url: string) => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = url;
    },
    rotate: (angle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      offscreen.getContext('2d')?.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(offscreen, -canvas.width / 2, -canvas.height / 2);
      ctx.restore();
      onStateChange(canvas.toDataURL());
    },
    flip: (horizontal: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      offscreen.getContext('2d')?.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (horizontal) { ctx.scale(-1, 1); ctx.drawImage(offscreen, -canvas.width, 0); }
      else { ctx.scale(1, -1); ctx.drawImage(offscreen, 0, -canvas.height); }
      ctx.restore();
      onStateChange(canvas.toDataURL());
    },
    crop: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const data = ctx.getImageData(0, 0, canvas.width - 100, canvas.height - 100);
      canvas.width -= 100;
      canvas.height -= 100;
      ctx.putImageData(data, 0, 0);
      onStateChange(canvas.toDataURL());
    },
    resize: (w, h) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w; canvas.height = h;
    },
    getCompositeDataUrl: (mimeType = 'image/png') => {
       return canvasRef.current?.toDataURL(mimeType) || '';
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width === 0) {
      canvas.width = 1200; canvas.height = 800;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
    const pos = { x: Math.round((clientX - rect.left) / zoom), y: Math.round((clientY - rect.top) / zoom) };
    return pos;
  }, [zoom]);

  const commitText = () => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const fontSize = Math.max(12, brushSize * 4);
      ctx.font = `${fontSize}px Arial`; ctx.fillStyle = color; ctx.textBaseline = 'top';
      const lines = textInput.value.split('\n');
      lines.forEach((line, i) => ctx.fillText(line, textInput.x, textInput.y + (i * fontSize * 1.2)));
      onStateChange(canvasRef.current!.toDataURL());
    }
    setTextInput(null);
  };

  const applyBrushStyles = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = brushSize;
    ctx.globalAlpha = 1.0; ctx.setLineDash([]);
    ctx.shadowBlur = (1 - brushSettings.hardness) * (brushSize / 2);
    ctx.shadowColor = tool === 'eraser' ? color2 : color;
    ctx.strokeStyle = tool === 'eraser' ? color2 : color;
    if (tool === 'pencil') { ctx.lineWidth = Math.max(1, brushSize / 4); ctx.shadowBlur = 0; }
  };

  const drawBrushPoint = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const jitterX = (Math.random() - 0.5) * brushSize * brushSettings.jitter;
    const jitterY = (Math.random() - 0.5) * brushSize * brushSettings.jitter;
    if (brushSettings.hardness < 0.9 && tool !== 'pencil') {
      const grad = ctx.createRadialGradient(x + jitterX, y + jitterY, 0, x + jitterX, y + jitterY, brushSize / 2);
      grad.addColorStop(0, tool === 'eraser' ? color2 : color);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x + jitterX, y + jitterY, brushSize / 2, 0, Math.PI * 2); ctx.fill();
    } else { ctx.lineTo(x + jitterX, y + jitterY); ctx.stroke(); }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    if (tool === 'zoom') {
      const isShift = (e as React.MouseEvent).shiftKey;
      onZoomChange(isShift ? Math.max(0.1, zoom - 0.2) : Math.min(5, zoom + 0.2));
      return;
    }
    if (tool === 'text') {
      if (textInput) commitText();
      else setTextInput({ x: pos.x, y: pos.y, value: '' });
      return;
    }
    if (tool === 'polygon') {
      const newPoints = [...polyPoints, pos]; setPolyPoints(newPoints);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) { applyBrushStyles(ctx); ctx.beginPath(); ctx.moveTo(newPoints[0].x, newPoints[0].y);
        newPoints.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); }
      return;
    }
    if (textInput) commitText();
    setStartPos(pos); setLastPos(pos);
    if (tool === 'fill') { floodFill(pos.x, pos.y, (e as React.MouseEvent).button === 2 ? color2 : color); return; }
    if (tool === 'picker') {
      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
        onColorPick(hex);
      }
      return;
    }
    setIsDrawing(true); setTempImageData(canvasRef.current?.toDataURL() || null);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y); applyBrushStyles(ctx);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    onMouseMove(pos);
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    if (['brush', 'eraser', 'pencil'].includes(tool)) {
      const dist = Math.sqrt(Math.pow(pos.x - lastPos.x, 2) + Math.pow(pos.y - lastPos.y, 2));
      const step = Math.max(1, brushSize * brushSettings.spacing);
      if (dist >= step) {
        const angle = Math.atan2(pos.y - lastPos.y, pos.x - lastPos.x);
        for (let d = 0; d < dist; d += step) drawBrushPoint(ctx, lastPos.x + Math.cos(angle) * d, lastPos.y + Math.sin(angle) * d);
        setLastPos(pos);
      }
    } else if (tool !== 'polygon') {
      if (tempImageData) {
        const img = new Image(); img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          ctx.drawImage(img, 0, 0); applyBrushStyles(ctx);
          const w = pos.x - startPos.x, h = pos.y - startPos.y;
          const radius = Math.sqrt(w*w + h*h);
          ctx.beginPath();
          if (tool === 'rectangle') ctx.strokeRect(startPos.x, startPos.y, w, h);
          else if (tool === 'rounded-rect') {
            const r = Math.min(10, Math.abs(w)/4, Math.abs(h)/4);
            ctx.roundRect(startPos.x, startPos.y, w, h, r); ctx.stroke();
          }
          else if (tool === 'circle') ctx.arc(startPos.x, startPos.y, radius, 0, 2*Math.PI), ctx.stroke();
          else if (tool === 'line') { ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
          else if (tool === 'star') {
            let rot = Math.PI / 2 * 3; let step = Math.PI / 5; ctx.moveTo(startPos.x, startPos.y - radius);
            for (let i = 0; i < 5; i++) {
              ctx.lineTo(startPos.x + Math.cos(rot) * radius, startPos.y + Math.sin(rot) * radius); rot += step;
              ctx.lineTo(startPos.x + Math.cos(rot) * (radius/2.5), startPos.y + Math.sin(rot) * (radius/2.5)); rot += step;
            } ctx.closePath(); ctx.stroke();
          }
        }; img.src = tempImageData;
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false); if (canvasRef.current) onStateChange(canvasRef.current.toDataURL());
  };

  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data;
    const x = Math.round(startX), y = Math.round(startY);
    const pixelPos = (y * canvas.width + x) * 4;
    const startR = data[pixelPos], startG = data[pixelPos+1], startB = data[pixelPos+2], startA = data[pixelPos+3];
    const r = parseInt(fillColor.slice(1, 3), 16), g = parseInt(fillColor.slice(3, 5), 16), b = parseInt(fillColor.slice(5, 7), 16);
    if (startR === r && startG === g && startB === b && startA === 255) return;
    const stack = [[x, y]];
    const match = (px: number, py: number) => {
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return false;
      const p = (py * canvas.width + px) * 4;
      return data[p] === startR && data[p+1] === startG && data[p+2] === startB && data[p+3] === startA;
    };
    while (stack.length) {
      const [cx, cy] = stack.pop()!; let py = cy; while (match(cx, py - 1)) py--;
      let spanLeft = false, spanRight = false;
      while (match(cx, py)) {
        const p = (py * canvas.width + cx) * 4; data[p] = r; data[p+1] = g; data[p+2] = b; data[p+3] = 255;
        if (!spanLeft && cx > 0 && match(cx - 1, py)) { stack.push([cx - 1, py]); spanLeft = true; }
        else if (spanLeft && cx > 0 && !match(cx - 1, py)) spanLeft = false;
        if (!spanRight && cx < canvas.width - 1 && match(cx + 1, py)) { stack.push([cx + 1, py]); spanRight = true; }
        else if (spanRight && cx < canvas.width - 1 && !match(cx + 1, py)) spanRight = false;
        py++;
      }
    }
    ctx.putImageData(imageData, 0, 0); onStateChange(canvas.toDataURL());
  };

  return (
    <div className="inline-block shadow-2xl bg-white border border-zinc-300 relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={handleMouseMove} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onContextMenu={(e)=>e.preventDefault()} onTouchStart={startDrawing} onTouchMove={handleMouseMove} onTouchEnd={stopDrawing} className="touch-none cursor-crosshair" />
      {textInput && (
        <textarea ref={textInputRef} autoFocus className="absolute bg-transparent border border-dashed border-blue-500 outline-none p-0 overflow-hidden resize-both z-50"
          style={{ left: textInput.x, top: textInput.y, color: color, fontSize: Math.max(12, brushSize * 4), fontFamily: 'Arial', lineHeight: '1.2', minWidth: '100px', minHeight: '20px' }}
          value={textInput.value} onChange={(e) => setTextInput({ ...textInput, value: e.target.value })} onBlur={commitText} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); } if (e.key === 'Escape') setTextInput(null); }} />
      )}
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;

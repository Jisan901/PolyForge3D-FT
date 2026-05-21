import React, { useState, useRef, useCallback } from 'react';
import { AtlasConfig, AtlasItem } from './types';
import { CreateModal } from './components/CreateModal';
import { CanvasAtlas } from './components/CanvasAtlas';
import { Download, Upload, Plus, Trash2, Image as ImageIcon, Info, MousePointer2, Eraser, Hand, Copy, Layers, Maximize, Minimize, Grid, Wand2, Settings } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<AtlasConfig | null>(null);
  const [items, setItems] = useState<AtlasItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tool, setTool] = useState<'add' | 'erase' | 'pan'>('add');
  const [fitMode, setFitMode] = useState<'stretch' | 'fit'>('stretch');
  const [overlapMode, setOverlapMode] = useState<'replace' | 'overlay'>('replace');
  const [renderMode, setRenderMode] = useState<'pixelated' | 'interpolated'>('pixelated');
  const [eraseMode, setEraseMode] = useState<'item' | 'cell'>('item');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targetArea, setTargetArea] = useState<{col: number, row: number, colSpan: number, rowSpan: number} | null>(null);
  const [pendingImportImage, setPendingImportImage] = useState<HTMLImageElement | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (newConfig: AtlasConfig) => {
    setConfig(newConfig);
    setItems([]);
    setIsModalOpen(false);
  };

  const handleDropImage = useCallback((files: File[], startCol: number, startRow: number, colSpan = 1, rowSpan = 1) => {
    if (!config) return;

    files.forEach((file, index) => {
      let targetCol = startCol;
      let targetRow = startRow;
      let targetColSpan = colSpan;
      let targetRowSpan = rowSpan;

      if (index > 0) {
        // For subsequent files, just place them 1x1 sequentially
        const startIndex = startRow * config.columns + startCol;
        const targetIndex = startIndex + index;
        targetCol = targetIndex % config.columns;
        targetRow = Math.floor(targetIndex / config.columns);
        targetColSpan = 1;
        targetRowSpan = 1;
      }

      // Stop if it exceeds bounds
      if (targetCol + targetColSpan > config.columns || targetRow + targetRowSpan > config.rows) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setItems(prev => {
            let filtered = prev;
            
            if (overlapMode === 'replace') {
              // Remove any items that intersect with this new area
              filtered = prev.filter(item => {
                const iColSpan = item.colSpan || 1;
                const iRowSpan = item.rowSpan || 1;
                const intersectX = item.col < targetCol + targetColSpan && item.col + iColSpan > targetCol;
                const intersectY = item.row < targetRow + targetRowSpan && item.row + iRowSpan > targetRow;
                return !(intersectX && intersectY);
              });
            }
            
            return [...filtered, {
              id: Math.random().toString(36).substring(7),
              col: targetCol,
              row: targetRow,
              colSpan: targetColSpan,
              rowSpan: targetRowSpan,
              image: img,
              src
            }];
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }, [config, overlapMode]);

  const handleAreaSelect = useCallback((col: number, row: number, colSpan: number, rowSpan: number, shiftKey: boolean) => {
    if (tool === 'erase' || shiftKey) {
      setItems(prev => {
        const newItems: AtlasItem[] = [];
        for (const item of prev) {
          const iColSpan = item.colSpan || 1;
          const iRowSpan = item.rowSpan || 1;
          const intersectX = item.col < col + colSpan && item.col + iColSpan > col;
          const intersectY = item.row < row + rowSpan && item.row + iRowSpan > row;
          
          if (intersectX && intersectY) {
            if (eraseMode === 'cell') {
              const erasedCells = item.erasedCells ? [...item.erasedCells] : [];
              for (let r = row; r < row + rowSpan; r++) {
                for (let c = col; c < col + colSpan; c++) {
                  if (c >= item.col && c < item.col + iColSpan && r >= item.row && r < item.row + iRowSpan) {
                    if (!erasedCells.some(ec => ec.col === c && ec.row === r)) {
                      erasedCells.push({ col: c, row: r });
                    }
                  }
                }
              }
              if (erasedCells.length < iColSpan * iRowSpan) {
                newItems.push({ ...item, erasedCells });
              }
            }
            // If eraseMode is 'item', we don't push it (it gets removed)
          } else {
            newItems.push(item);
          }
        }
        return newItems;
      });
    } else {
      setTargetArea({ col, row, colSpan, rowSpan });
      fileInputRef.current?.click();
    }
  }, [tool, eraseMode]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !targetArea) return;
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleDropImage(files, targetArea.col, targetArea.row, targetArea.colSpan, targetArea.rowSpan);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
    setTargetArea(null);
  };

  const processImport = (img: HTMLImageElement, newConfig: AtlasConfig) => {
    setConfig(newConfig);
    
    const promises: Promise<AtlasItem>[] = [];
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = newConfig.cellWidth;
    sliceCanvas.height = newConfig.cellHeight;
    const sliceCtx = sliceCanvas.getContext('2d');
    if (!sliceCtx) return;

    for (let r = 0; r < newConfig.rows; r++) {
      for (let c = 0; c < newConfig.columns; c++) {
        sliceCtx.clearRect(0, 0, newConfig.cellWidth, newConfig.cellHeight);
        sliceCtx.drawImage(img, c * newConfig.cellWidth, r * newConfig.cellHeight, newConfig.cellWidth, newConfig.cellHeight, 0, 0, newConfig.cellWidth, newConfig.cellHeight);
        
        const cellData = sliceCtx.getImageData(0, 0, newConfig.cellWidth, newConfig.cellHeight);
        let isEmpty = true;
        for (let i = 0; i < cellData.data.length; i += 4) {
          if (c === 0 && r === 0 && i < 8 * 4) continue;
          if (cellData.data[i + 3] > 0) {
            isEmpty = false;
            break;
          }
        }

        if (!isEmpty) {
          const src = sliceCanvas.toDataURL('image/png');
          promises.push(new Promise(resolve => {
            const cellImg = new Image();
            cellImg.onload = () => {
              resolve({
                id: Math.random().toString(36).substring(7),
                col: c,
                row: r,
                colSpan: 1,
                rowSpan: 1,
                image: cellImg,
                src
              });
            };
            cellImg.src = src;
          }));
        }
      }
    }

    Promise.all(promises).then(newItems => {
      setItems(newItems);
      setPendingImportImage(null);
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, 8, 1);
        const data = imgData.data;
        
        const col = (data[3] << 8) | data[7];
        const row = (data[11] << 8) | data[15];
        const cw = (data[19] << 8) | data[23];
        const ch = (data[27] << 8) | data[31];

        if (col > 0 && col <= 1000 && row > 0 && row <= 1000 && cw > 0 && cw <= 4096 && ch > 0 && ch <= 4096 && img.width === col * cw && img.height === row * ch) {
          const newConfig = { columns: col, rows: row, cellWidth: cw, cellHeight: ch };
          processImport(img, newConfig);
        } else {
          setPendingImportImage(img);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (!canvasRef.current || !config) return;
    
    // Create a temporary canvas without the grid/background
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = config.columns * config.cellWidth;
    exportCanvas.height = config.rows * config.cellHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Set smoothing based on render mode
    ctx.imageSmoothingEnabled = renderMode === 'interpolated';

    // Draw only the images
    items.forEach(item => {
      const colSpan = item.colSpan || 1;
      const rowSpan = item.rowSpan || 1;
      const x = item.col * config.cellWidth;
      const y = item.row * config.cellHeight;
      const w = config.cellWidth * colSpan;
      const h = config.cellHeight * rowSpan;
      
      if (item.erasedCells && item.erasedCells.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        item.erasedCells.forEach(cell => {
          ctx.rect(
            cell.col * config.cellWidth,
            cell.row * config.cellHeight,
            config.cellWidth,
            config.cellHeight
          );
        });
        ctx.clip('evenodd');
      }

      if (fitMode === 'fit') {
        const scale = Math.min(w / item.image.width, h / item.image.height);
        const drawWidth = item.image.width * scale;
        const drawHeight = item.image.height * scale;
        const offsetX = (w - drawWidth) / 2;
        const offsetY = (h - drawHeight) / 2;
        ctx.drawImage(item.image, x + offsetX, y + offsetY, drawWidth, drawHeight);
      } else {
        ctx.drawImage(item.image, x, y, w, h);
      }

      if (item.erasedCells && item.erasedCells.length > 0) {
        ctx.restore();
      }
    });

    // Write metadata to first 8 pixels' alpha
    const imgData = ctx.getImageData(0, 0, 8, 1);
    imgData.data[3] = (config.columns >> 8) & 0xFF;
    imgData.data[7] = config.columns & 0xFF;
    imgData.data[11] = (config.rows >> 8) & 0xFF;
    imgData.data[15] = config.rows & 0xFF;
    imgData.data[19] = (config.cellWidth >> 8) & 0xFF;
    imgData.data[23] = config.cellWidth & 0xFF;
    imgData.data[27] = (config.cellHeight >> 8) & 0xFF;
    imgData.data[31] = config.cellHeight & 0xFF;
    ctx.putImageData(imgData, 0, 0);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `atlas_${config.columns}x${config.rows}_${config.cellWidth}x${config.cellHeight}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="h-full w-full bg-neutral-950 text-neutral-300 font-sans flex flex-col overflow-hidden selection:bg-neutral-800">
      {/* Hidden file input for mobile/click support */}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/png" 
        ref={importInputRef} 
        onChange={handleImport} 
        className="hidden" 
      />

      {/* Topbar */}
      <header className="h-auto min-h-12 py-2 border-b border-neutral-800/50 bg-neutral-900/50 flex flex-wrap items-center justify-between px-4 shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center">
            <ImageIcon size={14} className="text-neutral-400" />
          </div>
          <h1 className="text-xs font-medium tracking-wide text-neutral-200 hidden sm:block">Atlas Creator</h1>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {config && (
            <>
              <div className="flex items-center bg-neutral-950 rounded border border-neutral-800 p-0.5 mr-2">
                <button
                  onClick={() => setTool('add')}
                  className={`p-1.5 rounded ${tool === 'add' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Add Image (Tap cell)"
                >
                  <MousePointer2 size={14} />
                </button>
                <button
                  onClick={() => setTool('erase')}
                  className={`p-1.5 rounded ${tool === 'erase' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Erase Image (Tap cell)"
                >
                  <Eraser size={14} />
                </button>
                <button
                  onClick={() => setTool('pan')}
                  className={`p-1.5 rounded ${tool === 'pan' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Pan Canvas (Middle Click or Two Fingers)"
                >
                  <Hand size={14} />
                </button>
              </div>

              <div className="relative mr-2">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all ${isSettingsOpen ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                  title="Settings"
                >
                  <Settings size={14} />
                  <span className="hidden sm:inline">Settings</span>
                </button>

                {isSettingsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-4">
                      {/* Overlap Mode */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-neutral-400 font-medium">Overlap Mode</label>
                        <div className="flex bg-neutral-950 rounded border border-neutral-800 p-0.5">
                          <button
                            onClick={() => setOverlapMode('replace')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${overlapMode === 'replace' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Copy size={12} /> Replace
                          </button>
                          <button
                            onClick={() => setOverlapMode('overlay')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${overlapMode === 'overlay' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Layers size={12} /> Overlay
                          </button>
                        </div>
                      </div>

                      {/* Fit Mode */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-neutral-400 font-medium">Image Fit</label>
                        <div className="flex bg-neutral-950 rounded border border-neutral-800 p-0.5">
                          <button
                            onClick={() => setFitMode('stretch')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${fitMode === 'stretch' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Maximize size={12} /> Stretch
                          </button>
                          <button
                            onClick={() => setFitMode('fit')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${fitMode === 'fit' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Minimize size={12} /> Fit
                          </button>
                        </div>
                      </div>

                      {/* Erase Mode */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-neutral-400 font-medium">Erase Mode</label>
                        <div className="flex bg-neutral-950 rounded border border-neutral-800 p-0.5">
                          <button
                            onClick={() => setEraseMode('item')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${eraseMode === 'item' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <ImageIcon size={12} /> Whole Image
                          </button>
                          <button
                            onClick={() => setEraseMode('cell')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${eraseMode === 'cell' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Grid size={12} /> Single Cell
                          </button>
                        </div>
                      </div>

                      {/* Render Mode */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-neutral-400 font-medium">Render Mode</label>
                        <div className="flex bg-neutral-950 rounded border border-neutral-800 p-0.5">
                          <button
                            onClick={() => setRenderMode('pixelated')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${renderMode === 'pixelated' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Grid size={12} /> Pixelated
                          </button>
                          <button
                            onClick={() => setRenderMode('interpolated')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded ${renderMode === 'interpolated' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                          >
                            <Wand2 size={12} /> Smooth
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[10px] text-neutral-500 font-mono tracking-wider mr-2 hidden md:block">
                {config.columns}x{config.rows} GRID â€¢ {config.cellWidth}x{config.cellHeight}PX
              </div>
              <button
                onClick={() => setItems([])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-neutral-800/50 rounded transition-all"
                title="Clear all images"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded transition-all"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <div className="w-px h-4 bg-neutral-800 mx-1 hidden sm:block" />
            </>
          )}
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-800 text-neutral-300 font-medium rounded hover:bg-neutral-700 hover:text-white transition-all shadow-sm mr-2"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-200 text-neutral-900 font-medium rounded hover:bg-white transition-all shadow-sm"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New Atlas</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {config ? (
          <div className="flex-1 relative">
            <CanvasAtlas
              config={config}
              items={items}
              fitMode={fitMode}
              tool={tool}
              renderMode={renderMode}
              onDropImage={handleDropImage}
              onAreaSelect={handleAreaSelect}
              canvasRef={canvasRef}
            />
            
            {/* Overlay Info */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto flex items-center gap-2 text-[10px] text-neutral-500 bg-neutral-900/80 px-3 py-2 rounded border border-neutral-800/50 backdrop-blur-sm pointer-events-none z-10">
              <Info size={12} className="shrink-0" />
              <span>Scroll to zoom. Middle-click/Two-fingers to pan.</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
            <div className="w-16 h-16 mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-center shadow-inner">
              <ImageIcon size={24} className="text-neutral-600" />
            </div>
            <p className="text-sm font-medium text-neutral-400 mb-1">No Atlas Created</p>
            <p className="text-xs text-neutral-600 mb-6">Create a new atlas to start adding textures.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 rounded transition-all"
            >
              <Plus size={14} />
              <span>Create Atlas</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <CreateModal
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreate}
        />
      )}
      {pendingImportImage && (
        <CreateModal
          title="Import Atlas"
          submitText="Import"
          onClose={() => setPendingImportImage(null)}
          onCreate={(config) => processImport(pendingImportImage, config)}
        />
      )}
    </div>
  );
}

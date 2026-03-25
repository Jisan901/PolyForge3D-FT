import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  FileCode,
  FileImage,
  FileText,
  RefreshCw,
  Box,
  Palette,
  Grid3x3,
  Move3d,
  Image as ImageIcon,
} from "lucide-react";
import ContextMenu, { MenuItem } from "./ContextMenu";
import { DragAndDropZone } from "./Utils/DragNDrop";

import { Editor } from "@/Editor/Editor";

const editor = Editor;

// Removed 'files' category
type ResourceCategory = "objects" | "materials" | "geometries" | "textures";

interface CategoryTab {
  id: ResourceCategory;
  label: string;
  icon: React.ReactNode;
  type?: string;
}

const categories: CategoryTab[] = [
  {
    id: "objects",
    label: "Objects",
    icon: <Box size={16} />,
    type: "Object3D",
  },
  {
    id: "materials",
    label: "Materials",
    icon: <Palette size={16} />,
    type: "Material",
  },
  {
    id: "geometries",
    label: "Geometries",
    icon: <Grid3x3 size={16} />,
    type: "BufferGeometry",
  },
  {
    id: "textures",
    label: "Textures",
    icon: <ImageIcon size={16} />,
    type: "Texture",
  },
];

const ResourceBrowser: React.FC = () => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string;
  } | null>(null);
  const [runtimeResources, setRuntimeResources] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<ResourceCategory>("objects");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRuntimeResources = useCallback(
    async (category: ResourceCategory) => {
      try {
        let resources: any[] = [];
        const registry = editor.core.threeRegistry;

        switch (category) {
          case "objects":
            resources = [...registry.objects.values()];
            break;
          case "materials":
            resources = [...registry.materials.values()];
            break;
          case "geometries":
            resources = [...registry.geometries.values()];
            break;
          case "textures":
            resources = [...registry.textures.values()];
            break;
        }
        setRuntimeResources(resources || []);
      } catch (error) {
        console.error(`Failed to fetch ${category} resources:`, error);
        setRuntimeResources([]);
      }
    },
    [],
  );

  useEffect(() => {
    fetchRuntimeResources(activeCategory);
  }, [activeCategory, fetchRuntimeResources]);

  const handleCategoryChange = (category: ResourceCategory) => {
    setActiveCategory(category);
    setSearchQuery("");
  };

  const getIcon = (asset: any) => {
    const props = { size: 32 };
    if (!asset) return <FileText {...props} className="text-gray-400" />;

    const normalizedType = asset?.type?.toLowerCase?.() || "";

    if (asset.isMaterial)
      return <Palette {...props} className="text-pink-400" />;
    if (asset.isTexture)
      return <ImageIcon {...props} className="text-orange-400" />;
    if (asset.isGeometry||asset.isBufferGeometry)
      return <Grid3x3 {...props} className="text-green-400" />;
    if (asset.isMesh) return <Box {...props} className="text-blue-800" />;
    if (asset.isObject3D) return <Move3d {...props} className="text-indigo-400" />;

    return <FileText {...props} className="text-gray-400" />;
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
  };

  const handleOpen = useCallback((resource: any) => {
    editor.api.buses.selectionUpdate.emit(resource)
    // Logic to select in scene or open in properties inspector
  }, []);

  const getContextMenuItems = (id: string): MenuItem[] => [
    {
      label: "Inspect",
      action: () => console.log("Inspect", id),
    },
    {
      label: "Clone",
      action: () => console.log("Clone", id),
    },
    { separator: true, label: "", action: () => {} },
    {
      label: "Save to File",
      action: () => console.log("Exporting resource to disk...", id),
    },
    {
      label: "Dispose",
      danger: true,
      action: () => console.log("Dispose Runtime Resource", id),
    },
  ];

  const getBackgroundMenuItems = (): MenuItem[] => [
    {
      label: "Refresh List",
      action: () => fetchRuntimeResources(activeCategory),
    },
  ];

  const filteredItems = runtimeResources.filter((item) =>
    (item.name || item.uuid)?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-editor-panel">
      {/* Category Tabs */}
      <div className="h-10 flex items-center px-2 border-b border-editor-border bg-editor-bg shrink-0">
        <div className="flex gap-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`
                                flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all
                                ${
                                  activeCategory === category.id
                                    ? "bg-editor-accent text-white"
                                    : "text-editor-textDim hover:bg-white/5 hover:text-white"
                                }
                            `}
            >
              {category.icon}
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-8 flex items-center px-2 border-b border-editor-border bg-editor-bg gap-2 shrink-0">
        <div className="flex-1 flex items-center bg-editor-input border border-editor-border rounded px-2 py-0.5">
          <Search size={12} className="text-editor-textDim mr-2" />
          <input
            type="text"
            placeholder={`Search live ${activeCategory}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-[10px] w-full focus:outline-none text-white"
          />
        </div>
        <RefreshCw
          onClick={() => fetchRuntimeResources(activeCategory)}
          size={14}
          className="text-editor-textDim cursor-pointer hover:text-white"
        />
      </div>

      {/* Resource Grid */}
      <div
        className="flex-1 p-2 overflow-y-auto bg-[#1e1e1e]"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, targetId: "bg" });
          }
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
          {filteredItems.map((resource) => (
            <DragAndDropZone
              key={resource.uuid || resource.id}
              payload={{ type: "RuntimeResource", data: resource }}
            >
              <div
                className="group flex flex-col items-center p-2 rounded hover:bg-white/5 cursor-pointer border border-transparent hover:border-editor-accent/50 transition-all select-none"
                onContextMenu={(e) =>
                  handleContextMenu(e, resource.uuid || resource.id)
                }
                onDoubleClick={() => handleOpen(resource)}
              >
                <div className="mb-2 transition-transform group-hover:scale-110 pointer-events-none">
                  {getIcon(resource || activeCategory)}
                </div>
                <span className="text-[10px] text-center text-editor-text truncate w-full px-1 bg-transparent rounded group-hover:bg-editor-accent group-hover:text-white leading-tight py-0.5 pointer-events-none">
                  {resource.name || "Unnamed"}
                </span>
                <span className="text-[9px] text-gray-500 mt-1 pointer-events-none">
                  {resource.type}
                </span>
              </div>
            </DragAndDropZone>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-editor-textDim">
            <Box size={48} className="mb-4 opacity-20" />
            <p className="text-sm">
              {searchQuery
                ? "No matching resources"
                : `No active ${activeCategory} in memory`}
            </p>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.targetId === "bg"
              ? getBackgroundMenuItems()
              : getContextMenuItems(contextMenu.targetId)
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default ResourceBrowser;

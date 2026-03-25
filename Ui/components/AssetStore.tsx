import React, { useState } from 'react';
import { Search, Download, Star, Filter, Package, Image as ImageIcon, FileCode, Box, ChevronDown, Heart, Eye, ArrowDownToLine, X, Check } from 'lucide-react';

interface StoreAsset {
  id: string;
  title: string;
  author: string;
  price: string;
  rating: number;
  type: '3D Model' | 'Texture' | 'Script' | 'Audio';
  image: string;
  description: string;
  downloads: string;
  tags: string[];
}

const MOCK_STORE_ASSETS: StoreAsset[] = [
  { id: '1', title: 'Sci-Fi Corridor Pack', author: 'NeonStudios', price: 'Free', rating: 4.8, type: '3D Model', image: 'https://picsum.photos/seed/scifi/600/400', description: 'Modular sci-fi corridor pieces with PBR textures.', downloads: '12.4k', tags: ['Sci-Fi', 'Modular', 'PBR'] },
  { id: '2', title: 'Realistic Nature Textures', author: 'EarthGen', price: '$15.00', rating: 4.9, type: 'Texture', image: 'https://picsum.photos/seed/nature/600/400', description: 'High-resolution 4K seamless nature textures.', downloads: '3.2k', tags: ['Nature', '4K', 'Seamless'] },
  { id: '3', title: 'Advanced Player Controller', author: 'CodeNinja', price: '$5.00', rating: 4.5, type: 'Script', image: 'https://picsum.photos/seed/code/600/400', description: 'Kinematic character controller with physics support.', downloads: '8.1k', tags: ['Controller', 'Physics', 'C#'] },
  { id: '4', title: 'Low Poly Vehicles', author: 'PolyArt', price: 'Free', rating: 4.2, type: '3D Model', image: 'https://picsum.photos/seed/poly/600/400', description: 'A collection of 20 low poly vehicles for mobile games.', downloads: '45.2k', tags: ['Low Poly', 'Vehicles', 'Mobile'] },
  { id: '5', title: 'Ambient Space Music', author: 'AudioWave', price: '$10.00', rating: 4.7, type: 'Audio', image: 'https://picsum.photos/seed/space/600/400', description: '10 seamless looping ambient tracks for space games.', downloads: '1.5k', tags: ['Music', 'Ambient', 'Space'] },
  { id: '6', title: 'Fantasy Weapons Bundle', author: 'ForgeMaster', price: '$20.00', rating: 4.6, type: '3D Model', image: 'https://picsum.photos/seed/fantasy/600/400', description: 'High-quality fantasy swords, axes, and shields.', downloads: '5.6k', tags: ['Fantasy', 'Weapons', 'Props'] },
  { id: '7', title: 'Water Shader Pro', author: 'ShaderLab', price: '$25.00', rating: 5.0, type: 'Script', image: 'https://picsum.photos/seed/water/600/400', description: 'Advanced water shader with depth, refraction, and foam.', downloads: '9.8k', tags: ['Shader', 'Water', 'VFX'] },
  { id: '8', title: 'Urban Decals', author: 'CityScape', price: 'Free', rating: 4.3, type: 'Texture', image: 'https://picsum.photos/seed/urban/600/400', description: 'Grime, graffiti, and damage decals for urban environments.', downloads: '22.1k', tags: ['Decals', 'Urban', 'Grime'] },
  { id: '9', title: 'Toon Shading Material', author: 'AnimeDev', price: 'Free', rating: 4.9, type: 'Texture', image: 'https://picsum.photos/seed/toon/600/400', description: 'Cel-shading material setup for anime-style rendering.', downloads: '31.4k', tags: ['Toon', 'Anime', 'Material'] },
  { id: '10', title: 'Zombie Animation Pack', author: 'MocapStudio', price: '$30.00', rating: 4.4, type: '3D Model', image: 'https://picsum.photos/seed/zombie/600/400', description: '50+ motion captured zombie animations.', downloads: '2.1k', tags: ['Animation', 'Zombie', 'Mocap'] },
];

const AssetStore: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Popular');
  
  const [priceFilters, setPriceFilters] = useState({
    free: false,
    paid: false,
    onSale: false
  });

  const [selectedAsset, setSelectedAsset] = useState<StoreAsset | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const handleAddToCart = (asset: StoreAsset) => {
    setToastMessage(`Added "${asset.title}" to project!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const newFavs = new Set(prev);
      if (newFavs.has(id)) {
        newFavs.delete(id);
      } else {
        newFavs.add(id);
      }
      return newFavs;
    });
  };

  const categories = [
    { name: 'All', icon: Package },
    { name: '3D Models', icon: Box },
    { name: 'Textures', icon: ImageIcon },
    { name: 'Scripts', icon: FileCode },
    { name: 'Audio', icon: Star } // Using Star as placeholder for Audio icon
  ];

  let filteredAssets = MOCK_STORE_ASSETS.filter(asset => {
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'All' || 
                            (activeCategory === '3D Models' && asset.type === '3D Model') ||
                            (activeCategory === 'Textures' && asset.type === 'Texture') ||
                            (activeCategory === 'Scripts' && asset.type === 'Script') ||
                            (activeCategory === 'Audio' && asset.type === 'Audio');
                            
    let matchesPrice = true;
    if (priceFilters.free || priceFilters.paid) {
      const isFree = asset.price === 'Free';
      matchesPrice = (priceFilters.free && isFree) || (priceFilters.paid && !isFree);
    }
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Apply sorting
  if (sortBy === 'Rating') {
    filteredAssets.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'Price: Low to High') {
    filteredAssets.sort((a, b) => {
      const priceA = a.price === 'Free' ? 0 : parseFloat(a.price.replace('$', ''));
      const priceB = b.price === 'Free' ? 0 : parseFloat(b.price.replace('$', ''));
      return priceA - priceB;
    });
  } else if (sortBy === 'Price: High to Low') {
    filteredAssets.sort((a, b) => {
      const priceA = a.price === 'Free' ? 0 : parseFloat(a.price.replace('$', ''));
      const priceB = b.price === 'Free' ? 0 : parseFloat(b.price.replace('$', ''));
      return priceB - priceA;
    });
  }

  const getTypeIcon = (type: string) => {
    switch(type) {
      case '3D Model': return <Box size={14} className="text-blue-400" />;
      case 'Texture': return <ImageIcon size={14} className="text-green-400" />;
      case 'Script': return <FileCode size={14} className="text-yellow-400" />;
      default: return <Package size={14} className="text-purple-400" />;
    }
  };

  const featuredAsset = MOCK_STORE_ASSETS[0];

  return (
    <div className="w-full h-full flex flex-col bg-[#111] text-editor-text font-sans">
      {/* Header / Search Bar */}
      <div className="h-10 border-b border-editor-border bg-editor-panel flex items-center px-4 gap-3 shrink-0 shadow-sm z-10">
        <div className="flex-1 max-w-2xl relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-editor-textDim" />
          <input 
            type="text" 
            placeholder="Search for assets, creators, or tags..." 
            className="w-full bg-[#1e1e1e] border border-editor-border rounded py-1 pl-8 pr-3 text-xs text-white placeholder:text-editor-textDim focus:outline-none focus:border-editor-accent transition-colors shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] border border-editor-border text-editor-text rounded text-xs hover:bg-white/5 transition-colors">
              <span>Sort: {sortBy}</span>
              <ChevronDown size={12} />
            </button>
            <div className="absolute right-0 top-full mt-1 w-40 bg-editor-panel border border-editor-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
              {['Popular', 'Rating', 'Price: Low to High', 'Price: High to Low'].map(option => (
                <button 
                  key={option}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-editor-accent hover:text-white transition-colors ${sortBy === option ? 'text-white bg-white/5' : 'text-editor-textDim'}`}
                  onClick={() => setSortBy(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button 
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors shadow-md ${showSidebar ? 'bg-editor-accent text-white hover:bg-editor-accent/90' : 'bg-[#1e1e1e] border border-editor-border text-editor-text hover:bg-white/5'}`}
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <Filter size={12} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Categories */}
        {showSidebar && (
          <div className="w-40 border-r border-editor-border bg-editor-panel/30 p-2 flex flex-col gap-0.5 shrink-0 overflow-y-auto animate-in slide-in-from-left-4 duration-200">
            <h3 className="text-[10px] font-semibold text-editor-textDim uppercase tracking-wider mb-2 px-2 mt-1">Categories</h3>
          {categories.map(cat => (
            <button
              key={cat.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${
                activeCategory === cat.name 
                  ? 'bg-editor-accent/20 text-editor-accent font-medium shadow-sm' 
                  : 'text-editor-text hover:bg-white/5 hover:text-white'
              }`}
              onClick={() => setActiveCategory(cat.name)}
            >
              <cat.icon size={14} className={activeCategory === cat.name ? 'text-editor-accent' : 'text-editor-textDim'} />
              {cat.name}
            </button>
          ))}
          
          <div className="mt-4">
            <h3 className="text-[10px] font-semibold text-editor-textDim uppercase tracking-wider mb-2 px-2">Price</h3>
            <div className="px-2 flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs text-editor-text hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={priceFilters.free}
                  onChange={(e) => setPriceFilters({...priceFilters, free: e.target.checked})}
                  className="rounded border-editor-border bg-[#1e1e1e] text-editor-accent focus:ring-editor-accent focus:ring-offset-0 w-3 h-3" 
                />
                Free Assets
              </label>
              <label className="flex items-center gap-1.5 text-xs text-editor-text hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={priceFilters.paid}
                  onChange={(e) => setPriceFilters({...priceFilters, paid: e.target.checked})}
                  className="rounded border-editor-border bg-[#1e1e1e] text-editor-accent focus:ring-editor-accent focus:ring-offset-0 w-3 h-3" 
                />
                Paid Assets
              </label>
              <label className="flex items-center gap-1.5 text-xs text-editor-text hover:text-white cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={priceFilters.onSale}
                  onChange={(e) => setPriceFilters({...priceFilters, onSale: e.target.checked})}
                  className="rounded border-editor-border bg-[#1e1e1e] text-editor-accent focus:ring-editor-accent focus:ring-offset-0 w-3 h-3" 
                />
                On Sale
              </label>
            </div>
          </div>
        </div>
        )}

        {/* Asset Grid */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#111]">
          
          {/* Featured Banner (Only show if 'All' is selected and no search) */}
          {activeCategory === 'All' && !searchQuery && (
            <div className="mb-4 rounded-lg overflow-hidden relative h-40 group cursor-pointer border border-editor-border hover:border-editor-accent/50 transition-colors">
              <img src={featuredAsset.image} alt="Featured" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                <div className="inline-block px-1.5 py-0.5 bg-editor-accent text-white text-[9px] font-bold uppercase tracking-wider rounded w-max mb-2">Featured</div>
                <h2 className="text-lg font-bold text-white mb-1">{featuredAsset.title}</h2>
                <p className="text-xs text-editor-textDim max-w-2xl mb-3 line-clamp-2">{featuredAsset.description}</p>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-3 py-1.5 bg-editor-accent text-white rounded text-xs font-medium hover:bg-editor-accent/90 transition-colors flex items-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(featuredAsset);
                    }}
                  >
                    <Download size={12} />
                    Get Now - {featuredAsset.price}
                  </button>
                  <button 
                    className="px-3 py-1.5 bg-white/10 text-white rounded text-xs font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAsset(featuredAsset);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">
              {searchQuery ? `Search Results for "${searchQuery}"` : activeCategory === 'All' ? 'Trending Assets' : `${activeCategory} Assets`}
            </h2>
            <span className="text-xs text-editor-textDim">{filteredAssets.length} results</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="bg-editor-panel border border-editor-border rounded-lg overflow-hidden hover:border-editor-accent/50 hover:shadow-lg hover:shadow-editor-accent/5 transition-all duration-300 group flex flex-col">
                
                {/* Image Container */}
                <div className="h-28 relative overflow-hidden bg-[#1e1e1e]">
                  <img 
                    src={asset.image} 
                    alt={asset.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                    {asset.price === 'Free' && (
                      <div className="bg-emerald-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider shadow-sm">
                        Free
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-semibold text-white border border-white/10 shadow-sm">
                    {asset.price}
                  </div>

                  {/* Hover Overlay Actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button 
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-editor-accent text-white flex items-center justify-center backdrop-blur-md transition-colors" 
                      title="Quick View"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      className={`w-7 h-7 rounded-full hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-md transition-colors ${favorites.has(asset.id) ? 'bg-red-500' : 'bg-white/20'}`} 
                      title="Add to Favorites"
                      onClick={(e) => toggleFavorite(asset.id, e)}
                    >
                      <Heart size={14} fill={favorites.has(asset.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-2 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <h4 className="font-semibold text-white text-xs line-clamp-1 group-hover:text-editor-accent transition-colors" title={asset.title}>{asset.title}</h4>
                  </div>
                  <div className="text-[10px] text-editor-textDim mb-2 hover:text-white cursor-pointer transition-colors w-max">{asset.author}</div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {asset.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-1 py-0.5 bg-[#1e1e1e] border border-editor-border rounded text-[8px] text-editor-textDim uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 2 && (
                      <span className="px-1 py-0.5 bg-[#1e1e1e] border border-editor-border rounded text-[8px] text-editor-textDim uppercase tracking-wider">
                        +{asset.tags.length - 2}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-2 border-t border-editor-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getTypeIcon(asset.type)}
                      <span className="text-[10px] text-editor-textDim font-medium">{asset.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-editor-textDim" title={`${asset.downloads} downloads`}>
                        <ArrowDownToLine size={10} />
                        <span className="text-[9px]">{asset.downloads}</span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={10} fill="currentColor" />
                        <span className="text-[10px] font-bold text-white">{asset.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-2 pb-2 pt-0">
                  <button 
                    className="w-full py-1.5 bg-[#1e1e1e] border border-editor-border hover:bg-editor-accent hover:border-editor-accent text-white rounded text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 group/btn"
                    onClick={() => handleAddToCart(asset)}
                  >
                    <Download size={12} className="group-hover/btn:-translate-y-0.5 transition-transform" />
                    <span>Add to Project</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredAssets.length === 0 && (
            <div className="w-full h-40 flex flex-col items-center justify-center text-editor-textDim bg-editor-panel/30 rounded-lg border border-editor-border border-dashed mt-4">
              <Package size={32} className="mb-2 opacity-20" />
              <p className="text-sm font-medium text-white mb-1">No assets found</p>
              <p className="text-xs">Try adjusting your search or filters to find what you're looking for.</p>
              <button 
                className="mt-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs transition-colors"
                onClick={() => { 
                  setSearchQuery(''); 
                  setActiveCategory('All'); 
                  setPriceFilters({ free: false, paid: false, onSale: false });
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Asset Details Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-editor-panel border border-editor-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 border-b border-editor-border">
              <h2 className="text-lg font-bold text-white">{selectedAsset.title}</h2>
              <button 
                onClick={() => setSelectedAsset(null)}
                className="p-1.5 text-editor-textDim hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
              {/* Image Section */}
              <div className="w-full md:w-1/2 bg-[#111] p-4 flex items-center justify-center border-r border-editor-border">
                <img 
                  src={selectedAsset.image} 
                  alt={selectedAsset.title} 
                  className="max-w-full max-h-[300px] object-contain rounded shadow-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Details Section */}
              <div className="w-full md:w-1/2 p-4 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl font-bold text-white">{selectedAsset.price}</span>
                    <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-bold">{selectedAsset.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-editor-textDim text-xs">Created by <span className="text-editor-accent hover:underline cursor-pointer">{selectedAsset.author}</span></p>
                </div>
                
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1.5">Description</h3>
                  <p className="text-editor-text leading-relaxed text-xs">
                    {selectedAsset.description}
                    <br/><br/>
                    This is a detailed description of the asset. It includes all the necessary information about what is included in the package, technical details, and compatibility information.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1e1e1e] p-2 rounded border border-editor-border">
                    <div className="text-[10px] text-editor-textDim mb-1">Asset Type</div>
                    <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                      {getTypeIcon(selectedAsset.type)}
                      {selectedAsset.type}
                    </div>
                  </div>
                  <div className="bg-[#1e1e1e] p-2 rounded border border-editor-border">
                    <div className="text-[10px] text-editor-textDim mb-1">Downloads</div>
                    <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                      <ArrowDownToLine size={12} className="text-editor-textDim" />
                      {selectedAsset.downloads}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1.5">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAsset.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-[#1e1e1e] border border-editor-border rounded text-[10px] text-editor-textDim hover:text-white hover:border-editor-accent cursor-pointer transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mt-auto pt-4 flex gap-2">
                  <button 
                    onClick={() => {
                      handleAddToCart(selectedAsset);
                      setSelectedAsset(null);
                    }}
                    className="flex-1 py-2 bg-editor-accent text-white rounded font-medium hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-editor-accent/20"
                  >
                    <Download size={14} />
                    Add to Project
                  </button>
                  <button 
                    className={`p-2 border rounded transition-colors ${favorites.has(selectedAsset.id) ? 'bg-red-500 border-red-500 text-white' : 'bg-[#1e1e1e] border-editor-border text-editor-text hover:text-white hover:border-white/20'}`}
                    onClick={() => toggleFavorite(selectedAsset.id)}
                  >
                    <Heart size={16} fill={favorites.has(selectedAsset.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-500 text-white px-3 py-2 rounded shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-white/20 rounded-full p-0.5">
            <Check size={14} />
          </div>
          <span className="font-medium text-xs">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default AssetStore;

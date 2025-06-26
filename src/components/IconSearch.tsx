import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Heart, Grid3X3, List, ChevronLeft, ChevronRight, Loader2, Save, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessedIcon {
  id: string;
  prefix: string;
  name: string;
}

const IconSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const iconsPerPage = 50;

  // Search for icons using Iconify API
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['iconify-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      console.log('Searching for icons:', searchQuery);
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=200`);
      
      if (!response.ok) {
        throw new Error('Failed to search icons');
      }
      
      const data = await response.json();
      console.log('Raw search results:', data);
      
      // Transform string array to objects
      const iconObjects: ProcessedIcon[] = (data.icons || []).map((iconId: string) => {
        const [prefix, name] = iconId.split(':');
        return {
          id: iconId,
          prefix: prefix || 'unknown',
          name: name || 'unknown'
        };
      });
      
      console.log('Processed icon objects:', iconObjects.length);
      return iconObjects;
    },
    enabled: searchQuery.trim().length > 0,
  });

  const toggleIconSelection = (iconId: string) => {
    const newSelected = new Set(selectedIcons);
    if (newSelected.has(iconId)) {
      newSelected.delete(iconId);
    } else {
      newSelected.add(iconId);
    }
    setSelectedIcons(newSelected);
  };

  const downloadIcon = async (iconId: string) => {
    try {
      // Fetch SVG from CDN
      const response = await fetch(`https://api.iconify.design/${iconId}.svg?width=48&height=48`);
      if (!response.ok) throw new Error('Failed to fetch icon');
      
      const svgContent = await response.text();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${iconId.replace(':', '-')}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${iconId}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download icon');
    }
  };

  const saveIconToRepository = async (iconId: string) => {
    try {
      // Fetch SVG from CDN at 48x48
      const response = await fetch(`https://api.iconify.design/${iconId}.svg?width=48&height=48`);
      if (!response.ok) throw new Error('Failed to fetch icon');
      
      const svgContent = await response.text();
      const [prefix, name] = iconId.split(':');
      
      const { error } = await supabase
        .from('icons')
        .insert({
          name: name,
          svg_content: svgContent,
          category: prefix,
          keywords: [searchQuery.trim()],
          dimensions: { width: 48, height: 48 },
          file_size: new Blob([svgContent]).size,
          author: 'Iconify',
          license: 'Various (see Iconify)',
        });

      if (error) {
        console.error('Save error:', error);
        toast.error('Failed to save icon to repository');
      } else {
        toast.success('Icon saved to your repository!');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save icon');
    }
  };

  const saveAllPageIcons = async () => {
    if (!paginatedIcons.length) return;
    
    setIsSavingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      toast.info(`Saving ${paginatedIcons.length} icons to repository...`);

      for (const icon of paginatedIcons) {
        try {
          // Fetch SVG from CDN at 48x48
          const response = await fetch(`https://api.iconify.design/${icon.id}.svg?width=48&height=48`);
          if (!response.ok) throw new Error('Failed to fetch icon');
          
          const svgContent = await response.text();
          
          const { error } = await supabase
            .from('icons')
            .insert({
              name: icon.name,
              svg_content: svgContent,
              category: icon.prefix,
              keywords: [searchQuery.trim()],
              dimensions: { width: 48, height: 48 },
              file_size: new Blob([svgContent]).size,
              author: 'Iconify',
              license: 'Various (see Iconify)',
            });

          if (error) {
            console.error('Save error for', icon.id, ':', error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Save error for', icon.id, ':', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully saved ${successCount} icons to repository!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to save ${errorCount} icons`);
      }
    } catch (error) {
      console.error('Batch save error:', error);
      toast.error('Failed to save icons');
    } finally {
      setIsSavingAll(false);
    }
  };

  const copyIcon = async (iconId: string) => {
    try {
      // Fetch SVG from CDN at 48x48
      const response = await fetch(`https://api.iconify.design/${iconId}.svg?width=48&height=48`);
      if (!response.ok) throw new Error('Failed to fetch icon');
      
      const svgContent = await response.text();
      await navigator.clipboard.writeText(svgContent);
      
      toast.success(`Copied ${iconId} SVG to clipboard`);
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Failed to copy icon');
    }
  };

  const IconifyIcon = ({ iconId, className = "" }: { iconId: string; className?: string }) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    if (!iconId || !iconId.includes(':')) {
      return (
        <div className="w-12 h-12 flex items-center justify-center bg-red-100 rounded">
          <div className="w-6 h-6 bg-red-300 rounded"></div>
        </div>
      );
    }

    if (imgError) {
      return (
        <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
        </div>
      );
    }

    return (
      <div className={`w-12 h-12 flex items-center justify-center ${className}`}>
        {!imgLoaded && (
          <div className="w-6 h-6 bg-gray-200 animate-pulse rounded"></div>
        )}
        <img
          src={`https://api.iconify.design/${iconId}.svg?width=48&height=48`}
          alt={iconId}
          className={`w-full h-full ${imgLoaded ? 'block' : 'hidden'}`}
          onLoad={() => {
            setImgLoaded(true);
            console.log(`Icon loaded: ${iconId}`);
          }}
          onError={() => {
            setImgError(true);
            console.error(`Failed to load icon: ${iconId}`);
          }}
        />
      </div>
    );
  };

  const paginatedIcons = searchResults?.slice(
    (currentPage - 1) * iconsPerPage,
    currentPage * iconsPerPage
  ) || [];

  const totalPages = Math.ceil((searchResults?.length || 0) / iconsPerPage);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-4 items-center max-w-2xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search for icons (e.g., home, user, settings)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-2 text-lg">Searching icons...</span>
        </div>
      )}

      {/* Results */}
      {searchResults && searchResults.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Found {searchResults.length} icons • Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              {paginatedIcons.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveAllPageIcons}
                  disabled={isSavingAll}
                >
                  {isSavingAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save All on Page ({paginatedIcons.length})
                </Button>
              )}
              {selectedIcons.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectedIcons.forEach(iconId => downloadIcon(iconId));
                      setSelectedIcons(new Set());
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Selected ({selectedIcons.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      selectedIcons.forEach(iconId => saveIconToRepository(iconId));
                      setSelectedIcons(new Set());
                    }}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Save Selected ({selectedIcons.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
            : "space-y-2"
          }>
            {paginatedIcons.map((icon: ProcessedIcon) => {
              const isSelected = selectedIcons.has(icon.id);
              
              return (
                <Card 
                  key={icon.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:shadow-md'
                  } ${viewMode === 'list' ? 'p-4' : 'p-3'}`}
                  onClick={() => toggleIconSelection(icon.id)}
                >
                  <CardContent className={`p-0 ${viewMode === 'list' ? 'flex items-center gap-4' : 'text-center'}`}>
                    <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-2'} flex justify-center`}>
                      <IconifyIcon iconId={icon.id} />
                    </div>
                    <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                      <p className={`font-medium text-gray-900 ${viewMode === 'list' ? 'text-left' : 'text-xs'} truncate`}>
                        {icon.name}
                      </p>
                      {viewMode === 'list' && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {icon.prefix}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {viewMode === 'list' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyIcon(icon.id);
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadIcon(icon.id);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveIconToRepository(icon.id);
                          }}
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {searchQuery && searchResults && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No icons found</h3>
          <p className="text-gray-600">Try searching with different keywords</p>
        </div>
      )}

      {/* Empty State */}
      {!searchQuery && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Start searching for icons</h3>
          <p className="text-gray-600">Enter keywords like "home", "user", "settings" to find perfect icons</p>
        </div>
      )}
    </div>
  );
};

export default IconSearch;

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Trash2, Grid3X3, List, Eye, Copy } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface SavedIcon {
  id: string;
  name: string;
  svg_content: string;
  iconify_id?: string;
  category?: string;
  keywords?: string[];
  dimensions?: Json;
  file_size?: number;
  author?: string;
  downloads_count?: number;
  created_at: string;
}

const SavedIcons = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [lastClickedIcon, setLastClickedIcon] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch saved icons
  const { data: savedIcons, isLoading } = useQuery({
    queryKey: ['saved-icons', searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('icons')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,keywords.cs.{${searchQuery}}`);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching saved icons:', error);
        throw error;
      }
      
      return data as SavedIcon[];
    },
  });

  // Get unique categories
  const { data: categories } = useQuery({
    queryKey: ['icon-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('icons')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(item => item.category))].filter(Boolean);
      return uniqueCategories as string[];
    },
  });

  // Delete icon mutation
  const deleteIconMutation = useMutation({
    mutationFn: async (iconId: string) => {
      const { error } = await supabase
        .from('icons')
        .delete()
        .eq('id', iconId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-icons'] });
      toast.success('Icon deleted from repository');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete icon');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (iconIds: string[]) => {
      const { error } = await supabase
        .from('icons')
        .delete()
        .in('id', iconIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-icons'] });
      setSelectedIcons(new Set());
      toast.success('Selected icons deleted from repository');
    },
    onError: (error) => {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete selected icons');
    },
  });

  const handleIconClick = (iconId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (event.shiftKey && lastClickedIcon && savedIcons) {
      // Range selection: select all icons between lastClickedIcon and current
      const lastIndex = savedIcons.findIndex(icon => icon.id === lastClickedIcon);
      const currentIndex = savedIcons.findIndex(icon => icon.id === iconId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        
        const newSelected = new Set(selectedIcons);
        for (let i = startIndex; i <= endIndex; i++) {
          newSelected.add(savedIcons[i].id);
        }
        setSelectedIcons(newSelected);
      }
    } else {
      // Regular click: toggle selection and set as last clicked
      const newSelected = new Set(selectedIcons);
      if (newSelected.has(iconId)) {
        newSelected.delete(iconId);
      } else {
        newSelected.add(iconId);
      }
      setSelectedIcons(newSelected);
      setLastClickedIcon(iconId);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIcons.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedIcons));
    }
  };

  const clearSelection = () => {
    setSelectedIcons(new Set());
  };

  const copyIcon = async (icon: SavedIcon) => {
    try {
      await navigator.clipboard.writeText(icon.svg_content);
      toast.success(`Copied ${icon.name} to clipboard`);
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Failed to copy icon');
    }
  };

  const downloadIcon = async (icon: SavedIcon) => {
    try {
      const blob = new Blob([icon.svg_content], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${icon.name}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update download count
      await supabase
        .from('icons')
        .update({ downloads_count: (icon.downloads_count || 0) + 1 })
        .eq('id', icon.id);

      toast.success(`Downloaded ${icon.name}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download icon');
    }
  };

  const renderIcon = (icon: SavedIcon) => {
    return (
      <div 
        className="w-12 h-12 flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: icon.svg_content }}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search your icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {categories?.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
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

      {/* Stats and Bulk Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{savedIcons?.length || 0} icons saved</span>
          {selectedCategory !== 'all' && <span>• Filtered by {selectedCategory}</span>}
          {selectedIcons.size > 0 && <span>• {selectedIcons.size} selected</span>}
        </div>
        
        {selectedIcons.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected ({selectedIcons.size})
            </Button>
          </div>
        )}
      </div>

      {/* Icons Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Loading your icons...</p>
          </div>
        </div>
      ) : savedIcons && savedIcons.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4"
          : "space-y-2"
        }>
          {savedIcons.map((icon) => (
            <Card 
              key={icon.id}
              className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-purple-100 ${
                selectedIcons.has(icon.id) ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}
              onClick={(e) => handleIconClick(icon.id, e)}
            >
              <CardContent className={`p-3 ${viewMode === 'list' ? 'flex items-center gap-4' : 'text-center'}`}>
                <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'mb-2'} flex justify-center`}>
                  {renderIcon(icon)}
                </div>
                
                <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                  <p className={`font-medium text-gray-900 ${viewMode === 'list' ? 'text-left' : 'text-xs'} truncate`}>
                    {icon.name}
                  </p>
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center gap-2 mt-1">
                      {icon.category && (
                        <Badge variant="secondary" className="text-xs">
                          {icon.category}
                        </Badge>
                      )}
                      {icon.downloads_count && icon.downloads_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {icon.downloads_count} downloads
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className={`${viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100 transition-opacity mt-2' : ''} flex gap-1 ${viewMode === 'list' ? 'flex-row' : 'justify-center'}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyIcon(icon);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadIcon(icon);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIconMutation.mutate(icon.id);
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No icons saved yet</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'No icons match your search' : 'Start building your icon collection by searching and saving icons'}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedIcons;

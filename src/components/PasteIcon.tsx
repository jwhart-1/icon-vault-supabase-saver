
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PasteIcon = () => {
  const [svgContent, setSvgContent] = useState('');
  const [iconName, setIconName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [previewSvg, setPreviewSvg] = useState('');
  const [isValid, setIsValid] = useState(false);
  const queryClient = useQueryClient();

  // Get unique categories from existing icons
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

  const validateSvg = (svg: string) => {
    const trimmedSvg = svg.trim();
    if (!trimmedSvg) {
      setIsValid(false);
      setPreviewSvg('');
      return;
    }

    // Remove XML declaration if present for better HTML compatibility
    let cleanedSvg = trimmedSvg.replace(/<\?xml[^>]*\?>\s*/, '');

    // Basic SVG validation
    const isSvg = cleanedSvg.toLowerCase().includes('<svg') && cleanedSvg.toLowerCase().includes('</svg>');
    if (isSvg) {
      // For preview, change white fills to black for better visibility
      const previewSvg = cleanedSvg
        .replace(/fill="#FFFFFF"/gi, 'fill="#000000"')
        .replace(/fill="white"/gi, 'fill="black"')
        .replace(/fill="#FFF"/gi, 'fill="#000000"');
      
      setIsValid(true);
      setPreviewSvg(previewSvg);
      
      // Try to extract name from SVG if name field is empty
      if (!iconName) {
        const match = cleanedSvg.match(/id="([^"]+)"/);
        if (match) {
          setIconName(match[1]);
        }
      }
    } else {
      setIsValid(false);
      setPreviewSvg('');
    }
  };

  const handleSvgChange = (value: string) => {
    setSvgContent(value);
    validateSvg(value);
  };

  const saveIconMutation = useMutation({
    mutationFn: async () => {
      if (!svgContent.trim() || !iconName.trim()) {
        throw new Error('SVG content and icon name are required');
      }

      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(Boolean);
      
      // Calculate file size
      const fileSize = new Blob([svgContent]).size;
      
      // Try to extract dimensions from SVG
      let dimensions = null;
      const widthMatch = svgContent.match(/width="([^"]+)"/);
      const heightMatch = svgContent.match(/height="([^"]+)"/);
      const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
      
      if (widthMatch && heightMatch) {
        dimensions = { 
          width: parseInt(widthMatch[1]) || 24, 
          height: parseInt(heightMatch[1]) || 24 
        };
      } else if (viewBoxMatch) {
        const viewBox = viewBoxMatch[1].split(' ');
        if (viewBox.length === 4) {
          dimensions = { 
            width: parseInt(viewBox[2]) || 24, 
            height: parseInt(viewBox[3]) || 24 
          };
        }
      }

      const finalCategory = category === 'custom' ? customCategory.trim() : category.trim();
      
      const { error } = await supabase
        .from('icons')
        .insert({
          name: iconName.trim(),
          svg_content: svgContent.trim(),
          category: finalCategory || 'custom',
          keywords: keywordsArray.length > 0 ? keywordsArray : null,
          dimensions: dimensions,
          file_size: fileSize,
          author: 'Custom',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-icons'] });
      toast.success('Icon saved to repository!');
      
      // Clear form
      setSvgContent('');
      setIconName('');
      setCategory('');
      setCustomCategory('');
      setKeywords('');
      setPreviewSvg('');
      setIsValid(false);
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save icon: ' + error.message);
    },
  });

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleSvgChange(text);
      toast.success('Pasted from clipboard');
    } catch (error) {
      console.error('Paste error:', error);
      toast.error('Failed to paste from clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Custom Icon</h2>
        <p className="text-gray-600">Paste your SVG code and save it to your repository</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Icon Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon Name *
              </label>
              <Input
                placeholder="e.g., custom-heart, my-logo"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {category === 'custom' && (
                <Input
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (comma-separated)
              </label>
              <Input
                placeholder="e.g., heart, love, favorite"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  SVG Content *
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteFromClipboard}
                >
                  Paste from Clipboard
                </Button>
              </div>
              <Textarea
                placeholder="Paste your SVG code here..."
                value={svgContent}
                onChange={(e) => handleSvgChange(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              
              {svgContent && (
                <div className="flex items-center gap-2 mt-2">
                  {isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Valid SVG</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">Invalid or incomplete SVG</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={() => saveIconMutation.mutate()}
              disabled={!isValid || !iconName.trim() || saveIconMutation.isPending}
              className="w-full"
            >
              {saveIconMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Repository
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewSvg ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
                  <div
                    className="w-16 h-16 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-16 [&>svg]:max-h-16"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{iconName || 'Untitled'}</span>
                  </div>
                  {(category && category !== 'custom') || (category === 'custom' && customCategory) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Category:</span>
                      <Badge variant="secondary" className="text-xs">
                        {category === 'custom' ? customCategory : category}
                      </Badge>
                    </div>
                  ) : null}
                  {keywords && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Keywords:</span>
                      <div className="flex flex-wrap gap-1">
                        {keywords.split(',').map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg text-gray-400">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-2" />
                  <p>Paste SVG content to see preview</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PasteIcon;

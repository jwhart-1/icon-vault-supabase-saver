
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Heart, Grid3X3, List, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IconSearch from '@/components/IconSearch';
import SavedIcons from '@/components/SavedIcons';
import PasteIcon from '@/components/PasteIcon';

const Index = () => {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Icon Vault
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Search thousands of icons from Iconify, save your favorites, and build your personal icon repository
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Icons
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              My Icons
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Icon
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <IconSearch />
          </TabsContent>

          <TabsContent value="saved">
            <SavedIcons />
          </TabsContent>

          <TabsContent value="add">
            <PasteIcon />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

import React from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
  isDark?: boolean;
}

export default function ImagePreviewModal({ imageUrl, onClose, isDark = false }: ImagePreviewModalProps) {
  const [zoom, setZoom] = React.useState(1);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full text-sm">
        {Math.round(zoom * 100)}%
      </div>

      {/* Image */}
      <img
        src={imageUrl}
        alt="Preview"
        className="max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-200 rounded-lg shadow-2xl"
        style={{ transform: `scale(${zoom})` }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

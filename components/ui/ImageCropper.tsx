import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedFile) {
        onCropComplete(croppedFile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl flex flex-col h-[80vh] max-h-[800px]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-gray-900 text-lg">Crop cover image</h3>
            <p className="text-sm text-gray-500">Drag to re-position. Scroll to zoom.</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative flex-1 bg-gray-900 w-full">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-[#00EFFE] hover:bg-[#00D4E0] text-[#0A0A0A] font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? "Cropping..." : "Confirm Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}

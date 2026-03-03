import { useRef, useState, useCallback } from 'react';
import { Upload, X, Loader2, Crop as CropIcon } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { Modal } from '@/components/Modal';

interface ImageUploadProps {
    currentUrl?: string | null;
    onUploaded: (url: string) => void;
    label?: string;
    className?: string;
}

export function ImageUpload({
    currentUrl,
    onUploaded,
    label = 'Upload Image',
    className = '',
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const processAndUpload = async () => {
        if (!cropModalSrc || !croppedAreaPixels) return;
        setIsCropping(true);
        setError('');

        try {
            const croppedImageFile = await getCroppedImg(cropModalSrc, croppedAreaPixels);
            if (!croppedImageFile) throw new Error("Could not process cropping");

            setUploading(true);
            setCropModalSrc(null); // Close modal

            const objectUrl = URL.createObjectURL(croppedImageFile);
            setPreview(objectUrl);

            const res = await mediaApi.upload(croppedImageFile as File);
            if (res.success) {
                onUploaded(res.url);
                setPreview(res.url);
            } else {
                throw new Error("Upload response not successful");
            }
        } catch (e) {
            setError((e as Error).message);
            setPreview(currentUrl ?? null);
        } finally {
            setUploading(false);
            setIsCropping(false);
        }
    };

    const handleFile = (file: File) => {
        setError('');
        const objectUrl = URL.createObjectURL(file);
        setCropModalSrc(objectUrl);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    };

    const handleClear = () => {
        setPreview(null);
        onUploaded('');
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <p className="text-sm font-medium text-foreground">{label}</p>}

            {preview ? (
                // Preview state
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border group">
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="px-3 py-1.5 bg-white text-xs font-medium rounded-lg text-gray-900 hover:bg-gray-100"
                        >
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1.5 bg-red-500 rounded-lg text-white hover:bg-red-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                // Drop zone
                <div
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                >
                    {uploading ? (
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                    ) : (
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    )}
                    <p className="text-xs text-muted-foreground">
                        {uploading ? 'Uploading...' : 'Click or drag & drop to upload'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">JPG, PNG, WEBP up to 10MB</p>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                }}
            />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Modal isOpen={!!cropModalSrc} onClose={() => setCropModalSrc(null)} title="Crop Image" size="xl">
                <div className="space-y-4">
                    <div className="relative h-[400px] w-full bg-black/10 rounded-xl overflow-hidden">
                        {cropModalSrc && (
                            <Cropper
                                image={cropModalSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Assuming 1:1 ratio for avatars
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>
                    <div>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setCropModalSrc(null)} disabled={isCropping} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
                        <button type="button" onClick={processAndUpload} disabled={isCropping} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
                            {isCropping ? 'Cropping...' : 'Crop & Upload'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

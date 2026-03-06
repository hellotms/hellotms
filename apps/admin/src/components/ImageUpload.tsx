import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Crop as CropIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { Modal } from '@/components/Modal';

interface ImageUploadProps {
    value?: string | File | null;
    onChange: (value: string | File | null) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    aspect?: number;
    guide?: string;
    noCrop?: boolean;
}

export function ImageUpload({
    value,
    onChange,
    label = 'Upload Image',
    className = '',
    disabled = false,
    aspect = 1,
    guide,
    noCrop = false,
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!value) {
            setPreview(null);
        } else if (typeof value === 'string') {
            setPreview(value);
        } else if (value instanceof File) {
            const objectUrl = URL.createObjectURL(value);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [value]);

    const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCropComplete = async () => {
        if (!cropModalSrc || !croppedAreaPixels) return;
        setIsCropping(true);
        setError('');

        try {
            const croppedImageFile = await getCroppedImg(cropModalSrc, croppedAreaPixels);
            if (!croppedImageFile) throw new Error("Could not process cropping");

            // We generate a proper File object instead of a Blob
            const file = new File([croppedImageFile], "cropped_image.jpeg", {
                type: croppedImageFile.type,
                lastModified: Date.now(),
            });

            onChange(file);
            setCropModalSrc(null); // Close modal
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsCropping(false);
        }
    };

    const handleFile = async (file: File) => {
        setError('');
        if (noCrop) {
            setUploading(true);
            try {
                const { compressToHD } = await import('@/lib/compressImage');
                const compressed = await compressToHD(file);
                onChange(compressed);
            } catch (e) {
                setError("Compression failed");
                onChange(file); // Fallback to original
            } finally {
                setUploading(false);
            }
        } else {
            const objectUrl = URL.createObjectURL(file);
            setCropModalSrc(objectUrl);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    };

    const handleClear = () => {
        onChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <p className="text-sm font-medium text-foreground">{label}</p>}

            {preview ? (
                // Preview state
                <div
                    className={`relative w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border border-border group ${disabled ? 'opacity-70 grayscale-[0.2]' : ''}`}
                    style={{ aspectRatio: aspect ? `${aspect}` : '1/1', height: !aspect ? '160px' : 'auto', maxHeight: '200px' }}
                >
                    <img src={preview} alt="preview" className="w-full h-full object-contain bg-muted/20" />
                    {!disabled && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="px-3 py-1.5 bg-white dark:bg-[#1c1c1c] text-xs font-medium rounded-lg text-foreground hover:bg-gray-100"
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
                    )}
                    {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                // Drop zone
                <div
                    onClick={() => !disabled && inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`flex flex-col items-center justify-center h-36 border-2 border-dashed border-border rounded-xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'}`}
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
                    {guide && <p className="text-[10px] text-primary/60 mt-1 font-medium">{guide}</p>}
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
                                aspect={aspect}
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
                        <button type="button" onClick={handleCropComplete} disabled={isCropping} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
                            {isCropping ? 'Cropping...' : 'Crop & Save'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

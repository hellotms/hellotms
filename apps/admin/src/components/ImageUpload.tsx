import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ImageUploadProps {
    bucket: string;           // e.g. 'project-media' or 'company-logos'
    folder: string;           // e.g. `projects/${projectId}`
    currentUrl?: string | null;
    onUploaded: (url: string) => void;
    label?: string;
    className?: string;
}

export function ImageUpload({
    bucket,
    folder,
    currentUrl,
    onUploaded,
    label = 'Upload Image',
    className = '',
}: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = async (file: File) => {
        setError('');
        setUploading(true);

        // Local preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            const ext = file.name.split('.').pop();
            const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
            if (uploadErr) throw uploadErr;
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            onUploaded(data.publicUrl);
        } catch (e) {
            setError((e as Error).message);
            setPreview(currentUrl ?? null);
        } finally {
            setUploading(false);
        }
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
                }}
            />

            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

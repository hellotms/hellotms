import { useFieldArray, Control, UseFormRegister } from 'react-hook-form';
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { cn } from '@/lib/utils';

interface HeroSliderManagerProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  watch: any;
  setValue: any;
  disabled?: boolean;
}

export function HeroSliderManager({ control, register, watch, setValue, disabled }: HeroSliderManagerProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'hero_slider',
  });

  const slides = watch('hero_slider') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Hero Image Slider</h3>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Manage the background images that rotate on your landing page hero section.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => append({ id: crypto.randomUUID(), image_url: '', order: fields.length })}
            className="flex items-center gap-2 text-[10px] font-black bg-primary/10 text-primary px-4 py-2 rounded-xl uppercase tracking-widest transition-all hover:bg-primary/20"
          >
            <Plus className="h-3 w-3" /> Add Slide
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="group bg-muted/20 border border-border p-4 rounded-2xl transition-all hover:bg-muted/30"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Preview / Upload */}
              <div className="w-full md:w-48 shrink-0">
                <ImageUpload
                  label={`Slide ${index + 1}`}
                  value={watch(`hero_slider.${index}.image_url`)}
                  onChange={(url) => setValue(`hero_slider.${index}.image_url`, url)}
                  disabled={disabled}
                  aspect={16 / 9}
                />
              </div>

              {/* Content / Controls */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Slide Title (Optional)</label>
                    <input
                      {...register(`hero_slider.${index}.title`)}
                      disabled={disabled}
                      placeholder="Enter slide title..."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Slide Subtitle (Optional)</label>
                    <input
                      {...register(`hero_slider.${index}.subtitle`)}
                      disabled={disabled}
                      placeholder="Enter slide subtitle..."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>

                {!disabled && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        className="p-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, index + 1)}
                        disabled={index === fields.length - 1}
                        className="p-2 bg-background border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="flex items-center gap-2 text-[10px] font-black text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-lg uppercase tracking-widest transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-muted/10 border border-dashed border-border rounded-3xl text-muted-foreground">
            <ImageIcon className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No slides added yet</p>
            <p className="text-[10px] uppercase tracking-widest mt-1">Background fallback will be used</p>
          </div>
        )}
      </div>
    </div>
  );
}

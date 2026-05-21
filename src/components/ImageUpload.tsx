import { useState } from "react";
import { Upload, X, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trackUsage, COSTS, bytesToGB } from "@/lib/usage-tracking";

interface PhotoObject {
  url: string;
  description: string;
}

interface Props {
  bucket: string;
  value?: string | string[] | PhotoObject[];
  onChange: (urls: any) => void;
  multiple?: boolean;
  className?: string;
  label?: string;
  withDescription?: boolean;
}

export function ImageUpload({ bucket, value, onChange, multiple = false, className, label = "Enviar imagem", withDescription = false }: Props) {
  const [uploading, setUploading] = useState(false);
  
  // Normalize values to PhotoObject[] internally if withDescription is true
  const getNormalizedValues = () => {
    if (!value) return [];
    const arr = Array.isArray(value) ? value : [value];
    
    return arr.map(item => {
      if (typeof item === "string") {
        return { url: item, description: "" };
      }
      return item as PhotoObject;
    });
  };

  const items = getNormalizedValues();

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Faça login para enviar imagens.");
        return;
      }
      const uploaded: PhotoObject[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        
        uploaded.push({ url: data.publicUrl, description: "" });
        
        trackUsage({
          event_type: "upload",
          category: "storage",
          bytes: file.size,
          estimated_cost_usd: bytesToGB(file.size) * COSTS.STORAGE_GB_MONTH,
          metadata: { bucket, name: file.name, type: file.type },
        });
      }

      if (withDescription) {
        onChange([...items, ...uploaded]);
      } else {
        const urlsOnly = [...items, ...uploaded].map(i => i.url);
        if (multiple) onChange(urlsOnly);
        else onChange(urlsOnly[0]);
      }
      toast.success("Upload concluído");
    } catch (e: any) {
      toast.error("Falha no upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const updateDescription = (index: number, desc: string) => {
    const next = [...items];
    next[index].description = desc;
    
    if (withDescription) {
      onChange(next);
    } else {
      // Should not happen if withDescription is false, but just in case
      onChange(next.map(i => i.url));
    }
  };

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    if (withDescription) {
      onChange(next);
    } else {
      const urlsOnly = next.map(i => i.url);
      onChange(multiple ? urlsOnly : urlsOnly[0] || "");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {items.length > 0 && (
        <div className={cn("grid gap-3", withDescription ? "grid-cols-1" : "grid-cols-3")}>
          {items.map((item, index) => (
            <div key={item.url + index} className={cn(
              "group relative overflow-hidden rounded-lg border border-white/10 bg-white/5",
              withDescription ? "flex flex-col sm:flex-row gap-3 p-2" : "aspect-square"
            )}>
              <div className={cn("relative overflow-hidden rounded-md", withDescription ? "w-full sm:w-32 aspect-square shrink-0" : "h-full w-full")}>
                <img src={item.url} alt="" className="h-full w-full object-cover" />
                {!withDescription && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remover foto"
                    className="absolute right-1 top-1 rounded-full bg-black/75 p-1.5 text-white shadow-lg ring-1 ring-white/20 transition hover:bg-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              
              {withDescription && (
                <div className="flex-1 space-y-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Info da foto
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-muted-foreground hover:text-destructive transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Input 
                    placeholder="O que esta foto mostra?" 
                    value={item.description}
                    onChange={(e) => updateDescription(index, e.target.value)}
                    className="bg-black/20 border-white/10 h-8 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <label className="block">
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        <Button type="button" variant="outline" disabled={uploading} className="w-full h-10 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all" asChild>
          <span>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {label}
          </span>
        </Button>
      </label>
    </div>
  );
}

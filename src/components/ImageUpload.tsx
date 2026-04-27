import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  bucket: string;
  value?: string | string[];
  onChange: (urls: any) => void;
  multiple?: boolean;
  className?: string;
  label?: string;
}

export function ImageUpload({ bucket, value, onChange, multiple = false, className, label = "Enviar imagem" }: Props) {
  const [uploading, setUploading] = useState(false);
  const urls = Array.isArray(value) ? value : value ? [value] : [];

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (multiple) onChange([...urls, ...uploaded]);
      else onChange(uploaded[0]);
      toast.success("Upload concluído");
    } catch (e: any) {
      toast.error("Falha no upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = (url: string) => {
    const next = urls.filter((u) => u !== url);
    onChange(multiple ? next : next[0] || "");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
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
        <Button type="button" variant="outline" disabled={uploading} className="w-full" asChild>
          <span>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {label}
          </span>
        </Button>
      </label>
    </div>
  );
}
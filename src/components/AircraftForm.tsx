import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { AIRCRAFT_STATUS } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function AircraftForm({ initial, onDone }: { initial?: any; onDone?: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    prefix: initial?.prefix || "",
    model: initial?.model || "",
    manufacturer: initial?.manufacturer || "",
    serial_number: initial?.serial_number || "",
    year: initial?.year || "",
    total_hours: initial?.total_hours || "",
    owner: initial?.owner || "",
    cva_expiration: initial?.cva_expiration || "",
    last_inspection_date: initial?.last_inspection_date || "",
    status: initial?.status || "active",
    photo_url: initial?.photo_url || "",
    gallery: initial?.gallery || [],
    notes: initial?.notes || "",
  });

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("Faça login para salvar a aeronave.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      user_id: currentUser.id,
      year: form.year ? Number(form.year) : null,
      total_hours: form.total_hours ? Number(form.total_hours) : 0,
      cva_expiration: form.cva_expiration || null,
      last_inspection_date: form.last_inspection_date || null,
    };
    const op = initial?.id
      ? supabase.from("aircraft").update(payload).eq("id", initial.id)
      : supabase.from("aircraft").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Aeronave atualizada" : "Aeronave cadastrada");
    qc.invalidateQueries({ queryKey: ["aircraft"] });
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Prefixo *</Label>
          <Input required value={form.prefix} onChange={(e) => update("prefix", e.target.value.toUpperCase())} placeholder="PT-ABC" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AIRCRAFT_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fabricante</Label>
          <Input value={form.manufacturer} onChange={(e) => update("manufacturer", e.target.value)} placeholder="Cessna" />
        </div>
        <div>
          <Label>Modelo</Label>
          <Input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="172 Skyhawk" />
        </div>
        <div>
          <Label>Nº de Série</Label>
          <Input value={form.serial_number} onChange={(e) => update("serial_number", e.target.value)} />
        </div>
        <div>
          <Label>Ano</Label>
          <Input type="number" value={form.year} onChange={(e) => update("year", e.target.value)} />
        </div>
        <div>
          <Label>Horas Totais</Label>
          <Input type="number" step="0.1" value={form.total_hours} onChange={(e) => update("total_hours", e.target.value)} />
        </div>
        <div>
          <Label>Proprietário</Label>
          <Input value={form.owner} onChange={(e) => update("owner", e.target.value)} />
        </div>
        <div>
          <Label>Vencimento CVA</Label>
          <Input type="date" value={form.cva_expiration} onChange={(e) => update("cva_expiration", e.target.value)} />
        </div>
        <div>
          <Label>Última Inspeção</Label>
          <Input type="date" value={form.last_inspection_date} onChange={(e) => update("last_inspection_date", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Foto principal</Label>
        <ImageUpload bucket="aircraft-photos" value={form.photo_url} onChange={(v) => update("photo_url", v)} />
      </div>

      <div>
        <Label>Galeria</Label>
        <ImageUpload bucket="aircraft-photos" multiple value={form.gallery} onChange={(v) => update("gallery", v)} />
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-white/5 sticky bottom-0 bg-card/95 backdrop-blur">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
       <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initial ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
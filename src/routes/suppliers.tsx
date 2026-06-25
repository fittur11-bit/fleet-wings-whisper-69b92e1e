import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Building2, Search, Pencil, Trash2, Eye, Star, Phone, Mail, Globe, MapPin, MessageCircle, FileDown, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useSuppliers } from "@/lib/queries";
import { downloadSuppliersReport } from "@/lib/suppliers-report";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/suppliers")({
  component: () => <AuthGuard><SuppliersPage /></AuthGuard>,
});

const CATEGORIES = [
  { value: "workshop", label: "Oficina / Centro de Manutenção" },
  { value: "manufacturer", label: "Fabricante" },
  { value: "distributor", label: "Distribuidor de Peças" },
  { value: "avionics", label: "Aviônicos" },
  { value: "engine_shop", label: "Oficina de Motor" },
  { value: "propeller_shop", label: "Oficina de Hélice" },
  { value: "paint_interior", label: "Pintura / Interior" },
  { value: "fuel", label: "Combustível" },
  { value: "transport", label: "Transporte / Frete" },
  { value: "insurance", label: "Seguro" },
  { value: "consulting", label: "Consultoria / ANAC" },
  { value: "other", label: "Outros" },
];

const PRICE_LEVELS = [
  { value: "low", label: "Econômico", style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { value: "medium", label: "Médio", style: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { value: "high", label: "Alto", style: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { value: "premium", label: "Premium", style: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
];

const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;
const priceMeta = (v: string) => PRICE_LEVELS.find((p) => p.value === v) || PRICE_LEVELS[1];

function emptyForm() {
  return {
    name: "",
    trade_name: "",
    category: "workshop",
    service_types: "",
    specialties: "",
    price_level: "medium",
    avg_price_note: "",
    rating: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "Brasil",
    zip_code: "",
    cnpj: "",
    anac_certificate: "",
    payment_terms: "",
    lead_time_days: "",
    preferred: false,
    notes: "",
  };
}

function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [form, setForm] = useState<any>(emptyForm());
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!filtered.length) return toast.error("Nenhum fornecedor para exportar");
    setExporting(true);
    try {
      await downloadSuppliersReport(filtered);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter((s: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        s.name?.toLowerCase().includes(q) ||
        s.trade_name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.specialties?.toLowerCase().includes(q) ||
        (Array.isArray(s.service_types) && s.service_types.some((t: string) => t.toLowerCase().includes(q)));
      const matchCat = categoryFilter === "all" || s.category === categoryFilter;
      const matchPrice = priceFilter === "all" || s.price_level === priceFilter;
      return matchSearch && matchCat && matchPrice;
    });
  }, [suppliers, search, categoryFilter, priceFilter]);

  const stats = useMemo(() => ({
    total: suppliers.length,
    preferred: suppliers.filter((s: any) => s.preferred).length,
    workshops: suppliers.filter((s: any) => ["workshop", "engine_shop", "propeller_shop", "avionics"].includes(s.category)).length,
    avgRating: (() => {
      const rated = suppliers.filter((s: any) => s.rating);
      if (!rated.length) return "—";
      return (rated.reduce((acc: number, s: any) => acc + Number(s.rating), 0) / rated.length).toFixed(1);
    })(),
  }), [suppliers]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      ...emptyForm(),
      ...s,
      service_types: Array.isArray(s.service_types) ? s.service_types.join(", ") : "",
      rating: s.rating ?? "",
      lead_time_days: s.lead_time_days ?? "",
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir fornecedor?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Fornecedor excluído");
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Nome do fornecedor é obrigatório");
    if (!user) return toast.error("Sessão expirada");

    const payload: any = {
      user_id: user.id,
      name: form.name.trim(),
      trade_name: form.trade_name || null,
      category: form.category,
      service_types: form.service_types
        ? form.service_types.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
      specialties: form.specialties || null,
      price_level: form.price_level,
      avg_price_note: form.avg_price_note || null,
      rating: form.rating ? Number(form.rating) : null,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      website: form.website || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      zip_code: form.zip_code || null,
      cnpj: form.cnpj || null,
      anac_certificate: form.anac_certificate || null,
      payment_terms: form.payment_terms || null,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      preferred: !!form.preferred,
      notes: form.notes || null,
    };

    const { error } = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);

    if (error) return toast.error(error.message);
    toast.success(editing ? "Fornecedor atualizado" : "Fornecedor cadastrado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["suppliers"] });
  };

  return (
    <AppShell>
      <PageHeader
        title="Fornecedores"
        description="Cadastro padronizado de oficinas, fabricantes e prestadores de serviço"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Exportar PDF
            </Button>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Novo fornecedor
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Preferenciais", value: stats.preferred },
          { label: "Oficinas", value: stats.workshops },
          { label: "Nota média", value: stats.avgRating },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-card/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cidade, especialidade…"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos preços</SelectItem>
            {PRICE_LEVELS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-white/10">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum fornecedor cadastrado</p>
          <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Cadastrar o primeiro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s: any, i: number) => {
            const price = priceMeta(s.price_level);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-white/5 bg-card/50 p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {s.preferred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                      <h3 className="font-semibold truncate">{s.name}</h3>
                    </div>
                    {s.trade_name && <p className="text-xs text-muted-foreground truncate">{s.trade_name}</p>}
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{categoryLabel(s.category)}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${price.style}`}>
                    {price.label}
                  </span>
                </div>

                {Array.isArray(s.service_types) && s.service_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.service_types.slice(0, 4).map((t: string, idx: number) => (
                      <span key={idx} className="text-[10px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded">{t}</span>
                    ))}
                    {s.service_types.length > 4 && (
                      <span className="text-[10px] text-muted-foreground px-1">+{s.service_types.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {(s.city || s.state) && (
                    <div className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 shrink-0" />{[s.city, s.state].filter(Boolean).join("/")}</div>
                  )}
                  {s.rating && (
                    <div className="flex items-center gap-1.5"><Star className="h-3 w-3 shrink-0 text-amber-400" />{Number(s.rating).toFixed(1)}/5</div>
                  )}
                  {s.lead_time_days && (
                    <div className="truncate">⏱ {s.lead_time_days} dias</div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" />{s.phone}</div>
                  )}
                </div>

                <div className="flex gap-1 pt-2 border-t border-white/5">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(s)} className="flex-1 h-8"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="flex-1 h-8"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="flex-1 h-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Nome / Razão social *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Nome fantasia</Label>
              <Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Faixa de preço</Label>
              <Select value={form.price_level} onValueChange={(v) => setForm({ ...form, price_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRICE_LEVELS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Tipos de serviço (separados por vírgula)</Label>
              <Input
                value={form.service_types}
                onChange={(e) => setForm({ ...form, service_types: e.target.value })}
                placeholder="Ex: Inspeção 100h, Boroscopia, Troca de óleo"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Especialidades</Label>
              <Input
                value={form.specialties}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                placeholder="Ex: Cessna 172, Lycoming O-320, Garmin G1000"
              />
            </div>
            <div>
              <Label>Avaliação (0–5)</Label>
              <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
            </div>
            <div>
              <Label>Prazo médio (dias)</Label>
              <Input type="number" min="0" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observação sobre preços</Label>
              <Input
                value={form.avg_price_note}
                onChange={(e) => setForm({ ...form, avg_price_note: e.target.value })}
                placeholder="Ex: Hora-homem ~R$ 280, motor overhaul a partir de R$ 80k"
              />
            </div>

            <div className="md:col-span-2 border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Contato</p>
            </div>
            <div>
              <Label>Pessoa de contato</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            </div>

            <div className="md:col-span-2 border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Endereço</p>
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Estado / UF</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>País</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
            </div>

            <div className="md:col-span-2 border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Comercial / Técnico</p>
            </div>
            <div>
              <Label>Certificação ANAC</Label>
              <Input value={form.anac_certificate} onChange={(e) => setForm({ ...form, anac_certificate: e.target.value })} placeholder="Ex: OM 1234-05" />
            </div>
            <div>
              <Label>Condições de pagamento</Label>
              <Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} placeholder="Ex: 30/60 dias" />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-white/5 bg-card/40 p-3">
              <div>
                <Label>Fornecedor preferencial</Label>
                <p className="text-xs text-muted-foreground">Aparece destacado na lista</p>
              </div>
              <Switch checked={form.preferred} onCheckedChange={(v) => setForm({ ...form, preferred: v })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {viewing.preferred && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                  {viewing.name}
                </DialogTitle>
                {viewing.trade_name && <p className="text-sm text-muted-foreground">{viewing.trade_name}</p>}
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-white/10 bg-white/5">{categoryLabel(viewing.category)}</span>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${priceMeta(viewing.price_level).style}`}>
                    Preço {priceMeta(viewing.price_level).label}
                  </span>
                  {viewing.rating && (
                    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(viewing.rating).toFixed(1)}/5
                    </span>
                  )}
                </div>

                {Array.isArray(viewing.service_types) && viewing.service_types.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Serviços</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewing.service_types.map((t: string, idx: number) => (
                        <span key={idx} className="text-xs bg-white/5 px-2 py-1 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {viewing.specialties && (
                  <Field label="Especialidades">{viewing.specialties}</Field>
                )}
                {viewing.avg_price_note && (
                  <Field label="Média de preços">{viewing.avg_price_note}</Field>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {viewing.contact_name && <Field label="Contato">{viewing.contact_name}</Field>}
                  {viewing.phone && <Field label="Telefone" icon={<Phone className="h-3 w-3" />}><a href={`tel:${viewing.phone}`} className="hover:text-primary">{viewing.phone}</a></Field>}
                  {viewing.whatsapp && <Field label="WhatsApp" icon={<MessageCircle className="h-3 w-3" />}><a href={`https://wa.me/${viewing.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:text-primary">{viewing.whatsapp}</a></Field>}
                  {viewing.email && <Field label="E-mail" icon={<Mail className="h-3 w-3" />}><a href={`mailto:${viewing.email}`} className="hover:text-primary">{viewing.email}</a></Field>}
                  {viewing.website && <Field label="Website" icon={<Globe className="h-3 w-3" />}><a href={viewing.website} target="_blank" rel="noreferrer" className="hover:text-primary truncate">{viewing.website}</a></Field>}
                  {viewing.lead_time_days && <Field label="Prazo médio">{viewing.lead_time_days} dias</Field>}
                  {viewing.payment_terms && <Field label="Pagamento">{viewing.payment_terms}</Field>}
                  {viewing.anac_certificate && <Field label="Cert. ANAC">{viewing.anac_certificate}</Field>}
                  {viewing.cnpj && <Field label="CNPJ">{viewing.cnpj}</Field>}
                </div>

                {(viewing.address || viewing.city) && (
                  <Field label="Endereço" icon={<MapPin className="h-3 w-3" />}>
                    {[viewing.address, viewing.city, viewing.state, viewing.zip_code, viewing.country].filter(Boolean).join(", ")}
                  </Field>
                )}

                {viewing.notes && <Field label="Observações"><span className="whitespace-pre-wrap">{viewing.notes}</span></Field>}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setViewing(null)}>Fechar</Button>
                <Button onClick={() => { openEdit(viewing); setViewing(null); }}>Editar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">{icon}{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
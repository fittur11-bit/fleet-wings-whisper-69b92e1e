import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSuppliers } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, DollarSign, Search, FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/service-prices")({
  component: ServicePricesPage,
  head: () => ({
    meta: [
      { title: "Tabela de Preços - FlightCore" },
      { name: "description", content: "Tabela de preços de serviços de aviação" },
    ],
  }),
});

const CATEGORIES = [
  { value: "inspection", label: "Inspeção" },
  { value: "maintenance", label: "Manutenção" },
  { value: "overhaul", label: "Overhaul" },
  { value: "avionics", label: "Aviônica" },
  { value: "engine", label: "Motor" },
  { value: "airframe", label: "Célula" },
  { value: "propeller", label: "Hélice" },
  { value: "landing_gear", label: "Trem de Pouso" },
  { value: "painting", label: "Pintura" },
  { value: "interior", label: "Interior" },
  { value: "ndt", label: "Ensaios Não Destrutivos" },
  { value: "weighing", label: "Pesagem" },
  { value: "cleaning", label: "Limpeza" },
  { value: "transport", label: "Transporte/Ferry" },
  { value: "documentation", label: "Documentação" },
  { value: "general", label: "Geral" },
];

const UNITS = [
  { value: "service", label: "Serviço" },
  { value: "hour", label: "Hora" },
  { value: "man_hour", label: "Homem-hora" },
  { value: "cycle", label: "Ciclo" },
  { value: "unit", label: "Unidade" },
  { value: "kg", label: "Kg" },
];

type ServicePrice = {
  id: string;
  service_name: string;
  category: string;
  unit: string;
  price: number;
  currency: string;
  supplier_id: string | null;
  supplier_name: string | null;
  aircraft_model: string | null;
  min_price: number | null;
  max_price: number | null;
  validity_date: string | null;
  notes: string | null;
};

const emptyForm = {
  service_name: "",
  category: "general",
  unit: "service",
  price: "",
  currency: "BRL",
  supplier_id: "",
  aircraft_model: "",
  min_price: "",
  max_price: "",
  validity_date: "",
  notes: "",
};

function ServicePricesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: suppliers = [] } = useSuppliers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServicePrice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["service_prices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_prices")
        .select("*")
        .order("category")
        .order("service_name");
      if (error) throw error;
      return (data || []) as ServicePrice[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return prices.filter((p) => {
      const matchSearch =
        !s ||
        p.service_name.toLowerCase().includes(s) ||
        (p.supplier_name || "").toLowerCase().includes(s) ||
        (p.aircraft_model || "").toLowerCase().includes(s);
      const matchCat = filterCategory === "all" || p.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [prices, search, filterCategory]);

  const stats = useMemo(() => {
    const total = prices.length;
    const avg = total ? prices.reduce((a, p) => a + Number(p.price || 0), 0) / total : 0;
    const cats = new Set(prices.map((p) => p.category)).size;
    return { total, avg, cats };
  }, [prices]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: ServicePrice) => {
    setEditing(p);
    setForm({
      service_name: p.service_name,
      category: p.category,
      unit: p.unit,
      price: String(p.price ?? ""),
      currency: p.currency,
      supplier_id: p.supplier_id || "",
      aircraft_model: p.aircraft_model || "",
      min_price: p.min_price != null ? String(p.min_price) : "",
      max_price: p.max_price != null ? String(p.max_price) : "",
      validity_date: p.validity_date || "",
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.service_name.trim()) {
      toast.error("Informe o nome do serviço");
      return;
    }
    const supplier = suppliers.find((s: any) => s.id === form.supplier_id);
    const payload = {
      user_id: user.id,
      service_name: form.service_name.trim(),
      category: form.category,
      unit: form.unit,
      price: Number(form.price) || 0,
      currency: form.currency,
      supplier_id: form.supplier_id || null,
      supplier_name: supplier?.name || null,
      aircraft_model: form.aircraft_model.trim() || null,
      min_price: form.min_price ? Number(form.min_price) : null,
      max_price: form.max_price ? Number(form.max_price) : null,
      validity_date: form.validity_date || null,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("service_prices").update(payload).eq("id", editing.id)
      : await supabase.from("service_prices").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Preço atualizado" : "Preço adicionado");
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["service_prices"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este preço?")) return;
    const { error } = await supabase.from("service_prices").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Preço excluído");
    qc.invalidateQueries({ queryKey: ["service_prices"] });
  };

  const exportCSV = () => {
    const headers = ["Serviço", "Categoria", "Unidade", "Preço", "Moeda", "Mín", "Máx", "Fornecedor", "Modelo", "Validade", "Notas"];
    const rows = filtered.map((p) => [
      p.service_name,
      CATEGORIES.find((c) => c.value === p.category)?.label || p.category,
      UNITS.find((u) => u.value === p.unit)?.label || p.unit,
      p.price,
      p.currency,
      p.min_price ?? "",
      p.max_price ?? "",
      p.supplier_name ?? "",
      p.aircraft_model ?? "",
      p.validity_date ?? "",
      (p.notes ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabela-precos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number, cur = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(n || 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight">Tabela de Preços</h1>
          <p className="text-muted-foreground mt-1">
            Referência de preços de serviços de aviação
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo preço
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Itens</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Preço médio</p>
          <p className="text-2xl font-bold mt-1">{fmt(stats.avg)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Categorias</p>
          <p className="text-2xl font-bold mt-1">{stats.cats}</p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar serviço, fornecedor ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="md:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {prices.length === 0 ? "Nenhum preço cadastrado." : "Nenhum resultado."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right hidden md:table-cell">Faixa</TableHead>
                <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
                <TableHead className="hidden lg:table-cell">Modelo</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.service_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {CATEGORIES.find((c) => c.value === p.category)?.label || p.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {UNITS.find((u) => u.value === p.unit)?.label || p.unit}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {fmt(Number(p.price), p.currency)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground hidden md:table-cell tabular-nums">
                    {p.min_price != null || p.max_price != null
                      ? `${p.min_price != null ? fmt(Number(p.min_price), p.currency) : "—"} / ${p.max_price != null ? fmt(Number(p.max_price), p.currency) : "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.supplier_name || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{p.aircraft_model || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar preço" : "Novo preço"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Serviço *</Label>
              <Input
                value={form.service_name}
                onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                placeholder="Ex: Inspeção 100h Cessna 172"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço mínimo</Label>
              <Input
                type="number"
                step="0.01"
                value={form.min_price}
                onChange={(e) => setForm({ ...form, min_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço máximo</Label>
              <Input
                type="number"
                step="0.01"
                value={form.max_price}
                onChange={(e) => setForm({ ...form, max_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={form.supplier_id || "none"}
                onValueChange={(v) => setForm({ ...form, supplier_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo da aeronave</Label>
              <Input
                value={form.aircraft_model}
                onChange={(e) => setForm({ ...form, aircraft_model: e.target.value })}
                placeholder="Ex: C172, PA-28, EMB-110"
              />
            </div>
            <div className="space-y-2">
              <Label>Validade da cotação</Label>
              <Input
                type="date"
                value={form.validity_date}
                onChange={(e) => setForm({ ...form, validity_date: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Atualizar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
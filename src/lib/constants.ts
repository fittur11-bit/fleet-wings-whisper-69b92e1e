export const SERVICE_TYPES = [
  { value: "boroscopia", label: "Boroscopia" },
  { value: "pre_purchase", label: "Pré-Purchase" },
  { value: "annual_inspection", label: "Inspeção Anual" },
  { value: "progressive", label: "Inspeção Progressiva" },
  { value: "cva", label: "CVA" },
  { value: "50h", label: "Revisão 50h" },
  { value: "100h", label: "Revisão 100h" },
  { value: "200h", label: "Revisão 200h" },
  { value: "300h", label: "Revisão 300h" },
  { value: "400h", label: "Revisão 400h" },
  { value: "500h", label: "Revisão 500h" },
  { value: "600h", label: "Revisão 600h" },
  { value: "1000h", label: "Revisão 1000h" },
  { value: "ad_compliance", label: "AD Compliance" },
  { value: "sb_compliance", label: "SB Compliance" },
  { value: "altimetry_transponder", label: "Altimetria/Transponder" },
  { value: "compass_calibration", label: "Calibração da Bússola" },
  { value: "weighing_balance", label: "Pesagem e Balanceamento" },
  { value: "technical_wash", label: "Lavagem Técnica" },
  { value: "off_base", label: "Serviço Fora de Base" },
] as const;

export const MAINTENANCE_ITEMS = [
  { value: "cva", label: "CVA" },
  { value: "iam", label: "IAM" },
  { value: "revision_50h", label: "Revisão 50h" },
  { value: "revision_100h", label: "Revisão 100h" },
  { value: "revision_200h", label: "Revisão 200h" },
  { value: "revision_400h", label: "Revisão 400h" },
  { value: "revision_500h", label: "Revisão 500h" },
  { value: "revision_600h", label: "Revisão 600h" },
  { value: "revision_1000h", label: "Revisão 1000h" },
  { value: "altimetry_transponder", label: "Altimetria/Transponder" },
  { value: "compass_calibration", label: "Calibração Bússola" },
  { value: "weighing_balance", label: "Pesagem" },
  { value: "engine_tbo", label: "TBO Motor" },
  { value: "propeller_tbo", label: "TBO Hélice" },
  { value: "ad_compliance", label: "AD" },
  { value: "magneto", label: "Magneto" },
  { value: "fuel_hose", label: "Mangueira Combustível" },
  { value: "oil_hose", label: "Mangueira Óleo" },
  { value: "battery", label: "Bateria" },
  { value: "fire_ext", label: "Extintor" },
] as const;

export const DOC_TYPES = [
  { value: "AMM", label: "AMM" },
  { value: "POH", label: "POH" },
  { value: "IPC", label: "IPC" },
  { value: "SOP", label: "SOP" },
  { value: "SB", label: "Service Bulletin" },
  { value: "AD", label: "Airworthiness Directive" },
  { value: "OTHER", label: "Outro" },
] as const;

export const AIRCRAFT_STATUS = [
  { value: "active", label: "Ativa" },
  { value: "maintenance", label: "Em Manutenção" },
  { value: "inactive", label: "Inativa" },
  { value: "non_conform", label: "Não Conforme" },
] as const;

export const SERVICE_STATUS = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export const PART_STATUS = [
  { value: "stock", label: "Em Estoque" },
  { value: "installed", label: "Instalada" },
  { value: "scrapped", label: "Descartada" },
  { value: "sent_repair", label: "Enviada p/ Reparo" },
] as const;

export const PART_CONDITION = [
  { value: "new", label: "Nova" },
  { value: "serviceable", label: "Serviceable" },
  { value: "unserviceable", label: "Unserviceable" },
   { value: "overhauled", label: "Overhauled" },
 ] as const;
 
 export const SHIPMENT_STATUS = [
   { value: "sent", label: "Enviado" },
   { value: "in_repair", label: "Em Reparo" },
   { value: "received", label: "Recebido" },
   { value: "cancelled", label: "Cancelado" },
 ] as const;

export const SERVICE_CHECKLISTS: Record<string, string[]> = {
  "50h": ["Troca de óleo", "Filtro de óleo", "Inspeção visual motor", "Verificação de vazamentos", "Inspeção pneus"],
  "100h": ["Troca de óleo", "Filtro de óleo e ar", "Inspeção compressão", "Bujões magnéticos", "Sistema combustível", "Sistema elétrico"],
  "annual_inspection": ["Inspeção anual completa", "Documentação", "Pesagem", "Sistemas de emergência", "Cinto de segurança"],
  "cva": ["Vistoria documental", "Inspeção visual", "Teste de sistemas", "Conferência peso e balanceamento"],
  "boroscopia": ["Inspeção câmaras combustão", "Inspeção válvulas", "Registro fotográfico", "Relatório técnico"],
  "ad_compliance": ["Verificação aplicabilidade", "Cumprimento de instruções", "Registro em livro"],
  "sb_compliance": ["Avaliação SB", "Aplicação", "Registro técnico"],
};
export const SECURITY_QUESTIONS = [
  "Qual o nome do seu primeiro animal de estimação?",
  "Em que cidade você nasceu?",
  "Qual o nome de solteira da sua mãe?",
  "Qual a marca do seu primeiro carro?",
  "Qual o nome da sua escola primária?",
  "Qual seu prato favorito?",
] as const;

export const FLIGHT_NATURE = [
  { value: "private", label: "Privado (TPX)" },
  { value: "commercial", label: "Comercial (TPC)" },
  { value: "instruction", label: "Instrução (PRI)" },
  { value: "maintenance", label: "Voo de Experiência" },
  { value: "ferry", label: "Traslado" },
] as const;

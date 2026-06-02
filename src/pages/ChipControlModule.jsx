import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Database,
  Download,
  History,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings,
  Smartphone,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import Logo from '../components/Logo';
import {
  CHIP_CONTROL_STORAGE_KEY,
  CHIP_STATUS_OPTIONS,
  DEFAULT_OPERATORS,
  DEFAULT_TAGS,
  PAYMENT_METHOD_OPTIONS,
  QUICK_FILTERS,
  WHATSAPP_STATUS_OPTIONS,
  buildChipControlViewModel,
  createEmptyChip,
  createEmptyRecharge,
  createInitialChipControlState,
  downloadFile,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateId,
  matchesChipSearch,
  toCsv,
} from '../lib/chipControl';
import { getAdminBasePath, isAdminSessionActive } from '../lib/adminAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Inicio', icon: BarChart3 },
  { id: 'chips', label: 'Mis líneas', icon: Smartphone },
  { id: 'alertas', label: 'Avisos', icon: AlertTriangle },
  { id: 'calendario', label: 'Fechas', icon: Calendar },
  { id: 'historial', label: 'Movimientos', icon: History },
  { id: 'configuracion', label: 'Ajustes', icon: Settings },
];

// chip view: 'list' | 'new' | 'detail'
const CHIP_VIEW = { LIST: 'list', NEW: 'new', DETAIL: 'detail' };

const DETAIL_TABS = [
  { id: 'datos', label: 'Datos' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'recargas', label: 'Recargas' },
  { id: 'rotacion', label: 'Rotación' },
];

const TONE = {
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
};

const INPUT = 'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#050505] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/10';

// ─── Storage helpers ───────────────────────────────────────────────────────────

function loadStoredState() {
  const base = createInitialChipControlState();
  if (typeof window === 'undefined') return base;
  try {
    const raw = window.localStorage.getItem(CHIP_CONTROL_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      chips: Array.isArray(parsed.chips) ? parsed.chips : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      operators: Array.isArray(parsed.operators) && parsed.operators.length ? parsed.operators : DEFAULT_OPERATORS,
      tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : DEFAULT_TAGS,
      settings: { ...base.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return base;
  }
}

function appendHistory(history, action, details, user, chipId = '') {
  return [
    { id: generateId('h'), action, chipId, createdAt: new Date().toISOString(), details, user },
    ...history,
  ].slice(0, 300);
}

function normalizeChipForSave(form, settings) {
  return {
    ...form,
    alias: form.alias.trim(),
    phone: form.phone.trim(),
    location: form.location.trim(),
    notes: form.notes.trim(),
    cost: form.cost === '' ? '' : Number(form.cost),
    otherExpenses: form.otherExpenses === '' ? '' : Number(form.otherExpenses),
    tags: [...new Set(form.tags)],
    whatsapp: { ...form.whatsapp, blockReason: form.whatsapp.blockReason.trim(), notes: form.whatsapp.notes.trim() },
    rotation: {
      ...form.rotation,
      useDays: form.rotation.useDays || String(settings.defaultUseDays || 7),
      restDays: form.rotation.restDays || String(settings.defaultRestDays || 7),
    },
    recharges: (form.recharges || [])
      .filter((r) => r.date && r.amount !== '')
      .map((r) => ({ ...r, amount: Number(r.amount), notes: r.notes.trim() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  };
}

function normalizeChipForForm(chip, settings) {
  const empty = createEmptyChip(settings);
  return {
    ...empty,
    ...chip,
    cost: chip.cost === '' ? '' : String(chip.cost ?? ''),
    otherExpenses: chip.otherExpenses === '' ? '' : String(chip.otherExpenses ?? ''),
    tags: Array.isArray(chip.tags) ? chip.tags : [],
    whatsapp: { ...empty.whatsapp, ...(chip.whatsapp || {}) },
    rotation: {
      ...empty.rotation,
      ...(chip.rotation || {}),
      useDays: String(chip.rotation?.useDays ?? settings.defaultUseDays ?? 7),
      restDays: String(chip.rotation?.restDays ?? settings.defaultRestDays ?? 7),
    },
    recharges: (chip.recharges || []).map((r) => ({ ...r, amount: r.amount === '' ? '' : String(r.amount ?? '') })),
  };
}

function buildCalendarMonth(events, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);
  const eventMap = new Map();
  events.forEach((e) => {
    if (!e.date) return;
    const cur = eventMap.get(e.date) || [];
    cur.push(e);
    eventMap.set(e.date, cur);
  });
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ id: `e-${i}`, isCurrentMonth: false });
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const iso = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    cells.push({ date: iso, day, events: eventMap.get(iso) || [], id: iso, isCurrentMonth: true, isToday: iso === todayIso });
  }
  while (cells.length % 7 !== 0) cells.push({ id: `t-${cells.length}`, isCurrentMonth: false });
  return cells;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ChipControlModule() {
  const navigate = useNavigate();
  const [isAuthorized] = useState(() => isAdminSessionActive());
  const [state, setState] = useState(loadStoredState);
  const [activeTab, setActiveTab] = useState('dashboard');

  // chips sub-view
  const [chipView, setChipView] = useState(CHIP_VIEW.LIST);
  const [selectedChipId, setSelectedChipId] = useState(null);
  const [detailTab, setDetailTab] = useState('datos');
  const [chipForm, setChipForm] = useState(() => createEmptyChip(loadStoredState().settings));

  // list search/filter
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('todos');

  // settings form
  const [settingsForm, setSettingsForm] = useState(() => loadStoredState().settings);
  const [newOperator, setNewOperator] = useState('');
  const [newTag, setNewTag] = useState('');

  // calendar
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => { if (!isAuthorized) navigate(getAdminBasePath(), { replace: true }); }, [isAuthorized, navigate]);
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem(CHIP_CONTROL_STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { setSettingsForm({ ...state.settings }); }, [state.settings]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#050505] flex items-center justify-center">
        <p className="text-sm text-slate-500">Verificando acceso…</p>
      </div>
    );
  }

  const vm = buildChipControlViewModel(state);
  const user = state.settings.operatorUserLabel || 'Administrador';
  const filteredChips = vm.enhancedChips.filter((c) => matchesChipSearch(c, searchTerm, quickFilter));
  const selectedChip = selectedChipId ? vm.enhancedChips.find((c) => c.id === selectedChipId) : null;
  const calendarCells = buildCalendarMonth(vm.calendarEvents, calendarMonth);
  const calendarMonthLabel = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(calendarMonth);
  const urgentAlerts = vm.alerts.filter((a) => a.priority === 'Alta');

  // ── Chip actions ──────────────────────────────────────────────────────────

  const openNew = () => {
    setChipForm(createEmptyChip(state.settings));
    setChipView(CHIP_VIEW.NEW);
  };

  const openDetail = (chip) => {
    setSelectedChipId(chip.id);
    setChipForm(normalizeChipForForm(chip, state.settings));
    setDetailTab('datos');
    setChipView(CHIP_VIEW.DETAIL);
  };

  const goToList = () => {
    setChipView(CHIP_VIEW.LIST);
    setSelectedChipId(null);
    setDeleteConfirmId(null);
  };

  const handleSaveChip = (e) => {
    e?.preventDefault();
    if (!chipForm.alias.trim() || !chipForm.phone.trim()) {
      alert('El alias y el número son obligatorios.');
      return;
    }
    const toSave = normalizeChipForSave(chipForm, state.settings);
    setState((cur) => {
      const chips = [...cur.chips];
      const history = [...cur.history];
      const existingIndex = chips.findIndex((c) => c.id === toSave.id);
      if (existingIndex >= 0) {
        const prev = chips[existingIndex];
        chips[existingIndex] = toSave;
        history.unshift(...appendHistory([], 'Modificación', `Se actualizó ${toSave.alias}.`, user, toSave.id));
        if (prev.chipStatus !== toSave.chipStatus) {
          history.unshift(...appendHistory([], 'Cambio de estado', `${toSave.alias}: ${prev.chipStatus} → ${toSave.chipStatus}.`, user, toSave.id));
        }
        if (!prev.whatsapp?.blockDate && toSave.whatsapp.blockDate) {
          history.unshift(...appendHistory([], 'Bloqueo WA', `Se registró bloqueo de WhatsApp en ${toSave.alias}.`, user, toSave.id));
        }
      } else {
        toSave.id = generateId('chip');
        chips.unshift(toSave);
        history.unshift(...appendHistory([], 'Registro', `Se creó la línea ${toSave.alias}.`, user, toSave.id));
      }
      return { ...cur, chips, history };
    });

    if (chipView === CHIP_VIEW.NEW) {
      // after creating, go directly to its detail
      setSelectedChipId(null); // will be set after state update via a different approach
      goToList();
    }
    // if in detail view, stay there — chip is updated in place
  };

  const handleDeleteChip = (chipId) => {
    const chip = state.chips.find((c) => c.id === chipId);
    setState((cur) => ({
      ...cur,
      chips: cur.chips.filter((c) => c.id !== chipId),
      history: appendHistory(cur.history, 'Eliminación', `Se eliminó la línea ${chip?.alias || chipId}.`, user, chipId),
    }));
    setDeleteConfirmId(null);
    goToList();
  };

  // ── Settings ──────────────────────────────────────────────────────────────

  const handleSaveSettings = () => {
    setState((cur) => ({
      ...cur,
      settings: {
        ...cur.settings,
        rechargeIntervalDays: Number(settingsForm.rechargeIntervalDays) || 15,
        recoveryDays: Number(settingsForm.recoveryDays) || 90,
        defaultUseDays: Number(settingsForm.defaultUseDays) || 7,
        defaultRestDays: Number(settingsForm.defaultRestDays) || 7,
        operatorUserLabel: settingsForm.operatorUserLabel?.trim() || 'Administrador',
      },
      history: appendHistory(cur.history, 'Configuración', 'Se actualizaron los ajustes globales.', settingsForm.operatorUserLabel?.trim() || 'Administrador'),
    }));
  };

  const addOperator = () => {
    const v = newOperator.trim();
    if (!v) return;
    setState((cur) => {
      if (cur.operators.some((o) => o.toLowerCase() === v.toLowerCase())) return cur;
      return { ...cur, operators: [...cur.operators, v], history: appendHistory(cur.history, 'Operadora', `Se agregó ${v}.`, user) };
    });
    setNewOperator('');
  };

  const addTag = () => {
    const v = newTag.trim();
    if (!v) return;
    setState((cur) => {
      if (cur.tags.some((t) => t.toLowerCase() === v.toLowerCase())) return cur;
      return { ...cur, tags: [...cur.tags, v], history: appendHistory(cur.history, 'Etiqueta', `Se agregó ${v}.`, user) };
    });
    setNewTag('');
  };

  // ── Exports ───────────────────────────────────────────────────────────────

  const handleExportBackup = () => {
    downloadFile(`chips-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imp = JSON.parse(text);
      const base = createInitialChipControlState();
      const safe = {
        ...base, ...imp,
        chips: Array.isArray(imp.chips) ? imp.chips : [],
        history: appendHistory(Array.isArray(imp.history) ? imp.history : [], 'Restauración', `Respaldo importado: ${file.name}.`, base.settings.operatorUserLabel || 'Administrador'),
        operators: Array.isArray(imp.operators) && imp.operators.length ? imp.operators : DEFAULT_OPERATORS,
        tags: Array.isArray(imp.tags) && imp.tags.length ? imp.tags : DEFAULT_TAGS,
        settings: { ...base.settings, ...(imp.settings || {}) },
      };
      setState(safe);
      goToList();
    } catch { alert('No se pudo importar el respaldo.'); }
    finally { e.target.value = ''; }
  };

  const handleExportCsv = () => {
    const rows = vm.enhancedChips.map((c) => ({
      Alias: c.alias, Numero: c.phone, Operadora: c.operator,
      Estado: c.effectiveChipStatus, WhatsApp: c.whatsapp.status,
      ProximaRecarga: c.recharge.nextRechargeDate || '',
      Recuperacion: c.recovery.estimatedRecoveryDate || '',
      GastoTotal: c.totalExpenses,
    }));
    downloadFile('inventario.csv', toCsv(rows), 'text/csv;charset=utf-8;');
  };

  // ── Tab navigation helper ─────────────────────────────────────────────────

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'chips') goToList();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/5 bg-white/90 dark:bg-black/50 backdrop-blur-xl transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Logo className="w-6 h-6 text-brand" />
              <h1 className="text-base font-black tracking-tight">Control de Chips</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate(getAdminBasePath())}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver
            </button>
          </div>

          {/* ── Tab bar ── */}
          <div className="flex gap-1 pb-0 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'alertas' && urgentAlerts.length > 0 && (
                  <span className="rounded-full bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 min-w-[16px] text-center leading-none">
                    {urgentAlerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: DASHBOARD
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* 4 metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard label="Total líneas" value={vm.stats.totalChips} tone="slate" />
              <MetricCard label="Activas" value={vm.stats.totalActiveChips} tone="emerald" />
              <MetricCard label="Avisos urgentes" value={urgentAlerts.length} tone={urgentAlerts.length > 0 ? 'rose' : 'slate'} />
              <MetricCard label="Gasto del mes" value={formatCurrency(vm.stats.monthlyExpenses)} tone="amber" isText />
            </div>

            {/* Urgent alerts */}
            {urgentAlerts.length > 0 && (
              <Card title="Requieren atención ahora" icon={AlertTriangle}>
                <div className="space-y-2">
                  {urgentAlerts.slice(0, 6).map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onOpen={() => {
                        const chip = vm.enhancedChips.find((c) => c.id === alert.chipId);
                        if (chip) { switchTab('chips'); openDetail(chip); }
                      }}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* No chips yet */}
            {vm.stats.totalChips === 0 && (
              <EmptyState
                icon={Smartphone}
                title="No hay líneas registradas"
                description="Agrega tu primera línea para empezar a rastrear recargas y WhatsApp."
                action={{ label: '+ Agregar línea', onClick: () => { switchTab('chips'); openNew(); } }}
              />
            )}

            {/* Quick stats when there are chips */}
            {vm.stats.totalChips > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Card title="Chips por operadora" icon={BarChart3}>
                  <BarList items={vm.charts.chipsByOperator} />
                </Card>
                <Card title="Estado de WhatsApp" icon={MessageCircle}>
                  <BarList items={vm.charts.chipsByStatus} />
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: CHIPS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'chips' && (
          <>
            {/* ── LIST VIEW ── */}
            {chipView === CHIP_VIEW.LIST && (
              <div className="space-y-4">
                {/* Search + filter bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`${INPUT} pl-9`}
                      placeholder="Buscar por alias, número u operadora…"
                    />
                  </div>
                  <select value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)} className={`${INPUT} sm:w-48`}>
                    {QUICK_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={openNew}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva línea
                  </button>
                </div>

                {/* Chip table */}
                {filteredChips.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#0a0a0c]">
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[10px] font-black tracking-widest uppercase text-slate-400">
                      <span>Línea</span>
                      <span>Número</span>
                      <span className="hidden sm:block">Operadora</span>
                      <span>Chip</span>
                      <span className="hidden md:block">Recarga</span>
                      <span />
                    </div>

                    {/* Rows */}
                    {filteredChips.map((chip, idx) => (
                      <ChipRow
                        key={chip.id}
                        chip={chip}
                        isLast={idx === filteredChips.length - 1}
                        onClick={() => openDetail(chip)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Smartphone}
                    title={vm.enhancedChips.length === 0 ? 'Aún no hay líneas' : 'Ninguna línea coincide'}
                    description={vm.enhancedChips.length === 0 ? 'Usa el botón "Nueva línea" para registrar la primera.' : 'Intenta cambiar el filtro o el texto de búsqueda.'}
                    action={vm.enhancedChips.length === 0 ? { label: '+ Nueva línea', onClick: openNew } : null}
                  />
                )}
              </div>
            )}

            {/* ── NEW CHIP FORM ── */}
            {chipView === CHIP_VIEW.NEW && (
              <div className="max-w-lg mx-auto space-y-4">
                {/* Breadcrumb */}
                <button type="button" onClick={goToList} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                  Mis líneas
                </button>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5">
                  <h2 className="text-lg font-black mb-5">Nueva línea</h2>
                  <form onSubmit={handleSaveChip} className="space-y-4">
                    <Field label="Alias *" hint="Un nombre corto para identificarla. Ej: Principal 01">
                      <input
                        value={chipForm.alias}
                        onChange={(e) => setChipForm((c) => ({ ...c, alias: e.target.value }))}
                        className={INPUT}
                        placeholder="Principal 01"
                        autoFocus
                      />
                    </Field>
                    <Field label="Número telefónico *">
                      <input
                        value={chipForm.phone}
                        onChange={(e) => setChipForm((c) => ({ ...c, phone: e.target.value }))}
                        className={INPUT}
                        placeholder="+51 999 000 111"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Operadora">
                        <select value={chipForm.operator} onChange={(e) => setChipForm((c) => ({ ...c, operator: e.target.value }))} className={INPUT}>
                          {state.operators.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </Field>
                      <Field label="Estado">
                        <select value={chipForm.chipStatus} onChange={(e) => setChipForm((c) => ({ ...c, chipStatus: e.target.value }))} className={INPUT}>
                          {CHIP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                    </div>
                    <p className="text-xs text-slate-400">Los demás datos (recargas, WhatsApp, rotación) los puedes agregar después desde la ficha.</p>
                    <div className="flex gap-3 pt-1">
                      <button type="submit" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
                        <Save className="w-4 h-4" /> Guardar
                      </button>
                      <button type="button" onClick={goToList} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── DETAIL VIEW ── */}
            {chipView === CHIP_VIEW.DETAIL && selectedChip && (
              <div className="space-y-4">
                {/* Breadcrumb + actions */}
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={goToList} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    Mis líneas
                  </button>
                  <div className="flex items-center gap-2">
                    <StatusPill label={selectedChip.effectiveChipStatus} tone={chipStatusTone(selectedChip.effectiveChipStatus)} />
                    <StatusPill label={selectedChip.rotationState.phase} tone={rotationTone(selectedChip.rotationState.phase)} />
                    {deleteConfirmId === selectedChip.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-600 font-bold">¿Eliminar?</span>
                        <button type="button" onClick={() => handleDeleteChip(selectedChip.id)} className="rounded-lg bg-rose-500 text-white px-3 py-1.5 text-xs font-bold">Sí, eliminar</button>
                        <button type="button" onClick={() => setDeleteConfirmId(null)} className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold">No</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirmId(selectedChip.id)} className="rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-500 px-3 py-1.5 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chip header */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{selectedChip.alias}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{selectedChip.phone} · {selectedChip.operator}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <Stat label="Próx. recarga" value={selectedChip.recharge.nextRechargeDate ? formatDate(selectedChip.recharge.nextRechargeDate) : '—'} tone={selectedChip.recharge.tone} />
                      <Stat label="Recuperación WA" value={selectedChip.recovery.estimatedRecoveryDate ? formatDate(selectedChip.recovery.estimatedRecoveryDate) : '—'} />
                      <Stat label="Gasto total" value={formatCurrency(selectedChip.totalExpenses)} />
                    </div>
                  </div>

                  {/* Alerts for this chip */}
                  {(selectedChip.recharge.alertLabel || selectedChip.recovery.alertLabel || selectedChip.rotationState.alertLabel) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                      {selectedChip.recharge.alertLabel && <AlertPill label={selectedChip.recharge.alertLabel} tone={selectedChip.recharge.tone} />}
                      {selectedChip.recovery.alertLabel && <AlertPill label={selectedChip.recovery.alertLabel} tone={selectedChip.recovery.tone} />}
                      {selectedChip.rotationState.alertLabel && <AlertPill label={selectedChip.rotationState.alertLabel} tone="amber" />}
                    </div>
                  )}
                </div>

                {/* Inner tabs */}
                <div className="flex gap-1 border-b border-slate-200 dark:border-white/10">
                  {DETAIL_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDetailTab(t.id)}
                      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                        detailTab === t.id
                          ? 'border-brand text-brand'
                          : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Datos */}
                {detailTab === 'datos' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5">
                    <form onSubmit={handleSaveChip} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Alias *">
                          <input value={chipForm.alias} onChange={(e) => setChipForm((c) => ({ ...c, alias: e.target.value }))} className={INPUT} />
                        </Field>
                        <Field label="Número *">
                          <input value={chipForm.phone} onChange={(e) => setChipForm((c) => ({ ...c, phone: e.target.value }))} className={INPUT} />
                        </Field>
                        <Field label="Operadora">
                          <select value={chipForm.operator} onChange={(e) => setChipForm((c) => ({ ...c, operator: e.target.value }))} className={INPUT}>
                            {state.operators.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </Field>
                        <Field label="Estado">
                          <select value={chipForm.chipStatus} onChange={(e) => setChipForm((c) => ({ ...c, chipStatus: e.target.value }))} className={INPUT}>
                            {CHIP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Fecha de compra">
                          <input type="date" value={chipForm.purchaseDate} onChange={(e) => setChipForm((c) => ({ ...c, purchaseDate: e.target.value }))} className={INPUT} />
                        </Field>
                        <Field label="Fecha de activación">
                          <input type="date" value={chipForm.activationDate} onChange={(e) => setChipForm((c) => ({ ...c, activationDate: e.target.value }))} className={INPUT} />
                        </Field>
                        <Field label="Ubicación física">
                          <input value={chipForm.location} onChange={(e) => setChipForm((c) => ({ ...c, location: e.target.value }))} className={INPUT} placeholder="Caja A / Slot 4" />
                        </Field>
                        <Field label="Costo del chip">
                          <input type="number" min="0" step="0.01" value={chipForm.cost} onChange={(e) => setChipForm((c) => ({ ...c, cost: e.target.value }))} className={INPUT} placeholder="0.00" />
                        </Field>
                      </div>
                      <Field label="Notas">
                        <textarea value={chipForm.notes} onChange={(e) => setChipForm((c) => ({ ...c, notes: e.target.value }))} className={`${INPUT} min-h-[80px] resize-none`} placeholder="Cualquier nota útil…" />
                      </Field>

                      {/* Tags */}
                      {state.tags.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Etiquetas</p>
                          <div className="flex flex-wrap gap-2">
                            {state.tags.map((tag) => {
                              const active = chipForm.tags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setChipForm((c) => ({ ...c, tags: active ? c.tags.filter((t) => t !== tag) : [...c.tags, tag] }))}
                                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${active ? 'bg-brand text-black' : 'border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-brand/40'}`}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
                        <Save className="w-4 h-4" /> Guardar cambios
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab: WhatsApp */}
                {detailTab === 'whatsapp' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5 space-y-4">
                    {/* Recovery counter */}
                    {selectedChip.recovery.active && (
                      <div className={`rounded-xl border p-4 ${TONE[selectedChip.recovery.tone] || TONE.slate}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold">Contador de recuperación</p>
                          <p className="text-sm font-black">{selectedChip.recovery.daysRemaining > 0 ? `${selectedChip.recovery.daysRemaining} días` : '¡Listo!'}</p>
                        </div>
                        <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                          <div className="h-full rounded-full bg-current opacity-60 transition-all" style={{ width: `${selectedChip.recovery.progress}%` }} />
                        </div>
                        <p className="text-xs mt-1.5 opacity-70">Recuperación estimada: {formatDate(selectedChip.recovery.estimatedRecoveryDate)}</p>
                      </div>
                    )}

                    <form onSubmit={handleSaveChip} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Estado de WhatsApp">
                          <select value={chipForm.whatsapp.status} onChange={(e) => setChipForm((c) => ({ ...c, whatsapp: { ...c.whatsapp, status: e.target.value } }))} className={INPUT}>
                            {WHATSAPP_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </Field>
                        <Field label="Fecha de creación WA">
                          <input type="date" value={chipForm.whatsapp.createdAt} onChange={(e) => setChipForm((c) => ({ ...c, whatsapp: { ...c.whatsapp, createdAt: e.target.value } }))} className={INPUT} />
                        </Field>
                        <Field label="Fecha de bloqueo">
                          <input type="date" value={chipForm.whatsapp.blockDate} onChange={(e) => setChipForm((c) => ({ ...c, whatsapp: { ...c.whatsapp, blockDate: e.target.value } }))} className={INPUT} />
                        </Field>
                        <Field label="Motivo del bloqueo">
                          <input value={chipForm.whatsapp.blockReason} onChange={(e) => setChipForm((c) => ({ ...c, whatsapp: { ...c.whatsapp, blockReason: e.target.value } }))} className={INPUT} placeholder="Spam, verificación…" />
                        </Field>
                      </div>
                      <Field label="Notas">
                        <textarea value={chipForm.whatsapp.notes} onChange={(e) => setChipForm((c) => ({ ...c, whatsapp: { ...c.whatsapp, notes: e.target.value } }))} className={`${INPUT} min-h-[80px] resize-none`} placeholder="Estado de apelación, próxima revisión…" />
                      </Field>
                      <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
                        <Save className="w-4 h-4" /> Guardar cambios
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab: Recargas */}
                {detailTab === 'recargas' && (
                  <div className="space-y-3">
                    {/* Next recharge info */}
                    {selectedChip.recharge.nextRechargeDate && (
                      <div className={`rounded-xl border p-3 flex items-center justify-between ${TONE[selectedChip.recharge.tone]}`}>
                        <span className="text-sm font-bold">Próxima recarga</span>
                        <span className="text-sm font-black">{formatDate(selectedChip.recharge.nextRechargeDate)}</span>
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black">Historial de recargas</p>
                        <button
                          type="button"
                          onClick={() => setChipForm((c) => ({ ...c, recharges: [...c.recharges, createEmptyRecharge()] }))}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-black transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>

                      {chipForm.recharges.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">Sin recargas. Agrega la última para activar los recordatorios.</p>
                      )}

                      <div className="space-y-3">
                        {chipForm.recharges.map((r, idx) => (
                          <div key={r.id} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-500">Recarga {idx + 1}</p>
                              <button type="button" onClick={() => setChipForm((c) => ({ ...c, recharges: c.recharges.filter((x) => x.id !== r.id) }))} className="text-rose-400 hover:text-rose-600 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <Field label="Fecha">
                                <input type="date" value={r.date} onChange={(e) => setChipForm((c) => ({ ...c, recharges: c.recharges.map((x) => x.id === r.id ? { ...x, date: e.target.value } : x) }))} className={INPUT} />
                              </Field>
                              <Field label="Monto">
                                <input type="number" min="0" step="0.01" value={r.amount} onChange={(e) => setChipForm((c) => ({ ...c, recharges: c.recharges.map((x) => x.id === r.id ? { ...x, amount: e.target.value } : x) }))} className={INPUT} placeholder="0.00" />
                              </Field>
                              <Field label="Método">
                                <select value={r.paymentMethod} onChange={(e) => setChipForm((c) => ({ ...c, recharges: c.recharges.map((x) => x.id === r.id ? { ...x, paymentMethod: e.target.value } : x) }))} className={INPUT}>
                                  {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </Field>
                              <Field label="Notas">
                                <input value={r.notes} onChange={(e) => setChipForm((c) => ({ ...c, recharges: c.recharges.map((x) => x.id === r.id ? { ...x, notes: e.target.value } : x) }))} className={INPUT} placeholder="Opcional" />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>

                      {chipForm.recharges.length > 0 && (
                        <button type="button" onClick={handleSaveChip} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
                          <Save className="w-4 h-4" /> Guardar recargas
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Rotación */}
                {detailTab === 'rotacion' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5 space-y-4">
                    {/* Rotation status */}
                    <div className={`rounded-xl border p-3 flex items-center justify-between ${TONE[rotationTone(selectedChip.rotationState.phase)]}`}>
                      <span className="text-sm font-bold">Estado actual</span>
                      <span className="text-sm font-black">{selectedChip.rotationState.phase}</span>
                    </div>

                    <form onSubmit={handleSaveChip} className="space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <Field label="Inicio de uso">
                          <input type="date" value={chipForm.rotation.useStartDate} onChange={(e) => setChipForm((c) => ({ ...c, rotation: { ...c.rotation, useStartDate: e.target.value } }))} className={INPUT} />
                        </Field>
                        <Field label="Días de uso">
                          <input type="number" min="1" value={chipForm.rotation.useDays} onChange={(e) => setChipForm((c) => ({ ...c, rotation: { ...c.rotation, useDays: e.target.value } }))} className={INPUT} />
                        </Field>
                        <Field label="Días de descanso">
                          <input type="number" min="1" value={chipForm.rotation.restDays} onChange={(e) => setChipForm((c) => ({ ...c, rotation: { ...c.rotation, restDays: e.target.value } }))} className={INPUT} />
                        </Field>
                      </div>
                      {chipForm.rotation.useStartDate && (
                        <p className="text-xs text-slate-500">
                          Fin de uso: <strong>{formatDate(selectedChip.rotationState.useEndDate)}</strong> · Disponible de nuevo: <strong>{formatDate(selectedChip.rotationState.restEndDate)}</strong>
                        </p>
                      )}
                      <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
                        <Save className="w-4 h-4" /> Guardar rotación
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: ALERTAS
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'alertas' && (
          <div className="space-y-3">
            {vm.alerts.length === 0 && (
              <EmptyState icon={CheckCircle2} title="Todo en orden" description="No hay alertas pendientes en este momento." />
            )}
            {vm.alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onOpen={() => {
                  const chip = vm.enhancedChips.find((c) => c.id === alert.chipId);
                  if (chip) { switchTab('chips'); openDetail(chip); }
                }}
              />
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: CALENDARIO
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendario' && (
          <div className="space-y-4">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">← Anterior</button>
              <h2 className="text-sm font-black capitalize">{calendarMonthLabel}</h2>
              <button type="button" onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Siguiente →</button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/5">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-black tracking-widest text-slate-400">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calendarCells.map((cell) => (
                  <div
                    key={cell.id}
                    className={`min-h-[80px] sm:min-h-[100px] p-1.5 border-b border-r border-slate-100 dark:border-white/5 last:border-r-0 ${
                      cell.isToday ? 'bg-brand/5' : ''
                    }`}
                  >
                    {cell.isCurrentMonth && (
                      <>
                        <p className={`text-xs font-black mb-1 ${cell.isToday ? 'text-brand' : 'text-slate-400'}`}>{cell.day}</p>
                        <div className="space-y-0.5">
                          {cell.events.slice(0, 2).map((ev) => (
                            <div key={`${cell.id}-${ev.label}`} className={`rounded px-1 py-0.5 text-[9px] font-bold leading-tight truncate border ${TONE[ev.tone || 'slate']}`}>
                              {ev.label}
                            </div>
                          ))}
                          {cell.events.length > 2 && <p className="text-[9px] text-slate-400 font-bold">+{cell.events.length - 2}</p>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming list */}
            {vm.calendarEvents.length > 0 && (
              <Card title="Próximos eventos" icon={Clock}>
                <div className="space-y-2">
                  {vm.calendarEvents.slice(0, 8).map((ev) => (
                    <div key={`${ev.date}-${ev.label}`} className={`rounded-xl border px-3 py-2 flex items-center justify-between ${TONE[ev.tone || 'slate']}`}>
                      <p className="text-sm font-bold truncate">{ev.label}</p>
                      <p className="text-xs font-black opacity-70 ml-3 whitespace-nowrap">{formatDate(ev.date)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: HISTORIAL
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'historial' && (
          <div className="space-y-2">
            {vm.history.length === 0 && (
              <EmptyState icon={History} title="Sin movimientos aún" description="Las acciones quedarán registradas automáticamente." />
            )}
            {vm.history.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{entry.action}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.details}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">{formatDateTime(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: CONFIGURACIÓN
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'configuracion' && (
          <div className="space-y-4 max-w-2xl">

            {/* Rules */}
            <Card title="Reglas automáticas" icon={Settings}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Intervalo de recarga (días)">
                  <input type="number" min="1" value={settingsForm.rechargeIntervalDays} onChange={(e) => setSettingsForm((s) => ({ ...s, rechargeIntervalDays: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Días para recuperar WA">
                  <input type="number" min="1" value={settingsForm.recoveryDays} onChange={(e) => setSettingsForm((s) => ({ ...s, recoveryDays: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Días de uso por defecto">
                  <input type="number" min="1" value={settingsForm.defaultUseDays} onChange={(e) => setSettingsForm((s) => ({ ...s, defaultUseDays: e.target.value }))} className={INPUT} />
                </Field>
                <Field label="Días de descanso por defecto">
                  <input type="number" min="1" value={settingsForm.defaultRestDays} onChange={(e) => setSettingsForm((s) => ({ ...s, defaultRestDays: e.target.value }))} className={INPUT} />
                </Field>
              </div>
              <Field label="Nombre de usuario (historial)">
                <input value={settingsForm.operatorUserLabel} onChange={(e) => setSettingsForm((s) => ({ ...s, operatorUserLabel: e.target.value }))} className={INPUT} placeholder="Administrador" />
              </Field>
              <button type="button" onClick={handleSaveSettings} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
                <Save className="w-4 h-4" /> Guardar ajustes
              </button>
            </Card>

            {/* Operators */}
            <Card title="Operadoras" icon={Database}>
              <div className="flex flex-wrap gap-2 mb-3">
                {state.operators.map((o) => (
                  <span key={o} className="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">{o}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newOperator} onChange={(e) => setNewOperator(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOperator())} className={`${INPUT} flex-1`} placeholder="Nueva operadora…" />
                <button type="button" onClick={addOperator} className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-black transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </Card>

            {/* Tags */}
            <Card title="Etiquetas" icon={Database}>
              <div className="flex flex-wrap gap-2 mb-3">
                {state.tags.map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 dark:border-white/10 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">{t}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} className={`${INPUT} flex-1`} placeholder="Nueva etiqueta…" />
                <button type="button" onClick={addTag} className="rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-black transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </Card>

            {/* Data */}
            <Card title="Datos y respaldo" icon={Download}>
              <div className="grid sm:grid-cols-2 gap-2">
                <button type="button" onClick={handleExportBackup} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-brand/30 hover:text-brand transition-colors">
                  <Download className="w-4 h-4" /> Exportar backup
                </button>
                <button type="button" onClick={handleExportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-brand/30 hover:text-brand transition-colors">
                  <Download className="w-4 h-4" /> Exportar CSV
                </button>
                <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-brand/30 hover:text-brand transition-colors cursor-pointer col-span-full sm:col-span-1">
                  <Upload className="w-4 h-4" /> Importar backup
                  <input type="file" accept="application/json" className="hidden" onChange={handleImportBackup} />
                </label>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chipStatusTone(status) {
  if (status === 'Activo') return 'emerald';
  if (status === 'En riesgo') return 'amber';
  return 'rose';
}

function rotationTone(phase) {
  if (phase === 'En uso') return 'emerald';
  if (phase === 'En descanso') return 'amber';
  return 'slate';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, tone, isText = false }) {
  return (
    <div className={`rounded-2xl border p-4 transition-colors ${TONE[tone]}`}>
      <p className="text-[10px] font-black tracking-widest uppercase opacity-70">{label}</p>
      <p className={`mt-2 font-black ${isText ? 'text-xl' : 'text-3xl'} tracking-tight`}>{value}</p>
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-brand/10 text-brand p-2">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ChipRow({ chip, onClick, isLast }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-slate-100 dark:border-white/5' : ''}`}
    >
      <span className="text-sm font-bold truncate">{chip.alias}</span>
      <span className="text-sm text-slate-500 truncate">{chip.phone}</span>
      <span className="hidden sm:block text-xs text-slate-400">{chip.operator}</span>
      <StatusPill label={chip.effectiveChipStatus} tone={chipStatusTone(chip.effectiveChipStatus)} />
      <span className="hidden md:block">
        {chip.recharge.nextRechargeDate ? (
          <span className={`text-xs font-bold ${chip.recharge.tone === 'rose' ? 'text-rose-500' : chip.recharge.tone === 'amber' ? 'text-amber-500' : 'text-slate-400'}`}>
            {formatDate(chip.recharge.nextRechargeDate)}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </span>
      <Pencil className="w-3.5 h-3.5 text-slate-300" />
    </button>
  );
}

function AlertRow({ alert, onOpen }) {
  const tone = alert.priority === 'Alta' ? 'rose' : alert.priority === 'Media' ? 'amber' : 'slate';
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${TONE[tone]}`}>
      <div className="min-w-0">
        <p className="text-sm font-black truncate">{alert.title}</p>
        <p className="text-xs opacity-80 mt-0.5">{alert.chipAlias} · {alert.subtitle}</p>
      </div>
      <button type="button" onClick={onOpen} className="shrink-0 rounded-lg bg-white/50 dark:bg-black/20 px-3 py-1.5 text-xs font-bold hover:bg-white/80 dark:hover:bg-black/40 transition-colors whitespace-nowrap">
        {alert.actionLabel}
      </button>
    </div>
  );
}

function StatusPill({ label, tone = 'slate' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide whitespace-nowrap ${TONE[tone]}`}>
      {label}
    </span>
  );
}

function AlertPill({ label, tone = 'amber' }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${TONE[tone]}`}>
      {label}
    </span>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-black mt-0.5 ${tone === 'rose' ? 'text-rose-500' : tone === 'amber' ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </label>
  );
}

function BarList({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) return <p className="text-sm text-slate-400">Sin datos aún.</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
            <span className="text-slate-400">{item.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-10 text-center">
      <Icon className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-black hover:opacity-90 transition-opacity">
          {action.label}
        </button>
      )}
    </div>
  );
}

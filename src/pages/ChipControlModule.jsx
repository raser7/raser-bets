import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  Download,
  History,
  Lightbulb,
  ListTodo,
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

const tabs = [
  { id: 'dashboard', label: 'Inicio', icon: BarChart3 },
  { id: 'chips', label: 'Mis lineas', icon: Smartphone },
  { id: 'alertas', label: 'Avisos', icon: AlertTriangle },
  { id: 'calendario', label: 'Fechas', icon: Calendar },
  { id: 'historial', label: 'Movimientos', icon: History },
  { id: 'configuracion', label: 'Ajustes', icon: Settings },
];

const DEFAULT_FORM_SECTION_STATE = {
  recharges: true,
  rotation: false,
  tags: false,
  whatsapp: false,
};

const toneClasses = {
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
};

function loadStoredState() {
  const baseState = createInitialChipControlState();

  if (typeof window === 'undefined') {
    return baseState;
  }

  try {
    const rawState = window.localStorage.getItem(CHIP_CONTROL_STORAGE_KEY);
    if (!rawState) return baseState;

    const parsedState = JSON.parse(rawState);
    return {
      ...baseState,
      ...parsedState,
      chips: Array.isArray(parsedState.chips) ? parsedState.chips : [],
      history: Array.isArray(parsedState.history) ? parsedState.history : [],
      operators: Array.isArray(parsedState.operators) && parsedState.operators.length ? parsedState.operators : DEFAULT_OPERATORS,
      tags: Array.isArray(parsedState.tags) && parsedState.tags.length ? parsedState.tags : DEFAULT_TAGS,
      settings: {
        ...baseState.settings,
        ...(parsedState.settings || {}),
      },
    };
  } catch (error) {
    console.error(error);
    return baseState;
  }
}

function appendHistory(history, action, details, user, chipId = '') {
  return [
    {
      id: generateId('history'),
      action,
      chipId,
      createdAt: new Date().toISOString(),
      details,
      user,
    },
    ...history,
  ].slice(0, 300);
}

function normalizeChipForSave(chipForm, settings) {
  return {
    ...chipForm,
    alias: chipForm.alias.trim(),
    phone: chipForm.phone.trim(),
    location: chipForm.location.trim(),
    notes: chipForm.notes.trim(),
    cost: chipForm.cost === '' ? '' : Number(chipForm.cost),
    otherExpenses: chipForm.otherExpenses === '' ? '' : Number(chipForm.otherExpenses),
    tags: [...new Set(chipForm.tags)],
    whatsapp: {
      ...chipForm.whatsapp,
      blockReason: chipForm.whatsapp.blockReason.trim(),
      notes: chipForm.whatsapp.notes.trim(),
    },
    rotation: {
      ...chipForm.rotation,
      useDays: chipForm.rotation.useDays || String(settings.defaultUseDays || 7),
      restDays: chipForm.rotation.restDays || String(settings.defaultRestDays || 7),
    },
    recharges: (chipForm.recharges || [])
      .filter((recharge) => recharge.date && recharge.amount !== '')
      .map((recharge) => ({
        ...recharge,
        amount: Number(recharge.amount),
        notes: recharge.notes.trim(),
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
  };
}

function normalizeChipForForm(chip, settings) {
  return {
    ...createEmptyChip(settings),
    ...chip,
    cost: chip.cost === '' ? '' : String(chip.cost ?? ''),
    otherExpenses: chip.otherExpenses === '' ? '' : String(chip.otherExpenses ?? ''),
    tags: Array.isArray(chip.tags) ? chip.tags : [],
    whatsapp: {
      ...createEmptyChip(settings).whatsapp,
      ...(chip.whatsapp || {}),
    },
    rotation: {
      ...createEmptyChip(settings).rotation,
      ...(chip.rotation || {}),
      useDays: String(chip.rotation?.useDays ?? settings.defaultUseDays ?? 7),
      restDays: String(chip.rotation?.restDays ?? settings.defaultRestDays ?? 7),
    },
    recharges: (chip.recharges || []).map((recharge) => ({
      ...recharge,
      amount: recharge.amount === '' ? '' : String(recharge.amount ?? ''),
    })),
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

  events.forEach((event) => {
    if (!event.date) return;
    const current = eventMap.get(event.date) || [];
    current.push(event);
    eventMap.set(event.date, current);
  });

  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ id: `empty-${index}`, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const isoDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');

    cells.push({
      date: isoDate,
      day,
      events: eventMap.get(isoDate) || [],
      id: isoDate,
      isCurrentMonth: true,
      isToday: isoDate === todayIso,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ id: `tail-${cells.length}`, isCurrentMonth: false });
  }

  return cells;
}

function getPriorityTone(priority) {
  if (priority === 'Alta') return 'rose';
  if (priority === 'Media') return 'amber';
  return 'slate';
}

function getOpenSectionsFromChip(chip) {
  if (!chip) {
    return { ...DEFAULT_FORM_SECTION_STATE };
  }

  return {
    recharges: true,
    rotation: Boolean(chip.rotation?.useStartDate),
    tags: Boolean(chip.tags?.length),
    whatsapp: Boolean(chip.whatsapp?.createdAt || chip.whatsapp?.blockDate || chip.whatsapp?.blockReason || chip.whatsapp?.notes),
  };
}

function getGuidedActions(viewModel) {
  if (!viewModel.stats.totalChips) {
    return [
      {
        id: 'create-first-chip',
        title: 'Crea tu primera linea',
        description: 'Solo necesitas alias, numero, operadora y estado para empezar.',
        buttonLabel: 'Ir al registro',
        tab: 'chips',
      },
      {
        id: 'set-rules',
        title: 'Revisa los dias automaticos',
        description: 'Confirma cada cuantos dias recargas y cuantos dias dura una recuperacion.',
        buttonLabel: 'Abrir ajustes',
        tab: 'configuracion',
      },
      {
        id: 'add-recharge-later',
        title: 'Agrega recargas cuando las tengas',
        description: 'Si aun no sabes las fechas, puedes guardar la linea primero y completar despues.',
        buttonLabel: 'Entendido',
        tab: 'chips',
      },
    ];
  }

  const actions = [];

  if (viewModel.alerts.length) {
    actions.push({
      id: 'check-alerts',
      title: 'Revisa los avisos pendientes',
      description: 'Hay fechas o lineas que requieren atencion.',
      buttonLabel: 'Ver avisos',
      tab: 'alertas',
    });
  }

  actions.push({
    id: 'review-lines',
    title: 'Revisa tus lineas guardadas',
    description: 'Edita una ficha si cambio el estado, el numero o la fecha de recarga.',
    buttonLabel: 'Ver lineas',
    tab: 'chips',
  });

  actions.push({
    id: 'calendar-check',
    title: 'Mira las proximas fechas',
    description: 'El calendario te muestra recargas, descansos y recuperaciones.',
    buttonLabel: 'Abrir fechas',
    tab: 'calendario',
  });

  return actions.slice(0, 3);
}

export default function ChipControlModule() {
  const navigate = useNavigate();
  const [isAuthorized] = useState(() => isAdminSessionActive());
  const [moduleState, setModuleState] = useState(loadStoredState);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('todos');
  const [chipForm, setChipForm] = useState(() => createEmptyChip(loadStoredState().settings));
  const [openSections, setOpenSections] = useState(() => ({ ...DEFAULT_FORM_SECTION_STATE }));
  const [settingsForm, setSettingsForm] = useState(() => ({
    ...loadStoredState().settings,
  }));
  const [newOperator, setNewOperator] = useState('');
  const [newTag, setNewTag] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    if (!isAuthorized) {
      navigate(getAdminBasePath(), { replace: true });
    }
  }, [isAuthorized, navigate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CHIP_CONTROL_STORAGE_KEY, JSON.stringify(moduleState));
  }, [moduleState]);

  useEffect(() => {
    setSettingsForm({ ...moduleState.settings });
  }, [moduleState.settings]);

  const viewModel = buildChipControlViewModel(moduleState);
  const guidedActions = getGuidedActions(viewModel);
  const hasChips = viewModel.stats.totalChips > 0;
  const filteredChips = viewModel.enhancedChips.filter((chip) => matchesChipSearch(chip, searchTerm, quickFilter));
  const calendarCells = buildCalendarMonth(viewModel.calendarEvents, calendarMonth);
  const calendarMonthLabel = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-white flex items-center justify-center p-6 transition-colors">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-8 shadow-xl transition-colors">
          <p className="text-sm font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400">VERIFICANDO ACCESO ADMIN...</p>
        </div>
      </div>
    );
  }

  const resetChipForm = () => {
    setChipForm(createEmptyChip(moduleState.settings));
    setOpenSections({ ...DEFAULT_FORM_SECTION_STATE });
  };

  const openChipEditor = (chip) => {
    setActiveTab('chips');
    setChipForm(normalizeChipForForm(chip, moduleState.settings));
    setOpenSections(getOpenSectionsFromChip(chip));
  };

  const openNewChipForm = () => {
    setActiveTab('chips');
    resetChipForm();
  };

  const handleGuidedAction = (tab) => {
    if (tab === 'chips') {
      openNewChipForm();
      return;
    }

    setActiveTab(tab);
  };

  const handleSaveChip = (event) => {
    event.preventDefault();

    if (!chipForm.alias.trim() || !chipForm.phone.trim()) {
      alert('Alias y numero telefonico son obligatorios.');
      return;
    }

    const chipToSave = normalizeChipForSave(chipForm, moduleState.settings);

    setModuleState((currentState) => {
      const nextState = {
        ...currentState,
        chips: [...currentState.chips],
        history: [...currentState.history],
      };

      const user = currentState.settings.operatorUserLabel || 'Administrador';
      const existingIndex = nextState.chips.findIndex((chip) => chip.id === chipToSave.id);

      if (existingIndex >= 0) {
        const previousChip = nextState.chips[existingIndex];
        nextState.chips[existingIndex] = chipToSave;
        nextState.history = appendHistory(nextState.history, 'Modificacion', `Se actualizo la ficha de ${chipToSave.alias}.`, user, chipToSave.id);

        if (previousChip.chipStatus !== chipToSave.chipStatus) {
          nextState.history = appendHistory(
            nextState.history,
            'Cambio de estado',
            `${chipToSave.alias} paso de ${previousChip.chipStatus} a ${chipToSave.chipStatus}.`,
            user,
            chipToSave.id
          );
        }

        if (!previousChip.whatsapp?.blockDate && chipToSave.whatsapp.blockDate) {
          nextState.history = appendHistory(
            nextState.history,
            'Bloqueo',
            `Se registro bloqueo de WhatsApp para ${chipToSave.alias}.`,
            user,
            chipToSave.id
          );
        }
      } else {
        chipToSave.id = generateId('chip');
        nextState.chips.unshift(chipToSave);
        nextState.history = appendHistory(nextState.history, 'Creacion de chip', `Se registro el chip ${chipToSave.alias}.`, user, chipToSave.id);
      }

      if (chipToSave.recharges.length) {
        nextState.history = appendHistory(
          nextState.history,
          'Registro de recarga',
          `${chipToSave.alias} tiene ${chipToSave.recharges.length} recarga(s) registrada(s).`,
          user,
          chipToSave.id
        );
      }

      return nextState;
    });

    resetChipForm();
  };

  const handleDeleteChip = (chip) => {
    const confirmed = window.confirm(`Eliminar la ficha de ${chip.alias}?`);
    if (!confirmed) return;

    setModuleState((currentState) => ({
      ...currentState,
      chips: currentState.chips.filter((currentChip) => currentChip.id !== chip.id),
      history: appendHistory(
        currentState.history,
        'Eliminacion',
        `Se elimino el chip ${chip.alias}.`,
        currentState.settings.operatorUserLabel || 'Administrador',
        chip.id
      ),
    }));

    if (chipForm.id === chip.id) {
      resetChipForm();
    }
  };

  const handleSaveSettings = () => {
    setModuleState((currentState) => ({
      ...currentState,
      settings: {
        ...currentState.settings,
        rechargeIntervalDays: Number(settingsForm.rechargeIntervalDays) || 15,
        recoveryDays: Number(settingsForm.recoveryDays) || 90,
        defaultUseDays: Number(settingsForm.defaultUseDays) || 7,
        defaultRestDays: Number(settingsForm.defaultRestDays) || 7,
        operatorUserLabel: settingsForm.operatorUserLabel?.trim() || 'Administrador',
      },
      history: appendHistory(
        currentState.history,
        'Configuracion',
        'Se actualizaron las reglas globales del modulo.',
        settingsForm.operatorUserLabel?.trim() || 'Administrador'
      ),
    }));

    if (!chipForm.id) {
      setChipForm(createEmptyChip({
        defaultUseDays: Number(settingsForm.defaultUseDays) || 7,
        defaultRestDays: Number(settingsForm.defaultRestDays) || 7,
      }));
    }
  };

  const handleExportBackup = () => {
    downloadFile(
      `chips-control-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(moduleState, null, 2),
      'application/json'
    );
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedState = JSON.parse(text);
      const safeState = {
        ...createInitialChipControlState(),
        ...importedState,
        chips: Array.isArray(importedState.chips) ? importedState.chips : [],
        history: Array.isArray(importedState.history) ? importedState.history : [],
        operators: Array.isArray(importedState.operators) && importedState.operators.length ? importedState.operators : DEFAULT_OPERATORS,
        tags: Array.isArray(importedState.tags) && importedState.tags.length ? importedState.tags : DEFAULT_TAGS,
        settings: {
          ...createInitialChipControlState().settings,
          ...(importedState.settings || {}),
        },
      };

      safeState.history = appendHistory(
        safeState.history,
        'Restauracion',
        `Se importo el respaldo ${file.name}.`,
        safeState.settings.operatorUserLabel || 'Administrador'
      );

      setModuleState(safeState);
      resetChipForm();
      alert('Respaldo importado correctamente.');
    } catch (error) {
      console.error(error);
      alert('No se pudo importar el respaldo.');
    } finally {
      event.target.value = '';
    }
  };

  const handleExportChips = () => {
    const rows = viewModel.enhancedChips.map((chip) => ({
      Alias: chip.alias,
      Numero: chip.phone,
      Operadora: chip.operator,
      EstadoChip: chip.effectiveChipStatus,
      EstadoWhatsApp: chip.whatsapp.status,
      ProximaRecarga: chip.recharge.nextRechargeDate || '',
      RecuperacionEstimada: chip.recovery.estimatedRecoveryDate || '',
      Rotacion: chip.rotationState.phase,
      GastosTotales: chip.totalExpenses,
      Etiquetas: chip.tags.join(' | '),
    }));

    downloadFile('inventario-chips.csv', toCsv(rows), 'text/csv;charset=utf-8;');
  };

  const handleExportRecharges = () => {
    const rows = viewModel.enhancedChips.flatMap((chip) =>
      (chip.recharges || []).map((recharge) => ({
        Alias: chip.alias,
        Numero: chip.phone,
        FechaRecarga: recharge.date,
        Monto: recharge.amount,
        MetodoPago: recharge.paymentMethod,
        Observaciones: recharge.notes,
      }))
    );

    downloadFile('historial-recargas.csv', toCsv(rows), 'text/csv;charset=utf-8;');
  };

  const addOperator = () => {
    const value = newOperator.trim();
    if (!value) return;

    setModuleState((currentState) => {
      if (currentState.operators.some((operator) => operator.toLowerCase() === value.toLowerCase())) {
        return currentState;
      }

      return {
        ...currentState,
        operators: [...currentState.operators, value],
        history: appendHistory(
          currentState.history,
          'Operadora',
          `Se agrego la operadora ${value}.`,
          currentState.settings.operatorUserLabel || 'Administrador'
        ),
      };
    });

    setNewOperator('');
  };

  const addTag = () => {
    const value = newTag.trim();
    if (!value) return;

    setModuleState((currentState) => {
      if (currentState.tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
        return currentState;
      }

      return {
        ...currentState,
        tags: [...currentState.tags, value],
        history: appendHistory(
          currentState.history,
          'Etiqueta',
          `Se agrego la etiqueta ${value}.`,
          currentState.settings.operatorUserLabel || 'Administrador'
        ),
      };
    });

    setNewTag('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-100 transition-colors duration-500">
      <div className="border-b border-slate-200 dark:border-white/5 bg-white/85 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8 text-brand" />
              <div>
                <p className="text-[10px] font-black tracking-[0.25em] text-brand uppercase">Modulo Separado</p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Control de Chips y Lineas</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pensado para trabajar paso a paso, sin enredarte.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(getAdminBasePath())}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors hover:border-brand/30 hover:text-brand"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al Admin
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-bold transition-colors hover:bg-brand hover:text-black"
              >
                <Download className="w-4 h-4" />
                Backup JSON
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black tracking-[0.18em] uppercase transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand text-black shadow-[0_10px_30px_rgba(5,150,105,0.2)]'
                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-brand'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Chips" value={viewModel.stats.totalChips} tone="slate" />
              <MetricCard label="Activos" value={viewModel.stats.totalActiveChips} tone="emerald" />
              <MetricCard label="Suspendidos / Baja" value={viewModel.stats.totalSuspendedChips + viewModel.stats.totalDroppedChips} tone="rose" />
              <MetricCard label="Alertas Pendientes" value={viewModel.stats.alertsPending} tone="amber" />
              <MetricCard label="WhatsApp Activos" value={viewModel.stats.totalWhatsAppActive} tone="emerald" />
              <MetricCard label="WhatsApp Bloqueados" value={viewModel.stats.totalWhatsAppBlocked} tone="rose" />
              <MetricCard label="Numeros en Descanso" value={viewModel.stats.totalResting} tone="amber" />
              <MetricCard label="Numeros Disponibles" value={viewModel.stats.totalAvailable} tone="slate" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
              <SectionCard
                icon={ListTodo}
                title={hasChips ? 'Siguiente paso recomendado' : 'Empieza rapido'}
                subtitle={hasChips ? 'Acciones utiles sin tapar el resumen principal.' : 'Primero guarda una linea y luego completa el resto cuando quieras.'}
              >
                <div className="grid gap-3 lg:grid-cols-3">
                  {guidedActions.map((action) => (
                    <GuidedActionCard
                      key={action.id}
                      action={action}
                      onClick={() => handleGuidedAction(action.tab)}
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                icon={Lightbulb}
                title="Ayuda rapida"
                subtitle="Solo lo esencial para entender el modulo"
              >
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <FriendlyBullet>Calcula la proxima recarga automaticamente.</FriendlyBullet>
                  <FriendlyBullet>Cuenta los dias de recuperacion de WhatsApp.</FriendlyBullet>
                  <FriendlyBullet>Te muestra si una linea esta en uso, en descanso o disponible.</FriendlyBullet>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                icon={Wallet}
                title="Control financiero"
                subtitle="Gastos automaticos del inventario y las recargas"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ValuePanel label="Gastos del mes" value={formatCurrency(viewModel.stats.monthlyExpenses)} />
                  <ValuePanel label="Gastos totales" value={formatCurrency(viewModel.stats.totalExpenses)} />
                </div>
              </SectionCard>

              <SectionCard
                icon={AlertTriangle}
                title="Proximas acciones"
                subtitle="Lo mas urgente que el sistema detecta ahora mismo"
              >
                <div className="space-y-3">
                  {viewModel.alerts.slice(0, 5).map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onOpenChip={() => {
                        const chip = viewModel.enhancedChips.find((item) => item.id === alert.chipId);
                        if (chip) openChipEditor(chip);
                      }}
                    />
                  ))}

                  {!viewModel.alerts.length && (
                    <EmptyState
                      icon={CheckCircle2}
                      title="Todo en orden"
                      description="No hay alertas pendientes en este momento."
                    />
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard icon={BarChart3} title="Chips por operadora" subtitle="Distribucion actual del inventario">
                <BarList items={viewModel.charts.chipsByOperator} formatValue={(value) => `${value}`} />
              </SectionCard>

              <SectionCard icon={Smartphone} title="Estados de los chips" subtitle="Estado efectivo considerando recargas vencidas">
                <BarList items={viewModel.charts.chipsByStatus} formatValue={(value) => `${value}`} />
              </SectionCard>

              <SectionCard icon={Wallet} title="Gastos por mes" subtitle="Ultimos 6 meses del modulo">
                <BarList items={viewModel.charts.expensesByMonth} formatValue={(value) => formatCurrency(value)} />
              </SectionCard>

              <SectionCard icon={MessageCircle} title="Bloqueos y recuperaciones" subtitle="Comparativo de eventos por mes">
                <div className="grid gap-6 sm:grid-cols-2">
                  <BarList items={viewModel.charts.blocksByMonth} formatValue={(value) => `${value}`} />
                  <BarList items={viewModel.charts.recoveryByMonth} formatValue={(value) => `${value}`} />
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === 'chips' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.92fr)] 2xl:grid-cols-[minmax(0,1.34fr)_minmax(380px,0.9fr)]">
            <SectionCard
              icon={chipForm.id ? Pencil : Plus}
              title={chipForm.id ? 'Editar linea guardada' : 'Registrar una linea nueva'}
              subtitle="Primero guarda lo basico. Todo lo demas lo puedes completar despues."
            >
              <form onSubmit={handleSaveChip} className="space-y-6">
                <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4 text-sm text-slate-700 dark:text-slate-100">
                  <p className="font-black text-brand uppercase tracking-[0.16em] text-[11px] mb-2">Forma facil de usarlo</p>
                  <p className="font-medium leading-relaxed">
                    Si quieres avanzar rapido, llena solo <strong>alias</strong>, <strong>numero</strong>, <strong>operadora</strong> y <strong>estado</strong>.
                    Luego guardas. Despues puedes volver y completar WhatsApp, recargas o descansos.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">1. Datos basicos</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Esto es lo minimo recomendado para crear la linea.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label="Alias" required hint="Pon un nombre corto para reconocer esta linea rapido. Ejemplo: Principal 01.">
                      <input
                        value={chipForm.alias}
                        onChange={(event) => setChipForm((current) => ({ ...current, alias: event.target.value }))}
                        className={inputClass}
                        placeholder="Ej: Principal 01"
                      />
                    </Field>

                    <Field label="Numero telefonico" required hint="Escribe el numero tal como lo usas normalmente.">
                      <input
                        value={chipForm.phone}
                        onChange={(event) => setChipForm((current) => ({ ...current, phone: event.target.value }))}
                        className={inputClass}
                        placeholder="+51 999 000 111"
                      />
                    </Field>

                    <Field label="Operadora" hint="Selecciona la empresa del chip.">
                      <select
                        value={chipForm.operator}
                        onChange={(event) => setChipForm((current) => ({ ...current, operator: event.target.value }))}
                        className={inputClass}
                      >
                        {moduleState.operators.map((operator) => (
                          <option key={operator} value={operator}>
                            {operator}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Estado del chip" hint="Usa Activo si la linea se puede usar hoy.">
                      <select
                        value={chipForm.chipStatus}
                        onChange={(event) => setChipForm((current) => ({ ...current, chipStatus: event.target.value }))}
                        className={inputClass}
                      >
                        {CHIP_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Fecha de compra" hint="Opcional. Sirve para reportes y gastos.">
                      <input
                        type="date"
                        value={chipForm.purchaseDate}
                        onChange={(event) => setChipForm((current) => ({ ...current, purchaseDate: event.target.value }))}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Fecha de activacion" hint="Si la sabes, ayudara a calcular mejor las recargas.">
                      <input
                        type="date"
                        value={chipForm.activationDate}
                        onChange={(event) => setChipForm((current) => ({ ...current, activationDate: event.target.value }))}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Ubicacion fisica" hint="Ejemplo: Caja A, slot 3 o telefono de prueba.">
                      <input
                        value={chipForm.location}
                        onChange={(event) => setChipForm((current) => ({ ...current, location: event.target.value }))}
                        className={inputClass}
                        placeholder="Caja A / Slot 4"
                      />
                    </Field>

                    <Field label="Costo del chip" hint="Opcional. Si no lo sabes ahora, puedes dejarlo vacio.">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={chipForm.cost}
                        onChange={(event) => setChipForm((current) => ({ ...current, cost: event.target.value }))}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </Field>

                    <Field label="Otros gastos" hint="Ejemplo: envio, accesorios o un gasto extra relacionado.">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={chipForm.otherExpenses}
                        onChange={(event) => setChipForm((current) => ({ ...current, otherExpenses: event.target.value }))}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </Field>
                  </div>
                </div>

                <Field label="Observaciones" hint="Anota cualquier detalle util para recordarlo despues.">
                  <textarea
                    value={chipForm.notes}
                    onChange={(event) => setChipForm((current) => ({ ...current, notes: event.target.value }))}
                    className={`${inputClass} min-h-[90px] resize-none`}
                    placeholder="Notas generales de la linea"
                  />
                </Field>

                <div className="grid gap-6 2xl:grid-cols-2">
                  <div className="space-y-6">
                    <CollapsibleSection
                      title="2. Datos de WhatsApp"
                      description="Abre esta parte solo si esta linea tiene o tuvo cuenta de WhatsApp."
                      badge="Opcional"
                      isOpen={openSections.whatsapp}
                      onToggle={() => setOpenSections((current) => ({ ...current, whatsapp: !current.whatsapp }))}
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Fecha de creacion" hint="Dia en que se creo la cuenta de WhatsApp, si lo recuerdas.">
                          <input
                            type="date"
                            value={chipForm.whatsapp.createdAt}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                whatsapp: { ...current.whatsapp, createdAt: event.target.value },
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Estado de WhatsApp" hint="Usa Bloqueado si la cuenta ya no entra.">
                          <select
                            value={chipForm.whatsapp.status}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                whatsapp: { ...current.whatsapp, status: event.target.value },
                              }))
                            }
                            className={inputClass}
                          >
                            {WHATSAPP_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Fecha de bloqueo" hint="Si la cuenta se bloqueo, esta fecha activa el contador automatico de recuperacion.">
                          <input
                            type="date"
                            value={chipForm.whatsapp.blockDate}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                whatsapp: { ...current.whatsapp, blockDate: event.target.value },
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Motivo del bloqueo" hint="Ejemplo: spam, verificacion, sin actividad, etc.">
                          <input
                            value={chipForm.whatsapp.blockReason}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                whatsapp: { ...current.whatsapp, blockReason: event.target.value },
                              }))
                            }
                            className={inputClass}
                            placeholder="Spam, verificacion, etc."
                          />
                        </Field>
                      </div>

                      <Field label="Observaciones de WhatsApp" hint="Puedes anotar si ya hiciste apelacion, cuando volver a revisar o cualquier detalle.">
                        <textarea
                          value={chipForm.whatsapp.notes}
                          onChange={(event) =>
                            setChipForm((current) => ({
                              ...current,
                              whatsapp: { ...current.whatsapp, notes: event.target.value },
                            }))
                          }
                          className={`${inputClass} min-h-[90px] resize-none`}
                          placeholder="Notas de recuperacion, estado o incidencias"
                        />
                      </Field>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="3. Uso y descanso"
                      description="Sirve para controlar cuando una linea esta en uso, cuando descansa y cuando vuelve a estar disponible."
                      badge="Opcional"
                      isOpen={openSections.rotation}
                      onToggle={() => setOpenSections((current) => ({ ...current, rotation: !current.rotation }))}
                    >
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Inicio de uso" hint="Dia en que empezaste a usar esta linea.">
                          <input
                            type="date"
                            value={chipForm.rotation.useStartDate}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                rotation: { ...current.rotation, useStartDate: event.target.value },
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Dias de uso" hint="Cuantos dias se usa antes de descansar.">
                          <input
                            type="number"
                            min="1"
                            value={chipForm.rotation.useDays}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                rotation: { ...current.rotation, useDays: event.target.value },
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Dias de descanso" hint="Cuantos dias descansa antes de volver a estar disponible.">
                          <input
                            type="number"
                            min="1"
                            value={chipForm.rotation.restDays}
                            onChange={(event) =>
                              setChipForm((current) => ({
                                ...current,
                                rotation: { ...current.rotation, restDays: event.target.value },
                              }))
                            }
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </CollapsibleSection>
                  </div>

                  <div className="space-y-6">
                    <CollapsibleSection
                      title="4. Historial de recargas"
                      description="Muy recomendado. Con estas fechas el sistema puede avisarte cuando una linea esta por vencer."
                      badge="Recomendado"
                      isOpen={openSections.recharges}
                      onToggle={() => setOpenSections((current) => ({ ...current, recharges: !current.recharges }))}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Recargas guardadas</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Puedes poner una o varias. Si no sabes todas, empieza con la ultima.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setChipForm((current) => ({
                              ...current,
                              recharges: [...current.recharges, createEmptyRecharge()],
                            }))
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-3 py-2 text-xs font-black tracking-[0.14em] uppercase text-brand transition-colors hover:bg-brand hover:text-black"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar recarga
                        </button>
                      </div>

                      <div className="space-y-3">
                        {chipForm.recharges.map((recharge, index) => (
                          <div key={recharge.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 transition-colors">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <p className="text-xs font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-300">Recarga {index + 1}</p>
                              <button
                                type="button"
                                onClick={() =>
                                  setChipForm((current) => ({
                                    ...current,
                                    recharges: current.recharges.filter((item) => item.id !== recharge.id),
                                  }))
                                }
                                className="text-rose-500 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Fecha">
                                <input
                                  type="date"
                                  value={recharge.date}
                                  onChange={(event) =>
                                    setChipForm((current) => ({
                                      ...current,
                                      recharges: current.recharges.map((item) =>
                                        item.id === recharge.id ? { ...item, date: event.target.value } : item
                                      ),
                                    }))
                                  }
                                  className={inputClass}
                                />
                              </Field>

                              <Field label="Monto">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={recharge.amount}
                                  onChange={(event) =>
                                    setChipForm((current) => ({
                                      ...current,
                                      recharges: current.recharges.map((item) =>
                                        item.id === recharge.id ? { ...item, amount: event.target.value } : item
                                      ),
                                    }))
                                  }
                                  className={inputClass}
                                />
                              </Field>

                              <Field label="Metodo de pago">
                                <select
                                  value={recharge.paymentMethod}
                                  onChange={(event) =>
                                    setChipForm((current) => ({
                                      ...current,
                                      recharges: current.recharges.map((item) =>
                                        item.id === recharge.id ? { ...item, paymentMethod: event.target.value } : item
                                      ),
                                    }))
                                  }
                                  className={inputClass}
                                >
                                  {PAYMENT_METHOD_OPTIONS.map((paymentMethod) => (
                                    <option key={paymentMethod} value={paymentMethod}>
                                      {paymentMethod}
                                    </option>
                                  ))}
                                </select>
                              </Field>

                              <Field label="Observaciones">
                                <input
                                  value={recharge.notes}
                                  onChange={(event) =>
                                    setChipForm((current) => ({
                                      ...current,
                                      recharges: current.recharges.map((item) =>
                                        item.id === recharge.id ? { ...item, notes: event.target.value } : item
                                      ),
                                    }))
                                  }
                                  className={inputClass}
                                  placeholder="Recarga manual, combo, etc."
                                />
                              </Field>
                            </div>
                          </div>
                        ))}

                        {!chipForm.recharges.length && (
                          <EmptyState
                            icon={RefreshCcw}
                            title="Sin recargas cargadas"
                            description="Agrega historial para calcular vencimientos y alertas automáticas."
                          />
                        )}
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      title="5. Etiquetas rapidas"
                      description="Te ayudan a reconocer mejor la linea sin escribir tanto."
                      badge="Opcional"
                      isOpen={openSections.tags}
                      onToggle={() => setOpenSections((current) => ({ ...current, tags: !current.tags }))}
                    >
                      <div className="flex flex-wrap gap-2">
                        {moduleState.tags.map((tag) => {
                          const isActive = chipForm.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setChipForm((current) => ({
                                  ...current,
                                  tags: isActive ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
                                }))
                              }
                              className={`rounded-full px-3 py-2 text-[11px] font-black tracking-[0.16em] uppercase transition-colors ${
                                isActive
                                  ? 'bg-brand text-black'
                                  : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-300'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleSection>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black tracking-[0.16em] uppercase text-black transition-colors hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black"
                  >
                    <Save className="w-4 h-4" />
                    {chipForm.id ? 'Guardar cambios' : 'Crear ficha'}
                  </button>

                  <button
                    type="button"
                    onClick={resetChipForm}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-black tracking-[0.16em] uppercase text-slate-600 dark:text-slate-200 transition-colors hover:border-brand/30 hover:text-brand"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Limpiar
                  </button>
                </div>
              </form>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard icon={Lightbulb} title="Ayuda rapida" subtitle="Lo importante del formulario, en corto">
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <FriendlyBullet>No tienes que llenar todo en la primera visita.</FriendlyBullet>
                  <FriendlyBullet>Si agregas una fecha de bloqueo, el sistema contara 90 dias automaticamente.</FriendlyBullet>
                  <FriendlyBullet>Si agregas una recarga, el sistema calcula la siguiente fecha de vencimiento.</FriendlyBullet>
                  <FriendlyBullet>Puedes editar cualquier linea despues, no pasa nada si hoy solo registras lo basico.</FriendlyBullet>
                </div>
              </SectionCard>

              <SectionCard icon={Search} title="Inventario y filtros" subtitle="Busca una linea, editala o crea otra nueva">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Mostrando <strong>{filteredChips.length}</strong> de <strong>{viewModel.enhancedChips.length}</strong> lineas guardadas.
                  </p>
                  <button
                    type="button"
                    onClick={openNewChipForm}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-brand transition-colors hover:bg-brand hover:text-black"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva linea
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className={`${inputClass} pl-11`}
                      placeholder="Buscar numero, alias, operadora o estado"
                    />
                  </div>

                  <select
                    value={quickFilter}
                    onChange={(event) => setQuickFilter(event.target.value)}
                    className={inputClass}
                  >
                    {QUICK_FILTERS.map((filter) => (
                      <option key={filter.id} value={filter.id}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </div>
              </SectionCard>

              <div className="space-y-4">
                {filteredChips.map((chip) => (
                  <ChipCard
                    key={chip.id}
                    chip={chip}
                    onDelete={() => handleDeleteChip(chip)}
                    onEdit={() => openChipEditor(chip)}
                  />
                ))}

                {!filteredChips.length && (
                  <EmptyState
                    icon={Smartphone}
                    title="No se encontraron chips"
                    description="Prueba otro filtro o usa el boton Nueva linea para registrar una ficha simple."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alertas' && (
          <SectionCard icon={AlertTriangle} title="Centro de alertas" subtitle="Recargas, recuperaciones, rotacion y datos incompletos">
            <div className="space-y-4">
              {viewModel.alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onOpenChip={() => {
                    const chip = viewModel.enhancedChips.find((item) => item.id === alert.chipId);
                    if (chip) openChipEditor(chip);
                  }}
                />
              ))}

              {!viewModel.alerts.length && (
                <EmptyState
                  icon={CheckCircle2}
                  title="Sin alertas activas"
                  description="El modulo no detecta vencimientos ni bloqueos urgentes."
                />
              )}
            </div>
          </SectionCard>
        )}

        {activeTab === 'calendario' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <SectionCard icon={Calendar} title="Calendario operativo" subtitle="Recargas, recuperaciones y cambios de ciclo">
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-300 transition-colors hover:text-brand"
                >
                  Mes anterior
                </button>

                <h3 className="text-sm sm:text-base font-black tracking-[0.16em] uppercase text-slate-700 dark:text-slate-200">
                  {calendarMonthLabel}
                </h3>

                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-xs font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-300 transition-colors hover:text-brand"
                >
                  Mes siguiente
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-[11px] font-black tracking-[0.16em] uppercase text-slate-400 dark:text-slate-500">
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                  <div key={day} className="px-2 py-1 text-center">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => (
                  <div
                    key={cell.id}
                    className={`min-h-[110px] rounded-2xl border p-2 transition-colors ${
                      cell.isCurrentMonth
                        ? cell.isToday
                          ? 'border-brand bg-brand/10'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5'
                        : 'border-transparent bg-transparent'
                    }`}
                  >
                    {cell.isCurrentMonth && (
                      <>
                        <div className="text-xs font-black mb-2">{cell.day}</div>
                        <div className="space-y-1">
                          {cell.events.slice(0, 3).map((event) => (
                            <div
                              key={`${cell.id}-${event.label}`}
                              className={`rounded-lg px-2 py-1 text-[10px] font-bold leading-tight ${toneClasses[event.tone || 'slate']}`}
                            >
                              {event.label}
                            </div>
                          ))}
                          {cell.events.length > 3 && (
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              +{cell.events.length - 3} eventos
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard icon={Clock3} title="Agenda proxima" subtitle="Lista cronologica de los siguientes eventos">
              <div className="space-y-3">
                {viewModel.calendarEvents.slice(0, 12).map((event) => (
                  <div
                    key={`${event.date}-${event.label}`}
                    className={`rounded-2xl border px-4 py-3 ${toneClasses[event.tone || 'slate']}`}
                  >
                    <p className="text-[10px] font-black tracking-[0.16em] uppercase mb-1">{formatDate(event.date)}</p>
                    <p className="text-sm font-bold">{event.label}</p>
                  </div>
                ))}

                {!viewModel.calendarEvents.length && (
                  <EmptyState
                    icon={Calendar}
                    title="Sin eventos calendarizados"
                    description="Registra recargas, bloqueos o ciclos para poblar esta vista."
                  />
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === 'historial' && (
          <SectionCard icon={History} title="Historial general" subtitle="Registro automatico de acciones del modulo">
            <div className="space-y-3">
              {viewModel.history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-4 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <p className="text-sm font-black text-slate-800 dark:text-white">{entry.action}</p>
                    <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{entry.details}</p>
                  <p className="mt-2 text-[11px] font-bold tracking-[0.16em] uppercase text-brand">
                    Usuario: {entry.user || 'Administrador'}
                  </p>
                </div>
              ))}

              {!viewModel.history.length && (
                <EmptyState
                  icon={History}
                  title="Sin historial aun"
                  description="Las acciones se iran registrando a medida que uses el modulo."
                />
              )}
            </div>
          </SectionCard>
        )}

        {activeTab === 'configuracion' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard icon={Settings} title="Reglas globales" subtitle="Parametros automaticos del sistema">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Intervalo de recarga (dias)">
                    <input
                      type="number"
                      min="1"
                      value={settingsForm.rechargeIntervalDays}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, rechargeIntervalDays: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Recuperacion de WhatsApp (dias)">
                    <input
                      type="number"
                      min="1"
                      value={settingsForm.recoveryDays}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, recoveryDays: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Uso por defecto (dias)">
                    <input
                      type="number"
                      min="1"
                      value={settingsForm.defaultUseDays}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, defaultUseDays: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Descanso por defecto (dias)">
                    <input
                      type="number"
                      min="1"
                      value={settingsForm.defaultRestDays}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, defaultRestDays: event.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Usuario del historial">
                  <input
                    value={settingsForm.operatorUserLabel}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, operatorUserLabel: event.target.value }))}
                    className={inputClass}
                    placeholder="Administrador"
                  />
                </Field>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black tracking-[0.16em] uppercase text-black transition-colors hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black"
                >
                  <Save className="w-4 h-4" />
                  Guardar configuracion
                </button>
              </div>
            </SectionCard>

            <SectionCard icon={Database} title="Catalogos y respaldos" subtitle="Operadoras, etiquetas y exportaciones">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-black tracking-[0.16em] uppercase text-slate-600 dark:text-slate-300">Operadoras</h3>
                  <div className="flex flex-wrap gap-2">
                    {moduleState.operators.map((operator) => (
                      <span
                        key={operator}
                        className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[11px] font-black tracking-[0.14em] uppercase text-slate-600 dark:text-slate-200"
                      >
                        {operator}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={newOperator}
                      onChange={(event) => setNewOperator(event.target.value)}
                      className={inputClass}
                      placeholder="Nueva operadora"
                    />
                    <button
                      type="button"
                      onClick={addOperator}
                      className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-brand transition-colors hover:bg-brand hover:text-black"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-black tracking-[0.16em] uppercase text-slate-600 dark:text-slate-300">Etiquetas</h3>
                  <div className="flex flex-wrap gap-2">
                    {moduleState.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[11px] font-black tracking-[0.14em] uppercase text-slate-600 dark:text-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={newTag}
                      onChange={(event) => setNewTag(event.target.value)}
                      className={inputClass}
                      placeholder="Nueva etiqueta"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-brand transition-colors hover:bg-brand hover:text-black"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleExportChips}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-slate-700 dark:text-slate-100 transition-colors hover:border-brand/30 hover:text-brand"
                  >
                    <Download className="w-4 h-4" />
                    Exportar chips
                  </button>

                  <button
                    type="button"
                    onClick={handleExportRecharges}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-slate-700 dark:text-slate-100 transition-colors hover:border-brand/30 hover:text-brand"
                  >
                    <Download className="w-4 h-4" />
                    Exportar recargas
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-slate-700 dark:text-slate-100 transition-colors hover:border-brand/30 hover:text-brand"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </button>

                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-black tracking-[0.14em] uppercase text-slate-700 dark:text-slate-100 transition-colors hover:border-brand/30 hover:text-brand">
                    <Upload className="w-4 h-4" />
                    Importar backup
                    <input type="file" accept="application/json" className="hidden" onChange={handleImportBackup} />
                  </label>
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, tone, value }) {
  return (
    <div className={`rounded-3xl border p-5 transition-colors ${toneClasses[tone]}`}>
      <p className="text-[11px] font-black tracking-[0.2em] uppercase opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function ValuePanel({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 transition-colors">
      <p className="text-[10px] font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function SectionCard({ children, icon: Icon, subtitle, title }) {
  return (
    <section className="rounded-[28px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5 sm:p-6 shadow-sm transition-colors">
      <div className="flex items-start gap-3 mb-5">
        <div className="rounded-2xl bg-brand/10 text-brand p-3">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function GuidedActionCard({ action, onClick }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 transition-colors">
      <p className="text-sm font-black text-slate-900 dark:text-white">{action.title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{action.description}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-black tracking-[0.14em] uppercase text-black transition-colors hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black"
      >
        {action.buttonLabel}
      </button>
    </div>
  );
}

function FriendlyBullet({ children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
      <p>{children}</p>
    </div>
  );
}

function CollapsibleSection({ badge, children, description, isOpen, onToggle, title }) {
  return (
    <div className="border-t border-slate-200 dark:border-white/10 pt-5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-4 text-left transition-colors hover:border-brand/30"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">{title}</p>
              {badge && (
                <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] uppercase text-brand">
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>

          <span className="rounded-full border border-slate-200 dark:border-white/10 p-2 text-slate-500 dark:text-slate-300">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {isOpen && <div className="pt-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ children, hint, label, required = false }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>}
    </label>
  );
}

function ChipCard({ chip, onDelete, onEdit }) {
  return (
    <article className="rounded-[28px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0c] p-5 shadow-sm transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-black tracking-tight">{chip.alias}</p>
            <StatusPill label={chip.effectiveChipStatus} tone={chip.effectiveChipStatus === 'Activo' ? 'emerald' : chip.effectiveChipStatus === 'En riesgo' ? 'amber' : 'rose'} />
            <StatusPill label={chip.rotationState.phase} tone={chip.rotationState.phase === 'Disponible' ? 'slate' : chip.rotationState.phase === 'En descanso' ? 'amber' : 'emerald'} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-sm text-slate-600 dark:text-slate-300">
            <InfoLine label="Numero" value={chip.phone} />
            <InfoLine label="Operadora" value={chip.operator} />
            <InfoLine label="WhatsApp" value={chip.whatsapp.status} />
            <InfoLine label="Ubicacion" value={chip.location || '--'} />
            <InfoLine label="Proxima recarga" value={chip.recharge.nextRechargeDate ? formatDate(chip.recharge.nextRechargeDate) : '--'} />
            <InfoLine label="Recuperacion" value={chip.recovery.estimatedRecoveryDate ? formatDate(chip.recovery.estimatedRecoveryDate) : '--'} />
            <InfoLine label="Gasto total" value={formatCurrency(chip.totalExpenses)} />
            <InfoLine label="Etiquetas" value={chip.tags.length ? chip.tags.join(', ') : '--'} />
          </div>

          {(chip.recharge.alertLabel || chip.recovery.alertLabel || chip.rotationState.alertLabel) && (
            <div className="flex flex-wrap gap-2">
              {chip.recharge.alertLabel && <StatusPill label={chip.recharge.alertLabel} tone={chip.recharge.tone} />}
              {chip.recovery.alertLabel && <StatusPill label={chip.recovery.alertLabel} tone={chip.recovery.tone} />}
              {chip.rotationState.alertLabel && <StatusPill label={chip.rotationState.alertLabel} tone={getPriorityTone(chip.rotationState.priority)} />}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-xs font-black tracking-[0.14em] uppercase text-slate-600 dark:text-slate-200 transition-colors hover:border-brand/30 hover:text-brand"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 text-xs font-black tracking-[0.14em] uppercase text-rose-600 dark:text-rose-300 transition-colors hover:bg-rose-100 dark:hover:bg-rose-500/20"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}

function BarList({ formatValue, items }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
            <p className="text-xs font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400">
              {formatValue(item.value)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}

      {!items.length && (
        <EmptyState
          icon={BarChart3}
          title="Sin datos aun"
          description="Agrega registros para empezar a ver distribuciones."
        />
      )}
    </div>
  );
}

function AlertRow({ alert, onOpenChip }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 transition-colors ${toneClasses[getPriorityTone(alert.priority)]}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.16em] uppercase opacity-80">{alert.priority} prioridad</p>
          <p className="text-base font-black">{alert.title}</p>
          <p className="text-sm opacity-90">
            {alert.chipAlias} · {alert.chipPhone}
          </p>
          <p className="text-sm opacity-80 mt-1">{alert.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onOpenChip}
          className="rounded-xl bg-white/70 dark:bg-black/30 px-4 py-2 text-xs font-black tracking-[0.14em] uppercase transition-colors hover:bg-white dark:hover:bg-black/50"
        >
          {alert.actionLabel}
        </button>
      </div>
    </div>
  );
}

function StatusPill({ label, tone = 'slate' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.16em] uppercase ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-3 transition-colors">
      <p className="text-[10px] font-black tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-800 dark:text-slate-200 break-all">{value}</p>
    </div>
  );
}

function EmptyState({ description, icon: Icon, title }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-5 py-10 text-center transition-colors">
      <Icon className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-black text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#050505] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition-colors focus:border-brand/40';

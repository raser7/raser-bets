export const CHIP_CONTROL_STORAGE_KEY = 'raserbets_chip_control_module_v1';

export const DEFAULT_OPERATORS = ['Claro', 'Movistar', 'Entel', 'Bitel', 'Otras'];
export const DEFAULT_TAGS = ['Principal', 'Secundario', 'Nuevo', 'Recuperable', 'Activo', 'Respaldo', 'Observacion'];
export const CHIP_STATUS_OPTIONS = ['Activo', 'Suspendido', 'En riesgo', 'Perdido', 'Dado de baja'];
export const WHATSAPP_STATUS_OPTIONS = ['Activo', 'Bloqueado temporalmente', 'Bloqueado', 'Recuperado', 'Eliminado'];
export const PAYMENT_METHOD_OPTIONS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta', 'Otro'];
export const QUICK_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'bloqueados', label: 'Bloqueados' },
  { id: 'recuperables', label: 'Recuperables' },
  { id: 'recarga-pendiente', label: 'Con recarga pendiente' },
  { id: 'descanso', label: 'En descanso' },
  { id: 'disponibles', label: 'Disponibles' },
];

const PRIORITY_WEIGHT = { Alta: 0, Media: 1, Baja: 2 };
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function generateId(prefix = 'item') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function createInitialChipControlState() {
  return {
    chips: [],
    operators: DEFAULT_OPERATORS,
    tags: DEFAULT_TAGS,
    settings: {
      rechargeIntervalDays: 15,
      recoveryDays: 90,
      defaultUseDays: 7,
      defaultRestDays: 7,
      operatorUserLabel: 'Administrador',
    },
    history: [],
  };
}

export function createEmptyRecharge() {
  return {
    id: generateId('recharge'),
    date: getTodayIsoDate(),
    amount: '',
    paymentMethod: PAYMENT_METHOD_OPTIONS[0],
    notes: '',
  };
}

export function createEmptyChip(settings) {
  return {
    id: '',
    alias: '',
    phone: '',
    operator: DEFAULT_OPERATORS[0],
    purchaseDate: '',
    activationDate: '',
    chipStatus: CHIP_STATUS_OPTIONS[0],
    location: '',
    notes: '',
    cost: '',
    otherExpenses: '',
    tags: [],
    whatsapp: {
      createdAt: '',
      status: WHATSAPP_STATUS_OPTIONS[0],
      blockDate: '',
      blockReason: '',
      notes: '',
    },
    rotation: {
      useStartDate: '',
      useDays: String(settings?.defaultUseDays || 7),
      restDays: String(settings?.defaultRestDays || 7),
    },
    recharges: [],
  };
}

export function formatDate(value) {
  if (!value) return '--';
  const date = toDate(value);
  if (!date) return '--';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function getTodayIsoDate() {
  return toIsoDate(new Date());
}

export function buildChipControlViewModel(state) {
  const todayIso = getTodayIsoDate();
  const enhancedChips = (state.chips || [])
    .map((chip) => enrichChip(chip, state.settings, todayIso))
    .sort((a, b) => {
      const attentionDiff = Number(b.hasPriorityAlert) - Number(a.hasPriorityAlert);
      if (attentionDiff !== 0) return attentionDiff;
      return a.alias.localeCompare(b.alias, 'es');
    });

  const alerts = buildAlerts(enhancedChips);
  const stats = buildStats(enhancedChips, alerts);
  const charts = buildCharts(enhancedChips);
  const calendarEvents = buildCalendarEvents(enhancedChips);
  const history = [...(state.history || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return {
    alerts,
    calendarEvents,
    charts,
    enhancedChips,
    history,
    stats,
    upcomingRecharges: alerts.filter((alert) => alert.kind === 'recharge').slice(0, 6),
    upcomingRecoveries: alerts.filter((alert) => alert.kind === 'recovery').slice(0, 6),
  };
}

export function matchesChipSearch(chip, searchTerm, quickFilter) {
  const query = searchTerm.trim().toLowerCase();
  const haystack = [
    chip.alias,
    chip.phone,
    chip.operator,
    chip.effectiveChipStatus,
    chip.whatsapp.status,
    chip.location,
    chip.tags.join(' '),
    chip.purchaseDate,
    chip.activationDate,
  ]
    .join(' ')
    .toLowerCase();

  const searchOk = !query || haystack.includes(query);
  if (!searchOk) return false;

  switch (quickFilter) {
    case 'activos':
      return chip.effectiveChipStatus === 'Activo';
    case 'bloqueados':
      return ['Bloqueado', 'Bloqueado temporalmente'].includes(chip.whatsapp.status);
    case 'recuperables':
      return chip.recovery.active;
    case 'recarga-pendiente':
      return chip.recharge.status !== 'Al dia';
    case 'descanso':
      return chip.rotationState.phase === 'En descanso';
    case 'disponibles':
      return chip.rotationState.phase === 'Disponible';
    default:
      return true;
  }
}

export function toCsv(rows) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => stringifyCsvValue(row[header]))
        .join(',')
    ),
  ];

  return lines.join('\n');
}

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function enrichChip(chip, settings, todayIso) {
  const recharge = getRechargeStatus(chip, settings, todayIso);
  const recovery = getRecoveryStatus(chip, settings, todayIso);
  const rotationState = getRotationState(chip, settings, todayIso);
  const effectiveChipStatus = chip.chipStatus === 'Activo' && recharge.isRisk ? 'En riesgo' : chip.chipStatus;
  const totalRechargeAmount = (chip.recharges || []).reduce((total, rechargeItem) => total + normalizeAmount(rechargeItem.amount), 0);
  const totalExpenses = totalRechargeAmount + normalizeAmount(chip.cost) + normalizeAmount(chip.otherExpenses);
  const hasPriorityAlert =
    recharge.status === 'Vencida' ||
    recovery.daysRemaining === 0 ||
    rotationState.priority === 'Alta';

  return {
    ...chip,
    effectiveChipStatus,
    hasPriorityAlert,
    recharge,
    recovery,
    rotationState,
    totalExpenses,
    totalRechargeAmount,
  };
}

function buildStats(chips, alerts) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totals = chips.reduce(
    (acc, chip) => {
      acc.totalChips += 1;
      acc.chipStatus[chip.effectiveChipStatus] = (acc.chipStatus[chip.effectiveChipStatus] || 0) + 1;
      acc.whatsappStatus[chip.whatsapp.status] = (acc.whatsappStatus[chip.whatsapp.status] || 0) + 1;
      acc.rotation[chip.rotationState.phase] = (acc.rotation[chip.rotationState.phase] || 0) + 1;
      acc.totalExpenses += chip.totalExpenses;
      acc.monthlyExpenses += getMonthlyExpense(chip, currentMonth, currentYear);
      return acc;
    },
    {
      chipStatus: {},
      monthlyExpenses: 0,
      rotation: {},
      totalChips: 0,
      totalExpenses: 0,
      whatsappStatus: {},
    }
  );

  return {
    totalChips: totals.totalChips,
    totalActiveChips: totals.chipStatus.Activo || 0,
    totalSuspendedChips: totals.chipStatus.Suspendido || 0,
    totalDroppedChips: totals.chipStatus['Dado de baja'] || 0,
    totalWhatsAppActive: totals.whatsappStatus.Activo || 0,
    totalWhatsAppBlocked: (totals.whatsappStatus.Bloqueado || 0) + (totals.whatsappStatus['Bloqueado temporalmente'] || 0),
    totalResting: totals.rotation['En descanso'] || 0,
    totalAvailable: totals.rotation.Disponible || 0,
    alertsPending: alerts.length,
    monthlyExpenses: totals.monthlyExpenses,
    totalExpenses: totals.totalExpenses,
  };
}

function buildCharts(chips) {
  const chipsByOperator = buildCounter(chips, (chip) => chip.operator || 'Sin operadora');
  const chipsByStatus = buildCounter(chips, (chip) => chip.effectiveChipStatus || 'Sin estado');
  const blocksByMonth = buildMonthCounter(chips, (chip) => chip.whatsapp.blockDate);
  const recoveryByMonth = buildMonthCounter(chips, (chip) => chip.recovery.estimatedRecoveryDate);
  const expensesByMonth = buildExpenseByMonth(chips);

  return {
    chipsByOperator,
    chipsByStatus,
    blocksByMonth,
    expensesByMonth,
    recoveryByMonth,
  };
}

function buildAlerts(chips) {
  const alerts = [];

  chips.forEach((chip) => {
    if (chip.recharge.alertLabel) {
      alerts.push({
        id: `${chip.id}-recharge`,
        chipId: chip.id,
        chipAlias: chip.alias,
        chipPhone: chip.phone,
        kind: 'recharge',
        priority: chip.recharge.priority,
        title: chip.recharge.alertLabel,
        subtitle: chip.recharge.nextRechargeDate
          ? `Proxima recarga: ${formatDate(chip.recharge.nextRechargeDate)}`
          : 'Sin fecha de recarga',
        actionLabel: 'Registrar recarga',
      });
    }

    if (chip.recovery.alertLabel) {
      alerts.push({
        id: `${chip.id}-recovery`,
        chipId: chip.id,
        chipAlias: chip.alias,
        chipPhone: chip.phone,
        kind: 'recovery',
        priority: chip.recovery.priority,
        title: chip.recovery.alertLabel,
        subtitle: chip.recovery.estimatedRecoveryDate
          ? `Recuperacion estimada: ${formatDate(chip.recovery.estimatedRecoveryDate)}`
          : 'Sin fecha estimada',
        actionLabel: 'Revisar cuenta',
      });
    }

    if (chip.rotationState.alertLabel) {
      alerts.push({
        id: `${chip.id}-rotation`,
        chipId: chip.id,
        chipAlias: chip.alias,
        chipPhone: chip.phone,
        kind: 'rotation',
        priority: chip.rotationState.priority,
        title: chip.rotationState.alertLabel,
        subtitle: chip.rotationState.referenceDate
          ? `Fecha clave: ${formatDate(chip.rotationState.referenceDate)}`
          : 'Configura el ciclo para automatizar alertas',
        actionLabel: 'Gestionar ciclo',
      });
    }

    if (!chip.phone || !chip.alias) {
      alerts.push({
        id: `${chip.id}-system`,
        chipId: chip.id,
        chipAlias: chip.alias || 'Chip sin alias',
        chipPhone: chip.phone || '--',
        kind: 'system',
        priority: 'Media',
        title: 'Datos incompletos',
        subtitle: 'Faltan alias o numero telefonico.',
        actionLabel: 'Completar ficha',
      });
    }
  });

  return alerts.sort((a, b) => {
    const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title, 'es');
  });
}

function buildCalendarEvents(chips) {
  const events = [];

  chips.forEach((chip) => {
    if (chip.recharge.nextRechargeDate) {
      events.push({
        chipId: chip.id,
        date: chip.recharge.nextRechargeDate,
        label: `Recarga - ${chip.alias}`,
        tone: chip.recharge.tone,
      });
    }

    if (chip.recovery.estimatedRecoveryDate) {
      events.push({
        chipId: chip.id,
        date: chip.recovery.estimatedRecoveryDate,
        label: `Recuperacion - ${chip.alias}`,
        tone: chip.recovery.tone,
      });
    }

    if (chip.rotationState.useEndDate) {
      events.push({
        chipId: chip.id,
        date: chip.rotationState.useEndDate,
        label: `Fin de uso - ${chip.alias}`,
        tone: 'amber',
      });
    }

    if (chip.rotationState.restEndDate) {
      events.push({
        chipId: chip.id,
        date: chip.rotationState.restEndDate,
        label: `Fin de descanso - ${chip.alias}`,
        tone: 'emerald',
      });
    }
  });

  return events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function getRechargeStatus(chip, settings, todayIso) {
  const intervalDays = Number(settings?.rechargeIntervalDays || 15);
  const latestRecharge = [...(chip.recharges || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const baseDate = latestRecharge?.date || chip.activationDate || chip.purchaseDate;

  if (!baseDate) {
    return {
      alertLabel: 'Recarga pendiente de configurar',
      daysRemaining: null,
      isRisk: chip.chipStatus === 'Activo',
      nextRechargeDate: '',
      priority: 'Media',
      status: 'Sin datos',
      tone: 'slate',
    };
  }

  const nextRechargeDate = addDays(baseDate, intervalDays);
  const daysRemaining = getDayDifference(nextRechargeDate, todayIso);

  if (daysRemaining < 0) {
    return {
      alertLabel: 'Recarga vencida',
      daysRemaining,
      isRisk: true,
      nextRechargeDate,
      priority: 'Alta',
      status: 'Vencida',
      tone: 'rose',
    };
  }

  if (daysRemaining <= 1) {
    return {
      alertLabel: 'Recarga vence en 1 dia',
      daysRemaining,
      isRisk: false,
      nextRechargeDate,
      priority: 'Alta',
      status: 'Proxima a vencer',
      tone: 'amber',
    };
  }

  if (daysRemaining <= 3) {
    return {
      alertLabel: `Recarga vence en ${daysRemaining} dias`,
      daysRemaining,
      isRisk: false,
      nextRechargeDate,
      priority: 'Media',
      status: 'Proxima a vencer',
      tone: 'amber',
    };
  }

  if (daysRemaining <= 5) {
    return {
      alertLabel: `Recarga programada en ${daysRemaining} dias`,
      daysRemaining,
      isRisk: false,
      nextRechargeDate,
      priority: 'Baja',
      status: 'Proxima a vencer',
      tone: 'amber',
    };
  }

  return {
    alertLabel: '',
    daysRemaining,
    isRisk: false,
    nextRechargeDate,
    priority: 'Baja',
    status: 'Al dia',
    tone: 'emerald',
  };
}

function getRecoveryStatus(chip, settings, todayIso) {
  const blockDate = chip.whatsapp?.blockDate;
  const recoveryDays = Number(settings?.recoveryDays || 90);

  if (!blockDate) {
    return {
      active: false,
      alertLabel: '',
      daysRemaining: null,
      estimatedRecoveryDate: '',
      priority: 'Baja',
      progress: 0,
      tone: 'slate',
    };
  }

  const estimatedRecoveryDate = addDays(blockDate, recoveryDays);
  const daysRemaining = getDayDifference(estimatedRecoveryDate, todayIso);
  const elapsedDays = Math.max(0, recoveryDays - Math.max(daysRemaining, 0));
  const progress = Math.min(100, Math.round((elapsedDays / recoveryDays) * 100));

  if (daysRemaining <= 0) {
    return {
      active: true,
      alertLabel: 'Recuperacion completada',
      daysRemaining: 0,
      estimatedRecoveryDate,
      priority: 'Alta',
      progress: 100,
      tone: 'emerald',
    };
  }

  const checkpoints = [30, 15, 7, 3, 1];
  const matchingCheckpoint = checkpoints.find((checkpoint) => checkpoint === daysRemaining);

  return {
    active: true,
    alertLabel: matchingCheckpoint ? `Recuperacion en ${matchingCheckpoint} dias` : '',
    daysRemaining,
    estimatedRecoveryDate,
    priority: daysRemaining <= 3 ? 'Alta' : daysRemaining <= 15 ? 'Media' : 'Baja',
    progress,
    tone: daysRemaining <= 15 ? 'amber' : 'rose',
  };
}

function getRotationState(chip, settings, todayIso) {
  const useStartDate = chip.rotation?.useStartDate;
  const useDays = Number(chip.rotation?.useDays || settings?.defaultUseDays || 7);
  const restDays = Number(chip.rotation?.restDays || settings?.defaultRestDays || 7);

  if (!useStartDate) {
    return {
      alertLabel: '',
      nextAction: 'Configurar ciclo',
      phase: 'Disponible',
      priority: 'Baja',
      referenceDate: '',
      restEndDate: '',
      useEndDate: '',
    };
  }

  const elapsedDays = getDayDifference(todayIso, useStartDate);
  const useEndDate = addDays(useStartDate, useDays);
  const restEndDate = addDays(useStartDate, useDays + restDays);

  if (elapsedDays < 0) {
    return {
      alertLabel: '',
      nextAction: 'Pendiente de iniciar uso',
      phase: 'Disponible',
      priority: 'Baja',
      referenceDate: useStartDate,
      restEndDate,
      useEndDate,
    };
  }

  if (elapsedDays < useDays) {
    const daysRemaining = useDays - elapsedDays;
    return {
      alertLabel: daysRemaining <= 1 ? 'Completo su ciclo de uso' : '',
      nextAction: daysRemaining <= 1 ? 'Cambiar al siguiente numero' : 'Sigue en uso',
      phase: 'En uso',
      priority: daysRemaining <= 1 ? 'Alta' : daysRemaining <= 2 ? 'Media' : 'Baja',
      referenceDate: useEndDate,
      restEndDate,
      useEndDate,
    };
  }

  if (elapsedDays < useDays + restDays) {
    const daysRemaining = useDays + restDays - elapsedDays;
    return {
      alertLabel: daysRemaining <= 1 ? 'Numero disponible nuevamente' : '',
      nextAction: daysRemaining <= 1 ? 'Finalizar descanso' : 'Mantener descanso',
      phase: 'En descanso',
      priority: daysRemaining <= 1 ? 'Media' : 'Baja',
      referenceDate: restEndDate,
      restEndDate,
      useEndDate,
    };
  }

  return {
    alertLabel: 'Numero disponible nuevamente',
    nextAction: 'Listo para reutilizar',
    phase: 'Disponible',
    priority: 'Media',
    referenceDate: restEndDate,
    restEndDate,
    useEndDate,
  };
}

function buildCounter(chips, selector) {
  const map = new Map();

  chips.forEach((chip) => {
    const key = selector(chip);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function buildExpenseByMonth(chips) {
  const now = new Date();
  const buckets = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: `${MONTH_NAMES[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
      value: 0,
    });
  }

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  chips.forEach((chip) => {
    if (chip.purchaseDate) {
      const purchaseKey = chip.purchaseDate.slice(0, 7);
      const bucket = bucketMap.get(purchaseKey);
      if (bucket) {
        bucket.value += normalizeAmount(chip.cost) + normalizeAmount(chip.otherExpenses);
      }
    }

    (chip.recharges || []).forEach((recharge) => {
      const bucket = bucketMap.get((recharge.date || '').slice(0, 7));
      if (bucket) bucket.value += normalizeAmount(recharge.amount);
    });
  });

  return buckets;
}

function buildMonthCounter(chips, selector) {
  const now = new Date();
  const buckets = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      label: `${MONTH_NAMES[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
      value: 0,
    });
  }

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  chips.forEach((chip) => {
    const value = selector(chip);
    if (!value) return;
    const bucket = bucketMap.get(value.slice(0, 7));
    if (bucket) bucket.value += 1;
  });

  return buckets;
}

function getMonthlyExpense(chip, month, year) {
  let total = 0;

  const purchaseDate = toDate(chip.purchaseDate);
  if (purchaseDate && purchaseDate.getMonth() === month && purchaseDate.getFullYear() === year) {
    total += normalizeAmount(chip.cost) + normalizeAmount(chip.otherExpenses);
  }

  (chip.recharges || []).forEach((recharge) => {
    const rechargeDate = toDate(recharge.date);
    if (!rechargeDate) return;
    if (rechargeDate.getMonth() === month && rechargeDate.getFullYear() === year) {
      total += normalizeAmount(recharge.amount);
    }
  });

  return total;
}

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function stringifyCsvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(value, days) {
  const date = toDate(value);
  if (!date) return '';
  date.setDate(date.getDate() + Number(days || 0));
  return toIsoDate(date);
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getDayDifference(targetValue, baseValue) {
  const target = toDate(targetValue);
  const base = toDate(baseValue);
  if (!target || !base) return 0;

  const milliseconds = target.getTime() - base.getTime();
  return Math.ceil(milliseconds / 86400000);
}

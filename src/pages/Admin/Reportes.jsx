import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, FileText, RefreshCw, Download, Table } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { horariosAPI, turnosAPI } from '../../services/api';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import './Admin.css';

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const toFechaStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd');
};

const limpiarHora = (h) => {
  const raw = String(h ?? '').trim();
  if (!raw) return '';

  // Normaliza formatos tipo "8:00", "08:00," etc.
  const match = raw.match(/(\d{1,2}:\d{2})/);
  const hhmm = match ? match[1] : raw;
  const [hh, mm] = String(hhmm).split(':');
  if (!mm) return raw;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const ordenarHoras = (horas) =>
  [...horas].sort((a, b) => {
    const [ah, am] = String(a).split(':').map(Number);
    const [bh, bm] = String(b).split(':').map(Number);
    return ah !== bh ? ah - bh : am - bm;
  });

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const exportExcel = (workbook, filename) => {
  const array = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', cellDates: true });
  const blob = new Blob([array], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
};

const EXCEL_COLORS = {
  primary: 'FFE91E63',
  secondary: 'FF9C27B0',
  light: 'FFFCE4EC',
  white: 'FFFFFFFF',
  text: 'FF111111',
  muted: 'FF666666',
  border: 'FFDDDDDD',
};

const excelBorderThin = {
  top: { style: 'thin', color: { rgb: EXCEL_COLORS.border } },
  bottom: { style: 'thin', color: { rgb: EXCEL_COLORS.border } },
  left: { style: 'thin', color: { rgb: EXCEL_COLORS.border } },
  right: { style: 'thin', color: { rgb: EXCEL_COLORS.border } },
};

const setCellStyle = (ws, addr, style) => {
  if (!ws?.[addr]) return;
  ws[addr].s = { ...(ws[addr].s || {}), ...style };
};

const styleRow = (ws, rowIndex0, colCount, styleByCol) => {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex0, c });
    const style = typeof styleByCol === 'function' ? styleByCol(c, addr) : styleByCol;
    if (style) setCellStyle(ws, addr, style);
  }
};

const styleDataGrid = (ws, startRow0, rowCount, colCount, opts = {}) => {
  const {
    zebra = true,
    alignLeftCols = [],
    numberFmtByCol = {},
  } = opts;

  for (let r = 0; r < rowCount; r++) {
    const row0 = startRow0 + r;
    const isAlt = zebra && r % 2 === 1;
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r: row0, c });
      if (!ws[addr]) continue;

      const base = {
        border: excelBorderThin,
        alignment: {
          vertical: 'center',
          horizontal: alignLeftCols.includes(c) ? 'left' : 'center',
          wrapText: true,
        },
      };

      if (isAlt) {
        base.fill = { patternType: 'solid', fgColor: { rgb: EXCEL_COLORS.light } };
      }

      setCellStyle(ws, addr, base);

      const fmt = numberFmtByCol[c];
      if (fmt) ws[addr].z = fmt;
    }
  }
};

const makeStyledSheet = ({
  title,
  generado,
  header,
  rows,
  headerFillRgb,
  cols,
  numberFmtByCol,
  alignLeftCols,
}) => {
  const aoa = [[title], ['Generado', generado], [], header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];
  if (Array.isArray(cols)) ws['!cols'] = cols;
  ws['!views'] = [{ state: 'frozen', ySplit: 4 }];
  ws['!rows'] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }];

  setCellStyle(ws, 'A1', {
    font: { bold: true, sz: 16, color: { rgb: EXCEL_COLORS.text } },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  setCellStyle(ws, 'A2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });
  setCellStyle(ws, 'B2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });

  styleRow(ws, 3, header.length, {
    font: { bold: true, color: { rgb: EXCEL_COLORS.white } },
    fill: { patternType: 'solid', fgColor: { rgb: headerFillRgb || EXCEL_COLORS.primary } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: excelBorderThin,
  });

  styleDataGrid(ws, 4, rows.length, header.length, {
    alignLeftCols: alignLeftCols || [],
    numberFmtByCol: numberFmtByCol || {},
  });

  return ws;
};

const Reportes = () => {
  const { isSuperAdmin } = useAuth();
  const roleLabel = isSuperAdmin() ? 'Super admin' : 'Admin';
  const navigate = useNavigate();

  const [vista, setVista] = useState('home');
  const [reporteSeleccionado, setReporteSeleccionado] = useState('turnosDisponibles');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [turnos, setTurnos] = useState([]);
  const [horariosPorDia, setHorariosPorDia] = useState({});
  const [selectedFecha, setSelectedFecha] = useState('');
  const [mesFiltro, setMesFiltro] = useState(format(new Date(), 'yyyy-MM'));
  const [weekTab, setWeekTab] = useState(0);
  const [showSemana, setShowSemana] = useState(false);

  const cargarDatos = async () => {
    if (!isSuperAdmin()) return;
    setCargando(true);
    setError('');
    try {
      const [tRes, hRes] = await Promise.all([
        turnosAPI.getAll(),
        horariosAPI.getPorDia(),
      ]);

      setTurnos(Array.isArray(tRes?.data) ? tRes.data : []);
      setHorariosPorDia(hRes?.data || {});
    } catch (e) {
      setError('No se pudieron cargar los datos de reportes.');
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bloqueaHorario = (t) => {
    const estado = String(t?.estado || '');
    const estadoTransferencia = String(t?.estadoTransferencia || '');
    if (estadoTransferencia === 'rechazado') return false;
    return estado === 'pendiente' || estado === 'confirmado' || estado === 'en_proceso';
  };

  const getServicioNombre = (t) => {
    const n = t?.servicio?.nombre;
    if (n) return String(n);
    return String(t?.servicioNombre || t?.servicioId || 'Servicio');
  };

  const getClienteKey = (t) => String(t?.email || t?.usuarioId || t?.usuario || 'sin_email').toLowerCase();

  const inferMedioPago = (t) => {
    const hasTransfer = Boolean(
      String(t?.estadoTransferencia || '') ||
      String(t?.comprobanteTransferencia || '') ||
      String(t?.metodoTransferencia || '') ||
      String(t?.titularTransferencia || '')
    );
    if (hasTransfer) return 'Transferencia';
    const pagoId = String(t?.pagoId || '');
    const id = String(t?.id || t?._id || '');
    if (pagoId && id && pagoId !== id) return 'Mercado Pago';
    return 'Sin dato';
  };

  const mesFiltroMeta = useMemo(() => {
    const now = new Date();
    const [yyRaw, mmRaw] = String(mesFiltro || '').split('-');
    const yearSel = Number(yyRaw);
    const monthSel0 = Number(mmRaw) - 1;
    const mesRef = Number.isFinite(yearSel) && Number.isFinite(monthSel0)
      ? new Date(yearSel, monthSel0, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const mesNombre = MESES_ES[mesRef.getMonth()];
    const mesAnioLabel = `${mesNombre} ${mesRef.getFullYear()}`;
    const desdeMesStr = format(mesRef, 'dd/MM/yyyy');
    return { mesRef, mesAnioLabel, desdeMesStr };
  }, [mesFiltro]);

  const turnosMesActual = useMemo(() => {
    const { mesRef } = mesFiltroMeta;
    return turnos.filter((t) => {
      const f = toFechaStr(t?.fecha);
      if (!f) return false;
      const d = new Date(f + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return false;
      if (d.getFullYear() !== mesRef.getFullYear() || d.getMonth() !== mesRef.getMonth()) return false;
      return true;
    });
  }, [turnos, mesFiltroMeta]);

  // Mes actual completo (incluye turnos a futuro dentro del mes)
  // Usado en reportes de agenda/ocupación, para planificar.
  const turnosMesCompleto = useMemo(() => {
    const { mesRef } = mesFiltroMeta;
    return turnos.filter((t) => {
      const f = toFechaStr(t?.fecha);
      if (!f) return false;
      const d = new Date(f + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === mesRef.getFullYear() && d.getMonth() === mesRef.getMonth();
    });
  }, [turnos, mesFiltroMeta]);

  const turnosDisponibles = useMemo(() => {
    const hoy = new Date();
    const fechas = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      if (d.getDay() === 0) continue; // domingo no se muestra
      fechas.push(d);
    }

    const turnosPorFecha = new Map();
    for (const t of turnos) {
      const fechaStr = toFechaStr(t?.fecha);
      if (!fechaStr) continue;
      if (!turnosPorFecha.has(fechaStr)) turnosPorFecha.set(fechaStr, []);
      turnosPorFecha.get(fechaStr).push(t);
    }

    const resultados = fechas
      .map((d) => {
        const fechaStr = format(d, 'yyyy-MM-dd');
        const day = d.getDay();
        const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
        const extras = Array.isArray(horariosPorDia[fechaStr]) ? horariosPorDia[fechaStr] : [];
        const todos = ordenarHoras(Array.from(new Set([...normales, ...extras].map(limpiarHora))));

        const turnosDia = turnosPorFecha.get(fechaStr) || [];
        const ocupados = turnosDia
          .filter(bloqueaHorario)
          .map((t) => limpiarHora(t?.hora))
          .filter(Boolean);

        const disponibles = todos.filter((h) => !ocupados.includes(h));

        return {
          fechaStr,
          date: d,
          diaLabel: DIAS_ES[day],
          disponibles,
          total: todos.length,
          ocupados: ocupados.length,
        };
      })
      .filter((x) => x.disponibles.length > 0);

    return resultados;
  }, [horariosPorDia, turnos]);

  useEffect(() => {
    if (vista !== 'turnosDisponibles') return;
    if (turnosDisponibles.length === 0) {
      setSelectedFecha('');
      return;
    }
    if (!selectedFecha || !turnosDisponibles.some((x) => x.fechaStr === selectedFecha)) {
      setSelectedFecha(turnosDisponibles[0].fechaStr);
    }
  }, [vista, turnosDisponibles, selectedFecha]);

  const selectedDisponibles = useMemo(() => {
    if (!selectedFecha) return null;
    return turnosDisponibles.find((x) => x.fechaStr === selectedFecha) || null;
  }, [selectedFecha, turnosDisponibles]);

  const selectedStory = useMemo(() => {
    if (!selectedFecha) return null;

    const d = new Date(selectedFecha + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDay();

    const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
    const extras = Array.isArray(horariosPorDia[selectedFecha]) ? horariosPorDia[selectedFecha] : [];
    const todos = ordenarHoras(Array.from(new Set([...normales, ...extras].map(limpiarHora))));

    const ocupados = new Set(
      turnos
        .filter((t) => toFechaStr(t?.fecha) === selectedFecha)
        .filter(bloqueaHorario)
        .map((t) => limpiarHora(t?.hora))
        .filter(Boolean)
    );

    return {
      fechaStr: selectedFecha,
      diaLabel: DIAS_ES[day],
      date: d,
      times: todos.map((h) => ({ hora: h, ocupado: ocupados.has(h) })),
    };
  }, [selectedFecha, horariosPorDia, turnos]);

  const primeraDisponibilidad = turnosDisponibles.length > 0 ? turnosDisponibles[0] : null;

  const semanasDisponibles = useMemo(() => {
    const hoy = new Date();
    const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const groups = [
      { key: 'semana0', label: 'Esta semana', items: [] },
      { key: 'semana1', label: 'Próxima semana', items: [] },
    ];

    for (const x of turnosDisponibles) {
      const d = new Date(String(x.fechaStr) + 'T00:00:00');
      if (Number.isNaN(d.getTime())) continue;
      const diffDays = Math.floor((d.getTime() - hoy0.getTime()) / (24 * 60 * 60 * 1000));
      const weekIndex = Math.max(0, Math.min(1, Math.floor(diffDays / 7)));
      const dayShort = DIAS_ES[d.getDay()].slice(0, 3);
      groups[weekIndex].items.push({
        ...x,
        date: d,
        dayShort,
        diaNum: d.getDate(),
      });
    }

    // Asegurar orden dentro de cada semana
    for (const g of groups) {
      g.items.sort((a, b) => String(a.fechaStr).localeCompare(String(b.fechaStr)));
    }

    return groups;
  }, [turnosDisponibles]);

  const DAY_MS = 24 * 60 * 60 * 1000;

  const hoy0Str = format(new Date(), 'yyyy-MM-dd');

  const hoy0 = useMemo(() => {
    const [yy, mm, dd] = String(hoy0Str).split('-').map(Number);
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) {
      const h = new Date();
      return new Date(h.getFullYear(), h.getMonth(), h.getDate());
    }
    return new Date(yy, mm - 1, dd);
  }, [hoy0Str]);

  const fin2Semanas0 = useMemo(
    () => new Date(hoy0.getFullYear(), hoy0.getMonth(), hoy0.getDate() + 13),
    [hoy0]
  );

  const mondaySemana0 = useMemo(() => {
    const dow = hoy0.getDay(); // 0=domingo
    // Si hoy es domingo, tomamos el lunes siguiente (la app no muestra domingos).
    const diff = dow === 0 ? 1 : 1 - dow;
    return new Date(hoy0.getFullYear(), hoy0.getMonth(), hoy0.getDate() + diff);
  }, [hoy0]);

  useEffect(() => {
    if (vista !== 'turnosDisponibles') return;
    if (!selectedFecha) return;
    const d = new Date(selectedFecha + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return;
    const diffDays = Math.floor((d.getTime() - hoy0.getTime()) / DAY_MS);
    const derived = diffDays >= 7 ? 1 : 0;
    setWeekTab((prev) => (prev === derived ? prev : derived));
  }, [vista, selectedFecha, hoy0]);

  const weekTabLabels = useMemo(() => {
    const w0Start = mondaySemana0;
    const w0End = new Date(w0Start.getFullYear(), w0Start.getMonth(), w0Start.getDate() + 5);
    const w1Start = new Date(w0Start.getFullYear(), w0Start.getMonth(), w0Start.getDate() + 7);
    const w1End = new Date(w1Start.getFullYear(), w1Start.getMonth(), w1Start.getDate() + 5);
    return [
      `Esta semana (${format(w0Start, 'dd/MM')}–${format(w0End, 'dd/MM')})`,
      `Próxima semana (${format(w1Start, 'dd/MM')}–${format(w1End, 'dd/MM')})`,
    ];
  }, [mondaySemana0]);

  const semanaLunes = useMemo(() => {
    return new Date(
      mondaySemana0.getFullYear(),
      mondaySemana0.getMonth(),
      mondaySemana0.getDate() + weekTab * 7
    );
  }, [mondaySemana0, weekTab]);

  const semanaDias = useMemo(() => {
    const days = [];

    for (let i = 0; i < 6; i++) {
      const d = new Date(semanaLunes.getFullYear(), semanaLunes.getMonth(), semanaLunes.getDate() + i);
      const fechaStr = format(d, 'yyyy-MM-dd');
      const inWindow = d >= hoy0 && d <= fin2Semanas0;
      const day = d.getDay();

      if (!inWindow) {
        days.push({
          fechaStr,
          date: d,
          diaLabel: DIAS_ES[day],
          dayShort: DIAS_ES[day].slice(0, 3),
          diaNum: d.getDate(),
          inWindow: false,
          times: [],
        });
        continue;
      }

      const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
      const extras = Array.isArray(horariosPorDia[fechaStr]) ? horariosPorDia[fechaStr] : [];
      const todos = ordenarHoras(Array.from(new Set([...normales, ...extras].map(limpiarHora))).filter(Boolean));

      const ocupados = new Set(
        turnos
          .filter((t) => toFechaStr(t?.fecha) === fechaStr)
          .filter(bloqueaHorario)
          .map((t) => limpiarHora(t?.hora))
          .filter(Boolean)
      );

      days.push({
        fechaStr,
        date: d,
        diaLabel: DIAS_ES[day],
        dayShort: DIAS_ES[day].slice(0, 3),
        diaNum: d.getDate(),
        inWindow: true,
        times: todos.map((h) => ({ hora: h, ocupado: ocupados.has(h) })),
      });
    }

    return days;
  }, [semanaLunes, hoy0, fin2Semanas0, horariosPorDia, turnos]);

  const stats = useMemo(() => {
    const now = new Date();
    const hoyStr = format(now, 'yyyy-MM-dd');
    const start7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    const { mesRef, mesAnioLabel } = mesFiltroMeta;
    const mesDesde = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
    const hastaStr = format(now, 'dd/MM/yyyy HH:mm');
    const desdeMesStr = format(mesDesde, 'dd/MM/yyyy');

    const enRangoUltimos7 = (fechaStr) => {
      if (!fechaStr) return false;
      const d = new Date(fechaStr + 'T00:00:00');
      return d >= start7 && d <= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    const enMesSeleccionado = (fechaStr) => {
      if (!fechaStr) return false;
      const d = new Date(fechaStr + 'T00:00:00');
      return d.getFullYear() === mesRef.getFullYear() && d.getMonth() === mesRef.getMonth();
    };

    const esTurnoValidoDinero = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const calc = (predicateFecha) => {
      const items = turnos
        .filter((t) => {
          const f = toFechaStr(t?.fecha);
          return predicateFecha(f);
        })
        .filter(esTurnoValidoDinero);

      const cobrado = items.reduce((acc, t) => acc + (Number(t?.montoPagado) || 0), 0);
      const porCobrar = items.reduce((acc, t) => acc + Math.max(0, (Number(t?.montoTotal) || 0) - (Number(t?.montoPagado) || 0)), 0);
      const cantidad = items.length;
      return { cobrado, porCobrar, cantidad };
    };

    const hoy = calc((f) => f === hoyStr);
    const semana = calc(enRangoUltimos7);
    const mes = calc(enMesSeleccionado);

    const topClientesMes = (() => {
      const map = new Map();
      for (const t of turnos) {
        const f = toFechaStr(t?.fecha);
        if (!enMesSeleccionado(f)) continue;
        if (!esTurnoValidoDinero(t)) continue;
        const key = String(t?.email || t?.usuarioId || t?.usuario || 'sin_email').toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            key,
            email: t?.email || '',
            nombre: t?.nombre || '',
            total: 0,
            pagado: 0,
            turnos: 0,
          });
        }
        const row = map.get(key);
        row.total += Number(t?.montoTotal) || 0;
        row.pagado += Number(t?.montoPagado) || 0;
        row.turnos += 1;
      }
      return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    })();

    return { hoy, semana, mes, topClientesMes, mesAnioLabel, desdeMesStr, hastaStr };
  }, [turnos, mesFiltroMeta]);

  const reportGananciasTotalMes = useMemo(() => {
    const now = new Date();
    const hoyStr = format(now, 'yyyy-MM-dd');

    const { mesRef } = mesFiltroMeta;
    const isMesActual = mesRef.getFullYear() === now.getFullYear() && mesRef.getMonth() === now.getMonth();

    const esValidoDinero = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (String(t?.estadoTransferencia || '') === 'rechazado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const items = turnosMesActual
      .filter(esValidoDinero)
      .filter((t) => {
        if (!isMesActual) return true;
        // Para el mes actual: incluir hasta hoy por fecha del turno,
        // pero también incluir turnos futuros si ya hubo ingreso (seña/pago).
        const pagado = Number(t?.montoPagado) || 0;
        if (pagado > 0) return true;
        const f = toFechaStr(t?.fecha);
        if (!f) return false;
        return f <= hoyStr;
      });

    const porDiaMap = new Map();
    for (const t of items) {
      const fechaStr = toFechaStr(t?.fecha);
      if (!fechaStr) continue;
      const d = new Date(fechaStr + 'T00:00:00');
      const day = !Number.isNaN(d.getTime()) ? d.getDay() : 0;
      if (!porDiaMap.has(fechaStr)) {
        porDiaMap.set(fechaStr, {
          fechaStr,
          dia: DIAS_ES[day] || '',
          turnos: 0,
          total: 0,
          pagado: 0,
          porCobrar: 0,
        });
      }
      const row = porDiaMap.get(fechaStr);
      const total = Number(t?.montoTotal) || 0;
      const pagado = Number(t?.montoPagado) || 0;
      row.turnos += 1;
      row.total += total;
      row.pagado += pagado;
      row.porCobrar += Math.max(0, total - pagado);
    }

    const porDia = [...porDiaMap.values()]
      .sort((a, b) => String(a.fechaStr).localeCompare(String(b.fechaStr)));

    const resumen = porDia.reduce(
      (acc, r) => {
        acc.dias += 1;
        acc.turnos += r.turnos;
        acc.total += r.total;
        acc.pagado += r.pagado;
        acc.porCobrar += r.porCobrar;
        return acc;
      },
      { dias: 0, turnos: 0, total: 0, pagado: 0, porCobrar: 0 }
    );

    return {
      isMesActual,
      hastaStr: isMesActual ? format(now, 'dd/MM/yyyy') : 'Mes completo',
      porDia,
      resumen,
    };
  }, [turnosMesActual, mesFiltroMeta]);

  const reportGananciasServicio = useMemo(() => {
    const esTurnoValidoDinero = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const map = new Map();
    for (const t of turnosMesActual.filter(esTurnoValidoDinero)) {
      const key = getServicioNombre(t);
      if (!map.has(key)) {
        map.set(key, { servicio: key, turnos: 0, total: 0, pagado: 0, porCobrar: 0 });
      }
      const row = map.get(key);
      const total = Number(t?.montoTotal) || 0;
      const pagado = Number(t?.montoPagado) || 0;
      row.turnos += 1;
      row.total += total;
      row.pagado += pagado;
      row.porCobrar += Math.max(0, total - pagado);
    }
    const items = [...map.values()].sort((a, b) => b.total - a.total);
    const resumen = items.reduce(
      (acc, x) => {
        acc.turnos += x.turnos;
        acc.total += x.total;
        acc.pagado += x.pagado;
        acc.porCobrar += x.porCobrar;
        return acc;
      },
      { turnos: 0, total: 0, pagado: 0, porCobrar: 0 }
    );
    return { items, resumen };
  }, [turnosMesActual]);

  const reportServiciosMasPedidos = useMemo(() => {
    const esValido = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const map = new Map();
    for (const t of turnosMesActual.filter(esValido)) {
      const key = getServicioNombre(t);
      if (!map.has(key)) {
        map.set(key, { servicio: key, turnos: 0, total: 0, pagado: 0 });
      }
      const row = map.get(key);
      row.turnos += 1;
      row.total += Number(t?.montoTotal) || 0;
      row.pagado += Number(t?.montoPagado) || 0;
    }
    const items = [...map.values()].sort((a, b) => b.turnos - a.turnos);
    return { items };
  }, [turnosMesActual]);

  const reportClientesRecurrentes = useMemo(() => {
    const esValido = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const map = new Map();
    for (const t of turnosMesActual.filter(esValido)) {
      const key = getClienteKey(t);
      if (!map.has(key)) {
        map.set(key, { key, nombre: t?.nombre || '', email: t?.email || '', turnos: 0, total: 0, pagado: 0 });
      }
      const row = map.get(key);
      row.turnos += 1;
      row.total += Number(t?.montoTotal) || 0;
      row.pagado += Number(t?.montoPagado) || 0;
    }
    const items = [...map.values()].sort((a, b) => b.turnos - a.turnos).slice(0, 15);
    return { items };
  }, [turnosMesActual]);

  const reportOcupacion = useMemo(() => {
    const { mesRef } = mesFiltroMeta;
    const start = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
    const end = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0);

    const esOcupado = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      if (String(t?.estadoTransferencia || '') === 'rechazado') return false;
      return true;
    };

    const rows = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const fechaStr = format(d, 'yyyy-MM-dd');
      const day = d.getDay();
      if (day === 0) continue;

      const normales = Array.isArray(horariosPorDia[String(day)]) ? horariosPorDia[String(day)] : [];
      const extras = Array.isArray(horariosPorDia[fechaStr]) ? horariosPorDia[fechaStr] : [];
      const todos = ordenarHoras(Array.from(new Set([...normales, ...extras].map(limpiarHora))));
      if (todos.length === 0) continue;

      const ocupados = new Set(
        turnosMesCompleto
          .filter((t) => toFechaStr(t?.fecha) === fechaStr)
          .filter(esOcupado)
          .map((t) => limpiarHora(t?.hora))
          .filter(Boolean)
      );

      const total = todos.length;
      const ocupado = Math.min(total, ocupados.size);
      const libre = Math.max(0, total - ocupado);
      const pct = total > 0 ? Math.round((ocupado / total) * 100) : 0;
      rows.push({ fechaStr, dia: DIAS_ES[day], total, ocupado, libre, pct });
    }

    const resumen = rows.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.ocupado += r.ocupado;
        acc.libre += r.libre;
        return acc;
      },
      { total: 0, ocupado: 0, libre: 0 }
    );
    const pctMes = resumen.total > 0 ? Math.round((resumen.ocupado / resumen.total) * 100) : 0;

    // Agrupar por semanas dentro del mes (simple)
    const weeks = new Map();
    for (const r of rows) {
      const d = new Date(r.fechaStr + 'T00:00:00');
      const weekIdx = Math.floor((d.getDate() - 1) / 7) + 1;
      const key = `Semana ${weekIdx}`;
      if (!weeks.has(key)) weeks.set(key, { semana: key, total: 0, ocupado: 0, libre: 0 });
      const w = weeks.get(key);
      w.total += r.total;
      w.ocupado += r.ocupado;
      w.libre += r.libre;
    }
    const semanas = [...weeks.values()].map((w) => ({
      ...w,
      pct: w.total > 0 ? Math.round((w.ocupado / w.total) * 100) : 0,
    }));

    return { rows, resumen, pctMes, semanas };
  }, [horariosPorDia, turnosMesCompleto, mesFiltroMeta]);

  const reportCancelaciones = useMemo(() => {
    const norm = (v) => String(v ?? '').trim().toLowerCase();
    const now = new Date();

    const estadoParaReporte = (t) => {
      const estado = norm(t?.estado);
      const reg = norm(t?.registroEstadistica);
      const fechaStr = toFechaStr(t?.fecha);
      const hora = limpiarHora(t?.hora) || '00:00';
      const fechaTurno = fechaStr ? new Date(`${fechaStr}T${hora}:00`) : null;

      if (estado === 'rechazado') return 'rechazado';
      if (estado === 'cancelado') return 'cancelado';

      // Misma lectura que en Historial: completado + seña se muestra como cancelado/expirado.
      if (estado === 'completado' && reg === 'seña') {
        if (fechaTurno && !Number.isNaN(fechaTurno.getTime()) && fechaTurno < now) return 'expirado';
        return 'cancelado';
      }

      // Seña devuelta: según Historial puede verse como cancelado/expirado.
      if (estado === 'devuelto' && t?.seniaDevuelta && (reg === 'seña' || reg === 'ninguno')) {
        if (fechaTurno && !Number.isNaN(fechaTurno.getTime()) && fechaTurno < now) return 'expirado';
        return 'cancelado';
      }

      return estado || 'sin_estado';
    };

    const total = turnosMesActual.length;
    const cancelados = turnosMesActual.filter((t) => estadoParaReporte(t) === 'cancelado').length;
    const rechazados = turnosMesActual.filter((t) => estadoParaReporte(t) === 'rechazado').length;
    const transferRech = turnosMesActual.filter((t) => norm(t?.estadoTransferencia) === 'rechazado').length;

    const estadosMap = new Map();
    for (const t of turnosMesActual) {
      const e = estadoParaReporte(t);
      estadosMap.set(e, (estadosMap.get(e) || 0) + 1);
    }
    const estados = [...estadosMap.entries()].map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const motivosMap = new Map();
    for (const t of turnosMesActual) {
      if (norm(t?.estadoTransferencia) !== 'rechazado') continue;
      const m = String(t?.motivoRechazoTransferencia || '').trim() || 'Sin motivo';
      motivosMap.set(m, (motivosMap.get(m) || 0) + 1);
    }
    const motivos = [...motivosMap.entries()].map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    const pct = (x) => (total > 0 ? Math.round((x / total) * 100) : 0);
    return {
      total,
      cancelados,
      rechazados,
      transferRech,
      pctCancelados: pct(cancelados),
      pctRechazados: pct(rechazados),
      estados,
      motivos,
    };
  }, [turnosMesActual]);

  const reportMediosPago = useMemo(() => {
    const esValidoDinero = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const map = new Map();
    for (const t of turnosMesActual.filter(esValidoDinero)) {
      const medio = inferMedioPago(t);
      if (!map.has(medio)) map.set(medio, { medio, turnos: 0, total: 0, pagado: 0, porCobrar: 0 });
      const row = map.get(medio);
      const total = Number(t?.montoTotal) || 0;
      const pagado = Number(t?.montoPagado) || 0;
      row.turnos += 1;
      row.total += total;
      row.pagado += pagado;
      row.porCobrar += Math.max(0, total - pagado);
    }
    const items = [...map.values()].sort((a, b) => b.total - a.total);

    const transferEstados = (() => {
      const m = new Map();
      for (const t of turnosMesActual) {
        if (inferMedioPago(t) !== 'Transferencia') continue;
        const e = String(t?.estadoTransferencia || 'sin_estado');
        m.set(e, (m.get(e) || 0) + 1);
      }
      return [...m.entries()].map(([estado, cantidad]) => ({ estado, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
    })();

    return { items, transferEstados };
  }, [turnosMesActual]);

  const reportCobrosPendientes = useMemo(() => {
    const esValido = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      return true;
    };

    const map = new Map();
    for (const t of turnosMesActual.filter(esValido)) {
      const key = getClienteKey(t);
      if (!map.has(key)) {
        map.set(key, {
          key,
          nombre: t?.nombre || '',
          email: t?.email || '',
          turnos: 0,
          total: 0,
          pagado: 0,
          porCobrar: 0,
        });
      }
      const row = map.get(key);
      const total = Number(t?.montoTotal) || 0;
      const pagado = Number(t?.montoPagado) || 0;
      const porCobrar = Math.max(0, total - pagado);
      row.turnos += 1;
      row.total += total;
      row.pagado += pagado;
      row.porCobrar += porCobrar;
    }

    const all = [...map.values()]
      .filter((x) => x.porCobrar > 0)
      .sort((a, b) => b.porCobrar - a.porCobrar);

    const items = all.slice(0, 15);

    const resumen = all.reduce(
      (acc, x) => {
        acc.clientes += 1;
        acc.turnos += x.turnos;
        acc.total += x.total;
        acc.pagado += x.pagado;
        acc.porCobrar += x.porCobrar;
        return acc;
      },
      { clientes: 0, turnos: 0, total: 0, pagado: 0, porCobrar: 0 }
    );

    return { items, resumen };
  }, [turnosMesActual]);

  const reportCancelacionServicio = useMemo(() => {
    const norm = (v) => String(v ?? '').trim().toLowerCase();
    const now = new Date();
    const estadoParaReporte = (t) => {
      const estado = norm(t?.estado);
      const reg = norm(t?.registroEstadistica);
      const fechaStr = toFechaStr(t?.fecha);
      const hora = limpiarHora(t?.hora) || '00:00';
      const fechaTurno = fechaStr ? new Date(`${fechaStr}T${hora}:00`) : null;

      if (estado === 'rechazado') return 'rechazado';
      if (estado === 'cancelado') return 'cancelado';

      if (estado === 'completado' && reg === 'seña') {
        if (fechaTurno && !Number.isNaN(fechaTurno.getTime()) && fechaTurno < now) return 'expirado';
        return 'cancelado';
      }

      if (estado === 'devuelto' && t?.seniaDevuelta && (reg === 'seña' || reg === 'ninguno')) {
        if (fechaTurno && !Number.isNaN(fechaTurno.getTime()) && fechaTurno < now) return 'expirado';
        return 'cancelado';
      }

      return estado || 'sin_estado';
    };

    const map = new Map();
    for (const t of turnosMesActual) {
      const servicio = getServicioNombre(t);
      if (!map.has(servicio)) {
        map.set(servicio, { servicio, total: 0, cancelados: 0, rechazados: 0, pct: 0 });
      }
      const row = map.get(servicio);
      row.total += 1;
      const e = estadoParaReporte(t);
      if (e === 'cancelado') row.cancelados += 1;
      if (e === 'rechazado') row.rechazados += 1;
    }

    const items = [...map.values()].map((x) => {
      const bad = x.cancelados + x.rechazados;
      const pct = x.total > 0 ? Math.round((bad / x.total) * 100) : 0;
      return { ...x, pct };
    }).sort((a, b) => (b.pct - a.pct) || (b.total - a.total));

    const totalTurnos = items.reduce((acc, x) => acc + x.total, 0);
    const totalCancelados = items.reduce((acc, x) => acc + x.cancelados, 0);
    const totalRechazados = items.reduce((acc, x) => acc + x.rechazados, 0);
    const pctGlobal = totalTurnos > 0 ? Math.round(((totalCancelados + totalRechazados) / totalTurnos) * 100) : 0;

    return { items, resumen: { totalTurnos, totalCancelados, totalRechazados, pctGlobal } };
  }, [turnosMesActual]);

  const reportHorariosPico = useMemo(() => {
    const esOcupado = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      if (String(t?.estadoTransferencia || '') === 'rechazado') return false;
      return true;
    };

    const horasMap = new Map();
    const diasMap = new Map();

    for (const t of turnosMesCompleto.filter(esOcupado)) {
      const hora = limpiarHora(t?.hora);
      if (hora) horasMap.set(hora, (horasMap.get(hora) || 0) + 1);

      const fechaStr = toFechaStr(t?.fecha);
      if (fechaStr) {
        const d = new Date(fechaStr + 'T00:00:00');
        if (!Number.isNaN(d.getTime())) {
          const day = d.getDay();
          const label = DIAS_ES[day];
          diasMap.set(label, (diasMap.get(label) || 0) + 1);
        }
      }
    }

    const total = [...horasMap.values()].reduce((acc, x) => acc + x, 0);
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

    const porHora = ordenarHoras([...horasMap.entries()].map(([hora, turnos]) => ({ hora, turnos, pct: pct(turnos) })))
      .sort((a, b) => b.turnos - a.turnos);

    const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const porDia = diasOrden
      .map((dia) => ({ dia, turnos: diasMap.get(dia) || 0 }))
      .filter((x) => x.turnos > 0)
      .map((x) => ({ ...x, pct: pct(x.turnos) }));

    return { total, porHora, porDia };
  }, [turnosMesCompleto]);

  const reportOcupacionServicio = useMemo(() => {
    const esOcupado = (t) => {
      const estado = String(t?.estado || '');
      if (estado === 'rechazado') return false;
      if (estado === 'cancelado') return false;
      if (t?.seniaDevuelta) return false;
      if (String(t?.estadoTransferencia || '') === 'rechazado') return false;
      return true;
    };

    const map = new Map();
    let totalOcupados = 0;
    for (const t of turnosMesCompleto.filter(esOcupado)) {
      totalOcupados += 1;
      const servicio = getServicioNombre(t);
      if (!map.has(servicio)) map.set(servicio, { servicio, turnos: 0, total: 0, pagado: 0, porCobrar: 0 });
      const row = map.get(servicio);
      const total = Number(t?.montoTotal) || 0;
      const pagado = Number(t?.montoPagado) || 0;
      row.turnos += 1;
      row.total += total;
      row.pagado += pagado;
      row.porCobrar += Math.max(0, total - pagado);
    }

    const items = [...map.values()]
      .map((x) => ({
        ...x,
        pct: totalOcupados > 0 ? Math.round((x.turnos / totalOcupados) * 100) : 0,
      }))
      .sort((a, b) => b.turnos - a.turnos);

    const resumen = items.reduce(
      (acc, x) => {
        acc.servicios += 1;
        acc.turnos += x.turnos;
        acc.total += x.total;
        acc.pagado += x.pagado;
        acc.porCobrar += x.porCobrar;
        return acc;
      },
      { servicios: 0, turnos: 0, total: 0, pagado: 0, porCobrar: 0 }
    );

    return { items, resumen, totalOcupados };
  }, [turnosMesCompleto]);

  const reportSeniasDevueltas = useMemo(() => {
    const items = turnosMesActual
      .filter((t) => Boolean(t?.seniaDevuelta))
      .map((t) => {
        const fechaStr = toFechaStr(t?.fecha);
        return {
          id: String(t?.id || t?._id || `${fechaStr}-${t?.hora}-${t?.email || ''}`),
          fechaStr,
          hora: limpiarHora(t?.hora),
          nombre: String(t?.nombre || '').trim(),
          email: String(t?.email || '').trim(),
          servicio: getServicioNombre(t),
          estado: String(t?.estado || ''),
          pagado: Number(t?.montoPagado) || 0,
          total: Number(t?.montoTotal) || 0,
        };
      })
      .sort((a, b) => String(b.fechaStr).localeCompare(String(a.fechaStr)));

    const resumen = items.reduce(
      (acc, x) => {
        acc.cantidad += 1;
        acc.pagado += x.pagado;
        acc.total += x.total;
        return acc;
      },
      { cantidad: 0, pagado: 0, total: 0 }
    );

    return { items, resumen };
  }, [turnosMesActual]);

  const exportTurnosDisponiblesPDF = async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const blobToDataUrl = async (blob) => {
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    };

    const blobToImageDataUrl = async (blob, mime) => {
      try {
        if (typeof createImageBitmap === 'function') {
          const bmp = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(bmp, 0, 0);
          return canvas.toDataURL(mime);
        }
      } catch {
        // fallback abajo
      }

      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
          el.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL(mime);
      } catch {
        return null;
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    const fetchFirstCoverBlob = async () => {
      const base = String(import.meta?.env?.BASE_URL || '/');
      const baseNorm = base.endsWith('/') ? base : `${base}/`;

      const names = [
        'turnos-disponibles-cover.jpg',
        'turnos-disponibles-cover.jpeg',
        'turnos-disponibles-cover.png',
      ];

      const candidates = Array.from(new Set([
        ...names.map((n) => `${baseNorm}${n}`),
        ...names.map((n) => `/${n}`),
        ...names.map((n) => n),
      ]));

      for (const url of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;

          const ct = String(res.headers.get('content-type') || '').toLowerCase();
          // Si la SPA responde index.html, evitamos intentar decodificar HTML como imagen.
          if (ct && !ct.includes('image/')) continue;

          // eslint-disable-next-line no-await-in-loop
          const blob = await res.blob();
          if (!blob) continue;
          return blob;
        } catch {
          // ignore
        }
      }
      return null;
    };

    const getCoverInfoIfAny = async () => {
      const blob = await fetchFirstCoverBlob();
      if (!blob) {
        console.warn(
          'PDF turnos disponibles: no se encontró la imagen de fondo en /public (turnos-disponibles-cover.*).'
        );
        return null;
      }

      // Preferimos JPEG: suele tener mejor compatibilidad en jsPDF.
      let dataUrl = await blobToImageDataUrl(blob, 'image/jpeg');
      if (dataUrl && String(dataUrl).startsWith('data:image/jpeg')) {
        return { dataUrl, imgFormat: 'JPEG' };
      }

      // Fallback: PNG.
      dataUrl = await blobToImageDataUrl(blob, 'image/png');
      if (dataUrl && String(dataUrl).startsWith('data:image/png')) {
        return { dataUrl, imgFormat: 'PNG' };
      }

      // Último fallback: DataURL original si es PNG/JPEG.
      dataUrl = await blobToDataUrl(blob);
      const asStr = String(dataUrl || '');
      if (asStr.startsWith('data:image/jpeg')) return { dataUrl, imgFormat: 'JPEG' };
      if (asStr.startsWith('data:image/png')) return { dataUrl, imgFormat: 'PNG' };

      console.warn('PDF turnos disponibles: la imagen de fondo no se pudo decodificar/convertir.', {
        type: blob.type,
        size: blob.size,
      });
      return null;
    };

    const coverInfo = await getCoverInfoIfAny();

    const drawCoverBackground = () => {
      if (!coverInfo?.dataUrl) return null;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      try {
        const props = doc.getImageProperties(coverInfo.dataUrl);
        // "Contain": mostrar la imagen completa sin recortarla (menos zoom).
        const containScale = Math.min(pageW / props.width, pageH / props.height);
        // Extra: alejamos un poco más la imagen para que no quede tan "pegada".
        const scale = containScale * 0.9;
        const w = props.width * scale;
        const h = props.height * scale;
        const x = (pageW - w) / 2;
        const y = (pageH - h) / 2;
        doc.addImage(coverInfo.dataUrl, coverInfo.imgFormat, x, y, w, h);
        return { x, y, w, h };
      } catch {
        try {
          doc.addImage(coverInfo.dataUrl, coverInfo.imgFormat, 0, 0, pageW, pageH);
          return { x: 0, y: 0, w: pageW, h: pageH };
        } catch (e2) {
          console.warn('No se pudo dibujar la imagen de fondo en el PDF.', e2);
          return null;
        }
      }
    };

    const buildWeek = (mondayDate) => {
      const days = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
        const fechaStr = format(d, 'yyyy-MM-dd');
        // Para el PDF semanal mostramos Lunes a Sábado completo.
        // Solo limitamos hacia adelante por las 2 semanas.
        const inWindow = d <= fin2Semanas0;
        const dow = d.getDay();
        const header = `${DIAS_ES[dow].slice(0, 3)} ${format(d, 'dd/MM')}`;

        const normales = inWindow && Array.isArray(horariosPorDia[String(dow)]) ? horariosPorDia[String(dow)] : [];
        const extras = inWindow && Array.isArray(horariosPorDia[fechaStr]) ? horariosPorDia[fechaStr] : [];
        const todos = inWindow
          ? ordenarHoras(Array.from(new Set([...normales, ...extras].map(limpiarHora))).filter(Boolean))
          : [];

        const ocupados = new Set(
          inWindow
            ? turnos
              .filter((t) => toFechaStr(t?.fecha) === fechaStr)
              .filter(bloqueaHorario)
              .map((t) => limpiarHora(t?.hora))
              .filter(Boolean)
            : []
        );

        const times = todos.map((h) => ({ hora: h, ocupado: ocupados.has(h) }));
        const esPasado = d < hoy0;
        return { d, fechaStr, inWindow, esPasado, header, times };
      });

      return { days };
    };

    const renderWeek = (label, mondayDate) => {
      const { days } = buildWeek(mondayDate);

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const bg = drawCoverBackground();
      // Alineamos el contenido dentro de la imagen (no en el margen blanco)
      const leftX = bg ? bg.x + 70 : 56;
      // Posición vertical del bloque (días + horarios)
      // Más arriba para que se vea dentro del flyer.
      const topY = bg ? bg.y + 165 : 252;
      const headerGap = 72;
      // Limitamos el contenido a la parte izquierda del flyer (evita pisar el logo/ilustración).
      const contentRight = bg ? (bg.x + bg.w * 0.68) : Math.floor(pageW * 0.64);
      const rightLimit = Math.min(pageW - 40, Math.floor(contentRight));

      // Rosa más oscuro para que contraste mejor sobre el fondo.
      const pink = [176, 0, 88];
      const dark = [0, 0, 0];
      const muted = [90, 90, 90];
      const white = [255, 255, 255];

      const measure = (text) => doc.getTextWidth(String(text));

      const textOutlined = (text, x, y, opts = {}) => {
        const {
          fill = dark,
          stroke = white,
          lineWidth = 1.2,
          shadow = false,
          shadowDx = 0.9,
          shadowDy = 0.9,
          shadowColor = [0, 0, 0],
        } = opts;

        // Dos pasadas: borde y luego relleno.
        // Así el borde no "tapa" el color (en algunos visores quedaba todo blanco).
        if (shadow) {
          doc.setTextColor(...shadowColor);
          doc.text(String(text), x + shadowDx, y + shadowDy);
        }

        try {
          doc.setDrawColor(...stroke);
          doc.setLineWidth(lineWidth);
          doc.setTextColor(...stroke);
          doc.text(String(text), x, y, { renderingMode: 'stroke' });
        } catch {
          // ignore
        }

        doc.setTextColor(...fill);
        doc.text(String(text), x, y);
      };

      const wrapLineCount = (tokens, startX, maxX, gap) => {
        let lines = 1;
        let cx = startX;
        for (const tok of tokens) {
          const w = measure(tok);
          if (cx !== startX && cx + w > maxX) {
            lines += 1;
            cx = startX;
          }
          cx += w + gap;
        }
        return lines;
      };

      // Ajuste automático de tamaño para que siempre entre.
      let labelSize = 13;
      // Horarios del mismo tamaño que la fecha
      let timeSize = 15;
      let lineH = timeSize + 7;
      const dayGap = 10;
      const timeGap = 6;
      const timesX = leftX + headerGap;
      const availableH = bg
        ? Math.max(120, (bg.y + bg.h - 30) - topY)
        : (pageH - 60 - topY);

      const computeTotalH = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(timeSize);
        lineH = timeSize + 7;

        let total = 0;
        for (const day of days) {
          if (!day.inWindow) continue;
          total += Math.max(labelSize + 2, lineH);
          const tokens = (day.times || []).map((t) => t.hora);
          const lines = tokens.length > 0 ? wrapLineCount(tokens, timesX, rightLimit, timeGap) : 1;
          total += (lines - 1) * lineH;
          total += dayGap;
        }
        return total;
      };

      // Evita achicar demasiado: priorizamos legibilidad.
      while (timeSize > 11) {
        const needed = computeTotalH();
        if (needed <= availableH) break;
        timeSize -= 1;
        labelSize = Math.max(10, labelSize - 1);
      }

      // Semana + generado (sin recuadros)
      const headerY = topY - 18;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      textOutlined(String(label), leftX, headerY, {
        fill: dark,
        stroke: white,
        lineWidth: 1.6,
        shadow: true,
        shadowDx: 1,
        shadowDy: 1,
        shadowColor: [0, 0, 0],
      });



      // Lista de días: "Lun 13/04" + horarios en renglones (sin fondo)
      let y = topY;
      for (const day of days) {
        if (!day.inWindow) continue;

        const rowStartY = y;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(labelSize);
        // Un poquito más "ancho" para que destaque
        if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0.3);
        textOutlined(day.header, leftX, y, {
          fill: day.esPasado ? muted : dark,
          stroke: white,
          lineWidth: 1.6,
          shadow: false,
        });
        if (typeof doc.setCharSpace === 'function') doc.setCharSpace(0);

        const tokens = Array.isArray(day.times) ? day.times : [];
        let cx = timesX;
        let ty = y;
        let maxRightUsed = timesX;

        if (tokens.length === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(timeSize);
          const sinTxt = 'Sin horarios';
          textOutlined(sinTxt, timesX, ty, { fill: muted, stroke: white, lineWidth: 1.2, shadow: true });
          maxRightUsed = timesX + measure(sinTxt);

          // Borde del renglón (sin fondo) para que se entienda mejor
          try {
            const rowLeft = leftX - 10;
            const rowRight = Math.min(rightLimit + 6, maxRightUsed + 10);
            const rowTop = rowStartY - Math.max(labelSize, timeSize) - 6;
            const rowBottom = ty + 10;
            const w = Math.max(10, rowRight - rowLeft);
            const h = Math.max(10, rowBottom - rowTop);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.6);
            if (typeof doc.roundedRect === 'function') doc.roundedRect(rowLeft, rowTop, w, h, 4, 4, 'S');
            else doc.rect(rowLeft, rowTop, w, h);

            // Separador vertical entre fecha y horarios
            const dividerX = timesX - 12;
            doc.line(dividerX, rowTop, dividerX, rowTop + h);
          } catch {
            // ignore
          }

          y = ty + lineH + dayGap;
          continue;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(timeSize);

        for (const t of tokens) {
          const text = String(t.hora);
          const w = measure(text);
          if (cx !== timesX && cx + w > rightLimit) {
            ty += lineH;
            cx = timesX;
          }

          if (t.ocupado) {
            textOutlined(text, cx, ty, { fill: muted, stroke: white, lineWidth: 1.0, shadow: true });
          } else {
            textOutlined(text, cx, ty, { fill: pink, stroke: white, lineWidth: 1.2, shadow: true });
          }

          if (t.ocupado) {
            const yStrike = ty - timeSize * 0.35;
            doc.setDrawColor(...muted);
            doc.setLineWidth(1.2);
            doc.line(cx, yStrike, cx + w, yStrike);
          }

          maxRightUsed = Math.max(maxRightUsed, cx + w);

          cx += w + timeGap;
        }

        // Borde del renglón (sin fondo) para que se entienda mejor
        try {
          const rowLeft = leftX - 10;
          const rowRight = Math.min(rightLimit + 6, maxRightUsed + 10);
          const rowTop = rowStartY - Math.max(labelSize, timeSize) - 6;
          const rowBottom = ty + 10;
          const w = Math.max(10, rowRight - rowLeft);
          const h = Math.max(10, rowBottom - rowTop);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.6);
          if (typeof doc.roundedRect === 'function') doc.roundedRect(rowLeft, rowTop, w, h, 4, 4, 'S');
          else doc.rect(rowLeft, rowTop, w, h);

          // Separador vertical entre fecha y horarios
          const dividerX = timesX - 12;
          doc.line(dividerX, rowTop, dividerX, rowTop + h);
        } catch {
          // ignore
        }

        y = ty + lineH + dayGap;
      }
    };

    renderWeek(weekTabLabels?.[0] || 'Esta semana', mondaySemana0);
    doc.addPage();
    renderWeek(
      weekTabLabels?.[1] || 'Próxima semana',
      new Date(mondaySemana0.getFullYear(), mondaySemana0.getMonth(), mondaySemana0.getDate() + 7)
    );

    doc.save(`turnos-disponibles-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportTurnosDisponiblesExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');

    const baseHeader = ['Fecha', 'Día', 'Disponibles', 'Ocupados', 'Total'];
    const maxHorarios = Math.max(1, ...turnosDisponibles.map((x) => x.disponibles.length));
    const header = [...baseHeader, ...Array.from({ length: maxHorarios }, (_, i) => `Horario ${i + 1}`)];

    const dataRows = turnosDisponibles.map((x) => {
      const dateObj = new Date(x.fechaStr + 'T00:00:00');
      return [
        dateObj,
        x.diaLabel,
        Number(x.disponibles.length) || 0,
        Number(x.ocupados) || 0,
        Number(x.total) || 0,
        ...Array.from({ length: maxHorarios }, (_, idx) => x.disponibles[idx] || ''),
      ];
    });

    const aoa = [
      ['Turnos disponibles (próximas 2 semanas)'],
      ['Generado', generado],
      [],
      header,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();

    // Merge título a lo ancho
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];

    // Ancho de columnas (aprox.)
    ws['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 8 },
      ...Array.from({ length: maxHorarios }, () => ({ wch: 9 })),
    ];

    // Congelar hasta la fila de headers
    ws['!views'] = [{ state: 'frozen', ySplit: 4 }];

    // Sin autofiltro (sin flechas)

    // Formato fecha en columna A (filas de datos)
    for (let i = 0; i < dataRows.length; i++) {
      const addr = XLSX.utils.encode_cell({ r: 4 + i, c: 0 });
      if (ws[addr]) ws[addr].z = 'dd/mm/yyyy';
    }

    // ===== Estilos =====
    // Altura de filas
    ws['!rows'] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }];

    // Título
    setCellStyle(ws, 'A1', {
      font: { bold: true, sz: 16, color: { rgb: EXCEL_COLORS.text } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });

    // Generado
    setCellStyle(ws, 'A2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });
    setCellStyle(ws, 'B2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });

    // Headers
    styleRow(ws, 3, header.length, {
      font: { bold: true, color: { rgb: EXCEL_COLORS.white } },
      fill: { patternType: 'solid', fgColor: { rgb: EXCEL_COLORS.primary } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: excelBorderThin,
    });

    // Datos
    styleDataGrid(ws, 4, dataRows.length, header.length, {
      alignLeftCols: [1],
      numberFmtByCol: {
        0: 'dd/mm/yyyy',
        2: '0',
        3: '0',
        4: '0',
      },
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Turnos disponibles');
    exportExcel(wb, `turnos-disponibles-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportStatsPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.setFontSize(16);
    doc.text('Estadísticas y finanzas', 40, 52);
    doc.setFontSize(10);
    doc.text(`Generado: ${generado}`, 40, 70);

    autoTable(doc, {
      startY: 86,
      head: [['Periodo', 'Cobrado', 'Por cobrar', 'Turnos']],
      body: [
        ['Hoy', `$${stats.hoy.cobrado.toLocaleString()}`, `$${stats.hoy.porCobrar.toLocaleString()}`, String(stats.hoy.cantidad)],
        ['Últimos 7 días', `$${stats.semana.cobrado.toLocaleString()}`, `$${stats.semana.porCobrar.toLocaleString()}`, String(stats.semana.cantidad)],
        [`Mes (${stats.mesAnioLabel})`, `$${stats.mes.cobrado.toLocaleString()}`, `$${stats.mes.porCobrar.toLocaleString()}`, String(stats.mes.cantidad)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
    });

    const startY2 = (doc.lastAutoTable?.finalY || 140) + 18;
    doc.setFontSize(12);
    doc.text(`Top clientes del mes ${stats.mesAnioLabel} (por total)`, 40, startY2);

    autoTable(doc, {
      startY: startY2 + 8,
      head: [['Cliente', 'Email/ID', 'Total', 'Pagado', 'Turnos']],
      body: stats.topClientesMes.map((c) => [
        c.nombre || '—',
        c.email || c.key,
        `$${c.total.toLocaleString()}`,
        `$${c.pagado.toLocaleString()}`,
        String(c.turnos),
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
      columnStyles: { 1: { cellWidth: 220 } },
    });

    doc.save(`estadisticas-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportStatsExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const wb = XLSX.utils.book_new();

    // ===== Resumen =====
    const headerResumen = ['Periodo', 'Cobrado', 'Por cobrar', 'Turnos'];
    const rowsResumen = [
      ['Hoy', Number(stats.hoy.cobrado) || 0, Number(stats.hoy.porCobrar) || 0, Number(stats.hoy.cantidad) || 0],
      ['Últimos 7 días', Number(stats.semana.cobrado) || 0, Number(stats.semana.porCobrar) || 0, Number(stats.semana.cantidad) || 0],
      [`Mes (${stats.mesAnioLabel})`, Number(stats.mes.cobrado) || 0, Number(stats.mes.porCobrar) || 0, Number(stats.mes.cantidad) || 0],
    ];

    const aoaResumen = [
      ['Estadísticas y finanzas'],
      ['Generado', generado],
      [],
      headerResumen,
      ...rowsResumen,
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(aoaResumen);
    wsResumen['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerResumen.length - 1 } }];
    wsResumen['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    wsResumen['!views'] = [{ state: 'frozen', ySplit: 4 }];
    // Sin autofiltro (sin flechas)

    // ===== Estilos Resumen =====
    wsResumen['!rows'] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }];
    setCellStyle(wsResumen, 'A1', {
      font: { bold: true, sz: 16, color: { rgb: EXCEL_COLORS.text } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    setCellStyle(wsResumen, 'A2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });
    setCellStyle(wsResumen, 'B2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });

    styleRow(wsResumen, 3, headerResumen.length, {
      font: { bold: true, color: { rgb: EXCEL_COLORS.white } },
      fill: { patternType: 'solid', fgColor: { rgb: EXCEL_COLORS.secondary } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: excelBorderThin,
    });

    styleDataGrid(wsResumen, 4, rowsResumen.length, headerResumen.length, {
      alignLeftCols: [0],
      numberFmtByCol: {
        1: '$#,##0',
        2: '$#,##0',
        3: '0',
      },
    });

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // ===== Top clientes =====
    const headerTop = ['Cliente', 'Email/ID', 'Total', 'Pagado', 'Turnos'];
    const rowsTop = stats.topClientesMes.map((c) => [
      c.nombre || '—',
      c.email || c.key,
      Number(c.total) || 0,
      Number(c.pagado) || 0,
      Number(c.turnos) || 0,
    ]);
    const aoaTop = [
      [`Top clientes del mes ${stats.mesAnioLabel} (por total)`],
      ['Generado', generado],
      [],
      headerTop,
      ...rowsTop,
    ];

    const wsTop = XLSX.utils.aoa_to_sheet(aoaTop);
    wsTop['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerTop.length - 1 } }];
    wsTop['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    wsTop['!views'] = [{ state: 'frozen', ySplit: 4 }];
    // Sin autofiltro (sin flechas)

    // ===== Estilos Top =====
    wsTop['!rows'] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 8 }, { hpt: 18 }];
    setCellStyle(wsTop, 'A1', {
      font: { bold: true, sz: 16, color: { rgb: EXCEL_COLORS.text } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    setCellStyle(wsTop, 'A2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });
    setCellStyle(wsTop, 'B2', { font: { bold: true, color: { rgb: EXCEL_COLORS.muted } } });

    styleRow(wsTop, 3, headerTop.length, {
      font: { bold: true, color: { rgb: EXCEL_COLORS.white } },
      fill: { patternType: 'solid', fgColor: { rgb: EXCEL_COLORS.primary } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: excelBorderThin,
    });

    styleDataGrid(wsTop, 4, rowsTop.length, headerTop.length, {
      alignLeftCols: [0, 1],
      numberFmtByCol: {
        2: '$#,##0',
        3: '$#,##0',
        4: '0',
      },
    });

    XLSX.utils.book_append_sheet(wb, wsTop, 'Top clientes');

    exportExcel(wb, `estadisticas-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportGananciasTotalMesPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.setFontSize(16);
    doc.text(`Ganancias total del mes (${mesFiltroMeta.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Generado: ${generado}`, 40, 70);
    doc.text(
      reportGananciasTotalMes.isMesActual
        ? `Corte: hasta hoy (${reportGananciasTotalMes.hastaStr}) + turnos futuros con pago registrado (seña)`
        : 'Corte: mes completo',
      40,
      86
    );

    autoTable(doc, {
      startY: 102,
      head: [['Concepto', 'Monto']],
      body: [
        ['Pagado (ingresos)', `$${reportGananciasTotalMes.resumen.pagado.toLocaleString()}`],
        ['Por cobrar', `$${reportGananciasTotalMes.resumen.porCobrar.toLocaleString()}`],
        ['Total', `$${reportGananciasTotalMes.resumen.total.toLocaleString()}`],
        ['Turnos', String(reportGananciasTotalMes.resumen.turnos)],
        ['Días con movimientos', String(reportGananciasTotalMes.resumen.dias)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
      columnStyles: { 0: { cellWidth: 240 } },
    });

    const startY2 = (doc.lastAutoTable?.finalY || 220) + 18;
    doc.setFontSize(12);
    doc.text('Detalle por día', 40, startY2);

    autoTable(doc, {
      startY: startY2 + 8,
      head: [['Fecha', 'Día', 'Turnos', 'Total', 'Pagado', 'Por cobrar']],
      body: reportGananciasTotalMes.porDia.map((r) => [
        format(new Date(r.fechaStr + 'T00:00:00'), 'dd/MM/yyyy'),
        r.dia,
        String(r.turnos),
        `$${r.total.toLocaleString()}`,
        `$${r.pagado.toLocaleString()}`,
        `$${r.porCobrar.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
      columnStyles: { 1: { cellWidth: 110 } },
    });

    doc.save(`ganancias-total-mes-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportGananciasTotalMesExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const wb = XLSX.utils.book_new();

    const wsResumen = makeStyledSheet({
      title: `Ganancias total del mes (${mesFiltroMeta.mesAnioLabel})`,
      generado,
      header: ['Concepto', 'Monto'],
      rows: [
        ['Pagado (ingresos)', Number(reportGananciasTotalMes.resumen.pagado) || 0],
        ['Por cobrar', Number(reportGananciasTotalMes.resumen.porCobrar) || 0],
        ['Total', Number(reportGananciasTotalMes.resumen.total) || 0],
        ['Turnos', Number(reportGananciasTotalMes.resumen.turnos) || 0],
        ['Días con movimientos', Number(reportGananciasTotalMes.resumen.dias) || 0],
        ['Corte', reportGananciasTotalMes.isMesActual ? `Hasta hoy (${reportGananciasTotalMes.hastaStr}) + futuros con pago` : 'Mes completo'],
      ],
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 28 }, { wch: 18 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '#,##0.00' },
    });

    const headerDia = ['Fecha', 'Día', 'Turnos', 'Total', 'Pagado', 'Por cobrar'];
    const rowsDia = reportGananciasTotalMes.porDia.map((r) => [
      new Date(r.fechaStr + 'T00:00:00'),
      r.dia,
      Number(r.turnos) || 0,
      Number(r.total) || 0,
      Number(r.pagado) || 0,
      Number(r.porCobrar) || 0,
    ]);

    const wsDia = makeStyledSheet({
      title: `Detalle por día (${mesFiltroMeta.mesAnioLabel})`,
      generado,
      header: headerDia,
      rows: rowsDia,
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [1],
      numberFmtByCol: {
        0: 'dd/mm/yyyy',
        2: '0',
        3: '#,##0.00',
        4: '#,##0.00',
        5: '#,##0.00',
      },
    });

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsDia, 'Por día');

    exportExcel(wb, `ganancias-total-mes-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportGananciasServicioPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Ganancias por servicio (${mesFiltroMeta.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Servicio', 'Turnos', 'Total', 'Pagado', 'Por cobrar']],
      body: reportGananciasServicio.items.map((x) => [
        x.servicio,
        String(x.turnos),
        `$${x.total.toLocaleString()}`,
        `$${x.pagado.toLocaleString()}`,
        `$${x.porCobrar.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
      columnStyles: { 0: { cellWidth: 220 } },
    });

    doc.save(`ganancias-servicio-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportGananciasServicioExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Servicio', 'Turnos', 'Total', 'Pagado', 'Por cobrar'];
    const rows = reportGananciasServicio.items.map((x) => [
      x.servicio,
      Number(x.turnos) || 0,
      Number(x.total) || 0,
      Number(x.pagado) || 0,
      Number(x.porCobrar) || 0,
    ]);
    const ws = makeStyledSheet({
      title: `Ganancias por servicio (${mesFiltroMeta.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '$#,##0', 3: '$#,##0', 4: '$#,##0' },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ganancias');
    exportExcel(wb, `ganancias-servicio-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportServiciosMasPedidosPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Servicios más pedidos (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);
    autoTable(doc, {
      startY: 100,
      head: [['Servicio', 'Turnos', 'Total', 'Pagado']],
      body: reportServiciosMasPedidos.items.map((x) => [
        x.servicio,
        String(x.turnos),
        `$${x.total.toLocaleString()}`,
        `$${x.pagado.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
      columnStyles: { 0: { cellWidth: 240 } },
    });
    doc.save(`servicios-mas-pedidos-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportServiciosMasPedidosExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Servicio', 'Turnos', 'Total', 'Pagado'];
    const rows = reportServiciosMasPedidos.items.map((x) => [
      x.servicio,
      Number(x.turnos) || 0,
      Number(x.total) || 0,
      Number(x.pagado) || 0,
    ]);
    const ws = makeStyledSheet({
      title: `Servicios más pedidos (${stats.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '$#,##0', 3: '$#,##0' },
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    exportExcel(wb, `servicios-mas-pedidos-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportClientesRecurrentesPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Clientes recurrentes (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);
    autoTable(doc, {
      startY: 100,
      head: [['Cliente', 'Email/ID', 'Turnos', 'Total', 'Pagado']],
      body: reportClientesRecurrentes.items.map((c) => [
        c.nombre || '—',
        c.email || c.key,
        String(c.turnos),
        `$${c.total.toLocaleString()}`,
        `$${c.pagado.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
      columnStyles: { 1: { cellWidth: 220 } },
    });
    doc.save(`clientes-recurrentes-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportClientesRecurrentesExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Cliente', 'Email/ID', 'Turnos', 'Total', 'Pagado'];
    const rows = reportClientesRecurrentes.items.map((c) => [
      c.nombre || '—',
      c.email || c.key,
      Number(c.turnos) || 0,
      Number(c.total) || 0,
      Number(c.pagado) || 0,
    ]);
    const ws = makeStyledSheet({
      title: `Clientes recurrentes (${stats.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [0, 1],
      numberFmtByCol: { 2: '0', 3: '$#,##0', 4: '$#,##0' },
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    exportExcel(wb, `clientes-recurrentes-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportOcupacionPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Ocupación (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);
    autoTable(doc, {
      startY: 100,
      head: [['Fecha', 'Día', 'Ocupados', 'Libres', 'Total', '%']],
      body: reportOcupacion.rows.map((r) => [
        format(new Date(r.fechaStr + 'T00:00:00'), 'dd/MM/yyyy'),
        r.dia,
        String(r.ocupado),
        String(r.libre),
        String(r.total),
        `${r.pct}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
    });
    doc.save(`ocupacion-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportOcupacionExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Fecha', 'Día', 'Ocupados', 'Libres', 'Total', '%'];
    const rows = reportOcupacion.rows.map((r) => [
      new Date(r.fechaStr + 'T00:00:00'),
      r.dia,
      Number(r.ocupado) || 0,
      Number(r.libre) || 0,
      Number(r.total) || 0,
      (Number(r.pct) || 0) / 100,
    ]);
    const ws = makeStyledSheet({
      title: `Ocupación (${stats.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }],
      alignLeftCols: [1],
      numberFmtByCol: { 0: 'dd/mm/yyyy', 2: '0', 3: '0', 4: '0', 5: '0%' },
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ocupación');
    exportExcel(wb, `ocupacion-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportCancelacionesPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Cancelaciones y rechazos (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total turnos (mes)', String(reportCancelaciones.total)],
        ['Cancelados', `${reportCancelaciones.cancelados} (${reportCancelaciones.pctCancelados}%)`],
        ['Rechazados', `${reportCancelaciones.rechazados} (${reportCancelaciones.pctRechazados}%)`],
        ['Transferencias rechazadas', String(reportCancelaciones.transferRech)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
    });

    const y2 = (doc.lastAutoTable?.finalY || 160) + 18;
    doc.setFontSize(12);
    doc.text('Estados (cantidad)', 40, y2);
    autoTable(doc, {
      startY: y2 + 8,
      head: [['Estado', 'Cantidad']],
      body: reportCancelaciones.estados.map((e) => [e.estado, String(e.cantidad)]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
    });

    if (reportCancelaciones.motivos.length > 0) {
      const y3 = (doc.lastAutoTable?.finalY || y2 + 80) + 18;
      doc.setFontSize(12);
      doc.text('Motivos de rechazo de transferencia', 40, y3);
      autoTable(doc, {
        startY: y3 + 8,
        head: [['Motivo', 'Cantidad']],
        body: reportCancelaciones.motivos.map((m) => [m.motivo, String(m.cantidad)]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [233, 30, 99] },
        columnStyles: { 0: { cellWidth: 340 } },
      });
    }

    doc.save(`cancelaciones-rechazos-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportCancelacionesExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const wb = XLSX.utils.book_new();

    const wsResumen = makeStyledSheet({
      title: `Cancelaciones y rechazos (${stats.mesAnioLabel})`,
      generado,
      header: ['Métrica', 'Valor'],
      rows: [
        ['Total turnos (mes)', Number(reportCancelaciones.total) || 0],
        ['Cancelados', `${reportCancelaciones.cancelados} (${reportCancelaciones.pctCancelados}%)`],
        ['Rechazados', `${reportCancelaciones.rechazados} (${reportCancelaciones.pctRechazados}%)`],
        ['Transferencias rechazadas', Number(reportCancelaciones.transferRech) || 0],
      ],
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 28 }, { wch: 22 }],
      alignLeftCols: [0, 1],
      numberFmtByCol: {},
    });

    const wsEstados = makeStyledSheet({
      title: `Estados (${stats.mesAnioLabel})`,
      generado,
      header: ['Estado', 'Cantidad'],
      rows: reportCancelaciones.estados.map((e) => [e.estado, Number(e.cantidad) || 0]),
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 18 }, { wch: 12 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0' },
    });

    const wsMotivos = makeStyledSheet({
      title: `Motivos rechazo transferencia (${stats.mesAnioLabel})`,
      generado,
      header: ['Motivo', 'Cantidad'],
      rows: reportCancelaciones.motivos.map((m) => [m.motivo, Number(m.cantidad) || 0]),
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 44 }, { wch: 12 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0' },
    });

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsEstados, 'Estados');
    XLSX.utils.book_append_sheet(wb, wsMotivos, 'Motivos');
    exportExcel(wb, `cancelaciones-rechazos-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportMediosPagoPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Medios de pago (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Medio', 'Turnos', 'Total', 'Pagado', 'Por cobrar']],
      body: reportMediosPago.items.map((x) => [
        x.medio,
        String(x.turnos),
        `$${x.total.toLocaleString()}`,
        `$${x.pagado.toLocaleString()}`,
        `$${x.porCobrar.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
    });

    if (reportMediosPago.transferEstados.length > 0) {
      const y2 = (doc.lastAutoTable?.finalY || 160) + 18;
      doc.setFontSize(12);
      doc.text('Transferencias: estado de validación', 40, y2);
      autoTable(doc, {
        startY: y2 + 8,
        head: [['Estado transferencia', 'Cantidad']],
        body: reportMediosPago.transferEstados.map((e) => [e.estado, String(e.cantidad)]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [156, 39, 176] },
      });
    }

    doc.save(`medios-pago-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportMediosPagoExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const wb = XLSX.utils.book_new();
    const ws = makeStyledSheet({
      title: `Medios de pago (${stats.mesAnioLabel})`,
      generado,
      header: ['Medio', 'Turnos', 'Total', 'Pagado', 'Por cobrar'],
      rows: reportMediosPago.items.map((x) => [
        x.medio,
        Number(x.turnos) || 0,
        Number(x.total) || 0,
        Number(x.pagado) || 0,
        Number(x.porCobrar) || 0,
      ]),
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '$#,##0', 3: '$#,##0', 4: '$#,##0' },
    });

    const wsT = makeStyledSheet({
      title: `Transferencias por estado (${stats.mesAnioLabel})`,
      generado,
      header: ['Estado', 'Cantidad'],
      rows: reportMediosPago.transferEstados.map((e) => [e.estado, Number(e.cantidad) || 0]),
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 18 }, { wch: 12 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0' },
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Medios');
    XLSX.utils.book_append_sheet(wb, wsT, 'Transferencias');
    exportExcel(wb, `medios-pago-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportCobrosPendientesPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Cobros pendientes / deuda (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Cliente', 'Email/ID', 'Turnos', 'Total', 'Pagado', 'Por cobrar']],
      body: reportCobrosPendientes.items.map((c) => [
        c.nombre || '—',
        c.email || c.key,
        String(c.turnos),
        `$${c.total.toLocaleString()}`,
        `$${c.pagado.toLocaleString()}`,
        `$${c.porCobrar.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
      columnStyles: { 1: { cellWidth: 210 } },
    });

    doc.save(`cobros-pendientes-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportCobrosPendientesExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Cliente', 'Email/ID', 'Turnos', 'Total', 'Pagado', 'Por cobrar'];
    const rows = reportCobrosPendientes.items.map((c) => [
      c.nombre || '—',
      c.email || c.key,
      Number(c.turnos) || 0,
      Number(c.total) || 0,
      Number(c.pagado) || 0,
      Number(c.porCobrar) || 0,
    ]);
    const ws = makeStyledSheet({
      title: `Cobros pendientes / deuda (${stats.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [0, 1],
      numberFmtByCol: { 2: '0', 3: '$#,##0', 4: '$#,##0', 5: '$#,##0' },
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deuda');
    exportExcel(wb, `cobros-pendientes-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportCancelacionServicioPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Cancelación por servicio (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Servicio', 'Total', 'Cancelados', 'Rechazados', '% cancel+rech']],
      body: reportCancelacionServicio.items.map((x) => [
        x.servicio,
        String(x.total),
        String(x.cancelados),
        String(x.rechazados),
        `${x.pct}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
      columnStyles: { 0: { cellWidth: 220 } },
    });

    doc.save(`cancelacion-servicio-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportCancelacionServicioExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Servicio', 'Total', 'Cancelados', 'Rechazados', '% cancel+rech'];
    const rows = reportCancelacionServicio.items.map((x) => [
      x.servicio,
      Number(x.total) || 0,
      Number(x.cancelados) || 0,
      Number(x.rechazados) || 0,
      (Number(x.pct) || 0) / 100,
    ]);
    const ws = makeStyledSheet({
      title: `Cancelación por servicio (${stats.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '0', 3: '0', 4: '0%' },
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cancelación');
    exportExcel(wb, `cancelacion-servicio-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportHorariosPicoPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Horarios pico (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Hora', 'Turnos', '%']],
      body: reportHorariosPico.porHora.map((h) => [h.hora, String(h.turnos), `${h.pct}%`]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
    });

    if (reportHorariosPico.porDia.length > 0) {
      const y2 = (doc.lastAutoTable?.finalY || 160) + 18;
      doc.setFontSize(12);
      doc.text('Por día de semana', 40, y2);
      autoTable(doc, {
        startY: y2 + 8,
        head: [['Día', 'Turnos', '%']],
        body: reportHorariosPico.porDia.map((d) => [d.dia, String(d.turnos), `${d.pct}%`]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [156, 39, 176] },
      });
    }

    doc.save(`horarios-pico-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportHorariosPicoExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const wb = XLSX.utils.book_new();

    const wsHora = makeStyledSheet({
      title: `Horarios pico por hora (${stats.mesAnioLabel})`,
      generado,
      header: ['Hora', 'Turnos', '%'],
      rows: reportHorariosPico.porHora.map((h) => [h.hora, Number(h.turnos) || 0, (Number(h.pct) || 0) / 100]),
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 10 }, { wch: 10 }, { wch: 8 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '0%' },
    });

    const wsDia = makeStyledSheet({
      title: `Horarios pico por día (${stats.mesAnioLabel})`,
      generado,
      header: ['Día', 'Turnos', '%'],
      rows: reportHorariosPico.porDia.map((d) => [d.dia, Number(d.turnos) || 0, (Number(d.pct) || 0) / 100]),
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 14 }, { wch: 10 }, { wch: 8 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '0%' },
    });

    XLSX.utils.book_append_sheet(wb, wsHora, 'Por hora');
    XLSX.utils.book_append_sheet(wb, wsDia, 'Por día');
    exportExcel(wb, `horarios-pico-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportOcupacionServicioPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Ocupación por servicio (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);
    autoTable(doc, {
      startY: 100,
      head: [['Servicio', 'Turnos', '%', 'Total', 'Pagado', 'Por cobrar']],
      body: reportOcupacionServicio.items.map((x) => [
        x.servicio,
        String(x.turnos),
        `${x.pct}%`,
        `$${x.total.toLocaleString()}`,
        `$${x.pagado.toLocaleString()}`,
        `$${x.porCobrar.toLocaleString()}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [233, 30, 99] },
      columnStyles: { 0: { cellWidth: 220 } },
    });
    doc.save(`ocupacion-servicio-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportOcupacionServicioExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const header = ['Servicio', 'Turnos', '%', 'Total', 'Pagado', 'Por cobrar'];
    const rows = reportOcupacionServicio.items.map((x) => [
      x.servicio,
      Number(x.turnos) || 0,
      (Number(x.pct) || 0) / 100,
      Number(x.total) || 0,
      Number(x.pagado) || 0,
      Number(x.porCobrar) || 0,
    ]);
    const ws = makeStyledSheet({
      title: `Ocupación por servicio (${stats.mesAnioLabel})`,
      generado,
      header,
      rows,
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 28 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }],
      alignLeftCols: [0],
      numberFmtByCol: { 1: '0', 2: '0%', 3: '$#,##0', 4: '$#,##0', 5: '$#,##0' },
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ocupación servicio');
    exportExcel(wb, `ocupacion-servicio-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const exportSeniasDevueltasPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    doc.setFontSize(16);
    doc.text(`Señas devueltas (${stats.mesAnioLabel})`, 40, 52);
    doc.setFontSize(10);
    doc.text(`Datos hasta: ${stats.hastaStr}`, 40, 70);
    doc.text(`Generado: ${generado}`, 40, 84);

    autoTable(doc, {
      startY: 100,
      head: [['Métrica', 'Valor']],
      body: [
        ['Cantidad', String(reportSeniasDevueltas.resumen.cantidad)],
        ['Monto pagado (registrado)', `$${reportSeniasDevueltas.resumen.pagado.toLocaleString()}`],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [156, 39, 176] },
    });

    const y2 = (doc.lastAutoTable?.finalY || 160) + 18;
    doc.setFontSize(12);
    doc.text('Detalle', 40, y2);
    autoTable(doc, {
      startY: y2 + 8,
      head: [['Fecha', 'Hora', 'Cliente', 'Servicio', 'Pagado', 'Estado']],
      body: reportSeniasDevueltas.items.map((x) => [
        x.fechaStr ? format(new Date(x.fechaStr + 'T00:00:00'), 'dd/MM/yyyy') : '—',
        x.hora || '—',
        x.nombre || x.email || '—',
        x.servicio,
        `$${x.pagado.toLocaleString()}`,
        x.estado || '—',
      ]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [233, 30, 99] },
      columnStyles: { 2: { cellWidth: 140 }, 3: { cellWidth: 160 } },
    });

    doc.save(`senias-devueltas-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
  };

  const exportSeniasDevueltasExcel = () => {
    const generado = format(new Date(), 'dd/MM/yyyy HH:mm');
    const wb = XLSX.utils.book_new();

    const wsResumen = makeStyledSheet({
      title: `Señas devueltas (${stats.mesAnioLabel})`,
      generado,
      header: ['Métrica', 'Valor'],
      rows: [
        ['Cantidad', Number(reportSeniasDevueltas.resumen.cantidad) || 0],
        ['Monto pagado (registrado)', Number(reportSeniasDevueltas.resumen.pagado) || 0],
      ],
      headerFillRgb: EXCEL_COLORS.secondary,
      cols: [{ wch: 26 }, { wch: 18 }],
      alignLeftCols: [0, 1],
      numberFmtByCol: { 1: '$#,##0' },
    });

    const wsDetalle = makeStyledSheet({
      title: `Detalle señas devueltas (${stats.mesAnioLabel})`,
      generado,
      header: ['Fecha', 'Hora', 'Cliente', 'Servicio', 'Pagado', 'Estado'],
      rows: reportSeniasDevueltas.items.map((x) => [
        x.fechaStr ? new Date(x.fechaStr + 'T00:00:00') : '',
        x.hora || '',
        x.nombre || x.email || '—',
        x.servicio,
        Number(x.pagado) || 0,
        x.estado || '',
      ]),
      headerFillRgb: EXCEL_COLORS.primary,
      cols: [{ wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 12 }],
      alignLeftCols: [2, 3],
      numberFmtByCol: { 0: 'dd/mm/yyyy', 4: '$#,##0' },
    });

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');
    exportExcel(wb, `senias-devueltas-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
  };

  const header = (
    <div className="admin-header">
      <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <FileText size={34} style={{ verticalAlign: 'middle' }} />
        <span>Reportes</span>
      </h1>
      <p>
        Consultas y reportes en tiempo real · Modo: <strong>{roleLabel}</strong>
      </p>
    </div>
  );

  if (!isSuperAdmin()) {
    return (
      <div className="admin-page">
        {header}
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '14px 0 18px 0' }}>
            <button
              type="button"
              className="btn btn-secondary reportes-back-btn"
              onClick={() => navigate('/admin/panel')}
              aria-label="Volver al panel"
              title="Volver al panel"
            >
              <ChevronLeft size={16} />
              Volver al panel
            </button>
          </div>
          <div className="admin-section">
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Acceso restringido</h2>
            <p style={{ margin: 0 }}>
              Los reportes solo están disponibles para <b>Superadmin</b>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {header}

      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="reportes-topbar">
          <button
            type="button"
            className="btn btn-secondary reportes-back-btn"
            onClick={() => (vista === 'home' ? navigate('/admin/panel') : setVista('home'))}
            aria-label={vista === 'home' ? 'Volver al panel' : 'Volver a reportes'}
            title={vista === 'home' ? 'Volver al panel' : 'Volver a reportes'}
          >
            <ChevronLeft size={16} />
            {vista === 'home' ? 'Volver al panel' : 'Volver'}
          </button>

          <button
            type="button"
            className="btn btn-secondary reportes-refresh-btn"
            onClick={cargarDatos}
            disabled={cargando}
            title="Actualizar"
          >
            <RefreshCw size={16} />
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {error ? (
          <div className="admin-section">
            <p style={{ margin: 0, color: 'var(--error)', fontWeight: 800 }}>{error}</p>
          </div>
        ) : null}

        {vista === 'home' && (
          <div className="admin-section">
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Panel de reportes</h2>
            <p style={{ margin: '0 0 14px 0' }}>Elegí un reporte y tocá “Traer reporte”.</p>

            <div className="reportes-selector">
              <label className="reportes-selector-label" htmlFor="reporteSelect">Reporte</label>
              <div className="reportes-selector-row">
                <select
                  id="reporteSelect"
                  className="reportes-selector-select"
                  value={reporteSeleccionado}
                  onChange={(e) => setReporteSeleccionado(e.target.value)}
                >
                  <option value="turnosDisponibles">Turnos disponibles (2 semanas)</option>
                  <option value="estadisticas">Estadísticas (día/semana/mes)</option>
                  <option value="gananciasTotalMes">Ganancias total del mes (mes seleccionado)</option>
                  <option value="gananciasServicio">Ganancias por servicio (mes seleccionado)</option>
                  <option value="serviciosMasPedidos">Servicios más pedidos (mes seleccionado)</option>
                  <option value="clientesRecurrentes">Clientes recurrentes (mes seleccionado)</option>
                  <option value="ocupacion">Ocupación (mes seleccionado)</option>
                  <option value="cancelaciones">Cancelaciones y rechazos (mes seleccionado)</option>
                  <option value="mediosPago">Medios de pago (mes seleccionado)</option>
                  <option value="cobrosPendientes">Cobros pendientes / deuda (mes seleccionado)</option>
                  <option value="cancelacionServicio">Cancelación por servicio (mes seleccionado)</option>
                  <option value="horariosPico">Horarios pico (mes seleccionado)</option>
                  <option value="ocupacionServicio">Ocupación por servicio (mes seleccionado)</option>
                  <option value="seniasDevueltas">Señas devueltas (mes seleccionado)</option>
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    await cargarDatos();
                    setVista(reporteSeleccionado);
                  }}
                  disabled={cargando}
                >
                  {cargando ? 'Cargando...' : 'Traer reporte'}
                </button>
              </div>

              <div className="reportes-selector-help">
                Tip: si querés que esté 100% al día, tocá “Actualizar”.
              </div>
            </div>
          </div>
        )}

        {vista === 'turnosDisponibles' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Turnos disponibles</h2>
              <div className="reporte-head-actions">
                {showSemana ? (
                  <button type="button" className="btn btn-secondary" onClick={exportTurnosDisponiblesPDF} disabled={turnosDisponibles.length === 0}>
                    <Download size={16} /> PDF
                  </button>
                ) : null}
                <button type="button" className="btn btn-secondary" onClick={exportTurnosDisponiblesExcel} disabled={turnosDisponibles.length === 0}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            {/* Tarjeta destacada (ideal para captura) */}
            <div className="reporte-share-card" aria-label="Resumen para compartir">
              <div className="reporte-share-top">
                <div className="reporte-share-title">Disponibilidad de turnos</div>
                <div className="reporte-share-badge">Próximas 2 semanas</div>
              </div>

              {primeraDisponibilidad ? (
                <>
                  <div className="reporte-share-next">
                    <div className="k">Próxima fecha con horarios</div>
                    <div className="v">
                      {primeraDisponibilidad.diaLabel}{' '}
                      {format(new Date(primeraDisponibilidad.fechaStr + 'T00:00:00'), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <div className="reporte-share-hours">
                    {(primeraDisponibilidad.disponibles || []).slice(0, 10).map((h) => (
                      <span key={h} className="reporte-hora-chip is-strong">{h}</span>
                    ))}
                    {primeraDisponibilidad.disponibles.length > 10 ? (
                      <span className="reporte-hora-chip is-muted">+{primeraDisponibilidad.disponibles.length - 10} más</span>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="reporte-share-next">
                  <div className="k">Próxima fecha con horarios</div>
                  <div className="v">No hay disponibilidad</div>
                </div>
              )}

              <div className="reporte-share-foot">
                Actualizado: {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>

            {turnosDisponibles.length === 0 ? (
              <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-light)' }}>
                No hay horarios disponibles en las próximas 2 semanas.
              </p>
            ) : (
              <>
                <div className="reporte-cal">
                  <div className="reporte-side-title" style={{ marginBottom: 10 }}>Calendario (2 semanas)</div>
                  <div className="reporte-weeks">
                    {semanasDisponibles.map((sem) => (
                      sem.items.length > 0 ? (
                        <div key={sem.key} className="reporte-week">
                          <div className="reporte-week-title">{sem.label}</div>
                          <div className="reporte-week-grid" role="grid" aria-label={sem.label}>
                            {sem.items.map((d) => {
                              const isActive = selectedFecha === d.fechaStr;
                              return (
                                <button
                                  key={d.fechaStr}
                                  type="button"
                                  className={`reporte-cal-day ${isActive ? 'is-active' : ''}`}
                                  onClick={() => {
                                    setSelectedFecha(d.fechaStr);
                                  }}
                                  role="gridcell"
                                  aria-label={`${d.diaLabel} ${format(d.date, 'dd/MM')} (${d.disponibles.length} horarios disponibles)`}
                                >
                                  <div className="d1">{d.dayShort}</div>
                                  <div className="d2">{String(d.diaNum).padStart(2, '0')}</div>
                                  <div className="d3">{d.disponibles.length} disp.</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                <div className="reporte-semana-toggleRow">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSemana((v) => !v)}
                    aria-expanded={showSemana}
                  >
                    {showSemana ? 'Ocultar calendario semanal' : 'Ver calendario semanal'}
                  </button>
                  {!showSemana ? (
                    <div className="reporte-semana-hint">
                      Tocá para ver Lunes a Sábado (ocupados tachados) y descargar el PDF.
                    </div>
                  ) : null}
                </div>

                {showSemana ? (
                  <div className="reporte-semana-card" aria-label="Calendario semanal">
                    <div className="reporte-semana-top">
                      <div>
                        <div className="reporte-semana-title">Calendario semanal</div>
                        <div className="reporte-semana-sub">Lunes a sábado · Tachados = ocupados</div>
                      </div>

                      <div className="reporte-semana-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={exportTurnosDisponiblesPDF}
                          disabled={turnosDisponibles.length === 0}
                          title="Descargar PDF"
                        >
                          <Download size={16} /> PDF
                        </button>
                      </div>

                      <div className="reporte-semana-tabs" role="tablist" aria-label="Semanas">
                        <button
                          type="button"
                          className={`reporte-semana-tab ${weekTab === 0 ? 'is-active' : ''}`}
                          onClick={() => setWeekTab(0)}
                          role="tab"
                          aria-selected={weekTab === 0}
                        >
                          {weekTabLabels[0]}
                        </button>
                        <button
                          type="button"
                          className={`reporte-semana-tab ${weekTab === 1 ? 'is-active' : ''}`}
                          onClick={() => setWeekTab(1)}
                          role="tab"
                          aria-selected={weekTab === 1}
                        >
                          {weekTabLabels[1]}
                        </button>
                      </div>
                    </div>

                    <div className="reporte-semana-grid" role="grid" aria-label="Semana seleccionada">
                      {semanaDias.map((d) => {
                        const isActive = selectedFecha === d.fechaStr;
                        return (
                          <button
                            key={d.fechaStr}
                            type="button"
                            className={`reporte-semana-day ${isActive ? 'is-active' : ''} ${!d.inWindow ? 'is-disabled' : ''}`}
                            onClick={() => {
                              if (!d.inWindow) return;
                              setSelectedFecha(d.fechaStr);
                            }}
                            disabled={!d.inWindow}
                            role="gridcell"
                            aria-label={`${d.diaLabel} ${format(d.date, 'dd/MM')}`}
                          >
                            <div className="reporte-semana-dayHead">
                              <div className="a">{d.dayShort} {String(d.diaNum).padStart(2, '0')}</div>
                              <div className="b">{format(d.date, 'dd/MM')}</div>
                            </div>

                            {!d.inWindow ? (
                              <div className="reporte-semana-empty">Fuera de rango</div>
                            ) : d.times.length === 0 ? (
                              <div className="reporte-semana-empty">Sin horarios</div>
                            ) : (
                              <div className="reporte-semana-times" role="list">
                                {d.times.map((t) => (
                                  <span
                                    key={t.hora}
                                    className={`reporte-dia-time reporte-semana-time ${t.ocupado ? 'is-ocupado' : 'is-libre'}`}
                                    role="listitem"
                                  >
                                    {t.hora}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {selectedDisponibles ? (
                  <div className="reporte-dia-card" style={{ marginTop: 14 }} aria-label="Detalle del día seleccionado">
                    <div className="reporte-dia-top">
                      <div className="reporte-dia-left">
                        <div className="reporte-dia-label">Día seleccionado</div>
                        <div className="reporte-dia-title">{selectedDisponibles.diaLabel}</div>
                        <div className="reporte-dia-date">
                          {format(new Date(selectedDisponibles.fechaStr + 'T00:00:00'), 'dd/MM/yyyy')}
                        </div>
                      </div>

                      <div className="reporte-dia-badges" aria-label="Resumen del día">
                        <span className="reporte-dia-badge is-primary">
                          {selectedDisponibles.disponibles.length} disponibles
                        </span>
                        <span className="reporte-dia-badge">{selectedDisponibles.ocupados} ocupados</span>
                        <span className="reporte-dia-badge">{selectedDisponibles.total} total</span>
                      </div>
                    </div>

                    <div className="reporte-dia-story" aria-label="Horarios del día">
                      <div className="reporte-dia-story-title">Horarios</div>
                      <div className="reporte-dia-story-sub">
                        Tachados = ya reservados · El resto = disponibles
                      </div>

                      <div className="reporte-dia-times" role="list">
                        {(selectedStory?.times || []).map((t, idx) => (
                          <span key={t.hora} className="reporte-dia-time-wrap" role="listitem">
                            <span className={`reporte-dia-time ${t.ocupado ? 'is-ocupado' : 'is-libre'}`}>
                              {t.hora}
                            </span>
                            {idx < (selectedStory?.times || []).length - 1 ? (
                              <span className="reporte-dia-sep" aria-hidden="true">|</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="reporte-dia-foot">
                      Actualizado: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {vista === 'estadisticas' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Estadísticas</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportStatsPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportStatsExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="statsMes">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="statsMes"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta" aria-label="Actualización de datos">
              Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})
            </div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Cobrado hoy</div>
                <div className="v">${stats.hoy.cobrado.toLocaleString()}</div>
                <div className="s">Turnos: {stats.hoy.cantidad} · Por cobrar: ${stats.hoy.porCobrar.toLocaleString()}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Últimos 7 días</div>
                <div className="v">${stats.semana.cobrado.toLocaleString()}</div>
                <div className="s">Turnos: {stats.semana.cantidad} · Por cobrar: ${stats.semana.porCobrar.toLocaleString()}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Mes ({stats.mesAnioLabel})</div>
                <div className="v">${stats.mes.cobrado.toLocaleString()}</div>
                <div className="s">Turnos: {stats.mes.cantidad} · Por cobrar: ${stats.mes.porCobrar.toLocaleString()}</div>
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Top clientes del mes {stats.mesAnioLabel} (por total)</div>
              <div className="turnos-table" role="table" aria-label="Top clientes del mes">
                <div className="turnos-row turnos-row-header" role="row">
                  <div className="turnos-cell cell-servicio" role="columnheader">Cliente</div>
                  <div className="turnos-cell cell-cliente" role="columnheader">Email/ID</div>
                  <div className="turnos-cell cell-fechaHora" role="columnheader">Total</div>
                  <div className="turnos-cell cell-estado" role="columnheader">Pagado</div>
                  <div className="turnos-cell cell-opciones" role="columnheader">Turnos</div>
                </div>
                {stats.topClientesMes.map((c) => (
                  <div key={c.key} className="turnos-row" role="row">
                    <div className="turnos-cell cell-servicio" role="cell">
                      <span className="turnos-servicio-nombre">{c.nombre || '—'}</span>
                    </div>
                    <div className="turnos-cell cell-cliente" role="cell">
                      <span className="turnos-cliente-nombre">{c.email || c.key}</span>
                    </div>
                    <div className="turnos-cell cell-fechaHora" role="cell">
                      <span className="turnos-pago-item"><span className="v total">${c.total.toLocaleString()}</span></span>
                    </div>
                    <div className="turnos-cell cell-estado" role="cell">
                      <span className="turnos-pago-item"><span className="v pagado">${c.pagado.toLocaleString()}</span></span>
                    </div>
                    <div className="turnos-cell cell-opciones" role="cell">{c.turnos}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {vista === 'gananciasServicio' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Ganancias por servicio</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportGananciasServicioPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportGananciasServicioExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="gananciasMes">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="gananciasMes"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{mesFiltroMeta.mesAnioLabel}</b> (desde {mesFiltroMeta.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Total</div>
                <div className="v">${reportGananciasServicio.resumen.total.toLocaleString()}</div>
                <div className="s">Turnos: {reportGananciasServicio.resumen.turnos}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Pagado</div>
                <div className="v">${reportGananciasServicio.resumen.pagado.toLocaleString()}</div>
                <div className="s">Por cobrar: ${reportGananciasServicio.resumen.porCobrar.toLocaleString()}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Servicios</div>
                <div className="v">{reportGananciasServicio.items.length}</div>
                <div className="s">Ranking por total</div>
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Detalle por servicio</div>
              <div className="reporte-simple-table" role="table" aria-label="Ganancias por servicio">
                <div className="reporte-simple-row cols-5 is-head" role="row">
                  <div className="reporte-simple-cell is-left" role="columnheader">Servicio</div>
                  <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                  <div className="reporte-simple-cell" role="columnheader">Total</div>
                  <div className="reporte-simple-cell" role="columnheader">Pagado</div>
                  <div className="reporte-simple-cell" role="columnheader">Por cobrar</div>
                </div>
                {reportGananciasServicio.items.map((x) => (
                  <div key={x.servicio} className="reporte-simple-row cols-5" role="row">
                    <div className="reporte-simple-cell is-left" role="cell">{x.servicio}</div>
                    <div className="reporte-simple-cell" role="cell">{x.turnos}</div>
                    <div className="reporte-simple-cell" role="cell">${x.total.toLocaleString()}</div>
                    <div className="reporte-simple-cell" role="cell">${x.pagado.toLocaleString()}</div>
                    <div className="reporte-simple-cell" role="cell">${x.porCobrar.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {vista === 'gananciasTotalMes' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Ganancias total del mes</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportGananciasTotalMesPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportGananciasTotalMesExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="gananciasTotalMes">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="gananciasTotalMes"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{mesFiltroMeta.mesAnioLabel}</b> (desde {mesFiltroMeta.desdeMesStr})</div>

            <div className="reportes-selector-help" style={{ marginTop: 8 }}>
              Nota: si el mes seleccionado es el actual, este reporte calcula <b>hasta hoy</b> por fecha del turno <b>y</b> también suma turnos futuros del mes que ya tengan <b>pago/seña</b> (monto pagado &gt; 0). Si elegís un mes anterior, toma el <b>mes completo</b>.
            </div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Pagado (ingresos)</div>
                <div className="v">${reportGananciasTotalMes.resumen.pagado.toLocaleString()}</div>
                <div className="s">Turnos: {reportGananciasTotalMes.resumen.turnos} · Días: {reportGananciasTotalMes.resumen.dias}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Por cobrar</div>
                <div className="v">${reportGananciasTotalMes.resumen.porCobrar.toLocaleString()}</div>
                <div className="s">Total: ${reportGananciasTotalMes.resumen.total.toLocaleString()}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Corte</div>
                <div className="v">{reportGananciasTotalMes.isMesActual ? 'Hasta hoy' : 'Mes completo'}</div>
                <div className="s">{reportGananciasTotalMes.isMesActual ? reportGananciasTotalMes.hastaStr : '—'}</div>
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Detalle por día</div>
              <div className="reporte-simple-table" role="table" aria-label="Ganancias por día">
                <div className="reporte-simple-row cols-6 is-head" role="row">
                  <div className="reporte-simple-cell is-left" role="columnheader">Fecha</div>
                  <div className="reporte-simple-cell is-left" role="columnheader">Día</div>
                  <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                  <div className="reporte-simple-cell" role="columnheader">Total</div>
                  <div className="reporte-simple-cell" role="columnheader">Pagado</div>
                  <div className="reporte-simple-cell" role="columnheader">Por cobrar</div>
                </div>
                {reportGananciasTotalMes.porDia.map((r) => (
                  <div key={r.fechaStr} className="reporte-simple-row cols-6" role="row">
                    <div className="reporte-simple-cell is-left" role="cell">{format(new Date(r.fechaStr + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                    <div className="reporte-simple-cell is-left" role="cell">{r.dia}</div>
                    <div className="reporte-simple-cell" role="cell">{r.turnos}</div>
                    <div className="reporte-simple-cell" role="cell">${r.total.toLocaleString()}</div>
                    <div className="reporte-simple-cell" role="cell">${r.pagado.toLocaleString()}</div>
                    <div className="reporte-simple-cell" role="cell">${r.porCobrar.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {vista === 'serviciosMasPedidos' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Servicios más pedidos</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportServiciosMasPedidosPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportServiciosMasPedidosExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroServicios">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroServicios"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reporte-simple-table" role="table" aria-label="Servicios más pedidos">
              <div className="reporte-simple-row cols-4 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Servicio</div>
                <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                <div className="reporte-simple-cell" role="columnheader">Total</div>
                <div className="reporte-simple-cell" role="columnheader">Pagado</div>
              </div>
              {reportServiciosMasPedidos.items.map((x) => (
                <div key={x.servicio} className="reporte-simple-row cols-4" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{x.servicio}</div>
                  <div className="reporte-simple-cell" role="cell">{x.turnos}</div>
                  <div className="reporte-simple-cell" role="cell">${x.total.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${x.pagado.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'clientesRecurrentes' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Clientes recurrentes</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportClientesRecurrentesPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportClientesRecurrentesExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroClientes">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroClientes"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reporte-simple-table" role="table" aria-label="Clientes recurrentes">
              <div className="reporte-simple-row cols-5 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Cliente</div>
                <div className="reporte-simple-cell is-left" role="columnheader">Email/ID</div>
                <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                <div className="reporte-simple-cell" role="columnheader">Total</div>
                <div className="reporte-simple-cell" role="columnheader">Pagado</div>
              </div>
              {reportClientesRecurrentes.items.map((c) => (
                <div key={c.key} className="reporte-simple-row cols-5" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{c.nombre || '—'}</div>
                  <div className="reporte-simple-cell is-left" role="cell">{c.email || c.key}</div>
                  <div className="reporte-simple-cell" role="cell">{c.turnos}</div>
                  <div className="reporte-simple-cell" role="cell">${c.total.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${c.pagado.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'ocupacion' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Ocupación</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportOcupacionPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportOcupacionExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroOcupacion">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroOcupacion"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Ocupación del mes</div>
                <div className="v">{reportOcupacion.pctMes}%</div>
                <div className="s">Ocupados: {reportOcupacion.resumen.ocupado} · Total: {reportOcupacion.resumen.total}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Libres</div>
                <div className="v">{reportOcupacion.resumen.libre}</div>
                <div className="s">En días con agenda</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Días analizados</div>
                <div className="v">{reportOcupacion.rows.length}</div>
                <div className="s">Sin domingos</div>
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Por semanas</div>
              <div className="reporte-simple-table" role="table" aria-label="Ocupación por semanas">
                <div className="reporte-simple-row cols-5 is-head" role="row">
                  <div className="reporte-simple-cell is-left" role="columnheader">Semana</div>
                  <div className="reporte-simple-cell" role="columnheader">Ocupados</div>
                  <div className="reporte-simple-cell" role="columnheader">Libres</div>
                  <div className="reporte-simple-cell" role="columnheader">Total</div>
                  <div className="reporte-simple-cell" role="columnheader">%</div>
                </div>
                {reportOcupacion.semanas.map((w) => (
                  <div key={w.semana} className="reporte-simple-row cols-5" role="row">
                    <div className="reporte-simple-cell is-left" role="cell">{w.semana}</div>
                    <div className="reporte-simple-cell" role="cell">{w.ocupado}</div>
                    <div className="reporte-simple-cell" role="cell">{w.libre}</div>
                    <div className="reporte-simple-cell" role="cell">{w.total}</div>
                    <div className="reporte-simple-cell" role="cell">{w.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Por día</div>
              <div className="reporte-simple-table" role="table" aria-label="Ocupación por día">
                <div className="reporte-simple-row cols-6 is-head" role="row">
                  <div className="reporte-simple-cell is-left" role="columnheader">Fecha</div>
                  <div className="reporte-simple-cell is-left" role="columnheader">Día</div>
                  <div className="reporte-simple-cell" role="columnheader">Ocupados</div>
                  <div className="reporte-simple-cell" role="columnheader">Libres</div>
                  <div className="reporte-simple-cell" role="columnheader">Total</div>
                  <div className="reporte-simple-cell" role="columnheader">%</div>
                </div>
                {reportOcupacion.rows.map((r) => (
                  <div key={r.fechaStr} className="reporte-simple-row cols-6" role="row">
                    <div className="reporte-simple-cell is-left" role="cell">{format(new Date(r.fechaStr + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                    <div className="reporte-simple-cell is-left" role="cell">{r.dia}</div>
                    <div className="reporte-simple-cell" role="cell">{r.ocupado}</div>
                    <div className="reporte-simple-cell" role="cell">{r.libre}</div>
                    <div className="reporte-simple-cell" role="cell">{r.total}</div>
                    <div className="reporte-simple-cell" role="cell">{r.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {vista === 'cancelaciones' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Cancelaciones y rechazos</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportCancelacionesPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportCancelacionesExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroCancelaciones">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroCancelaciones"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-selector-help" style={{ marginTop: 8 }}>
              Nota: este reporte se calcula por la <b>fecha del turno</b> dentro del mes (agenda), no por la fecha en que se canceló.
            </div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Total turnos</div>
                <div className="v">{reportCancelaciones.total}</div>
                <div className="s">En el mes seleccionado</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Cancelados</div>
                <div className="v">{reportCancelaciones.cancelados}</div>
                <div className="s">{reportCancelaciones.pctCancelados}% del total</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Rechazados</div>
                <div className="v">{reportCancelaciones.rechazados}</div>
                <div className="s">{reportCancelaciones.pctRechazados}% del total</div>
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Estados</div>
              <div className="reporte-simple-table" role="table" aria-label="Estados del mes">
                <div className="reporte-simple-row cols-2 is-head" role="row">
                  <div className="reporte-simple-cell is-left" role="columnheader">Estado</div>
                  <div className="reporte-simple-cell" role="columnheader">Cantidad</div>
                </div>
                {reportCancelaciones.estados.map((e) => (
                  <div key={e.estado} className="reporte-simple-row cols-2" role="row">
                    <div className="reporte-simple-cell is-left" role="cell">{e.estado}</div>
                    <div className="reporte-simple-cell" role="cell">{e.cantidad}</div>
                  </div>
                ))}
              </div>
            </div>

            {reportCancelaciones.motivos.length > 0 ? (
              <div className="reporte-table-wrap">
                <div className="reporte-main-sub">Motivos de rechazo de transferencia</div>
                <div className="reporte-simple-table" role="table" aria-label="Motivos de rechazo">
                  <div className="reporte-simple-row cols-2 is-head" role="row">
                    <div className="reporte-simple-cell is-left" role="columnheader">Motivo</div>
                    <div className="reporte-simple-cell" role="columnheader">Cantidad</div>
                  </div>
                  {reportCancelaciones.motivos.map((m) => (
                    <div key={m.motivo} className="reporte-simple-row cols-2" role="row">
                      <div className="reporte-simple-cell is-left" role="cell">{m.motivo}</div>
                      <div className="reporte-simple-cell" role="cell">{m.cantidad}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {vista === 'mediosPago' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Medios de pago</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportMediosPagoPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportMediosPagoExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroMedios">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroMedios"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reporte-simple-table" role="table" aria-label="Medios de pago">
              <div className="reporte-simple-row cols-5 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Medio</div>
                <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                <div className="reporte-simple-cell" role="columnheader">Total</div>
                <div className="reporte-simple-cell" role="columnheader">Pagado</div>
                <div className="reporte-simple-cell" role="columnheader">Por cobrar</div>
              </div>
              {reportMediosPago.items.map((x) => (
                <div key={x.medio} className="reporte-simple-row cols-5" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{x.medio}</div>
                  <div className="reporte-simple-cell" role="cell">{x.turnos}</div>
                  <div className="reporte-simple-cell" role="cell">${x.total.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${x.pagado.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${x.porCobrar.toLocaleString()}</div>
                </div>
              ))}
            </div>

            {reportMediosPago.transferEstados.length > 0 ? (
              <div className="reporte-table-wrap">
                <div className="reporte-main-sub">Transferencias: estado de validación</div>
                <div className="reporte-simple-table" role="table" aria-label="Estados de transferencia">
                  <div className="reporte-simple-row cols-2 is-head" role="row">
                    <div className="reporte-simple-cell is-left" role="columnheader">Estado</div>
                    <div className="reporte-simple-cell" role="columnheader">Cantidad</div>
                  </div>
                  {reportMediosPago.transferEstados.map((e) => (
                    <div key={e.estado} className="reporte-simple-row cols-2" role="row">
                      <div className="reporte-simple-cell is-left" role="cell">{e.estado}</div>
                      <div className="reporte-simple-cell" role="cell">{e.cantidad}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {vista === 'cobrosPendientes' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Cobros pendientes / deuda</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportCobrosPendientesPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportCobrosPendientesExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroCobros">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroCobros"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Por cobrar</div>
                <div className="v">${reportCobrosPendientes.resumen.porCobrar.toLocaleString()}</div>
                <div className="s">Clientes: {reportCobrosPendientes.resumen.clientes}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Pagado</div>
                <div className="v">${reportCobrosPendientes.resumen.pagado.toLocaleString()}</div>
                <div className="s">Total: ${reportCobrosPendientes.resumen.total.toLocaleString()}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Turnos (ranking)</div>
                <div className="v">{reportCobrosPendientes.resumen.turnos}</div>
                <div className="s">Top 15 por deuda</div>
              </div>
            </div>

            <div className="reporte-simple-table" role="table" aria-label="Cobros pendientes">
              <div className="reporte-simple-row cols-6 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Cliente</div>
                <div className="reporte-simple-cell is-left" role="columnheader">Email/ID</div>
                <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                <div className="reporte-simple-cell" role="columnheader">Total</div>
                <div className="reporte-simple-cell" role="columnheader">Pagado</div>
                <div className="reporte-simple-cell" role="columnheader">Por cobrar</div>
              </div>
              {reportCobrosPendientes.items.map((c) => (
                <div key={c.key} className="reporte-simple-row cols-6" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{c.nombre || '—'}</div>
                  <div className="reporte-simple-cell is-left" role="cell">{c.email || c.key}</div>
                  <div className="reporte-simple-cell" role="cell">{c.turnos}</div>
                  <div className="reporte-simple-cell" role="cell">${c.total.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${c.pagado.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${c.porCobrar.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'cancelacionServicio' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Cancelación por servicio</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportCancelacionServicioPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportCancelacionServicioExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroCancelacionServicio">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroCancelacionServicio"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">% global</div>
                <div className="v">{reportCancelacionServicio.resumen.pctGlobal}%</div>
                <div className="s">Cancel+rech / total</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Cancelados</div>
                <div className="v">{reportCancelacionServicio.resumen.totalCancelados}</div>
                <div className="s">Rechazados: {reportCancelacionServicio.resumen.totalRechazados}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Servicios</div>
                <div className="v">{reportCancelacionServicio.items.length}</div>
                <div className="s">Ordenado por %</div>
              </div>
            </div>

            <div className="reporte-simple-table" role="table" aria-label="Cancelación por servicio">
              <div className="reporte-simple-row cols-5 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Servicio</div>
                <div className="reporte-simple-cell" role="columnheader">Total</div>
                <div className="reporte-simple-cell" role="columnheader">Cancelados</div>
                <div className="reporte-simple-cell" role="columnheader">Rechazados</div>
                <div className="reporte-simple-cell" role="columnheader">%</div>
              </div>
              {reportCancelacionServicio.items.map((x) => (
                <div key={x.servicio} className="reporte-simple-row cols-5" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{x.servicio}</div>
                  <div className="reporte-simple-cell" role="cell">{x.total}</div>
                  <div className="reporte-simple-cell" role="cell">{x.cancelados}</div>
                  <div className="reporte-simple-cell" role="cell">{x.rechazados}</div>
                  <div className="reporte-simple-cell" role="cell">{x.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'horariosPico' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Horarios pico</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportHorariosPicoPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportHorariosPicoExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroPico">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroPico"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Turnos ocupados</div>
                <div className="v">{reportHorariosPico.total}</div>
                <div className="s">En el mes seleccionado</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Horas distintas</div>
                <div className="v">{reportHorariosPico.porHora.length}</div>
                <div className="s">Con al menos 1 turno</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Días con turnos</div>
                <div className="v">{reportHorariosPico.porDia.length}</div>
                <div className="s">Por día de semana</div>
              </div>
            </div>

            <div className="reporte-table-wrap">
              <div className="reporte-main-sub">Por hora</div>
              <div className="reporte-simple-table" role="table" aria-label="Horarios pico por hora">
                <div className="reporte-simple-row cols-3 is-head" role="row">
                  <div className="reporte-simple-cell is-left" role="columnheader">Hora</div>
                  <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                  <div className="reporte-simple-cell" role="columnheader">%</div>
                </div>
                {reportHorariosPico.porHora.map((h) => (
                  <div key={h.hora} className="reporte-simple-row cols-3" role="row">
                    <div className="reporte-simple-cell is-left" role="cell">{h.hora}</div>
                    <div className="reporte-simple-cell" role="cell">{h.turnos}</div>
                    <div className="reporte-simple-cell" role="cell">{h.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {reportHorariosPico.porDia.length > 0 ? (
              <div className="reporte-table-wrap">
                <div className="reporte-main-sub">Por día de semana</div>
                <div className="reporte-simple-table" role="table" aria-label="Horarios pico por día">
                  <div className="reporte-simple-row cols-3 is-head" role="row">
                    <div className="reporte-simple-cell is-left" role="columnheader">Día</div>
                    <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                    <div className="reporte-simple-cell" role="columnheader">%</div>
                  </div>
                  {reportHorariosPico.porDia.map((d) => (
                    <div key={d.dia} className="reporte-simple-row cols-3" role="row">
                      <div className="reporte-simple-cell is-left" role="cell">{d.dia}</div>
                      <div className="reporte-simple-cell" role="cell">{d.turnos}</div>
                      <div className="reporte-simple-cell" role="cell">{d.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {vista === 'ocupacionServicio' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Ocupación por servicio</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportOcupacionServicioPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportOcupacionServicioExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroOcupacionServicio">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroOcupacionServicio"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Turnos ocupados</div>
                <div className="v">{reportOcupacionServicio.totalOcupados}</div>
                <div className="s">Base para % por servicio</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Pagado</div>
                <div className="v">${reportOcupacionServicio.resumen.pagado.toLocaleString()}</div>
                <div className="s">Por cobrar: ${reportOcupacionServicio.resumen.porCobrar.toLocaleString()}</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Servicios</div>
                <div className="v">{reportOcupacionServicio.resumen.servicios}</div>
                <div className="s">Ordenado por turnos</div>
              </div>
            </div>

            <div className="reporte-simple-table" role="table" aria-label="Ocupación por servicio">
              <div className="reporte-simple-row cols-6 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Servicio</div>
                <div className="reporte-simple-cell" role="columnheader">Turnos</div>
                <div className="reporte-simple-cell" role="columnheader">%</div>
                <div className="reporte-simple-cell" role="columnheader">Total</div>
                <div className="reporte-simple-cell" role="columnheader">Pagado</div>
                <div className="reporte-simple-cell" role="columnheader">Por cobrar</div>
              </div>
              {reportOcupacionServicio.items.map((x) => (
                <div key={x.servicio} className="reporte-simple-row cols-6" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{x.servicio}</div>
                  <div className="reporte-simple-cell" role="cell">{x.turnos}</div>
                  <div className="reporte-simple-cell" role="cell">{x.pct}%</div>
                  <div className="reporte-simple-cell" role="cell">${x.total.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${x.pagado.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">${x.porCobrar.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vista === 'seniasDevueltas' && (
          <div className="admin-section">
            <div className="reporte-head">
              <h2 style={{ margin: 0, fontSize: 20 }}>Señas devueltas</h2>
              <div className="reporte-head-actions">
                <button type="button" className="btn btn-secondary" onClick={exportSeniasDevueltasPDF}>
                  <Download size={16} /> PDF
                </button>
                <button type="button" className="btn btn-secondary" onClick={exportSeniasDevueltasExcel}>
                  <Table size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="reportes-selector" style={{ marginTop: 12, marginBottom: 10 }}>
              <label className="reportes-selector-label" htmlFor="mesFiltroSenias">Mes</label>
              <div className="reportes-selector-row">
                <input
                  id="mesFiltroSenias"
                  type="month"
                  className="reportes-selector-select"
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                />
              </div>
            </div>

            <div className="reporte-meta">Datos hasta: <b>{stats.hastaStr}</b> · Mes seleccionado: <b>{stats.mesAnioLabel}</b> (desde {stats.desdeMesStr})</div>

            <div className="reportes-kpi-grid">
              <div className="reportes-kpi">
                <div className="k">Cantidad</div>
                <div className="v">{reportSeniasDevueltas.resumen.cantidad}</div>
                <div className="s">Turnos con seña devuelta</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Monto pagado</div>
                <div className="v">${reportSeniasDevueltas.resumen.pagado.toLocaleString()}</div>
                <div className="s">(registrado en el turno)</div>
              </div>
              <div className="reportes-kpi">
                <div className="k">Registros</div>
                <div className="v">{reportSeniasDevueltas.items.length}</div>
                <div className="s">Detalle completo</div>
              </div>
            </div>

            <div className="reporte-simple-table" role="table" aria-label="Señas devueltas">
              <div className="reporte-simple-row cols-6 is-head" role="row">
                <div className="reporte-simple-cell is-left" role="columnheader">Fecha</div>
                <div className="reporte-simple-cell is-left" role="columnheader">Hora</div>
                <div className="reporte-simple-cell is-left" role="columnheader">Cliente</div>
                <div className="reporte-simple-cell is-left" role="columnheader">Servicio</div>
                <div className="reporte-simple-cell" role="columnheader">Pagado</div>
                <div className="reporte-simple-cell" role="columnheader">Estado</div>
              </div>
              {reportSeniasDevueltas.items.map((x) => (
                <div key={x.id} className="reporte-simple-row cols-6" role="row">
                  <div className="reporte-simple-cell is-left" role="cell">{x.fechaStr ? format(new Date(x.fechaStr + 'T00:00:00'), 'dd/MM/yyyy') : '—'}</div>
                  <div className="reporte-simple-cell is-left" role="cell">{x.hora || '—'}</div>
                  <div className="reporte-simple-cell is-left" role="cell">{x.nombre || x.email || '—'}</div>
                  <div className="reporte-simple-cell is-left" role="cell">{x.servicio}</div>
                  <div className="reporte-simple-cell" role="cell">${x.pagado.toLocaleString()}</div>
                  <div className="reporte-simple-cell" role="cell">{x.estado || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reportes;

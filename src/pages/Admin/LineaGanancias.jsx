// Gráfico de línea/área para evolución mensual de ganancias
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const getUltimos12Meses = () => {
  const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const hoy = new Date();
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    meses.push({ mes: `${mesesLabels[m]} ${y}`, ganancia: 0 });
  }
  return meses;
};

const LineaGanancias = ({ data }) => {
  const chartData = (!data || data.length === 0) ? getUltimos12Meses() : data;
  const hasData = Array.isArray(chartData) && chartData.some(d => Number(d.ganancia) > 0);
  return (
    <div style={{ position: 'relative', width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
          <defs>
            <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d13fa0" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#d13fa0" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="mes" tick={{fontSize:13}}/>
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax) => Math.ceil((dataMax || 1) * 1.2)]}
            tickFormatter={v => `$${v.toLocaleString()}`}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={v => `$${v.toLocaleString()}`} labelFormatter={l => l} />
          <Legend />
          <Area type="monotone" dataKey="ganancia" name="Ganancia" stroke="#d13fa0" fillOpacity={1} fill="url(#colorGanancia)" />
        </AreaChart>
      </ResponsiveContainer>
      {!hasData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: '#d13fa0',
            fontWeight: 600,
            fontSize: 16,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))'
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>Sin datos todavía</div>
          <div style={{ color: '#888', fontWeight: 500, fontSize: 13 }}>Las ganancias aparecerán cuando haya turnos completados.</div>
        </div>
      )}
    </div>
  );
};

export default LineaGanancias;

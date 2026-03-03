// Gráfico de barras de ganancias mensuales o anuales por servicio
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const COLORS = ['#d13fa0', '#ffb6e6', '#8e24aa', '#42a5f5', '#4caf50', '#ff9800', '#ba68c8'];

const BarrasGanancias = ({ data, periodo }) => {
  if (!data || data.length === 0) return <div style={{textAlign:'center',color:'#888'}}>No hay datos para mostrar</div>;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
        <XAxis dataKey="servicio" tick={{fontSize:13}}/>
        <YAxis allowDecimals={false} tickFormatter={v => `$${v.toLocaleString()}`}/>
        <Tooltip formatter={v => `$${v.toLocaleString()}`} labelFormatter={l => l} />
        <Legend />
        <Bar dataKey="ganancias" name={periodo === 'mes' ? 'Ganancia mensual' : 'Ganancia anual'} radius={[8,8,0,0]}>
          {data.map((entry, idx) => (
            <Cell key={`cell-bar-gan-${idx}`} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarrasGanancias;

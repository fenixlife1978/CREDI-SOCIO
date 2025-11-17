export default function LoanList({ loans, removeLoan }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto rounded-lg overflow-hidden shadow">
        <thead>
          <tr className="bg-starbucks-green text-starbucks-white">
            <th className="px-4 py-2">Socio</th>
            <th className="px-4 py-2">Monto</th>
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loans.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-4 text-starbucks-brown">Sin préstamos registrados.</td>
            </tr>
          )}
          {loans.map(loan => (
            <tr key={loan.id} className="even:bg-starbucks-cream">
              <td className="px-4 py-2 font-medium">{loan.memberName}</td>
              <td className="px-4 py-2">{loan.amount} Bs</td>
              <td className="px-4 py-2">{loan.date}</td>
              <td className="px-4 py-2 text-center">
                <button onClick={() => removeLoan(loan.id)}
                  className="px-3 py-1 bg-starbucks-brown hover:bg-starbucks-green text-white rounded shadow text-xs"
                  title="Eliminar"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
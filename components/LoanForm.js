import { useState } from "react";

export default function LoanForm({ addLoan }) {
  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!memberName || !amount || !date) return;
    addLoan({
      id: Date.now(),
      memberName,
      amount: parseFloat(amount).toFixed(2),
      date,
    });
    setMemberName("");
    setAmount("");
    setDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block mb-1 font-medium text-sm text-starbucks-green">Socio</label>
        <input type="text" value={memberName} onChange={e => setMemberName(e.target.value)}
          placeholder="Nombre del socio"
          className="w-full px-3 py-2 rounded-lg border border-starbucks-green focus:ring-2 focus:ring-starbucks-green outline-none"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium text-sm text-starbucks-green">Monto</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="Monto (Bs)"
          className="w-full px-3 py-2 rounded-lg border border-starbucks-green focus:ring-2 focus:ring-starbucks-green outline-none"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium text-sm text-starbucks-green">Fecha</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-starbucks-green focus:ring-2 focus:ring-starbucks-green outline-none"
        />
      </div>
      <div className="flex items-end">
        <button type="submit"
          className="w-full py-2 px-3 bg-starbucks-green hover:bg-starbucks-brown text-starbucks-white font-semibold rounded-lg shadow"
        >
          Agregar
        </button>
      </div>
    </form>
  );
}

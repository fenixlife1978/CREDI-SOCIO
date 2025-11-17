import Head from "next/head";
import LoanForm from "../components/LoanForm";
import LoanList from "../components/LoanList";
import { useState } from "react";

export default function Home() {
  const [loans, setLoans] = useState([]);

  const addLoan = (loan) => {
    setLoans([loan, ...loans]);
  };

  const removeLoan = (id) => {
    setLoans(loans.filter((loan) => loan.id !== id));
  };

  return (
    <>
      <Head>
        <title>CREDI-SOCIO | Gestión de Préstamos</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </Head>
      <main className="min-h-screen flex flex-col items-center bg-starbucks-cream">
        <nav className="w-full px-8 py-4 flex justify-between items-center bg-starbucks-green shadow-lg">
          <span className="font-bold text-lg tracking-wide text-starbucks-white">CREDI-SOCIO</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-starbucks-brown text-starbucks-white">Inicio</a>
            <a href="#" className="hover:text-starbucks-brown text-starbucks-white">Préstamos</a>
            <a href="#" className="hover:text-starbucks-brown text-starbucks-white">Socios</a>
          </div>
        </nav>
        <section className="w-full max-w-2xl mx-auto mt-12 bg-starbucks-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-semibold text-starbucks-green mb-2">Gestión de Préstamos de Socios</h1>
          <p className="mb-6 text-starbucks-brown">App cálida, profesional y 100% responsive, al estilo Starbucks.</p>
          <LoanForm addLoan={addLoan} />
          <LoanList loans={loans} removeLoan={removeLoan} />
        </section>
        <footer className="mt-12 mb-6 text-starbucks-light-green text-sm">
          Hecho con 💡 por CREDI-SOCIO | {new Date().getFullYear()}
        </footer>
      </main>
    </>
  );
}
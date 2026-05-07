
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ExpenseList from '../components/expenses/ExpenseList';

const Expenses = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-red-600 to-red-500 px-4 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-red-100 text-sm mb-4">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-white text-2xl font-black">Business Expenses</h1>
        <p className="text-red-100 text-sm">Track your overhead costs</p>
      </div>

      <div className="px-4 -mt-4">
        <ExpenseList user={user} />
      </div>
    </div>
  );
};

export default Expenses;

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [showCharts, setShowCharts] = useState(true);

  const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

  const filterExpenses = useCallback(() => {
    let filtered = [...expenses];
    if (startDate) {
      filtered = filtered.filter(exp => new Date(exp.expense_date) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(exp => new Date(exp.expense_date) <= new Date(endDate));
    }
    setFilteredExpenses(filtered);
  }, [expenses, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [filterExpenses]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(response.data.expenses || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryData = () => {
    const categoryTotals = {};
    filteredExpenses.forEach(expense => {
      const category = expense.category_name || 'Uncategorized';
      const amount = parseFloat(expense.amount);
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });
    return Object.keys(categoryTotals).map(category => ({
      name: category,
      value: categoryTotals[category]
    }));
  };

  const getMonthlyData = () => {
    const monthlyTotals = {};
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + parseFloat(expense.amount);
    });
    return Object.keys(monthlyTotals).sort().map(month => ({
      month: month,
      amount: monthlyTotals[month]
    }));
  };

  const getEmployeeData = () => {
    const employeeTotals = {};
    filteredExpenses.forEach(expense => {
      const employee = `${expense.first_name || 'Unknown'} ${expense.last_name || ''}`;
      employeeTotals[employee] = (employeeTotals[employee] || 0) + parseFloat(expense.amount);
    });
    return Object.keys(employeeTotals).map(employee => ({
      name: employee.length > 12 ? employee.substring(0, 12) + '...' : employee,
      fullName: employee,
      amount: employeeTotals[employee]
    }));
  };

  const getStatusData = () => {
    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    filteredExpenses.forEach(expense => {
      statusCounts[expense.status]++;
    });
    return [
      { name: 'Pending', value: statusCounts.pending, color: '#F59E0B' },
      { name: 'Approved', value: statusCounts.approved, color: '#10B981' },
      { name: 'Rejected', value: statusCounts.rejected, color: '#EF4444' }
    ];
  };

  const getSummaryStats = () => {
    const total = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const approved = filteredExpenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const pending = filteredExpenses.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const rejected = filteredExpenses.filter(exp => exp.status === 'rejected').reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    return { total, approved, pending, rejected, count: filteredExpenses.length };
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const stats = getSummaryStats();
    const categoryData = getCategoryData();
    const monthlyData = getMonthlyData();
    const employeeData = getEmployeeData();

    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212);
    doc.text('Xpenza - Expense Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    if (startDate || endDate) {
      doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'End'}`, 14, 37);
    }

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Amount', 'Transactions']],
      body: [
        ['Total Expenses', `$${stats.total.toFixed(2)}`, stats.count],
        ['Approved', `$${stats.approved.toFixed(2)}`, filteredExpenses.filter(e => e.status === 'approved').length],
        ['Pending', `$${stats.pending.toFixed(2)}`, filteredExpenses.filter(e => e.status === 'pending').length],
        ['Rejected', `$${stats.rejected.toFixed(2)}`, filteredExpenses.filter(e => e.status === 'rejected').length]
      ],
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] }
    });

    let yPos = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Expenses by Category', 14, yPos);
    
    const categoryRows = categoryData.map(cat => [cat.name, `$${cat.value.toFixed(2)}`, `${((cat.value / stats.total) * 100).toFixed(1)}%`]);
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Category', 'Amount', 'Percentage']],
      body: categoryRows,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] }
    });

    yPos = doc.lastAutoTable.finalY + 15;
    doc.text('Top Spending Employees', 14, yPos);
    
    const topEmployees = [...employeeData].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const employeeRows = topEmployees.map(emp => [emp.fullName || emp.name, `$${emp.amount.toFixed(2)}`]);
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Employee', 'Total Amount']],
      body: employeeRows,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] }
    });

    yPos = doc.lastAutoTable.finalY + 15;
    doc.text('Monthly Expense Trend', 14, yPos);
    
    const monthlyRows = monthlyData.map(month => [month.month, `$${month.amount.toFixed(2)}`]);
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Month', 'Amount']],
      body: monthlyRows,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] }
    });

    doc.save(`Xpenza_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const categoryData = getCategoryData();
  const monthlyData = getMonthlyData();
  const employeeData = getEmployeeData();
  const statusData = getStatusData();
  const stats = getSummaryStats();

  return (
    <div className="space-y-4">
      {/* Header with Export Button - Smaller */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow p-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Reports & Analytics</h2>
            <p className="text-cyan-100 text-xs">View and analyze department expenses</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {showCharts ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={exportToPDF}
              className="bg-white text-cyan-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Date Filters - Smaller */}
      <div className="bg-white rounded-lg shadow p-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }} 
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats - Smaller Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-xs">Total Expenses</p>
              <p className="text-xl font-bold text-white">${stats.total.toFixed(2)}</p>
              <p className="text-cyan-100 text-xs">{stats.count} transactions</p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs">Approved</p>
              <p className="text-xl font-bold text-white">${stats.approved.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg shadow p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-xs">Pending</p>
              <p className="text-xl font-bold text-white">${stats.pending.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-xs">Rejected</p>
              <p className="text-xl font-bold text-white">${stats.rejected.toFixed(2)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {showCharts && (
        <>
          {/* Charts Row - Smaller */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Expenses by Category</h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={60} dataKey="value">
                      {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<p className="text-center text-gray-500 py-8 text-sm">No data available</p>)}
            </div>

            <div className="bg-white rounded-lg shadow p-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Expenses by Status</h3>
              {statusData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={60} dataKey="value">
                      {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<p className="text-center text-gray-500 py-8 text-sm">No data available</p>)}
            </div>
          </div>

          {/* Monthly Trend - Smaller */}
          <div className="bg-white rounded-lg shadow p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Monthly Expense Trend</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="amount" stroke="#06B6D4" strokeWidth={2} name="Amount" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (<p className="text-center text-gray-500 py-8 text-sm">No data available</p>)}
          </div>

          {/* Employee Comparison - Smaller */}
          <div className="bg-white rounded-lg shadow p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Expenses by Employee</h3>
            {employeeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={employeeData.slice(0, 6)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" height={50} tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} contentStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="amount" fill="#06B6D4" name="Amount" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<p className="text-center text-gray-500 py-8 text-sm">No data available</p>)}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
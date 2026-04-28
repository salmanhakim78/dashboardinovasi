import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download, Search, X, Eye, EyeOff, CheckSquare, Square, ChevronUp, ChevronDown, AlertTriangle, Loader2, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { supabase, InovasiDaerah } from '../lib/supabase';
import { AddData } from './AddData';
import { EditData } from './EditData';
import { DetailViewModal } from './DetailViewModal';
import * as XLSX from 'xlsx';

interface DataManagementProps {
  darkMode: boolean;
  isLoggedIn: boolean;
  onLoginSuccess?: () => void;
}

const getMaturityColor = (label: string) => {
  if (label === 'Sangat Inovatif') {
    return { color: 'bg-emerald-600', textColor: 'text-white' };
  } else if (label === 'Inovatif') {
    return { color: 'bg-blue-500', textColor: 'text-white' };
  } else {
    return { color: 'bg-orange-500', textColor: 'text-white' };
  }
};

type SortField = 'no' | 'judul_inovasi' | 'kematangan';
type SortDirection = 'asc' | 'desc';

export function DataManagement({ darkMode, isLoggedIn, onLoginSuccess }: DataManagementProps) {
  const [data, setData] = useState<InovasiDaerah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState('Semua');
  const [filterTahapan, setFilterTahapan] = useState('Semua');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InovasiDaerah | null>(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [pendingAction, setPendingAction] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [pendingItem, setPendingItem] = useState<InovasiDaerah | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<InovasiDaerah | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InovasiDaerah | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false); // ✅ NEW: Bulk delete modal
  const [showSelectionMode, setShowSelectionMode] = useState(false);
  const [successPopup, setSuccessPopup] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const showSuccess = (message: string) => {
    setSuccessPopup({ show: true, message });
    setTimeout(() => setSuccessPopup({ show: false, message: '' }), 3000);
  };
  
  const [sortField, setSortField] = useState<SortField>('no');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: inovasiData, error: fetchError } = await supabase
        .from('data_inovasi')
        .select('*')
        .order('no', { ascending: true });

      if (fetchError) throw fetchError;

      setData(inovasiData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal: any = a[sortField as keyof InovasiDaerah];
    let bVal: any = b[sortField as keyof InovasiDaerah];
    
    if (sortField === 'no' || sortField === 'kematangan') {
      aVal = Number(aVal);
      bVal = Number(bVal);
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredData = sortedData.filter((item) => {
    const matchesSearch = item.judul_inovasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.admin_opd.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJenis = filterJenis === 'Semua' || item.jenis === filterJenis;
    const matchesTahapan = filterTahapan === 'Semua' || item.tahapan_inovasi === filterTahapan;
    return matchesSearch && matchesJenis && matchesTahapan;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map(item => item.no).filter((no): no is number => no != null));
    }
  };

  const handleSelectItem = (no: number) => {
    if (no == null) return;
    if (selectedIds.includes(no)) {
      setSelectedIds(selectedIds.filter(selectedNo => selectedNo !== no));
    } else {
      setSelectedIds([...selectedIds, no]);
    }
  };

  const toggleSelectionMode = () => {
    setShowSelectionMode(prev => !prev);
    if (showSelectionMode) setSelectedIds([]);
  };

  // ✅ UPDATED: Use custom modal instead of window.confirm
  const handleBulkDelete = async () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    // ✅ Show custom modal instead of window.confirm
    setShowBulkDeleteModal(true);
  };

  // ✅ NEW: Confirm bulk delete function
  const confirmBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('data_inovasi')
        .delete()
        .in('no', selectedIds);

      if (error) throw error;

      setSelectedIds([]);
      setShowSelectionMode(false);
      setShowBulkDeleteModal(false); // Close modal
      await fetchData();
      showSuccess(`${selectedIds.length} data berhasil dihapus`);
    } catch (err: any) {
      console.error('Error bulk delete:', err);
      alert('Gagal menghapus data: ' + err.message);
    }
  };

  const handleBulkExport = () => {
    const selectedData = data.filter(item => selectedIds.includes(item.no));
    
    if (selectedData.length === 0) {
      alert('Tidak ada data yang dipilih');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(selectedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Terpilih');
    XLSX.writeFile(workbook, `Data_Inovasi_Terpilih_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setSelectedIds([]);
  };

  const handleEdit = (item: InovasiDaerah) => {
    if (!isLoggedIn) {
      setPendingAction('edit');
      setPendingItem(item);
      setShowLoginModal(true);
      return;
    }
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDeleteClick = (item: InovasiDaerah) => {
    if (!isLoggedIn) {
      setPendingAction('delete');
      setPendingItem(item);
      setShowLoginModal(true);
      return;
    }
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('data_inovasi')
        .delete()
        .eq('no', itemToDelete.no);

      if (error) throw error;

      setShowDeleteModal(false);
      setItemToDelete(null);
      await fetchData();
      showSuccess('Data berhasil dihapus');
    } catch (err: any) {
      console.error('Error deleting:', err);
      alert('Gagal menghapus data: ' + err.message);
    }
  };

  const handleAddNew = () => {
    if (!isLoggedIn) {
      setPendingAction('add');
      setShowLoginModal(true);
      return;
    }
    setShowAddModal(true);
  };

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      setLoginError('Username dan password harus diisi');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.detail || 'Username atau password salah');
        return;
      }
      const { token } = await res.json();
      sessionStorage.setItem('admin_jwt_token', token);
      onLoginSuccess?.();
      setShowLoginModal(false);
      setLoginError('');
      setLoginForm({ username: '', password: '' });
      setShowPassword(false);
      // Execute pending action after login
      setTimeout(() => {
        if (pendingAction === 'add') setShowAddModal(true);
        else if (pendingAction === 'edit' && pendingItem) { setEditingItem(pendingItem); setShowEditModal(true); }
        else if (pendingAction === 'delete' && pendingItem) { setItemToDelete(pendingItem); setShowDeleteModal(true); }
        setPendingAction(null);
        setPendingItem(null);
      }, 100);
    } catch {
      setLoginError('Gagal terhubung ke server. Coba lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginForm({ username: '', password: '' });
    setLoginError('');
    setShowPassword(false);
    setPendingAction(null);
    setPendingItem(null);
  };

  const handleEditSubmit = async (updatedData: Partial<InovasiDaerah>) => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('data_inovasi')
        .update(updatedData)
        .eq('no', editingItem.no);

      if (error) throw error;

      setShowEditModal(false);
      setEditingItem(null);
      await fetchData();
      showSuccess('Data berhasil diperbarui');
    } catch (err: any) {
      console.error('Error updating:', err);
      alert('Gagal mengupdate data: ' + err.message);
    }
  };

  const handleExport = (format: string) => {
    if (format === 'Excel') {
      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Inovasi');
      XLSX.writeFile(workbook, `Data_Inovasi_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (format === 'CSV') {
      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Data_Inovasi_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };

  const handleView = (item: InovasiDaerah) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400 flex-shrink-0" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={16} className="text-blue-500 flex-shrink-0" />
      : <ChevronDown size={16} className="text-blue-500 flex-shrink-0" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className={`animate-spin mx-auto mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`} size={48} />
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`text-center p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg max-w-md`}>
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Gagal Memuat Data
          </h3>
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#0F172A]'}`}>
          Data Management
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-2 bg-green-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm shadow-md"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => handleExport('CSV')}
            className="flex items-center gap-2 bg-[#2563EB] text-white px-3 md:px-4 py-2 rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm shadow-md"
          >
            <Download size={18} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`rounded-lg shadow-md p-4 sm:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Cari Data
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari judul inovasi atau OPD..."
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'
                }`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Jenis Inovasi
            </label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option>Semua</option>
              <option>Digital</option>
              <option>Non Digital</option>
              <option>Teknologi</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Tahapan Inovasi
            </label>
            <select
              value={filterTahapan}
              onChange={(e) => setFilterTahapan(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option>Semua</option>
              <option>Inisiatif</option>
              <option>Uji Coba</option>
              <option>Penerapan</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center flex-wrap gap-3">
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm ${
              showSelectionMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            {showSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
            <span>Pilih</span>
          </button>
          <div className="flex items-center gap-3">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Menampilkan {filteredData.length} dari {data.length} data
            </p>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Plus size={18} />
              <span>Tambah Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showSelectionMode && selectedIds.length > 0 && (
        <div className={`rounded-lg shadow-md p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          darkMode ? 'bg-blue-900/50 border border-blue-700' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <CheckSquare size={20} className="text-blue-500" />
            <span className="font-medium text-sm">{selectedIds.length} data terpilih</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleBulkExport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <Download size={16} />
              <span>Export Terpilih</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <Trash2 size={16} />
              <span>Hapus Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full">
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  {showSelectionMode && (
                    <th className={`px-4 sm:px-6 py-3 text-left ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <button onClick={handleSelectAll} className="flex items-center justify-center">
                        {selectedIds.length === paginatedData.length && paginatedData.length > 0 ? (
                          <CheckSquare size={18} className="text-blue-500" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('no')}
                    className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                      darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      No
                      <SortIcon field="no" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('judul_inovasi')}
                    className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                      darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      Judul Inovasi
                      <SortIcon field="judul_inovasi" />
                    </div>
                  </th>
                  <th className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Admin OPD
                  </th>
                  <th className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Jenis
                  </th>
                  <th className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Tahapan Inovasi
                  </th>
                  <th
                    onClick={() => handleSort('kematangan')}
                    className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
                      darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      Kematangan
                      <SortIcon field="kematangan" />
                    </div>
                  </th>
                  <th className={`px-4 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {paginatedData.map((item, pageIndex) => (
                  <tr key={item.no} className={`transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    {showSelectionMode && (
                      <td className="px-4 sm:px-6 py-4">
                        <button onClick={() => handleSelectItem(item.no)} className="flex items-center justify-center">
                          {selectedIds.includes(item.no) ? (
                            <CheckSquare size={18} className="text-blue-500" />
                          ) : (
                            <Square size={18} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                          )}
                        </button>
                      </td>
                    )}
                    <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{(currentPage - 1) * rowsPerPage + pageIndex + 1}</td>
                    <td className={`px-4 sm:px-6 py-4 text-sm font-medium max-w-xs truncate ${darkMode ? 'text-white' : 'text-gray-800'}`} title={item.judul_inovasi}>{item.judul_inovasi}</td>
                    <td className={`px-4 sm:px-6 py-4 text-sm max-w-[200px] ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <div className="line-clamp-2">{item.admin_opd}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: item.jenis === 'Digital' ? '#6366f1' : item.jenis === 'Non Digital' ? '#10b981' : '#f59e0b' }}>
                        {item.jenis}
                      </span>
                    </td>
                    <td className={`px-4 sm:px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.tahapan_inovasi}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const badge = getMaturityColor(item.label_kematangan);
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color} ${badge.textColor}`}>
                            {item.kematangan} - {item.label_kematangan}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-1 sm:gap-2">
                        <button onClick={() => handleView(item)} className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Lihat">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(item)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        <div className={`p-3 sm:p-4 flex justify-between items-center border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 sm:gap-4">
            <label className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</label>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className={`px-2 sm:px-3 py-1 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
              }`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Halaman {currentPage} dari {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ 
            backdropFilter: 'blur(10px)', 
            WebkitBackdropFilter: 'blur(10px)', 
            backgroundColor: 'rgba(0,0,0,0.3)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0
          }}
        >
          <div className="flex items-center justify-center w-full h-full p-4">
            <div className={`rounded-2xl shadow-2xl ring-1 ring-black/10 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <h3 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Konfirmasi Hapus</h3>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Apakah Anda yakin ingin menghapus data <strong>"{itemToDelete.judul_inovasi}"</strong>?
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Data yang dihapus tidak dapat dikembalikan.</p>
              </div>
              <div className={`p-4 sm:p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }} className={`px-4 py-2 rounded-lg transition-colors text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>Batal</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ 
            backdropFilter: 'blur(10px)', 
            WebkitBackdropFilter: 'blur(10px)', 
            backgroundColor: 'rgba(0,0,0,0.3)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0
          }}
        >
          <div className="flex items-center justify-center w-full h-full p-4">
            <div className={`rounded-2xl shadow-2xl ring-1 ring-black/10 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <h3 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Konfirmasi Hapus</h3>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} data terpilih</strong>?
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Data yang dihapus tidak dapat dikembalikan.</p>
              </div>
              <div className={`p-4 sm:p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button 
                  onClick={() => setShowBulkDeleteModal(false)} 
                  className={`px-4 py-2 rounded-lg transition-colors text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Batal
                </button>
                <button 
                  onClick={confirmBulkDelete} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50" 
          style={{ 
            backdropFilter: 'blur(10px)', 
            WebkitBackdropFilter: 'blur(10px)', 
            backgroundColor: 'rgba(15,23,42,0.55)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0
          }} 
          onClick={closeLoginModal}
        >
          <div className="flex items-center justify-center w-full h-full p-4">
            <div className={`rounded-2xl shadow-2xl ring-1 ring-black/10 max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Login Admin</h3>
                  <button onClick={closeLoginModal}><X className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={24} /></button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Username</label>
                  <input
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && loginForm.username) { e.preventDefault(); document.getElementById('password-input')?.focus(); } }}
                    disabled={loginLoading}
                    autoComplete="username"
                    autoFocus
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Password</label>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && !loginLoading && handleLogin()}
                      disabled={loginLoading}
                      autoComplete="current-password"
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              </div>
              <div className={`p-4 sm:p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button onClick={closeLoginModal} disabled={loginLoading} className={`px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-60 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>Batal</button>
                <button onClick={handleLogin} disabled={loginLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loginLoading && <Loader2 size={16} className="animate-spin" />}
                  {loginLoading ? 'Masuk...' : 'Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddData darkMode={darkMode} onClose={() => setShowAddModal(false)} onSuccess={async () => { await fetchData(); showSuccess('Data berhasil ditambahkan'); }} />
      )}

      {showEditModal && editingItem && (
        <EditData darkMode={darkMode} data={editingItem} onClose={() => { setShowEditModal(false); setEditingItem(null); }} onSubmit={handleEditSubmit} />
      )}

      {showViewModal && viewingItem && (
        <DetailViewModal darkMode={darkMode} data={viewingItem} onClose={() => { setShowViewModal(false); setViewingItem(null); }} />
      )}

      {/* Success Popup */}
      {successPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw', height: '100vh',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(15,23,42,0.50)',
          animation: 'dm_fadeIn .2s ease',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '44px 52px',
            textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            animation: 'dm_popIn .3s cubic-bezier(.34,1.56,.64,1)',
            maxWidth: '380px',
            width: '90%',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '76px', height: '76px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(34,197,94,0.38)',
              }}>
                <CheckCircle2 size={42} color="white" strokeWidth={2.5} />
              </div>
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Berhasil!
            </h3>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
              {successPopup.message}
            </p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes dm_fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dm_popIn  { from { opacity: 0; transform: scale(0.82) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  );
}
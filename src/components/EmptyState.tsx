import { SearchX, FileX, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  darkMode: boolean;
  type?: 'filter' | 'data' | 'error';
  title?: string;
  description?: string;
  onReset?: () => void;
}

export function EmptyState({ 
  darkMode, 
  type = 'filter',
  title,
  description,
  onReset
}: EmptyStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'filter':
        return <SearchX size={64} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />;
      case 'data':
        return <FileX size={64} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />;
      case 'error':
        return <AlertCircle size={64} className="text-red-500" />;
      default:
        return <SearchX size={64} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'filter':
        return 'Data Tidak Ditemukan';
      case 'data':
        return 'Belum Ada Data';
      case 'error':
        return 'Terjadi Kesalahan';
      default:
        return 'Data Tidak Ditemukan';
    }
  };

  const getDefaultDescription = () => {
    switch (type) {
      case 'filter':
        return 'Silakan atur ulang filter Anda atau coba dengan kriteria pencarian lain';
      case 'data':
        return 'Belum ada data yang tersedia saat ini';
      case 'error':
        return 'Mohon maaf, terjadi kesalahan. Silakan coba lagi';
      default:
        return 'Silakan atur ulang filter Anda atau coba dengan kriteria pencarian lain';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-lg ${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-md`}>
      <div className="mb-4">
        {getIcon()}
      </div>
      <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        {title || getDefaultTitle()}
      </h3>
      <p className={`text-sm text-center mb-6 max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {description || getDefaultDescription()}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}

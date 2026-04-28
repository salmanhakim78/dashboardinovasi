interface SkeletonLoaderProps {
  darkMode: boolean;
  type?: 'card' | 'chart' | 'table';
  count?: number;
}

export function SkeletonLoader({ darkMode, type = 'card', count = 1 }: SkeletonLoaderProps) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className={`rounded-lg shadow-md p-3 md:p-4 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } animate-pulse`}
          >
            <div className={`h-5 w-5 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className={`h-3 w-20 rounded mb-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className={`h-8 w-16 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} animate-pulse`}>
        <div className={`h-6 w-48 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-64 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`rounded-lg shadow-md overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="animate-pulse p-6">
          <div className={`h-6 w-32 rounded mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 mb-3">
              <div className={`h-10 flex-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className={`h-10 flex-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div className={`h-10 flex-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

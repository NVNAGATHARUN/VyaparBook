

const LoadingSpinner = ({ size = 'md', text = '', fullScreen = false }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className={`${sizes[size]} rounded-full border-4 border-green-100`}
        />
        <div
          className={`${sizes[size]} rounded-full border-4 border-transparent border-t-green-500 absolute inset-0 animate-spin`}
        />
      </div>
      {text && (
        <p className="text-gray-500 text-sm text-center animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;

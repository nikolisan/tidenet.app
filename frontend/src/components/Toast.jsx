import { useEffect } from 'react';
import { CircleX, Info} from 'lucide-react';

const TYPE_CLASS = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeClass = TYPE_CLASS[type] || TYPE_CLASS.info;

  return (
    <div className="toast toast-top toast-center">
      <div className={`alert ${typeClass} shadow-md`}>
        { typeClass === TYPE_CLASS["error"] ?
            <CircleX className="h-4 w-4"/>
            :
            <Info className="h-4 w-4"/>
        }
        <span>{message}</span>
        {onClose && (
          <button className="btn btn-xs btn-ghost" onClick={onClose} aria-label="Close notification">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;

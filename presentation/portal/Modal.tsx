import {useEffect, useRef, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

export function Modal({label, className, children, onClose}: {
  label: string; className: string; children: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return createPortal(
    <dialog ref={ref} className={className} aria-label={label}
      onCancel={event => {event.preventDefault();onClose();}}
      onClick={event => {if (event.target === event.currentTarget) onClose();}}>
      <div>{children}</div>
    </dialog>,
    document.body,
  );
}

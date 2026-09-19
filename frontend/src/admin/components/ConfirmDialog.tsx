type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};


export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="admin-dialog-backdrop">
      <section className="admin-dialog">
        <h2>{title}</h2>

        <p>{message}</p>

        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            Annuler
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

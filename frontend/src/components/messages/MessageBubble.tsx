import type {
  Message,
} from "./types";

type Props = {
  message: Message;
  mine: boolean;
  onReport?: (message: Message) => void;
};

export default function MessageBubble({
  message,
  mine,
  onReport,
}: Props) {
  const createdAt =
    new Date(message.created_at);

  return (
    <div
      className={
        mine
          ? "message-row message-row--mine"
          : "message-row message-row--other"
      }
    >
      <div
        className={
          mine
            ? "message-bubble message-bubble--mine"
            : "message-bubble message-bubble--other"
        }
      >
        <div className="message-bubble__body">
          {message.content}
        </div>

        <div className="message-bubble__meta">
          {createdAt.toLocaleTimeString(
            "fr-FR",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
          {!mine && onReport && (
            <button type="button" className="message-report-button" onClick={() => onReport(message)}>
              Signaler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
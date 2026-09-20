import type {
  Message,
} from "./types";


type Props = {
  message: Message;
  mine: boolean;
};


export default function MessageBubble({
  message,
  mine,
}: Props) {
  return (
    <div
      className={
        mine
          ? "message-bubble message-bubble--mine"
          : "message-bubble"
      }
    >
      <p>{message.content}</p>
      <span>
        {new Date(message.created_at).toLocaleString("fr-FR")}
      </span>
    </div>
  );
}

import {
  Send,
} from "lucide-react";
import type {
  FormEvent,
} from "react";


type Props = {
  text: string;
  sending?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};


export default function MessageComposer({
  text,
  sending = false,
  onChange,
  onSubmit,
}: Props) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="message-compose" onSubmit={submit}>
      <input
        value={text}
        onChange={event => onChange(event.target.value)}
        placeholder="Votre message"
        maxLength={3000}
        disabled={sending}
      />

      <button type="submit" disabled={sending || !text.trim()}>
        <Send size={17} />
        <span>{sending ? "Envoi..." : "Envoyer"}</span>
      </button>
    </form>
  );
}

import {
  Send,
} from "lucide-react";
import type {
  FormEvent,
} from "react";


type Props = {
  text: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};


export default function MessageComposer({
  text,
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
      />

      <button type="submit" disabled={!text.trim()}>
        <Send size={17} />
        <span>Envoyer</span>
      </button>
    </form>
  );
}

import type {
  Message,
} from "./types";

type Props = {
  message: Message;
  mine: boolean;
  meetupResponding?: boolean;
  onDelete?: (message: Message) => void;
  onReport?: (message: Message) => void;
  meetupStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "UPDATED" | "CANCELLED";
  meetupRespondable?: boolean;
  meetupEditable?: boolean;
  onMeetupResponse?: (message: Message, decision: "ACCEPTED" | "REJECTED") => void;
  onMeetupEdit?: (message: Message, payload: MeetupPayload) => void;
  onMeetupCancel?: (message: Message) => void;
};

export type MeetupPayload = {
  scheduled_at?: string;
  location_label?: string;
  instructions?: string | null;
};

type MeetupEventPayload = {
  meetup_message_id?: string;
  decision?: "ACCEPTED" | "REJECTED";
  note?: string | null;
  reason?: string | null;
};

type AttachmentPayload = {
  body?: string | null;
  url?: string;
  name?: string;
};

function parseAttachment(content: string): AttachmentPayload | null {
  try {
    const parsed = JSON.parse(content) as AttachmentPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parseMeetup(content: string): MeetupPayload | null {
  try {
    const parsed = JSON.parse(content) as MeetupPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parseMeetupEvent(content: string): MeetupEventPayload | null {
  try {
    const parsed = JSON.parse(content) as MeetupEventPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function MessageBubble({
  message,
  mine,
  meetupResponding = false,
  meetupStatus,
  meetupRespondable = true,
  meetupEditable = false,
  onDelete,
  onReport,
  onMeetupResponse,
  onMeetupEdit,
  onMeetupCancel,
}: Props) {
  const createdAt =
    new Date(message.created_at);

  const meetup = message.message_type === "MEETUP"
    ? parseMeetup(message.content)
    : null;

  const meetupEvent = ["MEETUP_RESPONSE", "MEETUP_UPDATE", "MEETUP_CANCELLED"].includes(message.message_type)
    ? parseMeetupEvent(message.content)
    : null;

  const attachment = message.message_type === "ATTACHMENT"
    ? parseAttachment(message.content)
    : null;

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
          {meetup ? (
            <div className="meetup-message">
              <strong>Rendez-vous proposé</strong>
              {meetupStatus && (
                <em className={`meetup-status meetup-status--${meetupStatus.toLowerCase()}`}>
                  {meetupStatus === "ACCEPTED"
                    ? "Accepté"
                    : meetupStatus === "REJECTED"
                      ? "Refusé"
                      : meetupStatus === "CANCELLED"
                        ? "Annulé"
                        : meetupStatus === "UPDATED"
                          ? "Modifié"
                          : "En attente"}
                </em>
              )}
              <span>{meetup.location_label ?? "Lieu à confirmer"}</span>
              {meetup.scheduled_at && (
                <span>{new Date(meetup.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
              )}
              {meetup.instructions && <p>{meetup.instructions}</p>}
              {meetupEditable && onMeetupEdit && onMeetupCancel && meetupStatus !== "CANCELLED" && (
                <div className="meetup-response-actions">
                  <button
                    type="button"
                    className="secondary-button inline-button"
                    disabled={meetupResponding}
                    onClick={() => onMeetupEdit(message, meetup)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="secondary-button inline-button"
                    disabled={meetupResponding}
                    onClick={() => onMeetupCancel(message)}
                  >
                    Annuler
                  </button>
                </div>
              )}
              {!mine && onMeetupResponse && meetupRespondable && meetupStatus !== "CANCELLED" && (
                <div className="meetup-response-actions">
                  <button
                    type="button"
                    className="primary-button inline-button"
                    disabled={meetupResponding}
                    onClick={() => onMeetupResponse(message, "ACCEPTED")}
                  >
                    Accepter
                  </button>
                  <button
                    type="button"
                    className="secondary-button inline-button"
                    disabled={meetupResponding}
                    onClick={() => onMeetupResponse(message, "REJECTED")}
                  >
                    Refuser
                  </button>
                </div>
              )}
            </div>
          ) : meetupEvent ? (
            <div className="meetup-message">
              <strong>
                {message.message_type === "MEETUP_CANCELLED"
                  ? "Rendez-vous annulé"
                  : message.message_type === "MEETUP_UPDATE"
                    ? "Rendez-vous modifié"
                    : meetupEvent.decision === "ACCEPTED"
                      ? "Rendez-vous accepté"
                      : "Rendez-vous refusé"}
              </strong>
              {meetupEvent.note && <p>{meetupEvent.note}</p>}
              {meetupEvent.reason && <p>{meetupEvent.reason}</p>}
            </div>
          ) : attachment ? (
            <div className="attachment-message">
              {attachment.body && <p>{attachment.body}</p>}
              {attachment.url && (
                <a href={attachment.url} target="_blank" rel="noreferrer">
                  {attachment.name || attachment.url}
                </a>
              )}
            </div>
          ) : message.message_type === "DELETED" ? (
            <em>Message supprimé</em>
          ) : (
            message.content
          )}
        </div>

        <div className="message-bubble__meta">
          {createdAt.toLocaleTimeString(
            "fr-FR",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
          {mine && message.message_type !== "DELETED" && onDelete && (
            <button type="button" className="message-report-button" onClick={() => onDelete(message)}>
              Supprimer
            </button>
          )}
          {mine && (
            <span>{message.read_at ? "Lu" : "Envoyé"}</span>
          )}
          {!mine && onReport && message.message_type !== "DELETED" && (
            <button type="button" className="message-report-button" onClick={() => onReport(message)}>
              Signaler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
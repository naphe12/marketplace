type Props = {
  children: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};


export default function StatusBadge({
  children,
  tone = "neutral",
}: Props) {
  return (
    <span
      className={[
        "status-badge",
        `status-badge--${tone}`,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

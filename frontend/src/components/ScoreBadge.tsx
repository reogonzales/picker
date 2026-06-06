interface Props {
  score: number;
  verdict: "BUY" | "HOLD" | "AVOID";
}

const colors = {
  BUY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  HOLD: "bg-yellow-100 text-yellow-800 border-yellow-300",
  AVOID: "bg-red-100 text-red-800 border-red-300",
};

export default function ScoreBadge({ score, verdict }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${colors[verdict]}`}
    >
      {score}
      <span className="font-bold">{verdict}</span>
    </span>
  );
}

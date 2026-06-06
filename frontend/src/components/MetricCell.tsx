interface Props {
  value: number | string | null | undefined;
  format?: "pct" | "num" | "price" | "ratio" | "plain";
  good?: "high" | "low" | "mid";
  suffix?: string;
}

function color(value: number, good: Props["good"]): string {
  if (good === "high") {
    if (value > 0) return "text-emerald-700";
    if (value < 0) return "text-red-600";
  }
  if (good === "low") {
    if (value < 0.2) return "text-emerald-700";
    if (value > 1.0) return "text-red-600";
  }
  return "text-slate-700";
}

export default function MetricCell({ value, format = "num", good, suffix }: Props) {
  if (value === null || value === undefined) {
    return <span className="text-slate-300">—</span>;
  }

  let display: string;
  if (typeof value === "string") {
    display = value;
  } else {
    switch (format) {
      case "pct":
        display = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
        break;
      case "price":
        display = `$${value.toFixed(2)}`;
        break;
      case "ratio":
        display = value.toFixed(2);
        break;
      default:
        display = value.toFixed(value % 1 === 0 ? 0 : 2);
    }
  }

  if (suffix) display += suffix;

  const cls =
    typeof value === "number" && good ? color(value, good) : "text-slate-700";

  return <span className={cls}>{display}</span>;
}

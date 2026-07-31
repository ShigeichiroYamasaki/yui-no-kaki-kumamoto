export type SupportEventPoint = {
  asset: "ETH" | "JPYC";
  amount: bigint;
  timestamp: number;
};

export type TrendPoint = {
  timestamp: number;
  eth: bigint;
  jpyc: bigint;
};

export function buildSupportTrend(events: SupportEventPoint[]): TrendPoint[] {
  let eth = 0n;
  let jpyc = 0n;
  const points: TrendPoint[] = [];

  for (const event of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    if (event.asset === "ETH") eth += event.amount;
    if (event.asset === "JPYC") jpyc += event.amount;
    points.push({ timestamp: event.timestamp, eth, jpyc });
  }

  return points;
}

export function chartPolyline(
  points: TrendPoint[],
  asset: "eth" | "jpyc",
  width = 680,
  height = 180,
): string {
  if (points.length === 0) return "";
  const values = points.map((point) => point[asset]);
  const max = values.reduce((current, value) => value > current ? value : current, 0n);
  const divisor = points.length > 1 ? points.length - 1 : 1;

  return values.map((value, index) => {
    const x = (index / divisor) * width;
    const y = max === 0n ? height : height - (Number(value * 10_000n / max) / 10_000) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

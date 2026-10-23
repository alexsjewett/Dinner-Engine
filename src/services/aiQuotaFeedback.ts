/**
 * User-facing explanations for server-enforced OpenAI pilot limits.
 * This describes why a new request was blocked. It does not read live
 * ledger counters, request quota changes, or imply that all other caps reset.
 */
function nextUtcBoundary(period: "hour" | "day" | "month", now: Date): Date {
  const boundary = new Date(now.getTime());
  if (period === "hour") {
    boundary.setUTCHours(boundary.getUTCHours() + 1, 0, 0, 0);
  } else if (period === "day") {
    boundary.setUTCDate(boundary.getUTCDate() + 1);
    boundary.setUTCHours(0, 0, 0, 0);
  } else {
    boundary.setUTCMonth(boundary.getUTCMonth() + 1, 1);
    boundary.setUTCHours(0, 0, 0, 0);
  }
  return boundary;
}

function localReset(period: "hour" | "day" | "month", now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZoneName: "short",
  }).format(nextUtcBoundary(period, now));
}

export function describeAiFailure(code: string, now: Date = new Date()): string {
  switch (code) {
    case "budget_hourly_limit_reached":
      return "AI hourly limit: up to 10 model calls per UTC hour, and one dinner search may use several calls. The next hourly window begins " +
        localReset("hour", now) + ". Other limits may still apply.";
    case "budget_daily_limit_reached":
      return "AI daily limit: up to 40 model calls per UTC day. The next daily window begins " +
        localReset("day", now) + ". Other limits may still apply.";
    case "budget_monthly_limit_reached":
      return "AI monthly request limit: up to 100 model calls per UTC month. The next monthly window begins " +
        localReset("month", now) + ".";
    case "budget_spending_limit_reached":
      return "The server's $5 monthly AI spending allowance cannot cover this full recipe search. The next monthly window begins " +
        localReset("month", now) + ". The spending cap has not been increased.";
    case "budget_limit_reached":
      return "The AI request or spending allowance was reached. This server version cannot identify which one; searches can use multiple model calls.";
    case "budget_unavailable":
      return "AI budget safeguards are temporarily unavailable, so no provider request was allowed.";
    default:
      return "AI suggestions couldn't finish (" + code + ").";
  }
}

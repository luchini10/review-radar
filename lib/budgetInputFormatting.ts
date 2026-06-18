function formatNumberToken(value: string) {
  const normalized = value.replace(/,/g, "");
  const match = normalized.match(/^(\d+)(\.\d*)?$/);

  if (!match) {
    return value;
  }

  const dollars = Number(match[1]).toLocaleString("en-US");
  const cents = match[2] || "";

  return `${dollars}${cents}`;
}

export function formatBudgetInput(value: string) {
  return value.replace(
    /(^|[^\w$])(\$?\s*)(\d[\d,]*(?:\.\d*)?)/g,
    (_match, prefix: string, _currency: string, amount: string) =>
      `${prefix}$${formatNumberToken(amount)}`,
  );
}

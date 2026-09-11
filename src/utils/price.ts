export function parseMenuPrice(price: string | undefined): number {
  if (!price || /gratis/i.test(price)) return 0;
  const parsed = parseFloat(price.replace('€', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatEuro(amount: number): string {
  return `€${amount.toFixed(2).replace('.', ',')}`;
}

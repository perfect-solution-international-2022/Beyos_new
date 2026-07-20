export function formatPrice(amount: number): string {
  return (
    "LKR " +
    new Intl.NumberFormat("en-LK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  );
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

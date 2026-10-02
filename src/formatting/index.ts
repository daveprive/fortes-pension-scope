export const currency = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format;
export const percentage = new Intl.NumberFormat('nl-NL', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format;
export const date = new Intl.DateTimeFormat('nl-NL').format;

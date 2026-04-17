import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(en);

const obj = countries.getNames('en', { select: 'official' });

export const COUNTRIES: { code: string; name: string }[] = Object.entries(obj)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

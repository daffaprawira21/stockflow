// ponytail: central contract for the theme persistence key. No React context or
// event bus yet; native DOM attribute (data-theme) + matchMedia handle the rest.
// Upgrade when a non-client component needs reactive theme state.

export const THEME_STORAGE_KEY = 'sf_theme';

export type Theme = 'light' | 'dark';

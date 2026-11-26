// ponytail: central contract for the theme persistence key. No React context or
// event bus yet; native DOM attribute (data-theme) + matchMedia handle the rest.
// Upgrade when a non-client component needs reactive theme state.
//
// Note: app/layout.tsx's no-flash inline script (in the root layout's <head>)
// intentionally hard-codes the 'sf_theme' key and 'light'|'dark' literals
// because it must run pre-paint as vanilla JS, not a module import. Do not
// "clean up" that script to use this module.

export const THEME_STORAGE_KEY = 'sf_theme';

export type Theme = 'light' | 'dark';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Disable Tailwind's preflight reset so our cascade layers work as expected.
  // The Tailwind v3 PostCSS plugin hoists preflight to the top level (unlayered)
  // regardless of the outer @layer wrapper, which clobbers SDK typography rules
  // like `.rtsdk h3 { font-size: 24px }`. The SDK stylesheet already provides
  // sensible defaults for h1-h6/body/a/etc., so we don't need preflight.
  // All utility classes (flex, grid, mt-4, bg-zinc-700, …) still work.
  corePlugins: { preflight: false },
  theme: {
    extend: {},
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                editor: {
                    bg: '#18181b', // zinc-950
                    panel: '#27272a', // zinc-800
                    border: '#3f3f46', // zinc-700
                    text: '#d4d4d8', // zinc-300
                    textDim: '#a1a1aa', // zinc-400
                    accent: '#2563eb', // blue-600
                    accentHover: '#3b82f6', // blue-500
                    input: '#18181b', // zinc-950
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            fontSize: {
                xxs: '0.65rem',
            }
        }
    },
    plugins: [],
}

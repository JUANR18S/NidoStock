# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Stock Cosmetológico

Sistema web de inventario y punto de venta para negocios cosmetológicos.

## Tecnologías
- React
- Vite
- Supabase
- Tailwind CSS
- React Router

## Funcionalidades del Sprint 1
- Configuración inicial del proyecto
- Conexión con Supabase
- Login con Supabase Auth
- Protección de rutas
- Roles base: admin y employee
- Tabla de perfiles
- Tabla de categorías de productos
- Reglas RLS iniciales

## Instalación

```bash
npm install
npm run dev

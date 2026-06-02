# Stock Cosmetológico

Sistema web de inventario y punto de venta de alta estética diseñado para centros cosmetológicos, spas y estéticas.

---

## 🛠️ Tecnologías y Arquitectura

- **Core**: React 18, Vite.
- **Estilos**: Tailwind CSS v4, Iconos de Lucide-React.
- **Base de Datos & Auth**: Supabase DB con políticas avanzadas de RLS (Row Level Security).
- **Rutas**: React Router DOM con roles validados (`admin`, `employee`).

---

## ✨ Funcionalidades

### Sprint 1: Autenticación y Roles
- Configuración inicial del proyecto y conexión segura con Supabase.
- Login interactivo con Supabase Auth.
- Middleware y rutas protegidas (`ProtectedRoute.jsx`).
- Perfiles de usuarios con roles definidos (`admin` y `employee`).
- Gestión e inicialización dinámica de categorías de productos.

### Sprint 2: Gestión de Inventario, Lotes y Stock
- Registro de productos por categoría y SKU único.
- Abastecimiento y trazabilidad mediante lotes con fechas de vencimiento.
- Vista automatizada `product_stock_summary` para calcular stock acumulado y fechas límite.
- Alertas inteligentes de caducidad en el catálogo.
- Bloqueo y auditoría de permisos a través de políticas RLS y controles en la interfaz.

---

## 🚀 Inicio Rápido (Local)

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configuración de Variables de Entorno**:
   Crea un archivo `.env` en la raíz basado en `.env.example` y rellena las credenciales de tu proyecto de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto-supabase.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```

3. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```

---

## 📦 Sprint 2 - Productos, lotes y stock

### 🎯 Objetivo del Sprint
Transformar el Dashboard básico en un sistema de inventario funcional integrado. Se habilita la creación de productos y el ingreso de stock mediante lotes con fechas de caducidad automatizadas, calculando dinámicamente el stock total y las alertas de vencimiento.

### 🗂️ Archivos Creados y Modificados

#### Nuevos Archivos:
- [supabase_sprint_2.sql](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/supabase_sprint_2.sql): Script SQL para creación de tablas (`products`, `product_batches`), vista (`product_stock_summary`), políticas RLS y triggers.
- [productService.js](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/services/productService.js): Capa de comunicación directa con Supabase para el CRUD de productos y lotes.
- [ProductForm.jsx](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/components/ProductForm.jsx): Modal interactivo para que administradores creen nuevos productos.
- [BatchForm.jsx](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/components/BatchForm.jsx): Modal interactivo para que administradores abastezcan inventario mediante lotes.
- [Products.jsx](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/pages/Products.jsx): Pantalla principal del catálogo de inventario con alertas de caducidad.

#### Archivos Modificados:
- [App.jsx](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/App.jsx): Se agregó la ruta protegida `/productos`.
- [Navbar.jsx](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/components/Navbar.jsx): Se añadieron pestañas dinámicas de navegación para "Dashboard" y "Productos".
- [Dashboard.jsx](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/src/pages/Dashboard.jsx): Se conectó la base de datos para mostrar los contadores en tiempo real (productos totales, lotes activos y lotes por vencer) reemplazando valores estáticos.

---

### 💻 Cómo ejecutar el SQL en Supabase

1. Entra a tu proyecto en el panel de [Supabase](https://supabase.com/).
2. Dirígete a la sección **SQL Editor** en el menú izquierdo.
3. Crea una nueva consulta e introduce el contenido completo del archivo [supabase_sprint_2.sql](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/supabase_sprint_2.sql).
4. Presiona **Run** para aplicar las tablas, la vista, las políticas RLS y cargar los datos iniciales de prueba (cremas y exfoliantes sembrados).

---

### 🧪 Cómo probar la ruta `/productos`

1. Inicia sesión en la aplicación.
2. Navega a **Productos** desde el Navbar superior o accede a `http://localhost:5173/productos`.
3. Podrás visualizar los productos de prueba con sus SKU, categoría, precio, stock sumado de sus lotes y la fecha del lote más próximo a vencer.
4. **Validación de Roles**:
   - **Administrador**: Verás los botones "Crear Producto" y "Añadir Lote". Al hacer clic, se abrirán los formularios interactivos que te permitirán añadir registros y verlos reflejados en tiempo real.
   - **Empleado**: El sistema ocultará los botones administrativos y no permitirá que realices operaciones de escritura, respetando las políticas RLS.

---

### ✅ Checklist de Validación

- [x] RLS en base de datos protege la escritura para que solo administradores la ejecuten.
- [x] La vista `product_stock_summary` calcula correctamente el stock sumado y fecha de vencimiento menor por producto.
- [x] Filtros y buscador del catálogo funcionan de forma fluida.
- [x] Alertas visuales inteligentes para lotes vencidos o por vencer en menos de 90 días.
- [x] El Dashboard sincroniza los contadores dinámicamente con la base de datos de Supabase.

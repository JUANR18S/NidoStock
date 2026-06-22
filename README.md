# NidoStock

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

---

## Sprint 2.1 - Hotfix de seguridad y estabilidad

### 🛡️ Vulnerabilidades Corregidas
- **Recursión Infinita en RLS**: Se reemplazaron las subconsultas recursivas en la tabla `profiles` mediante la función segura con `SECURITY DEFINER` `public.is_admin(user_id)`.
- **Escalada de Privilegios de Rol**: Se protegió la columna `role` mediante un trigger `enforce_profile_role_update` y políticas específicas de RLS, impidiendo que usuarios comunes cambien su propio rol a `admin` desde la interfaz o clientes API externos.
- **Crash de Precios en Interfaz**: Se corrigieron las llamadas directas a `.toFixed(2)` en `Products.jsx` utilizando coerción segura a `Number`, previniendo errores críticos de interfaz al cargar datos con precios nulos, indefinidos o en formato de texto.
- **Validación de Rutas Robustecida**: `ProtectedRoute.jsx` ahora bloquea el acceso parcial si un usuario autenticado carece de perfil/rol cargado, previniendo visualizaciones parpadeantes y brechas de acceso.
- **Bloqueo de Eliminación Física**: Se desactivaron y eliminaron por completo las políticas de tipo `DELETE` en base de datos para productos y lotes, forzando la trazabilidad y la inhabilitación lógica (`active = false`).
- **Unicidad de Lotes**: Se añadió una restricción de clave única `UNIQUE(product_id, batch_code)` en la tabla `product_batches` para evitar lotes duplicados en un mismo producto.
- **Auditoría de Lotes**: Se agregó la columna `updated_at` y su trigger en la tabla `product_batches`.
- **Validación de Fechas en Lotes**: Se bloqueó el ingreso de fechas de vencimiento en el pasado dentro de `BatchForm.jsx`.

### 🗂️ Archivo SQL a Ejecutar
Ejecuta el contenido del archivo [supabase_hotfix_sprint_2_1.sql](file:///c:/Users/riosm/OneDrive/Desktop/CosmeStock/supabase_hotfix_sprint_2_1.sql) en el **SQL Editor** de Supabase para aplicar las políticas, funciones, triggers y restricciones actualizadas.

### 🧪 Cómo Probar

#### **Probar como Admin**
1. Inicia sesión con una cuenta que tenga rol `admin` en la tabla `profiles`.
2. Podrás acceder a `/` y `/productos` sin problemas.
3. En `/productos`, visualizarás los botones "Crear Producto" y "Añadir Lote".
4. Podrás registrar nuevos productos y lotes.
5. Intenta registrar un lote con fecha de ayer; el sistema mostrará el error: *"La fecha de vencimiento no puede ser anterior a hoy."*
6. Podrás cambiar el rol de otros perfiles si es necesario desde la base de datos.

#### **Probar como Employee**
1. Inicia sesión con una cuenta que tenga el rol `employee` en `profiles`.
2. El sistema ocultará los botones administrativos de creación.
3. Intenta realizar una solicitud de actualización a la tabla `profiles` cambiando tu rol a `admin` (a través de la consola del navegador usando la API del cliente de Supabase). La base de datos bloqueará la transacción y lanzará el error: *"No tienes permisos para modificar el rol de usuario."*
4. Intenta realizar una solicitud de borrado físico (`delete`) de un producto o lote desde la consola. La operación fallará por falta de políticas de borrado en RLS.

### ✅ Checklist de Validación del Hotfix
- [x] No hay recursión infinita en las políticas de RLS.
- [x] Un empleado no puede elevar su propio rol a `admin`.
- [x] Las rutas protegidas validan explícitamente los roles permitidos.
- [x] `Products.jsx` no crashea si los precios son strings, null o indefinidos.
- [x] No se permiten eliminaciones físicas de productos o lotes.
- [x] No es posible registrar lotes con la misma combinación de producto y código de lote.
- [x] El formulario de lotes no permite guardar fechas de vencimiento anteriores a hoy.

---

## Sprint 2.2 - Registro Seguro y Gestión de Usuarios

### 🛡️ Funcionalidades Añadidas
- **Registro Público (/register)**: Formulario interactivo con validaciones frontend (mínimo 8 caracteres en contraseña, coincidencia de confirmación y correo válido). Mapea el nombre completo del usuario.
- **Panel Administrativo (/usuarios)**: Sección exclusiva para administradores que lista a todo el personal (nombre completo, correo, rol, estado y fecha de creación).
- **Mapeo de Metadatos**: El trigger `on_auth_user_created` lee los metadatos de Supabase Auth para poblar las columnas `full_name`, `active` y `created_at` en `profiles`.
- **Acceso Restringido en Perfiles**: Los empleados comunes solo pueden leer su propio perfil. Los administradores pueden leer y listar todos.

### ⚙️ Cómo Activar la Confirmación de Correo en Supabase
Para hacer funcional el flujo de confirmación de correo electrónico:
1. Ve al panel de tu proyecto en [Supabase](https://supabase.com/).
2. Dirígete a **Authentication -> Providers -> Email**.
3. Asegúrate de habilitar **Confirm email** y haz clic en **Save**.
4. *(Opcional)* Si deseas probar sin correos reales, puedes deshabilitar esta casilla para que el inicio de sesión sea instantáneo tras registrarse.

### 🧪 Cómo Probar el Registro y Promoción a Admin
1. Inicia la aplicación localmente (`npm run dev`).
2. Haz clic en **Crear cuenta** en la página de inicio de sesión o accede directamente a `http://localhost:5173/register`.
3. Llena los datos y regístrate.
4. Si la confirmación de correo está activa, ve a tu buzón (o revisa el historial de Supabase Auth) y haz clic en el enlace de validación.
5. Inicia sesión. Tu cuenta tendrá el rol `employee` por defecto.
6. **Promoción a Admin**: Para convertir esta cuenta en administrador, ejecuta en el SQL Editor de Supabase:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'tu_correo_registrado@ejemplo.com';
   ```
7. Al recargar la página web, verás la pestaña **Usuarios** en el menú superior y podrás ver a todos los usuarios del sistema.

### ✅ Checklist de Validación
- [x] El registro público no permite elegir roles y siempre asigna `employee`.
- [x] El trigger de base de datos extrae el nombre completo de los metadatos correctamente.
- [x] La ruta `/usuarios` está protegida y solo permite acceso a usuarios con rol `admin`.
- [x] Las acciones administrativas de roles en `/usuarios` están inactivas e informativas por seguridad de RLS.
- [x] Los empleados normales solo pueden leer su propio perfil (RLS bloquea lecturas cruzadas).

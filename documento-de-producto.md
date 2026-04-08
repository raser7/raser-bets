## Documento de Producto (MVP: Tipster VIP)

### 1. Objetivo del Proyecto
Proporcionar una plataforma web privada, rápida y responsiva donde un administrador pueda publicar actualizaciones efímeras (pronósticos deportivos) para una base de clientes con acceso restringido, garantizando una carga casi instantánea y facilidad de actualización desde dispositivos móviles.

### 2. Actores del Sistema
* **Cliente Final:** Usuario que recibe un enlace y una contraseña global. Solo consume el contenido.
* **Administrador:** Usuario con acceso a una ruta oculta para reemplazar el contenido activo.

### 3. Flujo Principal
* El cliente ingresa a la URL raíz e introduce la contraseña.
* Si es correcta, el sistema lee la base de datos y muestra: Imagen, Texto descriptivo y Botón de redirección.
* El administrador ingresa a una ruta específica (ej. `/admin-secreto`), sube la nueva imagen y texto, y el sistema sobrescribe el registro anterior.

---

## Stack Tecnológico

La selección prioriza el tiempo de desarrollo cero-configuración y costos de infraestructura nulos.

* **Frontend:** React.js inicializado con Vite (para compilación instantánea).
* **Estilos:** Tailwind CSS (para maquetación directa en los componentes sin archivos CSS adicionales).
* **Base de Datos:** Firebase Firestore (NoSQL, lecturas rápidas).
* **Almacenamiento de Archivos:** Firebase Storage (para alojar las imágenes de los pronósticos).
* **Despliegue (Hosting):** Vercel (despliegue automático desde GitHub).

---

## Arquitectura y Modelo de Datos

Para no perder tiempo en lógicas complejas de historiales o listas, aplicaremos el **Patrón de Documento Único (Single Document Overwrite)**.

### Estructura en Firebase Firestore
* **Colección:** `contenido_app`
* **Documento ID:** `pronostico_actual` (Este es el único documento que existirá).
* **Campos del Documento:**
  * `imagen_url`: Cadena de texto (URL generada por Firebase Storage).
  * `analisis`: Cadena de texto.
  * `link_apuesta`: Cadena de texto.
  * `fecha_actualizacion`: Timestamp (para saber hace cuánto se publicó).

### Lógica de Seguridad (Sin Auth Complejo)
* **Acceso Cliente:** La contraseña global se guarda en un archivo `.env` en Vercel. El frontend valida que el input del usuario coincida con esa variable antes de mostrar el componente del pronóstico.
* **Acceso Admin:** Una ruta simple en React Router (ej. `/panel-kevin`). Para mayor velocidad hoy, puedes protegerla con la misma lógica de contraseña o simplemente dejar la ruta "oculta" y ofuscada para que solo él la conozca, implementando un login real en la versión 2.0.

---

## Estructura de Carpetas Propuesta

Un árbol plano y directo al grano en tu carpeta `src`:

* `components/` (Componentes reutilizables como Botones o Inputs).
* `pages/`
  * `Login.jsx` (Pantalla del candado).
  * `Dashboard.jsx` (Vista del pronóstico para el cliente).
  * `AdminPanel.jsx` (Formulario de subida para Kevin).
* `firebase/`
  * `config.js` (Tus credenciales de Firebase de inicialización).
* `App.jsx` (Lógica de rutas usando `react-router-dom`).

---

## Plan de Ejecución Inmediata

1. Inicializa el proyecto local con Vite y Tailwind.
2. Crea el proyecto en la consola de Firebase y habilita Firestore y Storage en modo prueba.
3. Programa la conexión en `config.js`.
4. Maqueta el `AdminPanel.jsx` con el formulario y la función de subir imagen/sobrescribir Firestore.
5. Maqueta el `Dashboard.jsx` para que lea ese único documento y lo pinte.
6. Sube el repositorio a GitHub y conéctalo a Vercel.
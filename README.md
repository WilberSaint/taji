# TAJI

TAJI es un juego de mesa digital desarrollado con arquitectura **cliente-servidor**.

Tecnologías utilizadas:

- **Frontend:** React.js + Vite
- **Backend:** Node.js
- **Gestor de paquetes:** npm

El proyecto está organizado como **monorepo**, donde el cliente y el servidor se encuentran en el mismo repositorio.

---

# Estructura del proyecto

taji/
│
├── client/ # Aplicación React (Vite)
├── server/ # Backend Node.js
├── .gitignore # Backend Node.js
└── README.md

---

# Requisitos

Antes de ejecutar el proyecto debes tener instalado:

- **Node.js (versión 18 o superior)**
- **npm**
- **Git**

Verificar instalación:

```bash
node -v
npm -v
git --version

# Instalar Dependencias

Backend

cd server
npm install

Frontend

cd client
npm install

# Ejecutar el Proyecto


Backend

cd server
npm run dev

Frontend

cd client
npm run dev

---

Por defecto el frontend suele ejecutarse en http://localhost:5173. 
En caso de que el frontend no logre conectarse con el backend, se puede modificar la dirección del servidor editando el archivo client/.env y cambiando la IP utilizada por Vite, por ejemplo VITE_SERVER_IP=http://192.168.1.10:3000, después de lo cual se debe reiniciar el frontend nuevamente con npm run dev


# TAJI

**TAJI** es un juego de cartas digital sobre **energías renovables**, inspirado en *VIRUS!*.
Forma parte de un proyecto de investigación orientado a **llevar la ingeniería a los juegos**
para motivar a niñas, niños y jóvenes a estudiar carreras de ingeniería.

Arquitectura **cliente-servidor** en un **monorepo**:

- **client/** — React 18 + Vite + Tailwind CSS + Zustand + framer-motion + socket.io-client
- **server/** — Node.js + Express + Socket.io (estado en memoria, sin base de datos)

```
taji/
├── client/   # Aplicación React (Vite)
├── server/   # Backend Node.js + Socket.io
├── package.json  # Scripts para levantar ambos a la vez
└── README.md
```

---

## Requisitos

- **Node.js 18 o superior**
- **npm**
- **Git**

```bash
node -v
npm -v
git --version
```

---

## Instalación

Desde la raíz del repositorio:

```bash
npm run install:all
```

Esto instala las dependencias de la raíz, de `server/` y de `client/`.

> Alternativa manual: `npm install` en `server/` y en `client/` por separado.

---

## Ejecutar en local

Desde la raíz, un solo comando levanta el backend y el frontend:

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3001>

Para levantarlos por separado:

```bash
npm run dev:server   # solo backend (nodemon)
npm run dev:client   # solo frontend (vite)
```

---

## Configuración

### Cliente (`client/.env`)

El cliente funciona sin `.env` (usa `http://localhost:3001` por defecto).
Para apuntar a otro servidor, copia el ejemplo y edítalo:

```bash
cp client/.env.example client/.env
```

```
VITE_SERVER_URL=http://192.168.1.10:3001
```

Reinicia `npm run dev:client` después de cambiarlo.

### Servidor (`server/.env`)

El servidor también funciona sin `.env`. Para personalizarlo:

```bash
cp server/.env.example server/.env
```

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor |
| `CLIENT_URL` | `http://localhost:5173` | Origen permitido por CORS |
| `NODE_ENV` | `development` | Entorno |
| `DEBUG` | `false` | Logs de depuración |

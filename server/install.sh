#!/bin/bash

echo "🌱 TAJI Server - Instalación Rápida"
echo "===================================="
echo ""

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null
then
    echo "❌ Node.js no está instalado"
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"
echo ""

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas correctamente"
else
    echo "❌ Error al instalar dependencias"
    exit 1
fi

echo ""

# Copiar archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado"
    echo "⚠️  Recuerda configurar las variables en .env según tu entorno"
else
    echo "ℹ️  El archivo .env ya existe"
fi

echo ""
echo "✨ Instalación completada!"
echo ""
echo "Para iniciar el servidor:"
echo "  • Modo desarrollo: npm run dev"
echo "  • Modo producción: npm start"
echo ""
echo "El servidor estará disponible en http://localhost:3001"
echo ""

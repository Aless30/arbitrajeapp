# 📱 Detector de Arbitraje - App Movil

## Guia de Instalacion Paso a Paso

Esta app monitorea constantemente oportunidades de arbitraje en crypto y forex,
y te notifica directamente en tu celular cuando encuentra algo rentable.

---

## REQUISITOS PREVIOS

### 1. Instalar Node.js

1. Ve a: https://nodejs.org/
2. Descarga la version LTS (boton verde)
3. Instala normalmente (siguiente, siguiente, finalizar)
4. Verifica abriendo terminal/CMD: `node --version`

### 2. Instalar Expo CLI

Abre terminal/CMD y escribe:
```bash
npm install -g expo-cli
```

### 3. Instalar Expo Go en tu celular

- **Android:** Busca "Expo Go" en Play Store
- **iPhone:** Busca "Expo Go" en App Store

---

## INSTALAR LA APP

### Paso 1: Abre la terminal en la carpeta del proyecto

```bash
cd arbitrage-app
```

### Paso 2: Instala dependencias

```bash
npm install
```

### Paso 3: Inicia el proyecto

```bash
npx expo start
```

### Paso 4: Escanea el codigo QR

- Se abrira un navegador o veras un QR en la terminal
- Abre Expo Go en tu celular
- Escanea el QR con la camara del celular
- La app se abrira en tu celular

---

## USO DE LA APP

### Pantalla Principal (Dashboard)

- Muestra el estado del escaneo en tiempo real
- Boton para iniciar/pausar el monitoreo
- Estadisticas: escaneos totales, rentables, mejor score
- Lista de oportunidades rentables encontradas

### Pantalla de Detalle

- Al tocar una oportunidad, ves el desglose completo:
  - Ganancia bruta
  - Fees de trading
  - Fee de retiro
  - Slippage
  - Riesgo por transferencia
  - **Ganancia neta real**
  - Score y nivel de riesgo

### Pantalla de Historial

- Registro de todas las oportunidades detectadas
- Se guarda automaticamente en tu celular

### Pantalla de Configuracion

- Monto de inversion (para simulacion)
- Umbrales de ganancia minima
- Costos estimados (fees, slippage)
- Borrar historial

---

## NOTIFICACIONES

La app te envia notificaciones push cuando:
- Se detecta una oportunidad rentable
- El score es alto (buena oportunidad)

### Para que funcionen:

1. Acepta los permisos de notificacion cuando la app los pida
2. En Android: no pongas la app en "ahorro de bateria"
3. En iPhone: ve a Configuracion > Notificaciones > Expo Go > Permitir

---

## MONITOREO EN SEGUNDO PLANO

La app sigue escaneando incluso cuando:
- La pantalla esta apagada
- Estas usando otra app
- El celular esta en standby

### Limitaciones del sistema:

- **Android:** Escanea cada ~15 min en background (limitacion del OS)
- **iPhone:** Escanea cada ~15-30 min en background
- En primer plano: escanea cada 15 segundos

### Para mejor rendimiento:

- Deja la app abierta cuando puedas
- En Android: marca la app como "sin restriccion de bateria"
- Configuracion > Apps > Arbitrage Detector > Bateria > Sin restriccion

---

## COMPILAR COMO APP INDEPENDIENTE (sin Expo Go)

Si quieres instalar la app directamente en tu celular (sin necesitar Expo Go):

### Para Android (APK):

```bash
npx expo build:android -t apk
```

### Para Android (AAB - Play Store):

```bash
npx expo build:android -t app-bundle
```

### Para iPhone (requiere cuenta Apple Developer $99/year):

```bash
npx expo build:ios
```

### Con EAS Build (recomendado):

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Esto generara un archivo .apk que puedes instalar directamente.

---

## SOLUCIÓN DE PROBLEMAS

### "No se encontraron oportunidades"
- Normal. Las oportunidades aparecen en momentos de volatilidad
- Baja el umbral minimo en Configuracion
- Deja la app corriendo mas tiempo

### La app no escanea en background
- Android: Desactiva optimizacion de bateria para esta app
- iPhone: Activa "Actualizacion en segundo plano"

### Error al instalar dependencias
- Elimina la carpeta `node_modules` y el archivo `package-lock.json`
- Ejecuta: `npm install` de nuevo

### El QR no se escanea
- Asegurate de que celular y computadora estan en la misma red WiFi
- Prueba con: `npx expo start --tunnel`

---

## ESTRUCTURA DE LA APP

```
arbitrage-app/
├── App.tsx                          ← Entrada principal
├── app.json                         ← Configuracion Expo
├── package.json                     ← Dependencias
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         ← Navegacion (tabs)
│   ├── screens/
│   │   ├── DashboardScreen.tsx      ← Pantalla principal
│   │   ├── DetailScreen.tsx         ← Detalle de oportunidad
│   │   ├── HistoryScreen.tsx        ← Historial
│   │   └── SettingsScreen.tsx       ← Configuracion
│   ├── components/
│   │   ├── GlowCard.tsx            ← Tarjeta con efecto glow
│   │   ├── OpportunityCard.tsx     ← Tarjeta de oportunidad
│   │   ├── PulsingDot.tsx          ← Indicador animado
│   │   ├── ScoreRing.tsx           ← Anillo de score
│   │   └── StatusBadge.tsx         ← Badge de estado
│   ├── hooks/
│   │   └── useArbitrageScanner.ts  ← Hook de escaneo
│   ├── services/
│   │   ├── arbitrageEngine.ts      ← Motor de deteccion
│   │   └── backgroundTask.ts       ← Tarea en segundo plano
│   └── utils/
│       ├── theme.ts                ← Colores y estilos
│       └── storage.ts             ← Almacenamiento local
└── assets/                         ← Iconos y splash
```

---

## TECNOLOGIAS UTILIZADAS

- **React Native** con **Expo** - Framework para apps moviles
- **TypeScript** - Lenguaje con tipos para menos errores
- **ccxt** - Conexion a exchanges de criptomonedas
- **expo-background-fetch** - Escaneo en segundo plano
- **expo-notifications** - Notificaciones push locales
- **react-native-reanimated** - Animaciones fluidas
- **AsyncStorage** - Almacenamiento local persistente

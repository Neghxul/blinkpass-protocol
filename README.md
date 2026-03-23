<p align="center">
  <img src="./assets/app-icon.png" alt="BlinkPass Protocol Logo" width="400" />
</p>

<h1 align="center">BlinkPass Protocol 🎟️⚡</h1>
<p align="center">
  <em>Boletos inmutables, cero comisiones de terceros y validación criptográfica en la puerta.</em>
</p>

<br/>

# 🎟️ BlinkPass Protocol  
### Decentralized Ticketing & On-Chain Access Management

BlinkPass Protocol redefine la industria de los eventos en vivo eliminando intermediarios abusivos. Permite a los organizadores vender boletos inmutables (NFTs) directamente en redes sociales mediante **Solana Actions (Blinks)** y validar accesos con una app móvil nativa.

Además, incorpora un sistema de **regalías automáticas (10%) en mercado secundario**, devolviendo valor a los creadores.

---

## ✨ Features

- 🎫 Venta de boletos como NFTs (On-Chain)
- ⚡ Compra directa desde redes sociales (Blinks)
- 📱 App móvil para administración de eventos
- 💰 Regalías automáticas en reventa (10%)
- 🔐 Validación de boletos (anti-duplicado)
- 🏦 Escrow descentralizado para fondos

---

## 🏗️ Arquitectura

### 🔹 Smart Contracts (Rust / Anchor)
- Gestión de tesorería (Escrow)
- Auto-incremento de tickets
- Control de capacidad (Sold Out)
- Regalías automáticas On-Chain
- Máquina de estados (Validado, Escaneado, Reembolsado)

### 🔹 Backend (Express.js)
- API optimizada para **Solana Blinks**
- Generación de transacciones dinámicas
- Integración directa con redes sociales

### 🔹 Mobile App (React Native / Expo)
- Creación de eventos
- Despliegue de Smart Contracts
- Retiro de fondos (Cash Out)
- Panel administrativo

---

## 🚀 Getting Started

### 📋 Prerrequisitos

- Node.js v18+
- Phantom Wallet (configurada en **Devnet**)
- SOL de prueba → https://faucet.solana.com/

---

## 📱 1. Levantar App Móvil

```bash
npm install
npx expo start
```

- Presiona:
  - `a` → Android
  - `i` → iOS
  - o escanea QR con Expo Go

👉 Desde el dashboard:
- Ingresa nombre del evento
- Click en **"DESPLEGAR SMART CONTRACT"**

---

## 🌐 2. Levantar Servidor (Blinks)

```bash
cd blink-server
npm install
npx tsx server.ts
```

Servidor disponible en:

```
http://localhost:8080
```

---

## 🌍 3. Exponer API (Cloudflare Tunnel)

```bash
npx cloudflared tunnel --url http://localhost:8080
```

### Pasos:
1. Copia la URL `.trycloudflare.com`
2. Ve a:
   ```
   blink-server/server.ts
   ```
3. Actualiza el `href` del endpoint GET
4. Reinicia servidor:

```bash
Ctrl + C
npx tsx server.ts
```

---

## 🧪 4. Flujo de Compra (Usuario)

1. Ir a: https://dial.to  
2. Pegar URL:

```
https://tu-link.trycloudflare.com/api/blink
```

3. Conectar Phantom Wallet (Devnet)
4. Click en **"Comprar Ticket"**
5. Aprobar transacción

### Resultado:
- Se genera automáticamente:
  ```
  TICKET-001
  TICKET-002
  ...
  ```
- Respeta capacidad máxima (Sold Out)

---

## 💸 5. Retiro de Fondos (Cash Out)

Desde la App móvil:

1. Ir al panel administrador
2. Click en:
   ```
   RETIRAR FONDOS
   ```
3. El Smart Contract:
   - Transfiere SOL del escrow
   - Directo a wallet del organizador

---

## 🛡️ Seguridad

- Máquina de estados por ticket:
  - ✅ Válido  
  - 🎟️ Escaneado  
  - 🔁 Reembolsado  

- Previene:
  - Clonación
  - Reventa después de uso
  - Manipulación de tickets

---

## 📦 Stack Tecnológico

- **Blockchain:** Solana (Rust + Anchor)
- **Backend:** Node.js + Express + TSX
- **Mobile:** React Native + Expo
- **Infra:** Cloudflare Tunnel
- **Wallet:** Phantom

---

## 🧠 Roadmap

- [ ] Integración con QR dinámico
- [ ] Dashboard web para analytics
- [ ] Soporte multi-evento
- [ ] Notificaciones push
- [ ] Marketplace secundario propio

---

## 🤝 Contribuciones

Pull requests son bienvenidos.  
Para cambios grandes, abre un issue primero.

---

## 📄 Licencia

MIT

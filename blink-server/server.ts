import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createPostResponse } from "@solana/actions";
import type { ActionGetResponse, ActionPostRequest, ActionPostResponse } from "@solana/actions";
import { Connection, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import fs from 'fs';

const app = express();
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Encoding, Accept-Encoding");
  res.setHeader("X-Action-Version", "2.1.3");
  res.setHeader("X-Blockchain-Ids", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

const idl = JSON.parse(fs.readFileSync('./blink_pass_pro.json', 'utf-8'));

// DATOS DEL EVENTO
const EVENTO_PDA = "4F819GNZiu8gRVZoC9v9PUba84iT6sNZPuygXiDzXC4a";

// INFORMACIÓN DEL EVENTO
app.get('/api/blink', (req: Request, res: Response) => {
  const payload = {
    title: "Gran Final 2026",
    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    description: "Pase inmutable como NFT en Devnet. Valida en puerta con BlinkPass Protocol.",
    label: "Comprar",
    links: {
      actions: [
        {
          label: "Comprar Ticket ◎ 0.1 SOL",
          // LINK DE CLOUDFLARE ACTIVO
          href: "https://pcs-sides-forecasts-villages.trycloudflare.com/api/blink", 
          type: "transaction" as any
        }
      ]
    }
  };
  res.json(payload);
});

// TRANSACCIÓN
app.post('/api/blink', async (req: Request, res: Response) => {
  try {
    const body: ActionPostRequest = req.body;
    const comprador = new PublicKey(body.account);

    const connection = new Connection(clusterApiUrl('devnet'));
    const program = new Program(idl as any, { connection } as any);

    const eventoPubkey = new PublicKey(EVENTO_PDA);
    const [tesoreriaPda] = PublicKey.findProgramAddressSync([Buffer.from("tesoreria"), eventoPubkey.toBuffer()], program.programId);

    // 1. Consulta del estado actual del evento directo de la Blockchain
    const eventoData = await (program.account as any).evento.fetch(eventoPubkey);
    const boletosVendidos = eventoData.boletosVendidos.toNumber();
    const capacidadMax = eventoData.capacidadMaxima.toNumber();

    // 2. Protección contra reventas y Sold Outs
    if (boletosVendidos >= capacidadMax) {
      return res.status(400).json({ message: "¡Sold Out! Capacidad máxima alcanzada." });
    }

    // 3. Se genera el ID automático (Ej. 0 + 1 = TICKET-001)
    const nextTicketNum = boletosVendidos + 1;
    const ticketIdDinamico = `TICKET-${nextTicketNum.toString().padStart(3, '0')}`;
    
    console.log(`Generando boleto: ${ticketIdDinamico} (${nextTicketNum}/${capacidadMax})`);

    // 4. Se calcula el PDA del boleto con el nuevo ID dinámico
    const [boletoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("boleto"), eventoPubkey.toBuffer(), Buffer.from(ticketIdDinamico)], 
      program.programId
    );

    // 5. Se arma la instrucción pasándole el ID dinámico a Rust
    const tx = new Transaction().add(
      await (program.methods as any).comprarBoleto(ticketIdDinamico)
        .accounts({
          comprador: comprador,
          evento: eventoPubkey,
          tesoreria: tesoreriaPda,
          boleto: boletoPda,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
        })
        .instruction()
    );

    tx.feePayer = comprador;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: tx,
        message: `¡Éxito! Abre este link para ver tu QR de acceso en puerta: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticketIdDinamico}`,
      } as any
    });

    res.json(payload);
  } catch (err) {
    console.error("Error procesando POST:", err);
    res.status(400).send("Error");
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Servidor Blink corriendo en http://localhost:${PORT}`);
});
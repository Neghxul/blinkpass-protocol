// Archivo: app/api/blink/route.ts
import { ActionGetResponse, ActionPostRequest, ActionPostResponse, createPostResponse } from "@solana/actions";
import { Connection, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import idl from '../../../blink_pass_pro.json'; 

const EVENTO_PDA = "3XnxJBTFLrX5ufd7MuJfzWXQXtySQavcduVMLGtkv4rC";
const TICKET_ID = "TICKET-010"; 

// 1. GET: Dibuja la tarjeta en Twitter
export async function GET(request: Request) {
  const payload: ActionGetResponse = {
    title: "Concierto Cradle of Filth",
    icon: "https://i.scdn.co/image/ab6761610000e5eb140dc1b89d4fb9eecba2d0bc", // Un icono temporal de la banda
    description: "Compra tu pase inmutable como NFT en Devnet. Valida tu acceso con la App BlinkPass Protocol.",
    label: "Comprar Boleto",
    links: {
      actions: [
        {
          label: "Comprar Ticket ◎ 0.1 SOL",
          href: "/api/blink", 
          type: "transaction" // 🔥 SOLUCIÓN AL ERROR: Le decimos que es una transacción
        }
      ]
    }
  };
  return Response.json(payload, { headers: { "Access-Control-Allow-Origin": "*" } });
}

// 2. POST: Construye la transacción cuando le dan clic
export async function POST(request: Request) {
  try {
    const body: ActionPostRequest = await request.json();
    const comprador = new PublicKey(body.account);

    const connection = new Connection(clusterApiUrl('devnet'));
    const program = new Program(idl as any, { connection } as any);

    // Calculamos PDAs
    const eventoPubkey = new PublicKey(EVENTO_PDA);
    const [tesoreriaPda] = PublicKey.findProgramAddressSync([Buffer.from("tesoreria"), eventoPubkey.toBuffer()], program.programId);
    const [boletoPda] = PublicKey.findProgramAddressSync([Buffer.from("boleto"), eventoPubkey.toBuffer(), Buffer.from(TICKET_ID)], program.programId);

    // Creamos la instrucción de Anchor
    const tx = new Transaction().add(
      await program.methods.comprarBoleto(TICKET_ID)
        .accounts({
          comprador: comprador,
          evento: eventoPubkey,
          tesoreria: tesoreriaPda,
          boleto: boletoPda,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
        })
        .instruction()
    );

    // Preparamos la respuesta para el Blink
    tx.feePayer = comprador;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction", // 🔥 LA PIEZA FALTANTE PARA TYPESCRIPT
        transaction: tx,
        message: "¡Boleto comprado con éxito! Tu pase está en la blockchain.",
      }
    });

    return Response.json(payload, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    console.error("Error en POST:", err);
    return new Response("Error al procesar", { status: 400 });
  }
}

// 3. 🚨 OPTIONS: REQUISITO DE CORS PARA SOLANA BLINKS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
    },
  });
}
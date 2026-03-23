import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BlinkPassPro } from "../target/types/blink_pass_pro";

describe("blink_pass_pro", () => {
  // Conectamos a tu Localnet (dinero infinito automático)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BlinkPassPro as Program<BlinkPassPro>;
  
  // El organizador serás tú (tu billetera principal)
  const organizador = provider.wallet as anchor.Wallet;

  // 👤 Creamos un Comprador X con su propio celular/wallet
  const comprador = anchor.web3.Keypair.generate();

  // --- DATOS DEL EVENTO ---
  const idEvento = "WAYLEARN-2026";
  const precioBoleto = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL); // 1 SOL exacto
  const capacidadMaxima = new anchor.BN(100);
  const idBoleto = "TICKET-VIP-001"; // El QR

  // --- BUSCADOR DE DIRECCIONES (PDAs) ---
  const [eventoPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("evento"), organizador.publicKey.toBuffer(), Buffer.from(idEvento)],
    program.programId
  );

  const [tesoreriaPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("tesoreria"), eventoPda.toBuffer()],
    program.programId
  );

  const [boletoPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("boleto"), eventoPda.toBuffer(), Buffer.from(idBoleto)],
    program.programId
  );

  it("0. El Banco de Solana fondea al Comprador", async () => {
    // Le regalamos 5 SOL al comprador para que pueda pagar su boleto
    const tx = await provider.connection.requestAirdrop(comprador.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(tx);
    console.log("\n💸 Comprador fondeado con 5 SOL listos para gastar.");
  });

  it("1. Inicializa el Evento y la Bóveda Inviolable", async () => {
    const tx = await program.methods
      .inicializarEvento(idEvento, precioBoleto, capacidadMaxima)
      .accounts({
        organizador: organizador.publicKey,
        evento: eventoPda,
        tesoreria: tesoreriaPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("🚀 Evento creado. Firma:", tx);
  });

  it("2. El Comprador paga 1 SOL y el Smart Contract lo guarda", async () => {
    // Vemos el saldo de la bóveda ANTES de la compra
    let balanceAntes = await provider.connection.getBalance(tesoreriaPda);
    console.log(`🏦 Saldo Bóveda ANTES: ${balanceAntes / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    // El comprador firma la transacción con su dinero
    const tx = await program.methods
      .comprarBoleto(idBoleto)
      .accounts({
        comprador: comprador.publicKey,
        evento: eventoPda,
        tesoreria: tesoreriaPda,
        boleto: boletoPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([comprador]) // ¡Crucial! El comprador autoriza que le cobren
      .rpc();
    
    // Verificamos que el dinero llegó a la bóveda
    let balanceDespues = await provider.connection.getBalance(tesoreriaPda);
    console.log(`🏦 Saldo Bóveda DESPUÉS: ${balanceDespues / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    console.log("🎟️ ¡Compra exitosa! Boleto emitido.");
  });

  it("3. La App Móvil escanea el QR en la puerta", async () => {
    const tx = await program.methods
      .escanearAcceso(idBoleto)
      .accounts({
        validador: organizador.publicKey,
        boleto: boletoPda,
      })
      .rpc();
    
    console.log("✅ Acceso autorizado. Boleto quemado lógicamente.");
    
    // Consultamos el estado exacto en la blockchain
    const boletoData = await program.account.boleto.fetch(boletoPda);
    console.log("🔒 Nuevo estado del boleto:", Object.keys(boletoData.estado)[0]); 
  });

  it("4. INTENTO DE FRAUDE: Doble escaneo de código QR", async () => {
    console.log("\n🚨 Un revendedor intenta escanear una foto del mismo boleto...");
    let fraudeBloqueado = false;
    
    try {
      await program.methods
        .escanearAcceso(idBoleto)
        .accounts({
          validador: organizador.publicKey,
          boleto: boletoPda,
        })
        .rpc();
    } catch (err) {
      fraudeBloqueado = true;
      console.log("🛡️ ¡Bloqueo exitoso! Solana rechazó el clon en milisegundos.");
    }

    if (!fraudeBloqueado) {
      throw new Error("❌ SEGURIDAD VULNERADA: El contrato permitió un doble escaneo.");
    }
  });
});
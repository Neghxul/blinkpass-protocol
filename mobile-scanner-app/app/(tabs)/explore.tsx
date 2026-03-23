// ==========================================
// POLYFILLS WEB3
// ==========================================
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
global.Buffer = Buffer;
// ==========================================

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { supabase } from '../../src/lib/supabase';
import idl from '../../blink_pass_pro.json'; 

export default function DashboardAdmin() {
  const [balance, setBalance] = useState<number | null>(null);
  const [nombreEvento, setNombreEvento] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bovedas, setBovedas] = useState<any[]>([]);

  const SECRET_KEY = new Uint8Array([ 187, 224, 248, 100, 85, 241, 50, 74, 89, 117, 32, 19, 117, 246, 128, 186, 138, 151, 246, 52, 139, 194, 254, 207, 197, 133, 212, 55, 180, 43, 71, 193, 117, 124, 171, 60, 56, 196, 210, 84, 234, 12, 216, 215, 44, 45, 189, 170, 239, 12, 179, 242, 244, 199, 180, 135, 188, 208, 36, 225, 60, 76, 238, 209 ]);
  const validadorKeypair = Keypair.fromSecretKey(SECRET_KEY);

  const shadowWallet = {
    publicKey: validadorKeypair.publicKey,
    signTransaction: async (tx: any) => { tx.sign(validadorKeypair); return tx; },
    signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.sign(validadorKeypair)); return txs; },
  };

  const cargarDatos = async () => {
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(connection, shadowWallet as any, { commitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      // 1. Cargar saldo de la wallet principal
      const lamports = await connection.getBalance(validadorKeypair.publicKey);
      setBalance(lamports / 1e9);

      // 2. Traer eventos y consultar saldo de cada tesorería en tiempo real
      const { data: eventosDB } = await supabase
        .from('eventos')
        .select('*')
        .eq('organizador', validadorKeypair.publicKey.toBase58())
        .order('created_at', { ascending: false });

      if (eventosDB) {
        const bovedasProcesadas = await Promise.all(eventosDB.map(async (ev) => {
          const eventoPubkey = new PublicKey(ev.pda);
          const [tesoreriaPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("tesoreria"), eventoPubkey.toBuffer()],
            program.programId
          );
          const saldoTesoreria = await connection.getBalance(tesoreriaPda);
          return { ...ev, tesoreriaPda, saldo: saldoTesoreria / 1e9 };
        }));
        setBovedas(bovedasProcesadas);
      }
    } catch (e) {
      console.log("Error cargando datos:", e);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearEvento = async () => {
    if (!nombreEvento.trim()) { Alert.alert("Dato requerido", "Por favor ponle un nombre al evento."); return; }
    setIsLoading(true);
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(connection, shadowWallet as any, { commitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const ID_LIMPIO = nombreEvento.trim().replace(/\s+/g, '-');
      const [eventoPda] = PublicKey.findProgramAddressSync([Buffer.from("evento"), validadorKeypair.publicKey.toBuffer(), Buffer.from(ID_LIMPIO)], program.programId);
      const [tesoreriaPda] = PublicKey.findProgramAddressSync([Buffer.from("tesoreria"), eventoPda.toBuffer()], program.programId);

      await program.methods.inicializarEvento(ID_LIMPIO, new BN(0.1 * 1e9), new BN(100))
        .accounts({ organizador: validadorKeypair.publicKey, evento: eventoPda, tesoreria: tesoreriaPda, systemProgram: anchor.web3.SystemProgram.programId })
        .rpc();

      await supabase.from('eventos').insert([{ nombre: ID_LIMPIO, pda: eventoPda.toBase58(), organizador: validadorKeypair.publicKey.toBase58() }]);
      
      cargarDatos();
      console.log("\n=======================================================");
      console.log("¡EVENTO DESPLEGADO CON ÉXITO!");
      console.log(`\nconst EVENTO_PDA = "${eventoPda.toBase58()}";\n`);
      console.log("=======================================================\n");

      Alert.alert("¡Evento Publicado!", `ID: ${ID_LIMPIO}\nCópialo para tu servidor.`);
      setNombreEvento('');
    } catch (error: any) {
      Alert.alert("Error On-Chain", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // FUNCIÓN DINÁMICA DE RETIRO
  const handleRetirarDeBoveda = async (eventoPda: string, nombre: string) => {
    setIsLoading(true);
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(connection, shadowWallet as any, { commitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const eventoPubkey = new PublicKey(eventoPda);
      const [tesoreriaPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("tesoreria"), eventoPubkey.toBuffer()],
        program.programId
      );

      const tx = await program.methods.retirarFondos()
        .accounts({
          organizador: validadorKeypair.publicKey,
          evento: eventoPubkey,
          tesoreria: tesoreriaPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      cargarDatos();
      Alert.alert("¡Retiro Exitoso! ", `Se vació la bóveda de ${nombre}.\nTx: ${tx.slice(0,15)}...`);
    } catch (e: any) {
      Alert.alert("Error de Retiro", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>BlinkPass Protocol • Devnet</Text>
        </View>

        {/* TARJETA DE SALDO PRINCIPAL */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>WALLET PRINCIPAL</Text>
          <Text style={styles.balanceValue}>◎ {balance !== null ? balance.toFixed(4) : "..."}</Text>
          <Text style={styles.walletText}>{validadorKeypair.publicKey.toBase58().slice(0, 15)}...</Text>
        </View>

        {/* FORMULARIO DE CREACIÓN */}
        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>NUEVO EVENTO</Text>
          <TextInput style={styles.input} placeholder="Nombre del evento" placeholderTextColor="#555" value={nombreEvento} onChangeText={setNombreEvento} />
          <TouchableOpacity style={[styles.createButton, isLoading && { opacity: 0.6 }]} onPress={handleCrearEvento} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>🏗️ DESPLEGAR CONTRATO</Text>}
          </TouchableOpacity>
        </View>

        {/* LISTA DE BÓVEDAS ON-CHAIN */}
        <View style={styles.vaultsHeaderRow}>
          <Text style={styles.sectionTitle}>Tus Bóvedas (Escrows)</Text>
          <TouchableOpacity onPress={cargarDatos}><Text style={{fontSize: 20}}>🔄</Text></TouchableOpacity>
        </View>
        
        {bovedas.length === 0 ? (
          <Text style={styles.emptyText}>No hay eventos registrados.</Text>
        ) : (
          bovedas.map((boveda, index) => (
            <View key={index} style={styles.vaultCard}>
              <View style={styles.vaultInfo}>
                <Text style={styles.vaultName}>{boveda.nombre}</Text>
                <Text style={styles.vaultPda}>PDA: {boveda.pda.slice(0, 8)}...</Text>
                <Text style={styles.vaultBalance}>Saldo: ◎ {boveda.saldo.toFixed(4)}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.withdrawBtn, (boveda.saldo === 0 || isLoading) && { opacity: 0.5 }]} 
                disabled={boveda.saldo === 0 || isLoading}
                onPress={() => handleRetirarDeBoveda(boveda.pda, boveda.nombre)}
              >
                <Text style={styles.withdrawBtnText}>RETIRAR</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000', 
    padding: 20 
  },
  header: { 
    marginTop: 50, 
    marginBottom: 20 
  },
  headerTitle: { 
    fontSize: 34, 
    fontWeight: '900', 
    color: '#fff' 
  },
  headerSub: { 
    fontSize: 16, 
    color: '#14F195', 
    letterSpacing: 1 
  },
  balanceCard: { 
    backgroundColor: '#111', 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#333', 
    marginBottom: 20, 
    alignItems: 'center' 
  },
  balanceLabel: { 
    color: '#9945FF', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
  balanceValue: { 
    color: '#fff', 
    fontSize: 32, 
    fontWeight: '900' 
  },
  walletText: { 
    color: '#555', 
    fontSize: 10, 
    marginTop: 10, 
    fontFamily: 'monospace' 
  },
  formCard: { 
    backgroundColor: '#0A0A0A', 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#14F195', 
    marginBottom: 20 
  },
  inputLabel: { 
    color: '#14F195', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  input: { 
    backgroundColor: '#1A1A1A', 
    borderRadius: 12, 
    padding: 15, 
    color: '#fff', 
    fontSize: 16, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  createButton: { 
    backgroundColor: '#14F195', 
    padding: 15, 
    borderRadius: 14, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#000', 
    fontWeight: 'bold', 
    fontSize: 14, 
    letterSpacing: 0.5 
  },
  vaultsHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 15 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  emptyText: { 
    color: '#555', 
    fontStyle: 'italic', 
    textAlign: 'center', 
    marginTop: 20 
  },
  vaultCard: { 
    backgroundColor: '#111', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderLeftWidth: 4, 
    borderLeftColor: '#9945FF' 
  },
  vaultInfo: { flex: 1 },
  vaultName: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 2 
  },
  vaultPda: { 
    color: '#666', 
    fontSize: 10, 
    fontFamily: 'monospace', 
    marginBottom: 5 
  },
  vaultBalance: { 
    color: '#14F195', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  withdrawBtn: { 
    backgroundColor: '#9945FF', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderRadius: 8 
  },
  withdrawBtnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 12 
  }
});
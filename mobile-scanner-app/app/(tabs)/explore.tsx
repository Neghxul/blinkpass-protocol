// ==========================================
// POLYFILLS WEB3
// ==========================================
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
global.Buffer = Buffer;
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { supabase } from '../../src/lib/supabase';
import idl from '../../blink_pass_pro.json'; 

const BlinkPassLogo = require('@/assets/images/logo.png'); 

export default function DashboardAdmin() {
  const [balance, setBalance] = useState<number | null>(null);
  const [nombreEvento, setNombreEvento] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bovedas, setBovedas] = useState<any[]>([]); 

  const [logs, setLogs] = useState<string[]>([
    "> Inicializando nodo validador...",
    "> 🟢 Status: ONLINE",
    `> Anchor Program ID: ${idl.address.slice(0,15)}...`,
    "> Esperando instrucciones..._"
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `> ${msg}`]);
  };

  const SECRET_KEY = new Uint8Array([ 187, 224, 248, 100, 85, 241, 50, 74, 89, 117, 32, 19, 117, 246, 128, 186, 138, 151, 246, 52, 139, 194, 254, 207, 197, 133, 212, 55, 180, 43, 71, 193, 117, 124, 171, 60, 56, 196, 210, 84, 234, 12, 216, 215, 44, 45, 189, 170, 239, 12, 179, 242, 244, 199, 180, 135, 188, 208, 36, 225, 60, 76, 238, 209 ]);
  const validadorKeypair = Keypair.fromSecretKey(SECRET_KEY);

  const shadowWallet = {
    publicKey: validadorKeypair.publicKey,
    signTransaction: async (tx: any) => { tx.sign(validadorKeypair); return tx; },
    signAllTransactions: async (txs: any[]) => { txs.forEach(tx => tx.sign(validadorKeypair)); return txs; },
  };

  const cargarDatos = async () => {
    addLog("Sincronizando bóvedas y datos On-Chain...");
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(connection, shadowWallet as any, { commitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const lamports = await connection.getBalance(validadorKeypair.publicKey);
      setBalance(lamports / 1e9);

      const { data: eventosDB } = await supabase
        .from('eventos')
        .select('*')
        .eq('organizador', validadorKeypair.publicKey.toBase58())
        .order('created_at', { ascending: false });

      if (eventosDB) {
        const bovedasProcesadas = [];
        
        for (const ev of eventosDB) {
          const eventoPubkey = new PublicKey(ev.pda);
          const [tesoreriaPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("tesoreria"), eventoPubkey.toBuffer()],
            program.programId
          );
          
          const saldoTesoreria = await connection.getBalance(tesoreriaPda);

          let boletosVendidos = 0;
          let capacidadMaxima = 100;
          let precioSol = 0;

          try {
            const accountInfo = await connection.getAccountInfo(eventoPubkey);
            if (accountInfo && accountInfo.data) {
              const data = accountInfo.data;
              const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
              
              const strLen = view.getUint32(40, true); 
              
              const offsetPrecio = 44 + strLen;
              const offsetCapacidad = 44 + strLen + 8; 
              const offsetVendidos = 44 + strLen + 16; 
              
              const precioLamports = Number(view.getBigUint64(offsetPrecio, true));
              precioSol = precioLamports / 1e9;
              capacidadMaxima = Number(view.getBigUint64(offsetCapacidad, true));
              boletosVendidos = Number(view.getBigUint64(offsetVendidos, true));
            }
          } catch(err: any) {
            console.log(`Fallo la lectura de bytes en ${ev.nombre}:`, err.message);
          }

          const saldoActual = saldoTesoreria / 1e9;
          const totalRecaudado = boletosVendidos * precioSol;
          const retirado = Math.max(0, totalRecaudado - saldoActual);

          bovedasProcesadas.push({ 
            ...ev, 
            tesoreriaPda, 
            saldo: saldoActual, 
            boletosVendidos, 
            capacidadMaxima,
            totalRecaudado,
            retirado
          });
        }
        
        setBovedas(bovedasProcesadas);
        addLog("Sincronización completa.");
      }
    } catch (e) {
      addLog("Error sincronizando datos.");
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleCrearEvento = async () => {
    if (!nombreEvento.trim()) { Alert.alert("Dato requerido", "Ponle un nombre al evento."); return; }
    setIsLoading(true);
    addLog(`Construyendo contrato para: ${nombreEvento}...`);
    
    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(connection, shadowWallet as any, { commitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const ID_LIMPIO = nombreEvento.trim().replace(/\s+/g, '-');
      const [eventoPda] = PublicKey.findProgramAddressSync([Buffer.from("evento"), validadorKeypair.publicKey.toBuffer(), Buffer.from(ID_LIMPIO)], program.programId);
      const [tesoreriaPda] = PublicKey.findProgramAddressSync([Buffer.from("tesoreria"), eventoPda.toBuffer()], program.programId);

      addLog(`Firmando tx On-Chain...`);
      const tx = await program.methods.inicializarEvento(ID_LIMPIO, new BN(0.1 * 1e9), new BN(100))
        .accounts({ organizador: validadorKeypair.publicKey, evento: eventoPda, tesoreria: tesoreriaPda, systemProgram: anchor.web3.SystemProgram.programId })
        .rpc();

      await supabase.from('eventos').insert([{ nombre: ID_LIMPIO, pda: eventoPda.toBase58(), organizador: validadorKeypair.publicKey.toBase58() }]);

      addLog(`¡Despliegue exitoso! Tx: ${tx.slice(0, 8)}...`);
      
      console.log("\n=======================================================");
      console.log("  ¡EVENTO DESPLEGADO CON ÉXITO!");
      console.log(`\nconst EVENTO_PDA = "${eventoPda.toBase58()}";\n`);
      console.log("=======================================================\n");

      Alert.alert("¡Contrato Desplegado!", `ID: ${ID_LIMPIO}\nRevisa la terminal de tu PC para copiar el PDA.`);
      setNombreEvento(''); 
      cargarDatos();
    } catch (error: any) {
      addLog(`Falla On-Chain: ${error.message.slice(0, 20)}...`);
      Alert.alert("Fallo en la Red", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetirarDeBoveda = async (eventoPda: string, nombre: string) => {
    setIsLoading(true);
    addLog(`Solicitando retiro de bóveda: ${nombre}...`);
    
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

      addLog(`Retiro confirmado. Tx: ${tx.slice(0,8)}...`);
      cargarDatos(); 
      Alert.alert("¡Liquidación Exitosa! ", `Se vació la bóveda de ${nombre}.\nTx: ${tx.slice(0,15)}...`);
    } catch (e: any) {
      addLog(`Error de retiro: ${e.message.slice(0, 20)}...`);
      Alert.alert("Error de Retiro", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEliminarEvento = (id: number, nombre: string) => {
    Alert.alert(
      "Ocultar Evento",
      `¿Deseas eliminar "${nombre}" del dashboard?\n\n(La instrucción 'close' para destruir la bóveda On-Chain y recuperar el Rent de Solana estará disponible en la V2).`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Ocultar", 
          style: "destructive", 
          onPress: async () => {
            await supabase.from('eventos').delete().eq('id', id);
            addLog(`🗑️ Evento ${nombre} ocultado.`);
            cargarDatos();
          } 
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          
          <View style={styles.header}>
            <Image source={BlinkPassLogo} style={styles.logoImage} resizeMode="contain" />
            <View style={styles.badgeContainer}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSub}>MAIN DASHBOARD</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.phantomButton} 
              onPress={() => Alert.alert("Roadmap V2 🚀", "La integración Multi-Wallet (Phantom, Solflare) llegará en la V2. El MVP usa firmas delegadas para mantener latencia cero en la puerta.")}
            >
              <Text style={styles.phantomButtonText}>👻 Connect Phantom (V2)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.premiumCard}>
            <View style={[styles.cardGlow, { backgroundColor: '#14F195' }]} />
            <Text style={styles.balanceLabel}>WALLET DEL ORGANIZADOR</Text>
            <Text style={styles.balanceValue}>◎ {balance !== null ? balance.toFixed(4) : "..."}</Text>
            <View style={styles.pdaTag}>
              <Text style={styles.pdaText}>Wallet: {validadorKeypair.publicKey.toBase58().slice(0, 16)}...</Text>
            </View>
          </View>

          <View style={styles.premiumCard}>
            <View style={[styles.cardGlow, { backgroundColor: '#14F195' }]} />
            <Text style={styles.inputLabel}>DESPLEGAR NUEVO EVENTO</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Final-Santa-Rosa"
              placeholderTextColor="#444"
              value={nombreEvento}
              onChangeText={setNombreEvento}
              autoCapitalize="none"
            />
            
            <TouchableOpacity style={[styles.createButton, isLoading && { opacity: 0.6 }]} onPress={handleCrearEvento} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>🏗️ PUBLICAR SMART CONTRACT</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.vaultsHeaderRow}>
            <Text style={styles.sectionTitle}>Bóvedas Activas (Escrows)</Text>
            <TouchableOpacity onPress={cargarDatos}><Text style={{fontSize: 20}}>🔄</Text></TouchableOpacity>
          </View>
          
          {bovedas.length === 0 ? (
            <Text style={styles.emptyText}>No hay bóvedas On-Chain registradas.</Text>
          ) : (
            bovedas.map((boveda, index) => (
              <View key={index} style={styles.premiumCard}>
                <View style={[styles.cardGlow, { backgroundColor: '#9945FF' }]} />
                
                <TouchableOpacity 
                  style={{position: 'absolute', top: 15, right: 15, zIndex: 20, padding: 5}}
                  onPress={() => handleEliminarEvento(boveda.id, boveda.nombre)}
                >
                  <Text style={{fontSize: 16}}>🗑️</Text>
                </TouchableOpacity>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cardLabel}>ID: {boveda.nombre}</Text>
                    <Text style={styles.pdaText}>PDA: {boveda.pda.slice(0, 10)}...</Text>
                    <Text style={styles.ticketsMinedText}>🎟️ Vendidos: {boveda.boletosVendidos} / {boveda.capacidadMaxima}</Text>
                  </View>
                  <View style={{alignItems: 'flex-end', marginTop: 15}}>
                    <Text style={styles.balanceValueSmall}>◎ {boveda.saldo.toFixed(4)}</Text>
                  </View>
                </View>

                {/* 🔥 PANEL FINANCIERO DEL EVENTO BLINDADO 🔥 */}
                <View style={styles.financialRow}>
                  <View style={styles.finBox}>
                    <Text style={styles.finLabel}>RECAUDADO</Text>
                    <Text style={styles.finValue}>◎ {(boveda.totalRecaudado || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.finBox}>
                    <Text style={styles.finLabel}>RETIRADO</Text>
                    <Text style={styles.finValue}>◎ {(boveda.retirado || 0).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.finBox, { borderRightWidth: 0 }]}>
                    <Text style={[styles.finLabel, {color: '#14F195'}]}>EN BÓVEDA</Text>
                    <Text style={[styles.finValue, {color: '#14F195'}]}>◎ {(boveda.saldo || 0).toFixed(4)}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.withdrawButtonSmall, (boveda.saldo === 0 || isLoading) && { opacity: 0.5 }]} 
                  disabled={boveda.saldo === 0 || isLoading}
                  onPress={() => handleRetirarDeBoveda(boveda.pda, boveda.nombre)}
                >
                  <Text style={styles.withdrawTextSmall}>LIQUIDAR FONDOS</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>System Monitor</Text>
          <View style={styles.terminalCard}>
            <View style={styles.terminalHeader}>
              <View style={[styles.dot, {backgroundColor: '#FF5F56'}]} />
              <View style={[styles.dot, {backgroundColor: '#FFBD2E'}]} />
              <View style={[styles.dot, {backgroundColor: '#27C93F'}]} />
              <Text style={styles.terminalTitle}>bash - solana-cli</Text>
            </View>
            
            <ScrollView 
              style={{maxHeight: 120}} 
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {logs.slice(-6).map((log, index) => {
                const isSuccess = log.includes('✅') || log.includes('💸') || log.includes('🟢');
                const isError = log.includes('❌') || log.includes('🗑️');
                return (
                  <Text key={index} style={[styles.logTx, isSuccess && {color: '#14F195'}, isError && {color: '#FF5F56'}]}>
                    {log}
                  </Text>
                );
              })}
            </ScrollView>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505'
  },
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(153, 69, 255, 0.15)',
    transform: [{ scale: 2 }]
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    transform: [{ scale: 2 }]
  },
  header: {
    marginTop: 40,
    marginBottom: 25,
    alignItems: 'center',
    zIndex: 10
  },
  logoImage: {
    width: 200,
    height: 60,
    marginBottom: 10
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14F195',
    marginRight: 8,
    shadowColor: '#14F195',
    shadowOpacity: 0.8,
    shadowRadius: 5
  },
  headerSub: {
    fontSize: 12,
    color: '#aaa',
    letterSpacing: 2,
    fontWeight: 'bold'
  },
  phantomButton: {
    marginTop: 15,
    backgroundColor: 'rgba(171, 159, 242, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#AB9FF2'
  },
  phantomButtonText: {
    color: '#AB9FF2',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5
  },
  premiumCard: {
    backgroundColor: '#0A0A0A',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    padding: 25,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden'
  },
  cardGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4
  },
  balanceLabel: {
    color: '#14F195',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    letterSpacing: 1
  },
  balanceValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1
  },
  balanceValueSmall: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900'
  },
  pdaTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10
  },
  pdaText: {
    color: '#aaa',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  cardLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 5
  },
  ticketsMinedText: {
    color: '#14F195',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden'
  },
  withdrawButtonSmall: {
    marginTop: 15,
    backgroundColor: '#9945FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#9945FF',
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  withdrawTextSmall: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1
  },
  inputLabel: {
    color: '#14F195',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
    letterSpacing: 1
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 18,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  createButton: {
    backgroundColor: '#14F195',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#14F195',
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  buttonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5
  },
  vaultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 5
  },
  emptyText: {
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 5
  },
  terminalCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222',
    zIndex: 10
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingBottom: 10
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  terminalTitle: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    marginLeft: 10
  },
  logTx: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8
  },
  financialRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#222'
  },
  finBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333'
  },
  finLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4
  },
  finValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace'
  }
});
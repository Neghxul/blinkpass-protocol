// ==========================================
// POLYFILLS WEB3
// ==========================================
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
global.Buffer = Buffer;
// ==========================================

import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { 
  Animated, 
  Easing, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Vibration, 
  View, 
  ActivityIndicator, 
  FlatList 
} from 'react-native';
import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { router } from 'expo-router'; 
import idl from '../../blink_pass_pro.json'; 
import { supabase } from '../../src/lib/supabase';

type AppState = 'LISTA_EVENTOS' | 'DETALLE_EVENTO' | 'ESCANER' | 'VALIDANDO' | 'EXITO' | 'ERROR';

export default function ValidatorApp() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [validationState, setValidationState] = useState<AppState>('LISTA_EVENTOS');
  const [eventos, setEventos] = useState<any[]>([]);
  const [eventoActivo, setEventoActivo] = useState<any>(null);
  const [asistentes, setAsistentes] = useState<any[]>([]);
  const [scanned, setScanned] = useState(false);
  const [lastTicket, setLastTicket] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  
  const [isLoadingEventos, setIsLoadingEventos] = useState(true);

  // Llave Secreta del Validador
  const SECRET_KEY = new Uint8Array([ 187, 224, 248, 100, 85, 241, 50, 74, 89, 117, 32, 19, 117, 246, 128, 186, 138, 151, 246, 52, 139, 194, 254, 207, 197, 133, 212, 55, 180, 43, 71, 193, 117, 124, 171, 60, 56, 196, 210, 84, 234, 12, 216, 215, 44, 45, 189, 170, 239, 12, 179, 242, 244, 199, 180, 135, 188, 208, 36, 225, 60, 76, 238, 209 ]);
  const validadorKeypair = Keypair.fromSecretKey(SECRET_KEY);
  
  const laserAnim = useRef(new Animated.Value(0)).current;

  const cargarEventos = async () => {
    setIsLoadingEventos(true);
    const { data } = await supabase.from('eventos').select('*').order('created_at', { ascending: false });
    if (data) setEventos(data);
    setIsLoadingEventos(false);
  };

  const cargarAsistentes = async (pda: string) => {
    const { data } = await supabase.from('escaneos').select('*').eq('evento_pda', pda).order('created_at', { ascending: false });
    if (data) setAsistentes(data);
  };

  useEffect(() => {
    cargarEventos();
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (validationState === 'ESCANER') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, { toValue: 200, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(laserAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    }
  }, [validationState]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setValidationState('VALIDANDO');
    setLastTicket(data.trim());
    Vibration.vibrate(); 

    try {
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const provider = new AnchorProvider(connection, {
        publicKey: validadorKeypair.publicKey,
        signTransaction: async (tx: any) => { tx.sign(validadorKeypair); return tx; },
        signAllTransactions: async (txs: any[]) => { txs.forEach(t => t.sign(validadorKeypair)); return txs; },
      } as any, { commitment: 'confirmed' });
      const program = new Program(idl as any, provider);

      const [boletoPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("boleto"), new PublicKey(eventoActivo.pda).toBuffer(), Buffer.from(data.trim())],
        program.programId
      );

      await program.methods.escanearAcceso(data.trim()).accounts({
          validador: validadorKeypair.publicKey,
          boleto: boletoPda,
        }).rpc();

      await supabase.from('escaneos').insert([
        { evento_pda: eventoActivo.pda, ticket_id: data.trim(), estado: 'VALIDO' }
      ]);

      setValidationState('EXITO');
      Vibration.vibrate([0, 100, 50, 100]); 

    } catch (error: any) {
      console.error("Fallo On-Chain:", error.message);
      
      const errorMsg = error.message || "";
      let tipoError = 'FALSO';
      let mensajePantalla = 'Boleto Falso o Inválido';

      if (errorMsg.includes("6002") || errorMsg.includes("escaneado")) {
        tipoError = 'DUPLICADO';
        mensajePantalla = 'ESTE BOLETO YA FUE USADO';
      } else if (errorMsg.includes("3012") || errorMsg.includes("AccountNotInitialized")) {
        tipoError = 'FALSO';
        mensajePantalla = 'BOLETO FALSO (No existe On-Chain)';
      }

      setMensajeError(mensajePantalla);
      setValidationState('ERROR');
      Vibration.vibrate([0, 500, 200, 500]); 

      await supabase.from('escaneos').insert([
        { evento_pda: eventoActivo.pda, ticket_id: data.trim(), estado: tipoError }
      ]);
    }
  };

  if (hasPermission === null) return <View style={styles.container}><ActivityIndicator style={{marginTop: 100}} color="#14F195" /></View>;
  if (hasPermission === false) return <View style={styles.container}><Text style={styles.title}>Sin acceso a la cámara</Text></View>;

  if (validationState === 'LISTA_EVENTOS') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Selecciona Evento</Text>
          <TouchableOpacity onPress={cargarEventos}><Text style={{color: '#14F195', fontSize: 24}}>🔄</Text></TouchableOpacity>
        </View>

        {isLoadingEventos ? <ActivityIndicator size="large" color="#14F195" style={{marginTop: 50}} /> : (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {eventos.map(ev => (
              <TouchableOpacity key={ev.id} style={styles.card} onPress={() => { setEventoActivo(ev); cargarAsistentes(ev.pda); setValidationState('DETALLE_EVENTO'); }}>
                <View>
                  <Text style={styles.cardTitle}>{ev.nombre}</Text>
                  <Text style={styles.cardInfo}>ID: {ev.pda.slice(0, 15)}...</Text>
                </View>
                <Text style={{color: '#14F195', fontSize: 20}}>〉</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  if (validationState === 'DETALLE_EVENTO') {
    const validos = asistentes.filter(a => a.estado === 'VALIDO').length;
    const fraudes = asistentes.filter(a => a.estado !== 'VALIDO').length;

    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setValidationState('LISTA_EVENTOS')}><Text style={styles.backLink}>❮ Atrás</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{eventoActivo.nombre}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.sectionTitle}>ASISTENTES</Text>
            <Text style={styles.asistentesCount}>{validos}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.sectionTitle, {color: '#FF3B30'}]}>ALERTAS</Text>
            <Text style={[styles.asistentesCount, {color: '#FF3B30'}]}>{fraudes}</Text>
          </View>
        </View>

        <FlatList
          data={asistentes}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyListText}>Aún no hay registros de escaneo.</Text>}
          renderItem={({ item }) => (
            <View style={styles.asistenteRow}>
              <View>
                <Text style={styles.ticketText}>🎟️ {item.ticket_id}</Text>
                <Text style={[
                  styles.estadoBadge, 
                  item.estado === 'VALIDO' ? styles.estadoValido : 
                  item.estado === 'DUPLICADO' ? styles.estadoDuplicado : styles.estadoFalso
                ]}>
                  {item.estado || 'DESCONOCIDO'}
                </Text>
              </View>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          )}
          style={{ flex: 1, paddingHorizontal: 20 }}
        />

        <TouchableOpacity style={styles.scanBtn} onPress={() => { setScanned(false); setValidationState('ESCANER'); }}>
          <Text style={styles.scanBtnText}>📷 ABRIR ESCÁNER</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (validationState === 'ESCANER') {
    return (
      <View style={{flex: 1, backgroundColor: '#000'}}>
        <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => { setValidationState('DETALLE_EVENTO'); cargarAsistentes(eventoActivo.pda); }}>
          <Text style={{fontSize: 24, fontWeight: 'bold', color: '#000'}}>✕</Text>
        </TouchableOpacity>
        <View style={styles.overlay}>
          <View style={styles.frame}>
             <Animated.View style={[styles.laser, { transform: [{ translateY: laserAnim }] }]} />
          </View>
          <Text style={styles.scanTextTag}>Escaneando para: {eventoActivo.nombre}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.center, 
      validationState === 'EXITO' ? {backgroundColor: '#052e16'} : 
      validationState === 'ERROR' ? {backgroundColor: '#450a0a'} : 
      {backgroundColor: '#000'}
    ]}>
        {validationState === 'VALIDANDO' && (
          <View style={{alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#14F195" />
            <Text style={{color: '#14F195', marginTop: 20, fontSize: 18}}>Validando On-Chain...</Text>
          </View>
        )}

        {(validationState === 'EXITO' || validationState === 'ERROR') && (
          <>
            <Text style={{fontSize: 80, marginBottom: 10}}>{validationState === 'EXITO' ? '✅' : '🚨'}</Text>
            <Text style={styles.resultTitle}>{validationState === 'EXITO' ? 'ACCESO CONCEDIDO' : mensajeError}</Text>
            <Text style={{color: '#aaa', fontSize: 18, marginBottom: 40}}>Boleto: {lastTicket}</Text>
            
            <TouchableOpacity style={[styles.scanBtn, {width: '80%', marginBottom: 15}]} onPress={() => { setScanned(false); setValidationState('ESCANER'); }}>
              <Text style={styles.scanBtnText}>SIGUIENTE ESCANEO</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setValidationState('DETALLE_EVENTO'); cargarAsistentes(eventoActivo.pda); }}>
              <Text style={{color: '#fff', fontSize: 16, textDecorationLine: 'underline'}}>Salir a registros de auditoría</Text>
            </TouchableOpacity>
          </>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  center: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingHorizontal: 20, 
    marginBottom: 10 
  },
  title: { 
    color: '#fff', 
    fontSize: 32, 
    fontWeight: '900' 
  },
  card: { 
    backgroundColor: '#111', 
    padding: 25, 
    borderRadius: 15, 
    marginBottom: 15, 
    borderLeftWidth: 4, 
    borderLeftColor: '#14F195', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  cardTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
  cardInfo: { 
    color: '#666', 
    fontSize: 12, 
    fontFamily: 'monospace' 
  },
  detailHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    backgroundColor: '#111' 
  },
  backLink: { 
    color: '#14F195', 
    fontSize: 16, 
    marginRight: 15, 
    fontWeight: 'bold' 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#222' 
  },
  statBox: { 
    flex: 1, 
    padding: 20, 
    alignItems: 'center' 
  },
  sectionTitle: { 
    color: '#14F195', 
    fontSize: 12, 
    fontWeight: 'bold', 
    letterSpacing: 2 
  },
  asistentesCount: { 
    color: '#fff', 
    fontSize: 40, 
    fontWeight: '900' 
  },
  asistenteRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#222' 
  },
  ticketText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 5 
  },
  timeText: { 
    color: '#666', 
    fontSize: 12 
  },
  estadoBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8, 
    fontSize: 10, 
    fontWeight: 'bold', 
    alignSelf: 'flex-start', 
    overflow: 'hidden' 
  },
  estadoValido: { 
    backgroundColor: 'rgba(20, 241, 149, 0.2)', 
    color: '#14F195' 
  },
  estadoDuplicado: { 
    backgroundColor: 'rgba(255, 149, 0, 0.2)', 
    color: '#FF9500' 
  },
  estadoFalso: { 
    backgroundColor: 'rgba(255, 59, 48, 0.2)', 
    color: '#FF3B30' 
  },
  emptyListText: { 
    color: '#444', 
    textAlign: 'center', 
    marginTop: 30, 
    fontStyle: 'italic' 
  },
  scanBtn: { 
    backgroundColor: '#14F195', 
    margin: 20, 
    padding: 20, 
    borderRadius: 15, 
    alignItems: 'center' 
  },
  scanBtnText: { 
    color: '#000', 
    fontWeight: 'bold', 
    fontSize: 16, 
    letterSpacing: 1 
  },
  closeBtn: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    backgroundColor: '#fff', 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 10 
  },
  overlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.6)' 
  },
  frame: { 
    width: 250, 
    height: 250, 
    borderWidth: 2, 
    borderColor: '#14F195', 
    borderRadius: 20, 
    overflow: 'hidden' 
  },
  laser: { 
    width: '100%', 
    height: 3, 
    backgroundColor: '#14F195', 
    shadowColor: '#14F195', 
    shadowRadius: 10, 
    shadowOpacity: 1, 
    elevation: 5 
  },
  scanTextTag: { 
    color: '#fff', 
    marginTop: 25, 
    fontWeight: 'bold', 
    backgroundColor: '#111', 
    paddingHorizontal: 15, 
    paddingVertical: 5, 
    borderRadius: 10, 
    overflow: 'hidden' 
  },
  resultTitle: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: '900', 
    textAlign: 'center', 
    paddingHorizontal: 20 
  }
});
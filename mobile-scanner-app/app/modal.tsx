import { Link } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>BlinkPass Network</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.label}>RPC Node:</Text>
          <Text style={styles.value}>Solana Devnet</Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.label}>Latency:</Text>
          <Text style={[styles.value, { color: '#14F195' }]}>42ms 🟢</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Smart Contract:</Text>
          <Text style={styles.value}>Active</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.label}>Oracle Sync:</Text>
          <Text style={styles.value}>100%</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.footerText}>Conectado mediante Anchor Protocol.</Text>
      </View>

      <Link href="/" dismissTo style={styles.button}>
        <Text style={styles.buttonText}>CERRAR PANEL</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111',
    padding: 25,
    borderRadius: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#14F195',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  label: {
    color: '#888',
    fontSize: 16,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  footerText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    marginTop: 30,
    backgroundColor: '#14F195',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});
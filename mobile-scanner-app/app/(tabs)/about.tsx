import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'; 

const BlinkPassLogo = require('@/assets/images/logo.png'); 

export default function AboutScreen() {
  
  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error("No se pudo abrir la URL:", err));
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        <View style={styles.header}>
          <Image source={BlinkPassLogo} style={styles.logoImage} resizeMode="contain" />
          <View style={styles.badgeContainer}>
            <Text style={styles.headerSub}>v1.0.0 • SOLANA HACKATHON</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Lead Developer</Text>
        <View style={styles.premiumCard}>
          <View style={[styles.cardGlow, { backgroundColor: '#9945FF' }]} />
          
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>CR</Text>
            </View>
            <View>
              <Text style={styles.nameText}>Carlos Rodriguez</Text>
              <Text style={styles.roleText}>Web3 & Full-Stack Engineer</Text>
            </View>
          </View>

          <Text style={styles.bioText}>
            Arquitecto de software especializado en sistemas distribuidos y tecnología blockchain. Creador del protocolo BlinkPass para el ecosistema de Solana.
          </Text>

          <View style={styles.socialGrid}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => openLink('https://github.com/neghxul')}>
              <FontAwesome5 name="github" size={18} color="#fff" style={styles.socialIcon} />
              <Text style={styles.socialText}>GitHub</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialBtn} onPress={() => openLink('https://www.linkedin.com/in/cgrr2809/')}>
              <FontAwesome5 name="linkedin" size={18} color="#0077b5" style={styles.socialIcon} />
              <Text style={styles.socialText}>LinkedIn</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.socialGrid, { marginTop: 10 }]}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => openLink('https://schrecken.com')}>
              <FontAwesome5 name="globe" size={18} color="#14F195" style={styles.socialIcon} />
              <Text style={styles.socialText}>Website</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.socialBtn} onPress={() => openLink('mailto:cgrr29@gmail.com')}>
              <FontAwesome5 name="envelope" size={18} color="#FF5F56" style={styles.socialIcon} />
              <Text style={styles.socialText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>System Architecture</Text>
        <View style={styles.premiumCard}>
          <View style={[styles.cardGlow, { backgroundColor: '#14F195' }]} />
          
          <View style={styles.techRow}>
            <MaterialCommunityIcons name="cube-scan" size={20} color="#14F195" style={styles.techIcon} />
            <Text style={styles.techText}>Blockchain: <Text style={{color: '#fff'}}>Solana (Devnet)</Text></Text>
          </View>
          <View style={styles.techRow}>
            <FontAwesome5 name="file-contract" size={18} color="#9945FF" style={styles.techIcon} />
            <Text style={styles.techText}>Smart Contracts: <Text style={{color: '#fff'}}>Rust (Anchor)</Text></Text>
          </View>
          <View style={styles.techRow}>
            <FontAwesome5 name="mobile-alt" size={20} color="#61DAFB" style={styles.techIcon} />
            <Text style={styles.techText}>Mobile App: <Text style={{color: '#fff'}}>React Native (Expo)</Text></Text>
          </View>
          <View style={styles.techRow}>
            <FontAwesome5 name="database" size={18} color="#3ECF8E" style={styles.techIcon} />
            <Text style={styles.techText}>Database & Auth: <Text style={{color: '#fff'}}>Supabase</Text></Text>
          </View>
          <View style={[styles.techRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <FontAwesome5 name="bolt" size={20} color="#FFD700" style={styles.techIcon} />
            <Text style={styles.techText}>Minting: <Text style={{color: '#fff'}}>Solana Actions & Blinks</Text></Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made and code in 2026.</Text>
          <Text style={styles.footerText}>"Building the future of decentralized ticketing."</Text>
        </View>

      </ScrollView>
    </View>
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
    backgroundColor: 'rgba(153, 69, 255, 0.1)',
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
    marginBottom: 30,
    alignItems: 'center',
    zIndex: 10
  },
  logoImage: {
    width: 200,
    height: 60,
    marginBottom: 10
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  headerSub: {
    fontSize: 10,
    color: '#14F195',
    letterSpacing: 2,
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 5,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  premiumCard: {
    backgroundColor: '#0A0A0A',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    padding: 25,
    marginBottom: 25,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#9945FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  avatarText: {
    color: '#9945FF',
    fontSize: 24,
    fontWeight: '900'
  },
  nameText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2
  },
  roleText: {
    color: '#14F195',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  bioText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25
  },
  socialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#333'
  },
  socialIcon: {
    marginRight: 10
  },
  socialText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },
  techIcon: {
    width: 30,
    textAlign: 'center',
    marginRight: 10
  },
  techText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600'
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  footerText: {
    color: '#444',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center'
  }
});
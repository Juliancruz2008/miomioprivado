import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, RefreshControl, SafeAreaView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { actualizarMetodoPago, crearMetodoPago, eliminarMetodoPago, estaEnModoDemo, listarMetodosPago, type MetodoPago } from '../api/metodosPago';

const TIPOS = ['Visa', 'Mastercard', 'American Express', 'Nequi', 'Daviplata', 'Otro'];
const formInicial = { tipo: 'Visa', numero: '' };

function ultimosCuatro(numero: string) {
  return numero.replace(/\s/g, '').slice(-4) || '----';
}

function fechaLocal(fecha: string) {
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? 'Sin fecha' : valor.toLocaleDateString('es-CO');
}

export function MetodosPagoScreen() {
  // Estado de la pantalla: datos, carga, formulario y método en edición.
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<MetodoPago | null>(null);
  const [form, setForm] = useState(formInicial);
  const [modoDemo, setModoDemo] = useState(false);

  // READ: carga los métodos desde PostgreSQL o desde el modo demo.
  const cargar = useCallback(async (esRefresco = false) => {
    esRefresco ? setRefrescando(true) : setCargando(true);
    setMensaje('');
    try {
      setModoDemo(await estaEnModoDemo());
      setMetodos(await listarMetodosPago());
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudieron cargar los métodos de pago.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // Abre el formulario vacío para CREATE.
  const abrirNuevo = () => {
    setEditando(null);
    setForm(formInicial);
    setModalVisible(true);
  };

  // Abre el formulario con los datos actuales para UPDATE.
  const abrirEdicion = (metodo: MetodoPago) => {
    setEditando(metodo);
    setForm({ tipo: metodo.tipo, numero: metodo.numero });
    setModalVisible(true);
  };

  // CREATE o UPDATE, según exista un método seleccionado.
  const guardar = async () => {
    const numero = form.numero.trim();
    if (numero.replace(/\s/g, '').length < 4) {
      Alert.alert('Datos incompletos', 'Ingresa al menos cuatro dígitos para el número o cuenta.');
      return;
    }
    setGuardando(true);
    try {
      if (editando) await actualizarMetodoPago(editando.id, { tipo: form.tipo, numero });
      else await crearMetodoPago({ tipo: form.tipo, numero, estado: true });
      setModalVisible(false);
      await cargar();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // DELETE después de confirmar la acción.
  const confirmarEliminacion = (metodo: MetodoPago) => {
    const texto = `Se eliminará ${metodo.tipo} terminado en ${ultimosCuatro(metodo.numero)}.`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Eliminar método\n\n${texto}`)) void eliminar(metodo);
      return;
    }
    Alert.alert('Eliminar método', `Se eliminará ${metodo.tipo} terminado en ${ultimosCuatro(metodo.numero)}.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void eliminar(metodo) },
    ]);
  };

  const eliminar = async (metodo: MetodoPago) => {
    try {
      await eliminarMetodoPago(metodo.id);
      await cargar();
    } catch (error) {
      Alert.alert('No se pudo eliminar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    }
  };

  // UPDATE parcial: solo cambia el campo estado.
  const cambiarEstado = async (metodo: MetodoPago) => {
    try {
      await actualizarMetodoPago(metodo.id, { estado: !metodo.estado });
      await cargar();
    } catch (error) {
      Alert.alert('No se pudo actualizar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    }
  };

  // Interfaz visual de la pantalla.
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>EV CHARGE</Text><Text style={styles.title}>Métodos de pago</Text><Text style={styles.subtitle}>Administra tus tarjetas y cuentas.</Text>{modoDemo && <Text style={styles.demoBadge}>MODO PRUEBA · DATOS LOCALES</Text>}</View>
        <TouchableOpacity style={styles.addButton} onPress={abrirNuevo} accessibilityLabel="Agregar método de pago"><Text style={styles.addText}>+ Agregar</Text></TouchableOpacity>
      </View>

      {mensaje ? <View style={styles.errorBox}><Text style={styles.errorText}>{mensaje}</Text><TouchableOpacity onPress={() => void cargar()}><Text style={styles.retry}>Reintentar</Text></TouchableOpacity></View> : null}
      {cargando ? <ActivityIndicator color="#72d34a" size="large" style={styles.loader} /> : <FlatList
        data={metodos}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => void cargar(true)} tintColor="#72d34a" />}
        contentContainerStyle={metodos.length ? styles.list : styles.emptyList}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Aún no tienes métodos</Text><Text style={styles.emptyText}>Agrega una tarjeta o cuenta para pagar tus reservas y compras.</Text><TouchableOpacity style={styles.emptyButton} onPress={abrirNuevo}><Text style={styles.emptyButtonText}>Agregar método</Text></TouchableOpacity></View>}
        renderItem={({ item }) => <View style={styles.card}>
          <View style={styles.cardTop}><View style={styles.brandCircle}><Text style={styles.brandLetter}>{item.tipo.charAt(0).toUpperCase()}</Text></View><View style={styles.cardInfo}><Text style={styles.cardType}>{item.tipo}</Text><Text style={styles.cardNumber}>•••• {ultimosCuatro(item.numero)}</Text><Text style={styles.date}>Registrado el {fechaLocal(item.created_at)}</Text></View></View>
          <View style={styles.cardFooter}><View style={styles.statusRow}><Text style={[styles.status, item.estado ? styles.statusActive : styles.statusInactive]}>{item.estado ? 'Activo' : 'Inactivo'}</Text><Switch value={item.estado} onValueChange={() => void cambiarEstado(item)} trackColor={{ false: '#414844', true: '#418a28' }} thumbColor={item.estado ? '#72d34a' : '#c0c7c1'} /></View><View style={styles.actions}><TouchableOpacity onPress={() => abrirEdicion(item)}><Text style={styles.editAction}>Editar</Text></TouchableOpacity><TouchableOpacity onPress={() => confirmarEliminacion(item)}><Text style={styles.deleteAction}>Eliminar</Text></TouchableOpacity></View></View>
        </View>}
      />}
    </View>

    <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalBackdrop}><View style={styles.modal}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editando ? 'Editar método' : 'Nuevo método'}</Text><TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.close}>Cerrar</Text></TouchableOpacity></View>
        <Text style={styles.label}>Tipo de método</Text><View style={styles.types}>{TIPOS.map((tipo) => <TouchableOpacity key={tipo} onPress={() => setForm({ ...form, tipo })} style={[styles.typeChip, form.tipo === tipo && styles.typeChipSelected]}><Text style={[styles.typeText, form.tipo === tipo && styles.typeTextSelected]}>{tipo}</Text></TouchableOpacity>)}</View>
        <Text style={styles.label}>Número o cuenta</Text><TextInput style={styles.input} value={form.numero} onChangeText={(numero) => setForm({ ...form, numero })} placeholder="Ej.: 1234 5678 9012 3456" placeholderTextColor="#88918b" keyboardType="number-pad" maxLength={30} autoFocus />
        <TouchableOpacity style={[styles.saveButton, guardando && styles.disabledButton]} disabled={guardando} onPress={() => void guardar()}><Text style={styles.saveText}>{guardando ? 'Guardando...' : 'Guardar método'}</Text></TouchableOpacity>
      </View></View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0c110d' }, container: { flex: 1, paddingHorizontal: 20 }, header: { paddingTop: 22, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: '#72d34a', fontSize: 11, letterSpacing: 2, fontWeight: '800' }, title: { color: '#f4f7f3', fontSize: 28, fontWeight: '800', marginTop: 3 }, subtitle: { color: '#aeb7af', fontSize: 14, marginTop: 3 }, demoBadge: { color: '#72d34a', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 6 }, addButton: { backgroundColor: '#72d34a', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10 }, addText: { color: '#10210e', fontWeight: '800', fontSize: 13 }, loader: { marginTop: 70 }, list: { paddingBottom: 28, gap: 12 }, emptyList: { flexGrow: 1, justifyContent: 'center', paddingBottom: 100 }, empty: { alignItems: 'center', backgroundColor: '#151c16', borderRadius: 16, borderWidth: 1, borderColor: '#283229', padding: 28 }, emptyTitle: { color: '#f4f7f3', fontSize: 18, fontWeight: '800' }, emptyText: { color: '#aeb7af', textAlign: 'center', marginTop: 8, lineHeight: 20 }, emptyButton: { marginTop: 20, borderWidth: 1, borderColor: '#72d34a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9 }, emptyButtonText: { color: '#72d34a', fontWeight: '700' }, card: { backgroundColor: '#151c16', borderWidth: 1, borderColor: '#283229', borderRadius: 16, padding: 16 }, cardTop: { flexDirection: 'row' }, brandCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#233e1d', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, brandLetter: { color: '#93eb70', fontSize: 20, fontWeight: '900' }, cardInfo: { flex: 1 }, cardType: { color: '#f4f7f3', fontSize: 16, fontWeight: '800' }, cardNumber: { color: '#c7cfc7', marginTop: 2, fontSize: 15, letterSpacing: 1.5 }, date: { color: '#879188', fontSize: 12, marginTop: 5 }, cardFooter: { borderTopWidth: 1, borderTopColor: '#283229', marginTop: 15, paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, status: { fontSize: 12, fontWeight: '800' }, statusActive: { color: '#8fe86f' }, statusInactive: { color: '#ed9b94' }, actions: { flexDirection: 'row', gap: 13 }, editAction: { color: '#b9dcae', fontSize: 13, fontWeight: '700' }, deleteAction: { color: '#ef8e87', fontSize: 13, fontWeight: '700' }, errorBox: { backgroundColor: '#3b1c1b', borderColor: '#743331', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 }, errorText: { color: '#ffc0bb', lineHeight: 19 }, retry: { color: '#fff', fontWeight: '800', marginTop: 8 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.62)' }, modal: { backgroundColor: '#151c16', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, modalTitle: { color: '#f4f7f3', fontWeight: '800', fontSize: 20 }, close: { color: '#aeb7af', fontWeight: '700' }, label: { color: '#d7dfd6', fontWeight: '700', marginBottom: 9 }, types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }, typeChip: { borderColor: '#3a463b', borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 11 }, typeChipSelected: { backgroundColor: '#315c25', borderColor: '#72d34a' }, typeText: { color: '#b2bcb3', fontSize: 12, fontWeight: '700' }, typeTextSelected: { color: '#d9ffd0' }, input: { borderWidth: 1, borderColor: '#3a463b', borderRadius: 10, backgroundColor: '#0d120e', color: '#f4f7f3', padding: 14, fontSize: 16, marginBottom: 18 }, saveButton: { backgroundColor: '#72d34a', borderRadius: 10, alignItems: 'center', padding: 15 }, disabledButton: { opacity: .55 }, saveText: { color: '#10210e', fontWeight: '900', fontSize: 15 },
});

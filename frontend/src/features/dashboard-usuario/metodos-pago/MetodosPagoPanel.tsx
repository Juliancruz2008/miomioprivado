import { FormEvent, useState } from 'react';
import {
  actualizarMetodoPago,
  crearMetodoPago,
  eliminarMetodoPago,
  listarMetodosPago,
  type MetodoPago,
} from '../../../api/metodosPago.api';

const TIPOS_METODO = ['Visa', 'Mastercard', 'American Express', 'Nequi', 'Daviplata', 'Otro'];

type MetodoPagoPanelProps = {
  metodos: MetodoPago[];
  onMetodosChange: (metodos: MetodoPago[]) => void;
};

const emptyForm = { tipo: 'Visa', numero: '' };

function mensajeError(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

/** Panel CRUD de métodos de pago del usuario autenticado. */
export function MetodosPagoPanel({ metodos, onMetodosChange }: MetodoPagoPanelProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'success'; texto: string } | null>(null);

  const actualizarLista = async () => {
    onMetodosChange(await listarMetodosPago());
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(emptyForm);
    setMensaje(null);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setEditandoId(null);
    setForm(emptyForm);
    setMostrarFormulario(false);
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    const numero = form.numero.trim();
    if (numero.replace(/\s/g, '').length < 4) {
      setMensaje({ tipo: 'error', texto: 'Ingresa al menos cuatro dígitos para el número o cuenta.' });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      if (editandoId) {
        await actualizarMetodoPago(editandoId, { tipo: form.tipo, numero });
      } else {
        await crearMetodoPago({ tipo: form.tipo, numero, estado: true });
      }
      await actualizarLista();
      setMensaje({ tipo: 'success', texto: editandoId ? 'Método actualizado correctamente.' : 'Método agregado correctamente.' });
      cerrarFormulario();
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const editar = (metodo: MetodoPago) => {
    setEditandoId(metodo.id);
    setForm({ tipo: metodo.tipo, numero: metodo.numero });
    setMensaje(null);
    setMostrarFormulario(true);
  };

  const cambiarEstado = async (metodo: MetodoPago) => {
    setGuardando(true);
    setMensaje(null);
    try {
      await actualizarMetodoPago(metodo.id, { estado: !metodo.estado });
      await actualizarLista();
      setMensaje({ tipo: 'success', texto: `Método ${metodo.estado ? 'desactivado' : 'activado'} correctamente.` });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (metodo: MetodoPago) => {
    if (!window.confirm(`¿Eliminar el método ${metodo.tipo} terminado en ${metodo.numero.slice(-4)}?`)) return;
    setGuardando(true);
    setMensaje(null);
    try {
      await eliminarMetodoPago(metodo.id);
      await actualizarLista();
      setMensaje({ tipo: 'success', texto: 'Método eliminado correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: mensajeError(error) });
    } finally {
      setGuardando(false);
    }
  };

  return <>
    <div className="panel-toolbar">
      <button className="pill" type="button" onClick={mostrarFormulario ? cerrarFormulario : abrirNuevo}>
        {mostrarFormulario ? 'Cerrar formulario' : '+ Agregar método'}
      </button>
    </div>

    {mensaje && <p className={`alert alert-${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

    {mostrarFormulario && <form className="admin-form-grid payment-form" onSubmit={guardar}>
      <h3 className="full-width">{editandoId ? 'Editar método de pago' : 'Nuevo método de pago'}</h3>
      <label>Tipo
        <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>
          {TIPOS_METODO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
      </label>
      <label>Número o cuenta
        <input
          required
          minLength={4}
          maxLength={30}
          autoComplete="off"
          value={form.numero}
          onChange={(event) => setForm({ ...form, numero: event.target.value })}
          placeholder="Ej.: **** 1234"
        />
      </label>
      <button className="btn-form" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar método'}</button>
    </form>}

    <div className="table-wrap">
      <table>
        <thead><tr><th>Método</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {metodos.map((metodo) => <tr key={metodo.id}>
            <td><strong>{metodo.tipo}</strong><br /><small>Termina en {metodo.numero.slice(-4)} · Registrado {metodo.created_at ? new Date(metodo.created_at).toLocaleDateString('es-CO') : 'Sin fecha'}</small></td>
            <td><span className={`badge-estado ${metodo.estado ? 'activa' : 'cancelada'}`}>{metodo.estado ? 'Activo' : 'Inactivo'}</span></td>
            <td>
              <button className="btn-tbl" type="button" disabled={guardando} onClick={() => editar(metodo)}>Editar</button>{' '}
              <button className="btn-tbl" type="button" disabled={guardando} onClick={() => void cambiarEstado(metodo)}>{metodo.estado ? 'Desactivar' : 'Activar'}</button>{' '}
              <button className="btn-tbl danger" type="button" disabled={guardando} onClick={() => void eliminar(metodo)}>Eliminar</button>
            </td>
          </tr>)}
          {!metodos.length && <tr><td className="empty" colSpan={3}>No tienes métodos de pago registrados.</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}

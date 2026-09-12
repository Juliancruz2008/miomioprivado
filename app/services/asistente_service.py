import os
import re
import hashlib
from collections import defaultdict, deque
from time import monotonic

import requests


SYSTEM_CONTEXT = """Eres el asistente oficial de EV Charge. Mantén una conversación natural en español, entiende preguntas escritas de cualquier manera y responde con claridad, contexto y sin inventar funciones.
EV Charge usa FastAPI en el backend y React/Vite en el frontend. Sus secciones son Inicio, Categoría, Servicios, Mapa, Dashboard de usuario y Dashboard administrativo.
El usuario puede gestionar perfil, contraseña, vehículos, métodos de pago, reservas, cargas, compras, favoritos, reportes, calificaciones y notificaciones.
Las reservas se hacen para un cargador compatible y disponible desde el mapa o Reservas. Solo después de aprobar el pago se crea la reserva activa.
El administrador gestiona usuarios (sin cambiar sus datos personales), estaciones, reportes, reservas y notificaciones. Puede marcar una carga como realizada; esto libera el cargador y valida la carga para el usuario.
Estados de estación: disponible/activa (verde), reservada (azul solo si todos sus cargadores están ocupados), mantenimiento (amarillo) y fuera de servicio (rojo). No se puede reservar un cargador no disponible.
No solicites ni proceses contraseñas, CVV, tokens, claves ni datos privados. No ejecutes acciones: solo explica los pasos y pide confirmación si el usuario pregunta por una acción sensible.
Puedes responder dudas generales sobre vehículos eléctricos, conectores, autonomía, carga, seguridad y planificación, separando claramente la orientación general de las funciones de EV Charge.
Usa el historial para entender expresiones como “eso”, “también”, “¿y después?” o “no me funciona”. Si falta información, haz una sola pregunta de aclaración antes de dar instrucciones.
Si no conoces algo, dilo y recomienda Contacto/soporte. No inventes botones, rutas, precios ni políticas."""

_requests: dict[str, deque[float]] = defaultdict(deque)


def _limpiar_texto(texto: str) -> str:
    texto = re.sub(r"(?i)(password|contraseña|cvv|token|secret|api[_ -]?key)\s*[:=]\s*\S+", r"\1: [omitido]", texto)
    return texto.strip()


def _permitir(clave: str) -> bool:
    ahora = monotonic()
    ventana = _requests[clave]
    while ventana and ahora - ventana[0] > 60:
        ventana.popleft()
    if len(ventana) >= int(os.getenv("AI_RATE_LIMIT_PER_MINUTE", "20")):
        return False
    ventana.append(ahora)
    return True


def _respaldo(pregunta: str) -> tuple[str, list[str]]:
    p = pregunta.lower()
    def variar(opciones: list[str]) -> str:
        indice = int(hashlib.sha256(pregunta.encode('utf-8')).hexdigest(), 16) % len(opciones)
        return opciones[indice]
    if any(x in p for x in ("vehículo", "vehiculo", "carro", "auto")) and not any(x in p for x in ("conector", "ccs", "gb/t", "gbt", "tipo 1", "tipo 2")):
        return (variar(["Para gestionar un vehículo, entra al Dashboard de usuario y abre “Vehículos”. Allí puedes registrarlo, seleccionar sus datos y dejarlo como activo. El vehículo activo se usa para filtrar cargadores compatibles.", "Desde tu Dashboard abre “Vehículos”, registra los datos del carro y marca uno como activo. Así el mapa puede mostrarte cargadores compatibles con su conector."]), ["¿Cómo selecciono mi vehículo activo?", "¿Qué conectores son compatibles?"])
    if any(x in p for x in ("reserva", "reservar", "cargador")):
        return (variar(["Abre el Mapa o la sección Reservas, elige una estación y después un cargador compatible y disponible. Define el horario, selecciona un método de pago y continúa el proceso. La reserva se crea como activa solo cuando el pago es aprobado.", "Para reservar, selecciona la estación y el cargador compatible con tu vehículo, elige un horario futuro y continúa el proceso de pago. La estación solo se ocupa cuando el pago queda aprobado."]), ["¿Cómo cancelo una reserva?", "¿Qué significa reserva activa?"])
    if any(x in p for x in ("pago", "pagar", "tarjeta", "nequi", "pse")):
        return (variar(["En el proceso de pago puedes elegir Visa, Mastercard, American Express, Nequi, Daviplata, PSE u Otro. Selecciona el método que prefieras, revisa el resumen y confirma para continuar con la reserva.", "Selecciona el método de pago que quieras usar y revisa el resumen antes de confirmar. El método elegido queda asociado al proceso de reserva."]), ["¿Dónde agrego un método de pago?", "¿Dónde veo mis compras?"])
    if any(x in p for x in ("favorito", "favoritos")):
        return (variar(["En el Mapa abre una estación y pulsa Favorito. Para quitarla, entra a Favoritos en tu Dashboard y usa la acción de quitar. Allí también puedes consultar su estado actual.", "Guarda una estación desde su panel de información con Favorito. Después puedes administrarla desde Favoritos y revisar si está disponible, reservada, en mantenimiento o fuera de servicio."]), ["¿Cómo veo el estado de un favorito?", "¿Cómo reporto una estación?"])
    if any(x in p for x in ("reporte", "dañada", "avería", "averia")):
        return (variar(["Desde el detalle de una estación pulsa Reportar, elige el motivo y escribe una descripción respetuosa. El equipo administrativo revisa el reporte y puede actualizarlo a resuelto, mantenimiento o fuera de servicio.", "Abre el detalle de la estación, selecciona Reportar y describe el problema con precisión. El administrador revisará la incidencia y actualizará su estado cuando corresponda."]), ["¿Dónde consulto mis reportes?", "¿Qué estados tiene una estación?"])
    if any(x in p for x in ("contraseña", "contrasena", "perfil", "datos")):
        return (variar(["Puedes editar tus datos desde Mi perfil en el Dashboard. Para cambiar la contraseña usa la opción correspondiente; si no puedes iniciar sesión, utiliza Recuperar contraseña desde el acceso.", "Entra a Mi perfil desde tu Dashboard para actualizar tus datos. Si necesitas cambiar la contraseña, usa la opción de seguridad o el enlace Recuperar contraseña si cerraste sesión."]), ["¿Cómo recupero mi contraseña?", "¿Dónde edito mi perfil?"])
    if any(x in p for x in ("compra", "producto", "categoría", "categoria")):
        return (variar(["En Inicio entra a Categoría para consultar el catálogo. Selecciona un producto, revisa sus detalles y completa el proceso de compra. Las compras realizadas aparecen en Compras y generan una notificación.", "Para consultar productos, entra a Categoría, abre el artículo que te interese y continúa con el proceso de compra. Luego puedes revisar el resultado en Compras y en tus notificaciones."]), ["¿Dónde veo mis compras?", "¿Cómo funciona el proceso de compra?"])
    if any(x in p for x in ("conector", "ccs", "gb/t", "gbt", "tipo 1", "tipo 2", "tesla")):
        return (variar(["La compatibilidad depende del conector de tu vehículo y del cargador disponible. Registra o selecciona tu vehículo activo en el Dashboard y usa el filtro de conectores del Mapa para encontrar opciones compatibles.", "Para elegir un cargador, revisa el tipo de conector que usa tu vehículo y compáralo con el que aparece en cada estación. El sistema debe marcar como compatibles los cargadores que coincidan con tu vehículo activo."]), ["¿Cómo registro mi vehículo?", "¿Cómo filtro los conectores?"])
    if any(x in p for x in ("mapa", "ruta", "navegación", "navegacion", "ubicación", "ubicacion")):
        return (variar(["Entra al Mapa, selecciona una estación y pulsa Ruta para calcular el recorrido. Puedes consultar la ruta sin iniciar navegación o activar la navegación para ver tu posición y el avance del recorrido.", "Desde el Mapa selecciona el destino y usa Ruta. La aplicación dibuja el recorrido y puede actualizar tu posición mientras navegas; si no autorizas la ubicación, todavía puedes consultar la ruta manualmente."]), ["¿Cómo inicio la navegación?", "¿Por qué no detecta mi ubicación?"])
    if any(x in p for x in ("notificación", "notificacion", "campana", "aviso")):
        return (variar(["Las notificaciones aparecen en la campana de Inicio y en el apartado de notificaciones de tu panel. Se generan, entre otros casos, cuando cambia una reserva, un reporte o una compra.", "Revisa la campana de Inicio para consultar novedades. El panel conserva las notificaciones de tus actividades y muestra los cambios importantes de reservas, reportes y compras."]), ["¿Dónde veo mis notificaciones?", "¿Qué significa una notificación de reserva?"])
    if any(x in p for x in ("estado", "disponible", "mantenimiento", "fuera de servicio", "ocupado")):
        return ("En el mapa, verde indica disponible, azul indica que todos los cargadores de la estación están reservados, amarillo corresponde a mantenimiento y rojo a fuera de servicio. La disponibilidad real se revisa a nivel de cada cargador.", ["¿Por qué un cargador no está disponible?", "¿Cómo reporto una estación?"])
    if any(x in p for x in ("admin", "administrador", "panel administrativo")):
        return ("El administrador puede gestionar estaciones, usuarios, reportes, reservas y notificaciones. Puede cambiar estados de estaciones y marcar cargas como realizadas, pero conserva separadas las funciones propias del usuario.", ["¿Qué puede hacer el administrador?", "¿Cómo se libera un cargador?"])
    return (variar(["Puedo orientarte sobre el mapa, estaciones, vehículos, reservas, pagos, compras, favoritos, reportes, calificaciones, notificaciones y tu perfil. ¿Qué proceso necesitas realizar?", "Con gusto te ayudo con EV Charge. Indícame si necesitas orientación sobre una reserva, un vehículo, una estación, un pago, una compra o tu cuenta."]), ["¿Cómo agrego un vehículo?", "¿Cómo hago una reserva?", "¿Dónde veo mis compras?"])


def _mensajes(pregunta: str, historial: list[dict[str, str]]) -> list[dict[str, str]]:
    mensajes = [{"role": "system", "content": SYSTEM_CONTEXT}]
    for item in historial[-12:]:
        if item.get("role") in {"user", "assistant"} and item.get("content"):
            mensajes.append({"role": item["role"], "content": _limpiar_texto(item["content"])[:2000]})
    mensajes.append({"role": "user", "content": _limpiar_texto(pregunta)})
    return mensajes


def responder(pregunta: str, historial: list[dict[str, str]], clave_usuario: str) -> tuple[str, list[str], bool, str | None]:
    local, sugerencias = _respaldo(pregunta)
    if not _permitir(clave_usuario):
        return local, sugerencias, True, "rate_limit"
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key.startswith("tu_"):
        return local, sugerencias, True, None
    url = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions").strip()
    try:
        response = requests.post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json={"model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "messages": _mensajes(pregunta, historial), "temperature": 0.25, "max_tokens": 500}, timeout=float(os.getenv("AI_TIMEOUT_SECONDS", "20")))
        if response.status_code == 429:
            return local, sugerencias, True, "rate_limit"
        response.raise_for_status()
        contenido = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        if not contenido:
            return local, sugerencias, True, "empty"
        return contenido, sugerencias, False, None
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return local, sugerencias, True, "provider"

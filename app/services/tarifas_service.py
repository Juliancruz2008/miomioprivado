"""Reglas de tarifa para reservas de cargadores EV Charge."""


def calcular_precio_reserva(
    estacion_nombre: str,
    operador: str,
    tipo_cargador: str,
    potencia_kw: float | None,
    duracion_horas: float,
) -> dict[str, int | float]:
    horas = max(1, round(float(duracion_horas)))
    potencia = float(potencia_kw or 22)
    texto_estacion = f"{estacion_nombre} {operador}".lower()
    if "enel" in texto_estacion:
        factor_estacion = 1.15
    elif "terpel" in texto_estacion:
        factor_estacion = 1.08
    elif "primax" in texto_estacion:
        factor_estacion = 1.1
    else:
        factor_estacion = 1.0

    tipo = (tipo_cargador or "").lower()
    if potencia > 100 or "dc" in tipo or "gb/t" in tipo:
        tarifa_hora = 8000
    elif potencia >= 50 or "ccs" in tipo:
        tarifa_hora = 6500
    elif potencia >= 20 or "type 2" in tipo:
        tarifa_hora = 5000
    else:
        tarifa_hora = 3500

    subtotal = (2500 + tarifa_hora * horas) * factor_estacion
    total = int(round(subtotal / 1000) * 1000)
    return {
        "horas": horas,
        "tarifa_hora": tarifa_hora,
        "factor_estacion": factor_estacion,
        "total": max(1000, total),
    }

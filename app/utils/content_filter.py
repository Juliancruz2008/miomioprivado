import re
import unicodedata

_PALABRAS_OFENSIVAS = {
    "pirobo", "piroba", "gonorrea", "marica", "maricon", "hijueputa", "hpta", "pvto",
    "malparido", "malparida", "careverga", "carechimba", "culicagado", "culiada",
    "chimba", "verga", "mamerto", "zorra", "perra", "puta", "puto", "mierda", "mrd",
    "maricada", "pendejo", "pendeja", "imbecil", "idiota", "estupido", "estupida",
    "cojudo", "cojuda", "jueputa", "jueputas", "sap@",
    "culo", "culos", "pene", "penis", "pito", "polla", "teta", "tetas", "senos",
    "vagina", "vulva", "ano", "nalgas", "testiculo", "testiculos", "escroto",
    "pubis", "pezon", "pezones", "clitoris", "prepucio",
}

_LETRAS = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i"})


def normalizar_contenido(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto.lower()).encode("ascii", "ignore").decode()
    texto = texto.translate(_LETRAS)
    return re.sub(r"[^a-z0-9]+", "", texto)


def contiene_lenguaje_ofensivo(texto: str) -> bool:
    if re.search(r"(?i)(?<![a-z])h\s*[._*\-]*p(?![a-z])", texto or ""):
        return True
    normalizado = normalizar_contenido(texto)
    return any(normalizar_contenido(palabra) in normalizado for palabra in _PALABRAS_OFENSIVAS)


def validar_contenido(texto: str):
    if contiene_lenguaje_ofensivo(texto or ""):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="El texto contiene lenguaje ofensivo. Modifícalo para continuar.")

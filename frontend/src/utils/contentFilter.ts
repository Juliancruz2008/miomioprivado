const palabrasOfensivas = [
  'pirobo', 'piroba', 'gonorrea', 'marica', 'maricon', 'hijueputa', 'hpta', 'pvto',
  'malparido', 'malparida', 'careverga', 'carechimba', 'culicagado', 'culiada',
  'chimba', 'verga', 'mamerto', 'zorra', 'perra', 'puta', 'puto', 'mierda', 'mrd',
  'maricada', 'pendejo', 'pendeja', 'imbecil', 'idiota', 'estupido', 'estupida',
  'cojudo', 'cojuda', 'jueputa', 'jueputas', 'sapo',
  'culo', 'culos', 'pene', 'penis', 'pito', 'polla', 'teta', 'tetas', 'senos',
  'vagina', 'vulva', 'ano', 'nalgas', 'testiculo', 'testiculos', 'escroto',
  'pubis', 'pezon', 'pezones', 'clitoris', 'prepucio',
];

const reemplazos: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

export function normalizarContenido(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[013457@$!]/g, (caracter) => reemplazos[caracter] || caracter).replace(/[^a-z0-9]/g, '');
}

export function contieneLenguajeOfensivo(texto: string): boolean {
  if (/(^|[^a-z])h[\s._*-]*p([^a-z]|$)/i.test(texto)) return true;
  const normalizado = normalizarContenido(texto);
  return palabrasOfensivas.some((palabra) => normalizado.includes(normalizarContenido(palabra)));
}

export const mensajeContenidoOfensivo = 'El texto contiene lenguaje ofensivo. Modifícalo para continuar.';

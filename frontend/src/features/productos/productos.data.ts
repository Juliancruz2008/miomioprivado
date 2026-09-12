export type CategoriaKey = 'Cargadores' | 'Llantas' | 'Baterías' | 'Cables y conectores';

export type ProductoCatalogo = {
  nombre: string;
  desc: string;
  precio: string;
  monto: number;
  img: string;
  categoria: CategoriaKey;
  etiqueta: string;
  tipo: string;
  potencia: string;
  conector: string;
};

export const categoriasProducto: CategoriaKey[] = ['Cargadores', 'Llantas', 'Baterías', 'Cables y conectores'];

export const catalogoProductos: ProductoCatalogo[] = [
  { nombre: 'Cargador Rápido DC 150 kW', desc: 'Ideal para estaciones comerciales de carga ultra rápida.', precio: '$8.500.000 COP', monto: 8500000, img: '/img/cargador-rapido-150kw.png', categoria: 'Cargadores', etiqueta: 'Carga rápida', tipo: 'CARGADOR DC', potencia: '150 kW', conector: 'CCS2' },
  { nombre: 'Wallbox Inteligente 22 kW', desc: 'La solución compacta perfecta para tu casa o garaje.', precio: '$3.500.000 COP', monto: 3500000, img: '/img/wallbox-22kw.png', categoria: 'Cargadores', etiqueta: 'Uso residencial', tipo: 'WALLBOX', potencia: '22 kW', conector: 'Tipo 2' },
  { nombre: 'Cargador Portátil 7,4 kW', desc: 'Llévalo contigo en el baúl a todas partes.', precio: '$1.200.000 COP', monto: 1200000, img: '/img/cargador-portatil-74kw.png', categoria: 'Cargadores', etiqueta: 'Portátil', tipo: 'CARGADOR PORTÁTIL', potencia: '7,4 kW', conector: 'Tipo 2' },
  { nombre: 'Llanta Michelin Pilot Sport EV 20"', desc: 'Alto rendimiento, bajo ruido y diseñada para el torque eléctrico.', precio: '$1.250.000 COP', monto: 1250000, img: '/img/producto-llanta.svg', categoria: 'Llantas', etiqueta: 'Rendimiento', tipo: 'LLANTAS EV', potencia: '20 pulgadas', conector: 'Vehículos eléctricos' },
  { nombre: 'Llanta Hankook iON evo 22"', desc: 'Optimiza la autonomía con menor resistencia a la rodadura.', precio: '$1.480.000 COP', monto: 1480000, img: '/img/producto-llanta.svg', categoria: 'Llantas', etiqueta: 'Eficiencia', tipo: 'LLANTAS EV', potencia: '22 pulgadas', conector: 'Vehículos eléctricos' },
  { nombre: 'Módulo de Batería 48V', desc: 'Repuesto de celdas de iones de litio de alta densidad.', precio: '$2.800.000 COP', monto: 2800000, img: '/img/producto-bateria.svg', categoria: 'Baterías', etiqueta: 'Alto rendimiento', tipo: 'BATERÍA EV', potencia: '48 V', conector: 'Iones de litio' },
  { nombre: 'Batería Auxiliar 12V EV', desc: 'Soporte para los sistemas electrónicos del vehículo.', precio: '$450.000 COP', monto: 450000, img: '/img/producto-bateria.svg', categoria: 'Baterías', etiqueta: 'Auxiliar', tipo: 'BATERÍA EV', potencia: '12 V', conector: 'Auxiliar' },
  { nombre: 'Cable Tipo 2 a Tipo 2 (5 m)', desc: 'Soporta carga trifásica de hasta 22 kW.', precio: '$480.000 COP', monto: 480000, img: '/img/producto-cable.svg', categoria: 'Cables y conectores', etiqueta: 'Carga segura', tipo: 'CABLE', potencia: '22 kW', conector: 'Tipo 2' },
  { nombre: 'Adaptador CCS2 a GB/T', desc: 'Compatibilidad con el estándar de carga chino.', precio: '$750.000 COP', monto: 750000, img: '/img/producto-cable.svg', categoria: 'Cables y conectores', etiqueta: 'Adaptador', tipo: 'ADAPTADOR', potencia: 'CCS2', conector: 'GB/T' },
];

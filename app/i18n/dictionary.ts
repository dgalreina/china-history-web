export type Lang = 'es' | 'en' | 'zh';

export type Fase = 'cargando' | 'escribiendo' | 'ilustrando' | 'listo';

// Interfaz compartida: TypeScript obliga a que los 3 idiomas implementen
// exactamente las mismas claves — comprobación de completitud gratis, sin
// librería de i18n. Las frases con valores interpolados son funciones, no
// plantillas con placeholders.
export type Textos = {
  page: {
    cargando: string;
    errorConexion: string;
    mapa: string;
    texto: string;
  };
  resultPanels: {
    estadoCarga: Record<Fase, string>;
    reconstruccionAlt: (lugar: string, año: string) => string;
    generandoImagenSr: string;
    hito: string;
    sigueLaHistoria: string;
    cercaDeAqui: string;
  };
  settingsPanel: {
    ajustes: string;
    cerrar: string;
    pestañas: { estilo: string; ajustes: string; debug: string; idioma: string; hallazgos: string; sugerencias: string };
  };
  usagePanel: {
    modeloTexto: string;
    modeloPromptImagen: string;
    longitudTexto: string;
    resolucionImagen: string;
    sonnet: string;
    haiku: string;
    corto: string;
    extenso: string;
    alta: string;
    media: string;
    baja: string;
    notaAplicacion: string;
  };
  buscadorHitos: {
    cerrarBusqueda: string;
    buscarUnHito: string;
    placeholder: string;
    cargandoHitos: string;
    sinResultados: string;
    categoriaPalacio: string;
    categoriaTemplo: string;
    categoriaMansion: string;
    categoriaCiudadAntigua: string;
    categoriaEstado: string;
  };
  dynastyTimeline: {
    añoAnterior: string;
    añoSiguiente: string;
    año: string;
  };
  styleSelector: {
    fotorrealista: string;
    shanshui: string;
  };
  idiomaSelector: {
    titulo: string;
    español: string;
    ingles: string;
    chino: string;
  };
  // Nombres de dinastía/era mostrados en la barra de tiempo — indexados por
  // el `id` estable (el `label` en español de SEGMENTS, ver
  // DynastyTimeline.tsx), no por el idioma. El carácter chino de cada
  // dinastía (seg.hanzi) no depende de esto: se muestra igual en los 3
  // idiomas, es un elemento visual, no una traducción de interfaz.
  dinastias: Record<string, string>;
};

const DINASTIAS_ES: Record<string, string> = {
  Xia: 'Xia',
  Shang: 'Shang',
  Zhou: 'Zhou',
  'Reinos Combatientes': 'Reinos Combatientes',
  Qin: 'Qin',
  Han: 'Han',
  'Tres Reinos / Jin / Sui': 'Tres Reinos / Jin / Sui',
  Tang: 'Tang',
  'Cinco Dinastías': 'Cinco Dinastías',
  Song: 'Song',
  Yuan: 'Yuan',
  Ming: 'Ming',
  Qing: 'Qing',
  República: 'República',
  Comunismo: 'Comunismo',
};

const DINASTIAS_EN: Record<string, string> = {
  Xia: 'Xia',
  Shang: 'Shang',
  Zhou: 'Zhou',
  'Reinos Combatientes': 'Warring States',
  Qin: 'Qin',
  Han: 'Han',
  'Tres Reinos / Jin / Sui': 'Three Kingdoms / Jin / Sui',
  Tang: 'Tang',
  'Cinco Dinastías': 'Five Dynasties',
  Song: 'Song',
  Yuan: 'Yuan',
  Ming: 'Ming',
  Qing: 'Qing',
  República: 'Republic',
  Comunismo: 'Communist era',
};

const DINASTIAS_ZH: Record<string, string> = {
  Xia: '夏',
  Shang: '商',
  Zhou: '周',
  'Reinos Combatientes': '战国',
  Qin: '秦',
  Han: '汉',
  'Tres Reinos / Jin / Sui': '三国 / 晋 / 隋',
  Tang: '唐',
  'Cinco Dinastías': '五代',
  Song: '宋',
  Yuan: '元',
  Ming: '明',
  Qing: '清',
  República: '民国',
  Comunismo: '新中国',
};

const es: Textos = {
  page: {
    cargando: 'Cargando...',
    errorConexion: 'No se ha podido conectar con el backend.',
    mapa: 'Mapa',
    texto: 'Texto',
  },
  resultPanels: {
    estadoCarga: {
      cargando: 'Localizando el lugar…',
      escribiendo: 'Buscando material histórico…',
      ilustrando: 'Generando imagen…',
      listo: '',
    },
    reconstruccionAlt: (lugar, año) => `Reconstrucción de ${lugar}, ${año}`,
    generandoImagenSr: 'Generando imagen…',
    hito: 'Hito',
    sigueLaHistoria: 'Sigue la historia',
    cercaDeAqui: 'Cerca de aquí',
  },
  settingsPanel: {
    ajustes: 'Ajustes',
    cerrar: 'Cerrar',
    pestañas: { estilo: 'Estilo', ajustes: 'Ajustes', debug: 'Debug', idioma: 'Idioma', hallazgos: 'Hallazgos', sugerencias: 'Sugerencias' },
  },
  usagePanel: {
    modeloTexto: 'Modelo (texto)',
    modeloPromptImagen: 'Modelo (prompt de imagen)',
    longitudTexto: 'Longitud del texto',
    resolucionImagen: 'Resolución de imagen',
    sonnet: 'Sonnet',
    haiku: 'Haiku',
    corto: 'Corto',
    extenso: 'Extenso',
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
    notaAplicacion:
      'Se aplica al próximo clic en el mapa. El modelo de imagen solo redacta el prompt visual en inglés (no se muestra) — no tiene por qué coincidir con el del texto. La resolución cambia el peso de la imagen (es de sobra con la más baja para móvil), pero no acelera la generación con este modelo — mira el panel de debug para comprobarlo.',
  },
  buscadorHitos: {
    cerrarBusqueda: 'Cerrar búsqueda',
    buscarUnHito: 'Buscar un hito',
    placeholder: 'Nombre, lugar o año...',
    cargandoHitos: 'Cargando hitos...',
    sinResultados: 'Sin resultados.',
    categoriaPalacio: 'Palacio',
    categoriaTemplo: 'Templo',
    categoriaMansion: 'Mansión',
    categoriaCiudadAntigua: 'Ciudad antigua',
    categoriaEstado: 'Estado',
  },
  dynastyTimeline: {
    añoAnterior: 'Año anterior',
    añoSiguiente: 'Año siguiente',
    año: 'Año',
  },
  styleSelector: {
    fotorrealista: 'Fotorrealista',
    shanshui: 'Pintura tradicional (shanshui)',
  },
  idiomaSelector: {
    titulo: 'Idioma',
    español: 'Español',
    ingles: 'English',
    chino: '中文',
  },
  dinastias: DINASTIAS_ES,
};

const en: Textos = {
  page: {
    cargando: 'Loading...',
    errorConexion: 'Could not connect to the backend.',
    mapa: 'Map',
    texto: 'Text',
  },
  resultPanels: {
    estadoCarga: {
      cargando: 'Locating the place…',
      escribiendo: 'Searching historical material…',
      ilustrando: 'Generating image…',
      listo: '',
    },
    reconstruccionAlt: (lugar, año) => `Reconstruction of ${lugar}, ${año}`,
    generandoImagenSr: 'Generating image…',
    hito: 'Milestone',
    sigueLaHistoria: 'Follow the story',
    cercaDeAqui: 'Nearby',
  },
  settingsPanel: {
    ajustes: 'Settings',
    cerrar: 'Close',
    pestañas: { estilo: 'Style', ajustes: 'Usage', debug: 'Debug', idioma: 'Language', hallazgos: 'Findings', sugerencias: 'Suggestions' },
  },
  usagePanel: {
    modeloTexto: 'Model (text)',
    modeloPromptImagen: 'Model (image prompt)',
    longitudTexto: 'Text length',
    resolucionImagen: 'Image resolution',
    sonnet: 'Sonnet',
    haiku: 'Haiku',
    corto: 'Short',
    extenso: 'Long',
    alta: 'High',
    media: 'Medium',
    baja: 'Low',
    notaAplicacion:
      'Applies to the next map click. The image model only writes the visual prompt in English (not shown) — it doesn’t have to match the text model. Resolution changes the image file size (the lowest is plenty for mobile), but doesn’t speed up generation with this model — check the debug panel to confirm.',
  },
  buscadorHitos: {
    cerrarBusqueda: 'Close search',
    buscarUnHito: 'Search a milestone',
    placeholder: 'Name, place or year...',
    cargandoHitos: 'Loading milestones...',
    sinResultados: 'No results.',
    categoriaPalacio: 'Palace',
    categoriaTemplo: 'Temple',
    categoriaMansion: 'Mansion',
    categoriaCiudadAntigua: 'Ancient city',
    categoriaEstado: 'State',
  },
  dynastyTimeline: {
    añoAnterior: 'Previous year',
    añoSiguiente: 'Next year',
    año: 'Year',
  },
  styleSelector: {
    fotorrealista: 'Photorealistic',
    shanshui: 'Traditional painting (shanshui)',
  },
  idiomaSelector: {
    titulo: 'Language',
    español: 'Español',
    ingles: 'English',
    chino: '中文',
  },
  dinastias: DINASTIAS_EN,
};

const zh: Textos = {
  page: {
    cargando: '加载中...',
    errorConexion: '无法连接到服务器。',
    mapa: '地图',
    texto: '文字',
  },
  resultPanels: {
    estadoCarga: {
      cargando: '正在定位地点…',
      escribiendo: '正在查找历史资料…',
      ilustrando: '正在生成图像…',
      listo: '',
    },
    reconstruccionAlt: (lugar, año) => `${lugar}，${año}年的复原图`,
    generandoImagenSr: '正在生成图像…',
    hito: '历史事件',
    sigueLaHistoria: '继续了解历史',
    cercaDeAqui: '附近',
  },
  settingsPanel: {
    ajustes: '设置',
    cerrar: '关闭',
    pestañas: { estilo: '风格', ajustes: '用量', debug: '调试', idioma: '语言', hallazgos: '发现', sugerencias: '建议' },
  },
  usagePanel: {
    modeloTexto: '模型（文字）',
    modeloPromptImagen: '模型（图像提示词）',
    longitudTexto: '文字长度',
    resolucionImagen: '图像分辨率',
    sonnet: 'Sonnet',
    haiku: 'Haiku',
    corto: '简短',
    extenso: '详细',
    alta: '高',
    media: '中',
    baja: '低',
    notaAplicacion:
      '将应用于下一次点击地图。图像模型只负责用英文撰写视觉提示词（不会显示），不必与文字模型一致。分辨率会改变图像文件大小（移动端用最低档已足够），但在当前模型下不会加快生成速度——可在调试面板中查看确认。',
  },
  buscadorHitos: {
    cerrarBusqueda: '关闭搜索',
    buscarUnHito: '搜索历史事件',
    placeholder: '名称、地点或年份...',
    cargandoHitos: '正在加载历史事件...',
    sinResultados: '没有结果。',
    categoriaPalacio: '宫殿',
    categoriaTemplo: '寺庙',
    categoriaMansion: '王府',
    categoriaCiudadAntigua: '古城',
    categoriaEstado: '诸侯国',
  },
  dynastyTimeline: {
    añoAnterior: '上一年',
    añoSiguiente: '下一年',
    año: '年份',
  },
  styleSelector: {
    fotorrealista: '写实照片风格',
    shanshui: '传统山水画风格',
  },
  idiomaSelector: {
    titulo: '语言',
    español: 'Español',
    ingles: 'English',
    chino: '中文',
  },
  dinastias: DINASTIAS_ZH,
};

export const dictionary: Record<Lang, Textos> = { es, en, zh };

// es -> "X a.C./d.C.", en -> "X BC/AD", zh -> "公元前X年/公元X年" — antes vivía
// hardcodeado en español dentro de DynastyTimeline.tsx.
export function formatYear(year: number, lang: Lang): string {
  const abs = Math.abs(year);
  if (lang === 'en') return year < 0 ? `${abs} BC` : `${abs} AD`;
  if (lang === 'zh') return year < 0 ? `公元前${abs}年` : `公元${abs}年`;
  return year < 0 ? `${abs} a.C.` : `${abs} d.C.`;
}

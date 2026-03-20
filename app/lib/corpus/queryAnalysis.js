const PROVINCE_KEYWORDS = [
  { value: 'Jujuy', terms: ['jujuy'] },
  { value: 'Buenos Aires', terms: ['buenos aires', 'scba'] },
  { value: 'CABA', terms: ['caba', 'ciudad autonoma'] },
  { value: 'Nacional', terms: ['nacion', 'nacional', 'corte suprema', 'csjn'] },
  { value: 'Cordoba', terms: ['cordoba'] },
  { value: 'Mendoza', terms: ['mendoza'] },
  { value: 'Salta', terms: ['salta'] },
  { value: 'Tucuman', terms: ['tucuman'] },
  { value: 'Santa Fe', terms: ['santa fe'] },
  { value: 'Neuquen', terms: ['neuquen'] },
];

const AREA_KEYWORDS = [
  { value: 'Constitucional', terms: ['constitucion', 'constitucional', 'derechos fundamentales', 'amparo'] },
  { value: 'Procesal', terms: ['procesal', 'procedimiento', 'competencia', 'caducidad de instancia', 'traslado', 'plazo'] },
  { value: 'Civil', terms: ['civil', 'danos', 'responsabilidad civil', 'obligaciones', 'contrato', 'sucesion'] },
  { value: 'Comercial', terms: ['comercial', 'sociedad', 'concurso', 'quiebra', 'pagare', 'cheque'] },
  { value: 'Penal', terms: ['penal', 'delito', 'pena', 'imputado', 'fiscal'] },
  { value: 'Laboral', terms: ['laboral', 'trabajo', 'despido', 'trabajador', 'empleador', 'salario'] },
  { value: 'Familia', terms: ['familia', 'divorcio', 'alimentos', 'cuidado personal', 'responsabilidad parental'] },
  { value: 'Administrativo', terms: ['administrativo', 'administracion publica', 'licitacion', 'empleo publico'] },
  { value: 'Tributario', terms: ['tributario', 'impuesto', 'afip', 'ingresos brutos'] },
];

const PROCEDURAL_TERMS = [
  'plazo', 'traslado', 'demanda', 'contestar', 'contestacion',
  'recurso', 'apelacion', 'competencia', 'caducidad', 'notificacion',
  'cedula', 'providencia', 'resolucion', 'sentencia', 'incidente',
  'medida cautelar', 'embargo', 'prueba', 'audiencia', 'alegato',
  'excepcion', 'nulidad', 'reposicion', 'queja', 'casacion',
];

const TOPIC_TERMS = [
  'caducidad', 'competencia', 'alimentos', 'divorcio', 'despido',
  'contrato', 'sucesion', 'amparo', 'habeas corpus', 'embargo',
  'prescripcion', 'responsabilidad', 'danos', 'indemnizacion',
  'obligaciones', 'garantia', 'fianza', 'hipoteca', 'prenda',
  'concurso', 'quiebra', 'tutela', 'curatela', 'adopcion',
  'consumidor', 'defensa del consumidor', 'locacion', 'desalojo',
  'ejecucion', 'titulo ejecutivo', 'pagare', 'cheque', 'letra',
  'recurso extraordinario', 'inconstitucionalidad',
];

/**
 * Analyze a legal query using heuristic keyword rules.
 *
 * @param {string} query
 * @returns {{
 *   normalizedQuery: string,
 *   jurisdiction: string|null,
 *   legalArea: string|null,
 *   isProcedural: boolean,
 *   topics: string[],
 *   queryTerms: string[],
 * }}
 */
export function analyzeQuery(query) {
  const normalized = normalize(query);
  const jurisdiction = detectJurisdiction(normalized);
  const legalArea = detectLegalArea(normalized);
  const isProcedural = PROCEDURAL_TERMS.some((term) => normalized.includes(term));
  const topics = TOPIC_TERMS.filter((term) => normalized.includes(term));
  const queryTerms = extractTerms(normalized);

  return {
    normalizedQuery: normalized,
    jurisdiction,
    legalArea,
    isProcedural,
    topics,
    queryTerms,
  };
}

function detectJurisdiction(normalized) {
  for (const rule of PROVINCE_KEYWORDS) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return rule.value;
    }
  }
  return null;
}

function detectLegalArea(normalized) {
  let best = null;
  let bestScore = 0;

  for (const rule of AREA_KEYWORDS) {
    const score = rule.terms.filter((term) => normalized.includes(term)).length;
    if (score > bestScore) {
      best = rule.value;
      bestScore = score;
    }
  }

  return best;
}

function extractTerms(normalized) {
  const stopwords = new Set([
    'de', 'del', 'la', 'el', 'en', 'un', 'una', 'los', 'las',
    'por', 'para', 'con', 'al', 'se', 'que', 'es', 'no', 'si',
    'su', 'y', 'o', 'a', 'e', 'lo', 'le', 'me', 'te', 'mi',
    'como', 'mas', 'ya', 'pero', 'sin', 'sobre', 'entre',
    'cual', 'cuando', 'donde', 'quien', 'este', 'esta',
  ]);

  return normalized
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !stopwords.has(word));
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

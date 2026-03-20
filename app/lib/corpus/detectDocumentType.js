import path from 'node:path';

const PROVINCE_RULES = [
  { value: 'Jujuy', terms: ['jujuy', 'provincia de jujuy', 'tribunal superior de justicia de jujuy'] },
  { value: 'Buenos Aires', terms: ['provincia de buenos aires', 'buenos aires', 'scba'] },
  { value: 'CABA', terms: ['ciudad autonoma de buenos aires', 'caba', 'ciudad de buenos aires'] },
  { value: 'Cordoba', terms: ['cordoba', 'provincia de cordoba', 'tsj cordoba'] },
  { value: 'Mendoza', terms: ['mendoza', 'provincia de mendoza'] },
  { value: 'Salta', terms: ['salta', 'provincia de salta'] },
  { value: 'Tucuman', terms: ['tucuman', 'provincia de tucuman'] },
  { value: 'Santa Fe', terms: ['santa fe', 'provincia de santa fe'] },
  { value: 'Chaco', terms: ['chaco', 'provincia del chaco'] },
  { value: 'Neuquen', terms: ['neuquen', 'provincia del neuquen'] },
  { value: 'Rio Negro', terms: ['rio negro', 'provincia de rio negro'] },
];

const LEGAL_AREA_RULES = [
  { value: 'Constitucional', terms: ['constitucion', 'control de constitucionalidad', 'derechos fundamentales', 'preambulo'] },
  { value: 'Procesal', terms: ['codigo procesal', 'procedimiento', 'competencia', 'medida cautelar', 'caducidad de instancia', 'traslado'] },
  { value: 'Civil', terms: ['codigo civil', 'danos y perjuicios', 'responsabilidad civil', 'obligaciones', 'contrato', 'sucesion'] },
  { value: 'Comercial', terms: ['sociedad', 'concurso', 'quiebra', 'pagare', 'cheque', 'mercantil'] },
  { value: 'Penal', terms: ['codigo penal', 'delito', 'pena', 'imputado', 'fiscal', 'homicidio'] },
  { value: 'Laboral', terms: ['contrato de trabajo', 'despido', 'trabajador', 'empleador', 'salario'] },
  { value: 'Familia', terms: ['familia', 'divorcio', 'alimentos', 'cuidado personal', 'responsabilidad parental'] },
  { value: 'Administrativo', terms: ['acto administrativo', 'administracion publica', 'licitacion', 'empleo publico'] },
  { value: 'Tributario', terms: ['tributo', 'impuesto', 'afip', 'ingresos brutos', 'fisco'] },
];

export function detectDocumentType({ filename = '', title = '', text = '' } = {}) {
  const normalizedText = normalizeForSearch(text);
  const normalizedName = normalizeForSearch(`${filename} ${title}`);
  const haystack = `${normalizedName}\n${normalizedText}`.trim();

  const source = inferSourceType(haystack, normalizedName);
  const jurisdiction = inferJurisdiction(haystack);
  const legalArea = inferLegalArea(haystack, source);

  return {
    sourceType: source.sourceType,
    subtype: source.subtype,
    jurisdiction,
    legalArea,
    priority: derivePriority(source.sourceType, source.subtype),
  };
}

export function inferDocumentTitle({ title = '', filename = '', text = '' } = {}) {
  if (!isPlaceholderTitle(title, filename)) {
    return title.trim();
  }

  const firstMeaningfulLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length >= 8);

  if (firstMeaningfulLine) {
    return firstMeaningfulLine.slice(0, 160);
  }

  const fallback = path.parse(filename || 'documento').name.replace(/[_-]+/g, ' ').trim();
  return fallback || 'Documento legal';
}

export function derivePriority(sourceType, subtype) {
  if (subtype === 'constitucion' || subtype === 'constitucion_provincial') {
    return 1;
  }

  if (subtype === 'codigo_procesal') {
    return 2;
  }

  if (sourceType === 'norma') {
    return 3;
  }

  if (sourceType === 'jurisprudencia') {
    return 4;
  }

  if (sourceType === 'doctrina') {
    return 5;
  }

  return 6;
}

function inferSourceType(haystack, normalizedName) {
  if (containsAny(normalizedName, ['modelo', 'plantilla']) || containsAny(haystack, ['modelo de escrito', 'formulario modelo'])) {
    return { sourceType: 'modelo', subtype: 'modelo' };
  }

  if (containsAny(haystack, ['nota interna', 'memorandum', 'memo interno', 'circular interna'])) {
    return { sourceType: 'nota_interna', subtype: 'nota_interna' };
  }

  if (
    containsAny(haystack, ['sentencia', 'fallo']) &&
    containsAny(haystack, ['considerando', 'considerandos', 'resuelve', 'autos'])
  ) {
    return { sourceType: 'jurisprudencia', subtype: 'sentencia' };
  }

  if (
    containsAny(haystack, ['constitucion', 'preambulo']) &&
    containsAny(haystack, ['articulo', 'art.'])
  ) {
    const subtype = containsAny(haystack, ['constitucion provincial', 'constitucion de la provincia'])
      ? 'constitucion_provincial'
      : 'constitucion';

    return { sourceType: 'norma', subtype };
  }

  if (
    containsAny(haystack, ['codigo procesal', 'codigo procesal civil y comercial', 'codigo procesal penal', 'codigo procesal laboral']) &&
    containsAny(haystack, ['libro primero', 'capitulo', 'articulo', 'art.'])
  ) {
    return { sourceType: 'norma', subtype: 'codigo_procesal' };
  }

  if (
    containsAny(haystack, ['codigo civil y comercial', 'codigo penal', 'codigo aduanero', 'codigo tributario', 'codigo']) &&
    countMatches(haystack, ['libro', 'titulo', 'capitulo', 'articulo', 'art.']) >= 2
  ) {
    return { sourceType: 'norma', subtype: 'codigo' };
  }

  if (/\bley(?:\s+n[ro.]?\s*|\s+)\d+/i.test(haystack) || containsAny(haystack, ['texto de la ley', 'la presente ley'])) {
    return { sourceType: 'norma', subtype: 'ley' };
  }

  if (/\bdecreto(?:\s+n[ro.]?\s*|\s+)\d+/i.test(haystack) || containsAny(haystack, ['decreto reglamentario'])) {
    return { sourceType: 'norma', subtype: 'decreto' };
  }

  if (/\bresolucion(?:\s+n[ro.]?\s*|\s+)\d+/i.test(haystack) || containsAny(haystack, ['ministerio resuelve'])) {
    return { sourceType: 'norma', subtype: 'resolucion' };
  }

  if (containsAny(haystack, ['acordada'])) {
    return { sourceType: 'norma', subtype: 'acordada' };
  }

  if (
    containsAny(haystack, ['doctrina', 'comentario doctrinario', 'analisis doctrinario', 'revista juridica']) ||
    (containsAny(normalizedName, ['doctrina']) && containsAny(haystack, ['autor', 'bibliografia']))
  ) {
    return { sourceType: 'doctrina', subtype: 'articulo_doctrinario' };
  }

  if (
    containsAny(haystack, ['demanda', 'contestacion de demanda', 'interpone recurso', 'promueve incidente', 'solicita se tenga'])
  ) {
    return { sourceType: 'escrito', subtype: inferPleadingSubtype(haystack) };
  }

  return { sourceType: null, subtype: null };
}

function inferPleadingSubtype(haystack) {
  if (containsAny(haystack, ['contestacion de demanda', 'contesta demanda'])) {
    return 'contestacion_demanda';
  }

  if (containsAny(haystack, ['interpone recurso', 'recurso de apelacion', 'recurso extraordinario'])) {
    return 'recurso';
  }

  if (containsAny(haystack, ['medida cautelar', 'solicita cautelar'])) {
    return 'medida_cautelar';
  }

  if (containsAny(haystack, ['demanda'])) {
    return 'demanda';
  }

  return 'escrito';
}

function inferJurisdiction(haystack) {
  if (
    containsAny(haystack, [
      'constitucion nacional',
      'republica argentina',
      'corte suprema de justicia de la nacion',
      'codigo civil y comercial de la nacion',
      'codigo procesal civil y comercial de la nacion',
    ])
  ) {
    return 'Nacional';
  }

  for (const rule of PROVINCE_RULES) {
    if (containsAny(haystack, rule.terms)) {
      return rule.value;
    }
  }

  return null;
}

function inferLegalArea(haystack, source) {
  if (source.subtype === 'constitucion' || source.subtype === 'constitucion_provincial') {
    return 'Constitucional';
  }

  if (source.subtype === 'codigo_procesal') {
    return containsAny(haystack, ['civil y comercial']) ? 'Procesal Civil y Comercial' : 'Procesal';
  }

  let winner = null;

  for (const rule of LEGAL_AREA_RULES) {
    const score = countMatches(haystack, rule.terms);
    if (!score) {
      continue;
    }

    if (!winner || score > winner.score) {
      winner = { value: rule.value, score };
    }
  }

  return winner?.value || null;
}

function normalizeForSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(haystack, terms) {
  return terms.some((term) => haystack.includes(normalizeForSearch(term)));
}

function countMatches(haystack, terms) {
  return terms.filter((term) => haystack.includes(normalizeForSearch(term))).length;
}

function isPlaceholderTitle(title, filename) {
  const normalizedTitle = normalizeForSearch(title);
  if (!normalizedTitle) {
    return true;
  }

  const parsedFilename = path.parse(filename || '').name;
  if (!parsedFilename) {
    return false;
  }

  return normalizedTitle === normalizeForSearch(parsedFilename) || normalizedTitle === normalizeForSearch(filename);
}

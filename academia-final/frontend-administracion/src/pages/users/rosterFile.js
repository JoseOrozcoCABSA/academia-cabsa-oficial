import readXlsxFile, { readSheetNames } from 'read-excel-file';

const cleanHeader = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replaceAll('_', ' ').replace(/\s+/g, ' ');
const aliases = {
  email: ['correo', 'email', 'correo electronico', 'e-mail', 'correo encontrado sistema oficial'],
  officialEmail: ['correo oficial', 'email oficial', 'correo sistema oficial', 'correo encontrado sistema oficial'],
  code: ['codigo', 'codigo beca', 'clave oficial', 'codigo sistema oficial'],
  rfc: ['rfc', 'rfc por correo'],
  name: ['nombre', 'nombre completo', 'socio', 'alumno', 'docente', 'nombre docente'],
  username: ['usuario', 'username', 'nombre de usuario'],
};
const csvRows = (text) => text.split(/\r?\n/).filter(Boolean).map((line) => {
  const cells = []; let value = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (character === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(value); value = ''; }
    else value += character;
  }
  cells.push(value); return cells;
});

export async function parseRosterFile(file, selectedSheet = '') {
  let matrix;
  let sheets = [];
  if (file.name.toLowerCase().endsWith('.csv')) matrix = csvRows(await file.text());
  else {
    sheets = await readSheetNames(file);
    matrix = await readXlsxFile(file, { sheet: selectedSheet || sheets[0] });
  }
  if (matrix.length < 2) throw new Error('El archivo no contiene filas para el padrón.');
  const headers = matrix[0];
  const positions = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, headers.findIndex((header) => names.includes(cleanHeader(header)))]));
  if (positions.email < 0 && positions.code < 0 && positions.rfc < 0) throw new Error('El archivo necesita una columna RFC, Correo o Código de beca.');
  const rows = matrix.slice(1).map((row, index) => ({
    line: index + 2,
    ...Object.fromEntries(Object.keys(positions).map((key) => [key, positions[key] >= 0 ? String(row[positions[key]] ?? '').trim() : ''])),
  })).filter((row) => row.rfc || row.email || row.code || row.name || row.username);
  if (!rows.length) throw new Error('No se encontraron filas útiles en el archivo.');
  return {
    fileName: file.name,
    sheetName: selectedSheet || sheets[0] || 'CSV',
    rows,
    sheets,
    headers: Object.fromEntries(Object.entries(positions).map(([key, position]) => [key, position >= 0 ? headers[position] : null])),
  };
}

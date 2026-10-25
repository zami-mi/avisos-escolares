const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const providerName = (process.env.DATA_PROVIDER || 'mysql').toLowerCase();

let selectedAdapter;

switch (providerName) {
  case 'mysql':
    selectedAdapter = require('./mysqlAdapter');
    break;

  case 'nexus':
    
    throw new Error('El proveedor de datos NEXUS está planificado para una etapa posterior. Configura DATA_PROVIDER=mysql.');

  default:
    console.warn(`[DATA PROVIDER] Proveedor desconocido "${providerName}". Usando "mysql" por defecto.`);
    selectedAdapter = require('./mysqlAdapter');
    break;
}

module.exports = selectedAdapter;

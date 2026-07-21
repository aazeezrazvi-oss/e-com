const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
let url = '';
let key = '';

if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf8');
  // Simple regex to parse keys
  const urlMatch = fileContent.match(/SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = fileContent.match(/SUPABASE_ANON_KEY\s*=\s*(.*)/);
  
  if (urlMatch && urlMatch[1]) {
    url = urlMatch[1].trim().replace(/['"]/g, '');
  }
  if (keyMatch && keyMatch[1]) {
    key = keyMatch[1].trim().replace(/['"]/g, '');
  }
}

const configContent = `// Auto-generated configuration - DO NOT commit to GitHub
window.SUPABASE_CONFIG = {
  url: "${url}",
  anonKey: "${key}"
};
`;

const jsFolder = path.join(__dirname, 'js');
if (!fs.existsSync(jsFolder)) {
  fs.mkdirSync(jsFolder);
}

fs.writeFileSync(path.join(jsFolder, 'config.js'), configContent);
console.log('Successfully generated js/config.js');

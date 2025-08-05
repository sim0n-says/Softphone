const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Construction du CSS Tailwind...');

try {
  // Vérifier si tailwindcss est installé
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasTailwind = packageJson.devDependencies && packageJson.devDependencies.tailwindcss;
  
  if (!hasTailwind) {
    console.log('📦 Installation de Tailwind CSS...');
    execSync('npm install --save-dev tailwindcss autoprefixer postcss', { stdio: 'inherit' });
  }
  
  // Construire le CSS
  console.log('🎨 Génération du CSS...');
  execSync('npx tailwindcss -i ./public/tailwind.css -o ./public/tailwind-built.css --watch', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
} catch (error) {
  console.error('❌ Erreur lors de la construction du CSS:', error.message);
  process.exit(1);
} 
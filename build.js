const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { zip } = require('bestzip');

const files = [
  { entry: 'src/content.js', out: 'dist/content.js' },
  { entry: 'src/injector.js', out: 'dist/injector.js' },
  { entry: 'src/options.js', out: 'dist/options.js' },
];

const zipFileName = 'selopti-extension.zip';

async function runBuild() {
  console.log('Building bundles with esbuild...');
  
  // Build all files
  await Promise.all(
    files.map(file => 
      esbuild.build({
        entryPoints: [file.entry],
        bundle: true,
        outfile: file.out,
        minify: false, // Minification will be handled by the obfuscator (compact: true)
      })
    )
  );

  console.log('Obfuscating compiled bundles...');
  for (const file of files) {
    const code = fs.readFileSync(file.out, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      numbersToExpressions: true,
      simplify: true,
      stringArray: true,
      stringArrayThreshold: 0.75,
    });
    fs.writeFileSync(file.out, obfuscationResult.getObfuscatedCode(), 'utf8');
    console.log(`Successfully obfuscated: ${file.out}`);
  }

  // Remove existing zip archive if it exists
  if (fs.existsSync(zipFileName)) {
    console.log(`Deleting existing archive: ${zipFileName}...`);
    fs.unlinkSync(zipFileName);
  }

  console.log('Packaging extension into zip archive...');
  await zip({
    source: ['manifest.json', 'options.html', 'dist'],
    destination: zipFileName,
  });
  
  console.log(`Build completed! Created package: ${zipFileName}`);
}

runBuild().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

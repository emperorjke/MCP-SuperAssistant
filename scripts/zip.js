/**
 * zip.js
 * Script to package Chrome extension for distribution
 */

import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distPath = path.resolve(projectRoot, 'dist');
const outputPath = path.resolve(projectRoot, 'mcp-superassistant-v0.2.0.zip');

async function createZip() {
  console.log('📦 Creating extension package...');
  
  // Check if dist directory exists
  if (!fs.existsSync(distPath)) {
    console.error('❌ dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Remove existing zip if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log('🗑️  Removed existing package');
  }

  // Create zip archive
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Extension packaged successfully!`);
      console.log(`📁 File: ${path.basename(outputPath)}`);
      console.log(`💾 Size: ${sizeInMB} MB`);
      console.log('📋 Ready for Chrome Web Store or manual installation');
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️  Warning:', err.message);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all files from dist directory
    archive.directory(distPath, false);

    // Add root files if they exist
    const rootFiles = [
      'README.md',
      'LICENSE',
      'CHANGELOG.md'
    ];

    rootFiles.forEach(file => {
      const filePath = path.resolve(projectRoot, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    });

    console.log('📁 Adding files to archive...');
    archive.finalize();
  });
}

// Validate dist directory structure
function validateDistStructure() {
  console.log('🔍 Validating build structure...');
  
  const requiredFiles = [
    'manifest.json',
    'content/index.iife.js',
    'background/index.iife.js',
    'popup/index.html'
  ];

  const missingFiles = requiredFiles.filter(file => {
    const filePath = path.resolve(distPath, file);
    return !fs.existsSync(filePath);
  });

  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\n💡 Run "npm run build" to generate missing files');
    process.exit(1);
  }

  console.log('✅ Build structure validated');
}

// Main execution
async function main() {
  try {
    console.log('🚀 MCP SuperAssistant Package Builder');
    console.log('=====================================\n');
    
    validateDistStructure();
    await createZip();
    
    console.log('\n🎉 Package creation completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the extension in Chrome');
    console.log('   2. Upload to Chrome Web Store');
    console.log('   3. Or distribute the ZIP file manually');
    
  } catch (error) {
    console.error('❌ Error creating package:', error.message);
    process.exit(1);
  }
}

main();
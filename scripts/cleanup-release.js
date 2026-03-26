#!/usr/bin/env node

/**
 * Cleanup script to remove unnecessary build artifacts
 * Keeps only the main executables:
 * - Windows: .exe files
 * - macOS: .dmg files  
 * - Linux: .AppImage files
 */

const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '../release');

if (!fs.existsSync(releaseDir)) {
  console.log('Release directory does not exist');
  process.exit(0);
}

// Files to keep patterns
const keepPatterns = [
  /\.exe$/i,        // Windows executable
  /\.dmg$/i,        // macOS disk image
  /\.AppImage$/i,   // Linux AppImage
];

// Directories to remove
const removeDirectories = [
  '__appImage-x64',
  'win-unpacked',
  'linux-unpacked',
  'mac-unpacked',
];

let removedCount = 0;

// Remove directories
removeDirectories.forEach(dir => {
  const dirPath = path.join(releaseDir, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Removing directory: ${dir}`);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      removedCount++;
    } catch (err) {
      console.error(`Error removing directory ${dir}:`, err.message);
    }
  }
});

// Get fresh file listing after directory removal
const files = fs.readdirSync(releaseDir);

// Remove non-matching files
files.forEach(file => {
  const filePath = path.join(releaseDir, file);
  
  try {
    const stat = fs.statSync(filePath);
    
    if (stat.isFile()) {
      const shouldKeep = keepPatterns.some(pattern => pattern.test(file));
      
      if (!shouldKeep) {
        console.log(`Removing file: ${file}`);
        fs.unlinkSync(filePath);
        removedCount++;
      } else {
        console.log(`Keeping file: ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

console.log(`\nCleanup completed. Removed ${removedCount} items.`);
console.log('\nRemaining files:');
try {
  fs.readdirSync(releaseDir)
    .filter(f => {
      try {
        return fs.statSync(path.join(releaseDir, f)).isFile();
      } catch {
        return false;
      }
    })
    .forEach(f => {
      try {
        const size = (fs.statSync(path.join(releaseDir, f)).size / 1024 / 1024).toFixed(2);
        console.log(`  - ${f} (${size} MB)`);
      } catch (err) {
        console.error(`Error getting size of ${f}:`, err.message);
      }
    });
} catch (err) {
  console.error('Error listing remaining files:', err.message);
}


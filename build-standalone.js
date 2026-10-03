/**
 * سكريبت لتحديث الملف الموحد index.html تلقائيًا عند تعديل style.css أو app.js أو ai.js
 * يُستخدم لتجهيز التطبيق للنشر المباشر على GitHub Pages
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const templateHtmlPath = path.join(rootDir, 'template.html');
const indexHtmlPath = path.join(rootDir, 'index.html');
const styleCssPath = path.join(rootDir, 'style.css');
const aiJsPath = path.join(rootDir, 'ai.js');
const appJsPath = path.join(rootDir, 'app.js');

const styleCss = fs.readFileSync(styleCssPath, 'utf8');
let aiJs = fs.readFileSync(aiJsPath, 'utf8');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// تحويل وحدات ES إلى كود متوافق يعمل مباشرة في ملف HTML دون استيراد وتصدير
aiJs = aiJs.replace(/export\s+const\s+AI_CONFIG/g, 'const AI_CONFIG');
aiJs = aiJs.replace(/export\s+async\s+function\s+generateOpportunities/g, 'async function generateOpportunities');
aiJs = aiJs.replace(/export\s+\{[^}]+\};?/g, '');
appJs = appJs.replace(/import\s*\{[^}]*\}\s*from\s*['\"][^'\"]*['\"];?/g, '');

// قراءة القالب إما من template.html أو استخراجه
let templateHtml;
if (fs.existsSync(templateHtmlPath)) {
  templateHtml = fs.readFileSync(templateHtmlPath, 'utf8');
} else {
  templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');
}

// استبدال روابط التنسيق والسكربت بمحتواها المباشر
let standalone = templateHtml;

// إزالة أي كتل سابقة
if (standalone.includes('<style id="app-styles">')) {
  standalone = standalone.replace(/<style id="app-styles">[\s\S]*?<\/style>/, `<style id="app-styles">\n${styleCss}\n</style>`);
} else if (standalone.includes('<style>')) {
  standalone = standalone.replace(/<style>[\s\S]*?<\/style>/, `<style id="app-styles">\n${styleCss}\n</style>`);
} else {
  standalone = standalone.replace(
    /<link\s+rel=[\"']stylesheet[\"']\s+href=[\"'][^\"']*style\.css[\"']\s*\/?>/i,
    `<style id="app-styles">\n${styleCss}\n</style>`
  );
}

if (standalone.includes('<script id="app-logic">')) {
  standalone = standalone.replace(/<script id="app-logic">[\s\S]*?<\/script>/, `<script id="app-logic">\n${aiJs}\n\n${appJs}\n</script>`);
} else if (standalone.includes('<script>')) {
  standalone = standalone.replace(/<script>[\s\S]*?<\/script>/, `<script id="app-logic">\n${aiJs}\n\n${appJs}\n</script>` );
} else {
  standalone = standalone.replace(
    /<script\s+type=[\"']module[\"']\s+src=[\"'][^\"']*app\.js[\"']\s*><\/script>/i,
    `<script id="app-logic">\n${aiJs}\n\n${appJs}\n</script>`
  );
}

fs.writeFileSync(indexHtmlPath, standalone, 'utf8');
fs.writeFileSync(path.join(rootDir, 'hawwilha-standalone.html'), standalone, 'utf8');
console.log('✅ تم بنجاح إنشاء وتحديث index.html و hawwilha-standalone.html بحجم:', standalone.length, 'بايت');

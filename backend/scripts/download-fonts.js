const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');

const pipeline = promisify(stream.pipeline);

const fonts = [
  {
    name: 'DejaVuSans.ttf',
    url: 'https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/v2.37/ttf/DejaVuSans.ttf'
  },
  {
    name: 'DejaVuSans-Bold.ttf',
    url: 'https://raw.githubusercontent.com/dejavu-fonts/dejavu-fonts/v2.37/ttf/DejaVuSans-Bold.ttf'
  }
];

const fontsDir = path.join(__dirname, '../fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

async function downloadFont(font) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(fontsDir, font.name);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ Шрифт ${font.name} уже существует`);
      resolve();
      return;
    }

    console.log(`📥 Скачивание ${font.name}...`);
    
    https.get(font.url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          const fileStream = fs.createWriteStream(filePath);
          pipeline(redirectResponse, fileStream)
            .then(() => {
              console.log(`✅ ${font.name} успешно скачан`);
              resolve();
            })
            .catch(reject);
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath);
        pipeline(response, fileStream)
          .then(() => {
            console.log(`✅ ${font.name} успешно скачан`);
            resolve();
          })
          .catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function downloadAllFonts() {
  console.log('🔤 Начинаем скачивание шрифтов DejaVu Sans...\n');
  
  try {
    for (const font of fonts) {
      await downloadFont(font);
    }
    console.log('\n✅ Все шрифты успешно установлены!');
    console.log('📄 Теперь PDF-документы будут корректно отображать кириллицу.');
  } catch (error) {
    console.error('\n❌ Ошибка при скачивании шрифтов:', error.message);
    console.log('\n📝 Вы можете скачать шрифты вручную:');
    console.log('1. Перейдите на https://dejavu-fonts.github.io/Download.html');
    console.log('2. Скачайте DejaVu Sans TTF');
    console.log('3. Скопируйте DejaVuSans.ttf и DejaVuSans-Bold.ttf в папку backend/fonts/');
    process.exit(1);
  }
}

downloadAllFonts();

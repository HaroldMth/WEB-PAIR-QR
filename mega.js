const mega = require("megajs");
const fs = require("fs");

const auth = {
  email: 'mibeharold2@gmail.com',
  password: 'Harold123best',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

const upload = (filePath, name) => {
  return new Promise((resolve, reject) => {
    const storage = new mega.Storage(auth);

    storage.on('ready', () => {
      const fileSize = fs.statSync(filePath).size;
      const fileStream = fs.createReadStream(filePath);
      const uploadStream = storage.upload({ name, size: fileSize });

      fileStream.pipe(uploadStream);

      uploadStream.on('complete', (file) => {
        file.link((err, url) => {
          storage.close();
          if (err) return reject(err);
          resolve(url);
        });
      });

      uploadStream.on('error', (err) => {
        storage.close();
        reject(err);
      });
    });

    storage.on('error', (err) => {
      reject(err);
    });
  });
};

module.exports = { upload };

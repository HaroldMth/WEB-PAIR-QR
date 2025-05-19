const mega = require("megajs");

const auth = {
  email: 'mibeharold@gmail.com',
  password: 'hansbyte237',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

const upload = (data, name) => {
  return new Promise((resolve, reject) => {
    if (!auth.email || !auth.password || !auth.userAgent) {
      reject(new Error("Missing required authentication fields"));
      return;
    }

    const storage = new mega.Storage(auth);

    storage.on('ready', () => {
      // Upload the file
      const file = storage.upload({ name, allowUploadBuffering: true });

      // Write the data to the upload stream
      data.pipe(file);

      file.on('end', () => {
        // When upload finishes, get the public link
        file.link((err, url) => {
          storage.close();
          if (err) return reject(err);
          resolve(url);
        });
      });

      file.on('error', (err) => {
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

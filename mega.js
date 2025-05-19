const mega = require("megajs");
const fs = require("fs");

const auth = {
  email: "mibeharold2@gmail.com",
  password: "Harold123best",
  userAgent: "HansTechUploader/1.0"
};

const upload = async (filePath, fileName) => {
  return new Promise((resolve, reject) => {
    const storage = new mega.Storage(auth);

    storage.on("ready", () => {
      console.log("✅ Logged into Mega");

      const stats = fs.statSync(filePath);
      const stream = fs.createReadStream(filePath);

      const uploadStream = storage.upload({
        name: fileName,
        size: stats.size
      });

      stream.pipe(uploadStream);

      uploadStream.on("complete", (file) => {
        console.log("✅ Upload complete");
        file.link((err, url) => {
          storage.close();
          if (err) return reject("❌ Error getting link: " + err.message);
          console.log("🔗 File link:", url);
          resolve(url);
        });
      });

      uploadStream.on("error", (err) => {
        storage.close();
        reject("❌ Upload error: " + err.message);
      });
    });

    storage.on("error", (err) => {
      reject("❌ Storage login error: " + err.message);
    });
  });
};

// Example usage (Uncomment to test)
// upload("test.txt", "my_test_file.txt")
//   .then(link => console.log("Download link:", link))
//   .catch(err => console.error(err));

module.exports = { upload };

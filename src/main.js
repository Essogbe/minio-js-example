
import multer from "multer";
import { S3 } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";


dotenv.config(); // Charge les variables d'environnement depuis le fichier .env

export const bucket = process.env.S3_BUCKET;

export const s3 = new S3({
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  region: process.env.S3_REGION, // Ajout de la région pour éviter l'erreur
  tls: false,
  forcePathStyle: true,
});


// Utilisation de multer pour gérer les fichiers téléchargés en mémoire
const storage = multer.memoryStorage();  // On garde les fichiers en mémoire
export const upload = multer({ storage });

// Fonction d'upload avec le SDK v3 (en utilisant le buffer en mémoire)
export const uploadFileToS3 = async (fileBuffer, key) => {
  const uploadParams = {
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: "application/json", // Adapte selon ton type de fichier
  };

  try {
    const data = await s3.putObject(uploadParams);
    return data;
  } catch (err) {
    console.error("Error uploading file to S3:", err);
    throw new Error("Unable to upload file to S3");
  }
};

// Fonction pour télécharger un fichier depuis S3
export const getFileFromS3 = async (fileKey) => {
  const params = {
    Bucket: bucket,
    Key: fileKey,
  };

  try {
    const data = await s3.getObject(params);
    return data.Body;  // Retourne le contenu du fichier (stream)
  } catch (err) {
    console.error("Error fetching file:", err);
    throw new Error("Unable to fetch file");
  }
};


import express from "express";

const app = express();


app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const key = Date.now().toString();  // Utilisation de la date actuelle comme clé (optionnel)
    const fileBuffer = req.file.buffer;
    const result = await uploadFileToS3(fileBuffer, key);
    res.json({ message: "File uploaded successfully", key });
  } catch (error) {
    res.status(500).json({ message: "File upload failed", error: error.message });
  }
});

// Route pour télécharger un fichier depuis S3
app.get("/download/:key", async (req, res) => {
  const key = req.params.key;

  try {
    const fileStream = await getFileFromS3(key);
    res.setHeader("Content-Type", "application/json");
    fileStream.pipe(res);  // Pipline le stream directement dans la réponse
  } catch (error) {
    res.status(500).json({ message: "File download failed", error: error.message });
  }
});

app.listen(3333, () => {
  console.log("Server is running on http://localhost:3333");
});


import multer from "multer";
import { S3 } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Nom de ton bucket
export const bucket = "test";

// Configuration du client S3 avec AWS SDK v3
export const s3 = new S3({
  endpoint: "http://35.223.207.93:9000",
  credentials: {
    accessKeyId: "*",
    secretAccessKey: "*",
  },
  region: "us-east-1", 
  tls: false,  // Désactive SSL
  forcePathStyle: true,  // Utilise le style de chemin forcé pour MinIO
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

// Exemple d'utilisation avec Express pour uploader un fichier
import express from "express";

const app = express();

// Route pour uploader un fichier
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const key = Date.now().toString();  // Utilisation de la date actuelle comme clé
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

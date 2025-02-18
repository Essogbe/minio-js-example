import express from "express";
import multer from "multer";
import { S3, HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

export const bucket = process.env.S3_BUCKET;

export const s3 = new S3({
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  region: process.env.S3_REGION, 
  tls: false,
  forcePathStyle: true,
});

// Vérifier que le bucket existe et le créer si nécessaire
const ensureBucketExists = async () => {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (error.name === "NotFound") {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`Bucket ${bucket} created successfully.`);
    }
  }
};

ensureBucketExists();

// Configuration de multer pour stocker les fichiers en mémoire
const storage = multer.memoryStorage();
const upload = multer({ storage });

//  endpoint pour uploader un fichier directement sur MinIO
app.post("/upload-file", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier envoyé" });
  }

  const file = req.file;
  const allowedMimeTypes = ["image/png", "image/jpeg"]; //optionnel peut etre géré en front .enfin idéalement ....

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({ message: "Type de fichier non autorisé" });
  }

  try {
    const key = `uploads/${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    res.json({ message: "Fichier uploadé avec succès", key });
  } catch (error) {
    console.error("Erreur lors de l'upload:", error);
    res.status(500).json({ message: "Échec de l'upload" });
  }
});

// 🔗 Endpoint pour obtenir une URL pré-signée pour l'upload (optionnel)
app.post("/get-upload-url", async (req, res) => {
  const { filename, contentType } = req.body;

  if (!filename || !contentType) {
    return res.status(400).json({ message: "Filename et ContentType sont requis" });
  }

  try {
    const key = `uploads/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL pré-signée:", error);
    res.status(500).json({ message: "Échec de la génération de l'URL" });
  }
});

// 🔗 Endpoint pour obtenir une URL pré-signée pour le téléchargement
app.get("/get-download-url", async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ message: "File key est requis" });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ downloadUrl });
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL de téléchargement:", error);
    res.status(500).json({ message: "Échec de la génération de l'URL" });
  }
});

app.listen(3333, () => {
  console.log("Server is running on http://localhost:3333");
});

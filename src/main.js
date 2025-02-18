import express from "express";
import multer from "multer";
import { S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

export const bucket = process.env.S3_BUCKET;
dotenv.config();


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

// Fonction pour vérifier que le bucket existe
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

// const storage = multer.memoryStorage();
// export const upload = multer({ storage });

// Route pour générer une URL pré-signée pour l'upload
app.post("/get-upload-url", async (req, res) => {
  const { filename, contentType } = req.body;

  if (!filename || !contentType) {
    return res.status(400).json({ message: "Filename and contentType are required" });
  }

  try {
    const key = `uploads/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    console.log(key);
    res.json({ uploadUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ message: "Failed to generate upload URL" });
  }
});

app.get("/get-download-url", async (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ message: "File key is required" });
  }
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ downloadUrl });
  } catch (error) {
    console.error("Error generating download URL:", error);
    res.status(500).json({ message: "Failed to generate download URL" });
  }
});


app.listen(3333, () => {
  console.log("Server is running on http://localhost:3333");
});

# Introduction

## Qu'est-ce que MinIO ?
MinIO est une solution de stockage d'objets haute performance, compatible avec l'API S3 d'AWS. Il est conçu pour être léger, scalable et facile à déployer sur des infrastructures locales ou cloud. MinIO est souvent utilisé comme alternative à AWS S3 pour les environnements nécessitant une gestion privée des données.

## Avantages de MinIO
- **Open-source et auto-hébergé** : Permet un contrôle total des données sans dépendre d'un fournisseur cloud externe.
- **Compatibilité avec l'API S3** : Prise en charge native des outils et SDK compatibles avec AWS S3.
- **Performances élevées** : Optimisé pour les charges de travail intensives comme l'IA, l'analytique et les bases de données.
- **Sécurité avancée** : Prend en charge l'authentification avec des clés d'accès, le chiffrement et les contrôles d'accès.
- **Facilité de déploiement** : Peut être installé sur une seule machine ou en mode distribué pour une haute disponibilité.

# Intégration de MinIO dans le Backend

## Objectif
L'objectif est de permettre une interaction entre le backend de l'application et MinIO, notamment pour l'upload et le téléchargement de fichiers via des URLs pré-signées.

## Code Backend avec le SDK JavaScript

### Installation des dépendances
Avant de commencer, installez les dépendances nécessaires avec npm :
```sh
npm install express multer dotenv @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Implémentation du Backend
```javascript
import express from "express";
import multer from "multer";
import { S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

export const bucket = "test";

export const s3 = new S3({
  endpoint: "http://35.223.207.93:9000",
  credentials: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
  },
  region: "us-east-1",
  tls: false,
  forcePathStyle: true,
});

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Route pour obtenir une URL pré-signée pour l'upload
t app.post("/get-upload-url", async (req, res) => {
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
    res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ message: "Failed to generate upload URL" });
  }
});

// Route pour obtenir une URL pré-signée pour le téléchargement
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
```

## Intérêt de cette Approche
- **Séparation des responsabilités** : Le backend ne stocke pas les fichiers mais génère des URLs pré-signées pour permettre au frontend d'interagir directement avec MinIO.
- **Amélioration des performances** : Réduit la charge sur le serveur en évitant le transfert de fichiers via le backend.
- **Sécurité** : Les fichiers restent protégés et accessibles uniquement via des URLs temporaires.
- **Simplicité d'intégration** : Compatible avec n'importe quel frontend (React, Vue, Angular, etc.).


Avec cette approche, MinIO est utilisé comme un système de stockage efficace et sécurisé pour l'application, tout en offrant une gestion simplifiée des fichiers.


### NB
Le `key` représente le nom du fichier sur le Bucket Ainsi , `key= 'uploads/1452'` veut dire qu'il y a un fichier du nom de `1452` créé dans le bucket . Un bucket est comme le grand dossier contenant nos assets avec les autorisations . Le key peut porter ou non le nom du fichier de base en fonction de la logique de l'application

Une fois que le Front obtient l'url de upload, il fait une requete `PUT` pour envoyer le fichier .Lorsqu'il s'agit d'afficher le fichier, on utilise l'url présigné de download avec un `GET` 

#### Exemple
```
async function uploadFile(file) {
  try {
    // Obtenir une URL pré-signée du backend
    const response = await fetch("http://localhost:3333/get-upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    const { uploadUrl, key } = await response.json();

    if (!uploadUrl) {
      throw new Error("Échec de l'obtention de l'URL pré-signée");
    }

    // Envoyer le fichier directement à MinIO
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Échec de l'upload du fichier");
    }

    console.log("Fichier envoyé avec succès :", key);
    return key;
  } catch (error) {
    console.error("Erreur lors de l'upload :", error);
  }
}

// Exemple d'utilisation avec un input file
document.getElementById("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    await uploadFile(file);
  }
});
```

En fonction des cas d'usage , les fichiers d'un bucket peuvent etre acessibles en public sans necessité d'url présigné temporaire ni autre protocole . Ceci peut etre configuré au niveau du serveur Minio ou (découragé) au niveau du backend si les credentials lui fournissent les autorisations nécessaires .

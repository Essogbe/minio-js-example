# minio-s3


```
npm i
npm run dev
```

Tester en local avec curl

```
curl -X POST http://localhost:3333/upload \
  -F "file=@<nom-fichier>"

curl -X GET http://localhost:3333/download/<key> --output <fichier-output>


```
Minio with AWS SDK 💿
